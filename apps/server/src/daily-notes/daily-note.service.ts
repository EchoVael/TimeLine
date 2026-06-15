import type {
  DailyNoteSummary,
  DocumentPayload,
  LocalDate,
  Milestone,
  NewDailyDocumentDraft,
  SaveDailyDocumentRequest,
  UpdateDailyNoteGroupsRequest,
} from "@timemagic/shared";
import { isOverdue } from "@timemagic/shared";

import { GroupRepository } from "../groups/group.repository.js";
import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import {
  MilestoneRepository,
  type MilestoneRecord,
} from "../milestones/milestone.repository.js";
import {
  DailyNoteDocumentStore,
  type DailyNoteGroup,
  type StoredDailyDocument,
} from "./daily-note-document.store.js";
import {
  DailyNoteRepository,
  type DailyNoteRecord,
} from "./daily-note.repository.js";

function toMilestone(
  record: MilestoneRecord,
  today: LocalDate,
): Milestone {
  return {
    completedOn: record.completedOn as LocalDate | null,
    date: record.date as LocalDate,
    dayOrder: record.dayOrder,
    documentId: record.documentId,
    groupId: record.groupId,
    id: record.id,
    overdue: isOverdue(
      record.date as LocalDate,
      record.status,
      today,
    ),
    status: record.status,
    title: record.title,
    version: record.version,
  };
}

export class DailyNoteService {
  private readonly dateLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly repository: DailyNoteRepository,
    private readonly groups: GroupRepository,
    private readonly milestones: MilestoneRepository,
    private readonly documents: DailyNoteDocumentStore,
    private readonly today: () => LocalDate,
  ) {}

  summary(date: LocalDate): DailyNoteSummary {
    const note = this.repository.findByDate(date);
    const associated = this.repository.listGroups(date);
    return {
      date,
      documentId: note?.documentId ?? null,
      dueMilestones: this.milestones
        .listByDate(date)
        .map((milestone) => toMilestone(milestone, this.today())),
      exists: Boolean(note),
      groupIds: associated
        .filter((group) => !group.deletedAt)
        .map((group) => group.id),
      recycledGroupIds: associated
        .filter((group) => Boolean(group.deletedAt))
        .map((group) => group.id),
      version: note?.version ?? null,
    };
  }

  async document(
    date: LocalDate,
  ): Promise<DocumentPayload | NewDailyDocumentDraft> {
    const note = this.repository.findByDate(date);
    if (!note) {
      return {
        conflict: null,
        id: null,
        kind: "daily",
        markdown: this.documents.draft(date),
        modifiedAt: null,
        revision: null,
      };
    }
    const document = this.requireDocument(note.documentId);
    const stored = await this.documents.read(document.relativePath);
    return this.toDocumentPayload(document.id, stored);
  }

  async save(
    date: LocalDate,
    input: SaveDailyDocumentRequest,
  ): Promise<DocumentPayload> {
    return this.withDateLock(date, () => this.saveUnlocked(date, input));
  }

  private async saveUnlocked(
    date: LocalDate,
    input: SaveDailyDocumentRequest,
  ): Promise<DocumentPayload> {
    const note = this.repository.findByDate(date);
    if (!note) {
      if (input.expectedRevision !== null) {
        throw this.documentConflict();
      }
      return this.create(date, [], input.markdown);
    }

    const document = this.requireDocument(note.documentId);
    if (
      input.conflictStrategy !== "overwrite" &&
      input.expectedRevision !== document.contentRevision
    ) {
      throw this.documentConflict();
    }

    const groups = this.canonicalGroups(date);
    const rewritten = await this.documents.rewrite(
      document.relativePath,
      date,
      groups,
      input.markdown,
    );
    const now = new Date().toISOString();
    const updated = this.repository.updateDocument(
      document.id,
      document.contentRevision,
      {
        contentRevision: rewritten.stored.revision,
        fileMtimeMs: Math.round(rewritten.stored.fileMtimeMs),
        updatedAt: now,
      },
    );
    if (!updated) {
      await this.documents.restore(
        document.relativePath,
        rewritten.previousMarkdown,
      );
      throw this.documentConflict();
    }
    return this.toDocumentPayload(document.id, rewritten.stored);
  }

  async updateGroups(
    date: LocalDate,
    input: UpdateDailyNoteGroupsRequest,
  ): Promise<DailyNoteSummary> {
    return this.withDateLock(date, () =>
      this.updateGroupsUnlocked(date, input),
    );
  }

  private async updateGroupsUnlocked(
    date: LocalDate,
    input: UpdateDailyNoteGroupsRequest,
  ): Promise<DailyNoteSummary> {
    const note = this.repository.findByDate(date);
    if (!note) {
      if (
        input.expectedVersion !== null ||
        input.addGroupIds.length === 0
      ) {
        throw this.versionConflict();
      }
      const groups = this.requireActiveGroups(input.addGroupIds);
      await this.create(date, groups, "");
      return this.summary(date);
    }
    if (note.version !== input.expectedVersion) {
      throw this.versionConflict(note);
    }

    this.requireActiveGroups(input.addGroupIds);
    const current = this.repository.listGroups(date);
    const currentIds = new Set(current.map((group) => group.id));
    for (const groupId of input.removeGroupIds) {
      const currentGroup = current.find((group) => group.id === groupId);
      if (currentGroup?.deletedAt) {
        throw new ApiError(
          422,
          "VALIDATION_FAILED",
          "dailyNotes.groups.recycled",
        );
      }
    }

    const nextIds = new Set(currentIds);
    input.removeGroupIds.forEach((id) => nextIds.delete(id));
    input.addGroupIds.forEach((id) => nextIds.add(id));
    const nextGroups = this.requireGroupsInOrder([...nextIds]);
    const document = this.requireDocument(note.documentId);
    const existing = await this.documents.read(document.relativePath);
    const rewritten = await this.documents.rewrite(
      document.relativePath,
      date,
      nextGroups,
      existing.markdown,
    );
    const now = new Date().toISOString();
    const updated = this.repository.updateGroups(
      date,
      note.version,
      input.addGroupIds.filter((id) => !currentIds.has(id)),
      input.removeGroupIds.filter((id) => currentIds.has(id)),
      {
        contentRevision: rewritten.stored.revision,
        fileMtimeMs: Math.round(rewritten.stored.fileMtimeMs),
        id: document.id,
        updatedAt: now,
      },
    );
    if (!updated) {
      await this.documents.restore(
        document.relativePath,
        rewritten.previousMarkdown,
      );
      throw this.versionConflict(this.repository.findByDate(date));
    }
    return this.summary(date);
  }

  async clear(
    date: LocalDate,
    expectedRevision: string,
  ): Promise<DocumentPayload> {
    return this.withDateLock(date, () =>
      this.saveUnlocked(date, {
        expectedRevision,
        markdown: "",
      }),
    );
  }

  private async create(
    date: LocalDate,
    groups: DailyNoteGroup[],
    markdown: string,
  ): Promise<DocumentPayload> {
    const now = new Date().toISOString();
    const documentId = createId();
    const stored = await this.documents.create(date, groups, markdown);
    try {
      this.repository.create({
        document: {
          contentRevision: stored.revision,
          createdAt: now,
          deletedAt: null,
          fileMtimeMs: Math.round(stored.fileMtimeMs),
          id: documentId,
          kind: "daily",
          lastIndexedRevision: null,
          relativePath: stored.relativePath,
          trashBatchId: null,
          updatedAt: now,
        },
        groupIds: groups.map((group) => group.id),
        note: {
          createdAt: now,
          date,
          documentId,
          updatedAt: now,
          version: 1,
        },
      });
      return this.toDocumentPayload(documentId, stored);
    } catch (error) {
      await this.documents.remove(stored.relativePath);
      if (this.repository.findByDate(date)) {
        throw this.documentConflict();
      }
      throw error;
    }
  }

  private canonicalGroups(date: LocalDate): DailyNoteGroup[] {
    return this.repository
      .listGroups(date)
      .map(({ id, name }) => ({ id, name }));
  }

  private requireActiveGroups(groupIds: string[]): DailyNoteGroup[] {
    const uniqueIds = [...new Set(groupIds)];
    uniqueIds.forEach((id) => {
      const group = this.groups.findById(id);
      if (!group || group.archivedAt) {
        throw new ApiError(
          422,
          "VALIDATION_FAILED",
          "dailyNotes.groups.active",
        );
      }
    });
    return this.groups
      .list(true)
      .filter((group) => uniqueIds.includes(group.id))
      .map(({ id, name }) => ({ id, name }));
  }

  private requireGroupsInOrder(groupIds: string[]): DailyNoteGroup[] {
    return this.repository
      .listGroupsForIds(groupIds)
      .map(({ id, name }) => ({ id, name }));
  }

  private requireDocument(id: string) {
    const document = this.repository.findDocument(id);
    if (!document) {
      throw new ApiError(500, "INTEGRITY_FAILED", "documents.missing");
    }
    return document;
  }

  private documentConflict(): ApiError {
    return new ApiError(
      409,
      "DOCUMENT_CONFLICT",
      "documents.revision",
    );
  }

  private versionConflict(
    note?: DailyNoteRecord,
  ): ApiError {
    return new ApiError(
      409,
      "VERSION_CONFLICT",
      "dailyNotes.version",
      note ? { current: this.summary(note.date as LocalDate) } : undefined,
    );
  }

  private toDocumentPayload(
    id: string,
    stored: StoredDailyDocument,
  ): DocumentPayload {
    return {
      conflict: null,
      id,
      kind: "daily",
      markdown: stored.markdown,
      modifiedAt: new Date(stored.fileMtimeMs).toISOString(),
      revision: stored.revision,
    };
  }

  private async withDateLock<T>(
    date: LocalDate,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.dateLocks.get(date) ?? Promise.resolve();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => gate);
    this.dateLocks.set(date, queued);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.dateLocks.get(date) === queued) {
        this.dateLocks.delete(date);
      }
    }
  }
}
