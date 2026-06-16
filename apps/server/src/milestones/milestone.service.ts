import type {
  CreateMilestoneRequest,
  DeleteMilestoneRequest,
  LocalDate,
  Milestone,
  MilestoneListQuery,
  ReorderMilestonesRequest,
  UpdateMilestoneRequest,
} from "@timemagic/shared";
import { isOverdue } from "@timemagic/shared";

import { GroupRepository } from "../groups/group.repository.js";
import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import {
  MilestoneDocumentStore,
  type StoredDocument,
} from "./milestone-document.store.js";
import {
  MilestoneRepository,
  type MilestoneRecord,
} from "./milestone.repository.js";

function toMilestone(record: MilestoneRecord, today: LocalDate): Milestone {
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

export class MilestoneService {
  constructor(
    private readonly repository: MilestoneRepository,
    private readonly groups: GroupRepository,
    private readonly documents: MilestoneDocumentStore,
    private readonly today: () => LocalDate,
  ) {}

  async create(input: CreateMilestoneRequest) {
    const group = this.requireActiveGroup(input.groupId);
    const now = new Date().toISOString();
    const milestoneId = createId();
    const documentId = createId();
    const dayOrder = this.repository.listByDate(input.date).length;
    const title = input.title.trim();
    const stored = await this.documents.create({
      completedOn: null,
      date: input.date,
      group: { id: group.id, name: group.name },
      id: milestoneId,
      status: "not_started",
      title,
    });

    try {
      const record = this.repository.create({
        document: {
          contentRevision: stored.revision,
          createdAt: now,
          deletedAt: null,
          fileMtimeMs: Math.round(stored.fileMtimeMs),
          id: documentId,
          kind: "milestone",
          lastIndexedRevision: null,
          relativePath: stored.relativePath,
          trashBatchId: null,
          updatedAt: now,
        },
        milestone: {
          completedOn: null,
          createdAt: now,
          date: input.date,
          dayOrder,
          deletedAt: null,
          documentId,
          groupId: input.groupId,
          id: milestoneId,
          status: "not_started",
          title,
          trashBatchId: null,
          updatedAt: now,
          version: 1,
        },
      });

      return {
        document: this.toDocumentPayload(documentId, stored),
        milestone: toMilestone(record, this.today()),
      };
    } catch (error) {
      await this.documents.remove(stored.relativePath);
      throw error;
    }
  }

  list(query: MilestoneListQuery): Milestone[] {
    const today = this.today();
    const groupIds = query.groupId
      ? Array.isArray(query.groupId)
        ? query.groupId
        : [query.groupId]
      : null;
    const statuses = query.status
      ? Array.isArray(query.status)
        ? query.status
        : [query.status]
      : null;

    return this.repository
      .list()
      .filter((record) => query.includePast || record.date >= today)
      .filter((record) => query.includeCompleted || record.status !== "completed")
      .filter((record) => query.includeCancelled || record.status !== "cancelled")
      .filter((record) => !query.from || record.date >= query.from)
      .filter((record) => !query.to || record.date <= query.to)
      .filter((record) => !groupIds || groupIds.includes(record.groupId))
      .filter((record) => !statuses || statuses.includes(record.status))
      .slice(0, query.limit)
      .map((record) => toMilestone(record, today));
  }

  async update(id: string, input: UpdateMilestoneRequest): Promise<Milestone> {
    const current = this.requireMilestone(id);
    if (current.version !== input.expectedVersion) {
      throw this.versionConflict(current);
    }

    const group = this.requireActiveGroup(input.groupId ?? current.groupId);
    const date = input.date ?? (current.date as LocalDate);
    const status = input.status ?? current.status;
    const completedOn =
      status === "completed"
        ? (input.completedOn ?? (current.completedOn as LocalDate | null) ?? this.today())
        : null;

    if (status !== "completed" && input.completedOn) {
      throw new ApiError(
        422,
        "VALIDATION_FAILED",
        "milestones.completedOn.status",
      );
    }

    const title = input.title?.trim() ?? current.title;
    const document = this.repository.findDocument(current.documentId);
    if (!document) {
      throw new ApiError(500, "INTEGRITY_FAILED", "documents.missing");
    }

    const dayOrder =
      date === current.date
        ? current.dayOrder
        : this.repository.listByDate(date).length;
    const rewritten = await this.documents.rewrite(document.relativePath, {
      completedOn,
      date,
      group: { id: group.id, name: group.name },
      id: current.id,
      status,
      title,
    });
    const now = new Date().toISOString();

    try {
      const updated = this.repository.update(
        id,
        input.expectedVersion,
        {
          completedOn,
          date,
          dayOrder,
          groupId: group.id,
          status,
          title,
        },
        {
          contentRevision: rewritten.stored.revision,
          fileMtimeMs: Math.round(rewritten.stored.fileMtimeMs),
          id: document.id,
          updatedAt: now,
        },
        now,
      );

      if (!updated) {
        await this.documents.restore(
          document.relativePath,
          rewritten.previousMarkdown,
        );
        throw this.versionConflict(this.requireMilestone(id));
      }

      if (date !== current.date) {
        this.repository.normalizeDate(current.date);
      }
      return toMilestone(updated, this.today());
    } catch (error) {
      await this.documents.restore(
        document.relativePath,
        rewritten.previousMarkdown,
      );
      throw error;
    }
  }

  delete(id: string, input: DeleteMilestoneRequest) {
    const current = this.requireMilestone(id);
    if (current.version !== input.expectedVersion) {
      throw this.versionConflict(current);
    }

    const deleted = this.repository.softDelete(
      id,
      input.expectedVersion,
      new Date().toISOString(),
    );
    if (!deleted) {
      throw this.versionConflict(this.requireMilestone(id));
    }
    this.repository.normalizeDate(current.date);

    return { deleted: true, id };
  }

  reorder(input: ReorderMilestonesRequest): Milestone[] {
    const current = this.repository.listByDate(input.date);
    const currentIds = current.map(({ id }) => id);
    if (
      currentIds.length !== input.orderedIds.length ||
      new Set(input.orderedIds).size !== input.orderedIds.length ||
      currentIds.some((id) => !input.orderedIds.includes(id))
    ) {
      throw new ApiError(
        422,
        "VALIDATION_FAILED",
        "milestones.order.membership",
      );
    }

    for (const milestone of current) {
      if (input.expectedVersions[milestone.id] !== milestone.version) {
        throw this.versionConflict(milestone);
      }
    }

    try {
      return this.repository
        .reorder(
          input.date,
          input.orderedIds,
          input.expectedVersions,
          new Date().toISOString(),
        )
        .map((record) => toMilestone(record, this.today()));
    } catch (error) {
      if (error instanceof Error && error.message === "VERSION_CONFLICT") {
        throw new ApiError(409, "VERSION_CONFLICT", "milestones.version");
      }
      throw error;
    }
  }

  private requireActiveGroup(groupId: string) {
    const group = this.groups.findById(groupId);
    if (!group || group.archivedAt) {
      throw new ApiError(
        422,
        "VALIDATION_FAILED",
        "milestones.group.active",
      );
    }
    return group;
  }

  private requireMilestone(id: string): MilestoneRecord {
    const milestone = this.repository.findById(id);
    if (!milestone) {
      throw new ApiError(404, "NOT_FOUND", "milestones.notFound");
    }
    return milestone;
  }

  private versionConflict(current: MilestoneRecord): ApiError {
    return new ApiError(409, "VERSION_CONFLICT", "milestones.version", {
      current: toMilestone(current, this.today()),
    });
  }

  private toDocumentPayload(id: string, stored: StoredDocument) {
    return {
      conflict: null,
      id,
      kind: "milestone",
      markdown: stored.markdown,
      modifiedAt: new Date(stored.fileMtimeMs).toISOString(),
      revision: stored.revision,
    };
  }
}
