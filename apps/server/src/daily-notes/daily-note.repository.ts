import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import type { SqliteDatabase } from "../db/client.js";
import {
  dailyNoteGroups,
  dailyNotes,
  documents,
  groups,
} from "../db/schema.js";

export type DailyNoteRecord = typeof dailyNotes.$inferSelect;
export type DocumentRecord = typeof documents.$inferSelect;

export interface AssociatedGroupRecord {
  archivedAt: string | null;
  color: string;
  deletedAt: string | null;
  id: string;
  name: string;
  sortOrder: number;
}

interface CreateDailyNoteRecords {
  document: typeof documents.$inferInsert;
  groupIds: string[];
  note: typeof dailyNotes.$inferInsert;
}

export class DailyNoteRepository {
  constructor(private readonly database: SqliteDatabase) {}

  findByDate(date: string): DailyNoteRecord | undefined {
    return this.database.orm
      .select()
      .from(dailyNotes)
      .where(eq(dailyNotes.date, date))
      .get();
  }

  listRange(from: string, to: string): DailyNoteRecord[] {
    return this.database.orm
      .select()
      .from(dailyNotes)
      .where(and(gte(dailyNotes.date, from), lte(dailyNotes.date, to)))
      .orderBy(asc(dailyNotes.date))
      .all();
  }

  findDocument(id: string): DocumentRecord | undefined {
    return this.database.orm
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
      .get();
  }

  listGroups(date: string): AssociatedGroupRecord[] {
    return this.database.orm
      .select({
        archivedAt: groups.archivedAt,
        color: groups.color,
        deletedAt: groups.deletedAt,
        id: groups.id,
        name: groups.name,
        sortOrder: groups.sortOrder,
      })
      .from(dailyNoteGroups)
      .innerJoin(groups, eq(dailyNoteGroups.groupId, groups.id))
      .where(eq(dailyNoteGroups.date, date))
      .orderBy(asc(groups.sortOrder))
      .all();
  }

  listGroupsForIds(groupIds: string[]): AssociatedGroupRecord[] {
    if (groupIds.length === 0) {
      return [];
    }
    return this.database.orm
      .select({
        archivedAt: groups.archivedAt,
        color: groups.color,
        deletedAt: groups.deletedAt,
        id: groups.id,
        name: groups.name,
        sortOrder: groups.sortOrder,
      })
      .from(groups)
      .where(inArray(groups.id, groupIds))
      .orderBy(asc(groups.sortOrder))
      .all();
  }

  create(input: CreateDailyNoteRecords): DailyNoteRecord {
    return this.database.orm.transaction((transaction) => {
      transaction.insert(documents).values(input.document).run();
      const note = transaction
        .insert(dailyNotes)
        .values(input.note)
        .returning()
        .get();
      if (input.groupIds.length > 0) {
        transaction
          .insert(dailyNoteGroups)
          .values(
            input.groupIds.map((groupId) => ({
              createdAt: input.note.createdAt,
              date: input.note.date,
              groupId,
            })),
          )
          .run();
      }
      return note;
    });
  }

  updateDocument(
    id: string,
    expectedRevision: string,
    changes: Pick<
      DocumentRecord,
      "contentRevision" | "fileMtimeMs" | "updatedAt"
    >,
  ): boolean {
    const result = this.database.orm
      .update(documents)
      .set(changes)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.contentRevision, expectedRevision),
          isNull(documents.deletedAt),
        ),
      )
      .run();
    return result.changes === 1;
  }

  updateGroups(
    date: string,
    expectedVersion: number,
    addGroupIds: string[],
    removeGroupIds: string[],
    document: Pick<
      DocumentRecord,
      "contentRevision" | "fileMtimeMs" | "id" | "updatedAt"
    >,
  ): DailyNoteRecord | undefined {
    return this.database.orm.transaction((transaction) => {
      const note = transaction
        .update(dailyNotes)
        .set({
          updatedAt: document.updatedAt,
          version: sql`${dailyNotes.version} + 1`,
        })
        .where(
          and(
            eq(dailyNotes.date, date),
            eq(dailyNotes.version, expectedVersion),
          ),
        )
        .returning()
        .get();
      if (!note) {
        return undefined;
      }

      if (removeGroupIds.length > 0) {
        for (const groupId of removeGroupIds) {
          transaction
            .delete(dailyNoteGroups)
            .where(
              and(
                eq(dailyNoteGroups.date, date),
                eq(dailyNoteGroups.groupId, groupId),
              ),
            )
            .run();
        }
      }
      if (addGroupIds.length > 0) {
        transaction
          .insert(dailyNoteGroups)
          .values(
            addGroupIds.map((groupId) => ({
              createdAt: document.updatedAt,
              date,
              groupId,
            })),
          )
          .onConflictDoNothing()
          .run();
      }

      transaction
        .update(documents)
        .set({
          contentRevision: document.contentRevision,
          fileMtimeMs: document.fileMtimeMs,
          updatedAt: document.updatedAt,
        })
        .where(eq(documents.id, document.id))
        .run();

      return note;
    });
  }
}
