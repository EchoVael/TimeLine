import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { SqliteDatabase } from "../db/client.js";
import { documents, milestones } from "../db/schema.js";

export type MilestoneRecord = typeof milestones.$inferSelect;
export type DocumentRecord = typeof documents.$inferSelect;

interface CreateRecords {
  document: typeof documents.$inferInsert;
  milestone: typeof milestones.$inferInsert;
}

export class MilestoneRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(): MilestoneRecord[] {
    return this.database.orm
      .select()
      .from(milestones)
      .where(isNull(milestones.deletedAt))
      .orderBy(asc(milestones.date), asc(milestones.dayOrder))
      .all();
  }

  listByDate(date: string): MilestoneRecord[] {
    return this.database.orm
      .select()
      .from(milestones)
      .where(and(eq(milestones.date, date), isNull(milestones.deletedAt)))
      .orderBy(asc(milestones.dayOrder))
      .all();
  }

  findById(id: string): MilestoneRecord | undefined {
    return this.database.orm
      .select()
      .from(milestones)
      .where(and(eq(milestones.id, id), isNull(milestones.deletedAt)))
      .get();
  }

  findDocument(id: string): DocumentRecord | undefined {
    return this.database.orm
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
      .get();
  }

  create(input: CreateRecords): MilestoneRecord {
    return this.database.orm.transaction((transaction) => {
      transaction.insert(documents).values(input.document).run();
      return transaction
        .insert(milestones)
        .values(input.milestone)
        .returning()
        .get();
    });
  }

  update(
    id: string,
    expectedVersion: number,
    milestoneChanges: Partial<
      Pick<
        MilestoneRecord,
        "completedOn" | "date" | "dayOrder" | "groupId" | "status" | "title"
      >
    >,
    document: Pick<
      DocumentRecord,
      "contentRevision" | "fileMtimeMs" | "id" | "updatedAt"
    >,
    updatedAt: string,
  ): MilestoneRecord | undefined {
    return this.database.orm.transaction((transaction) => {
      const updated = transaction
        .update(milestones)
        .set({
          ...milestoneChanges,
          updatedAt,
          version: sql`${milestones.version} + 1`,
        })
        .where(
          and(
            eq(milestones.id, id),
            eq(milestones.version, expectedVersion),
            isNull(milestones.deletedAt),
          ),
        )
        .returning()
        .get();

      if (!updated) {
        return undefined;
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

      return updated;
    });
  }

  reorder(
    date: string,
    orderedIds: string[],
    expectedVersions: Record<string, number>,
    updatedAt: string,
  ): MilestoneRecord[] {
    return this.database.orm.transaction((transaction) => {
      orderedIds.forEach((id, dayOrder) => {
        const result = transaction
          .update(milestones)
          .set({
            dayOrder,
            updatedAt,
            version: sql`${milestones.version} + 1`,
          })
          .where(
            and(
              eq(milestones.id, id),
              eq(milestones.date, date),
              eq(milestones.version, expectedVersions[id] ?? -1),
              isNull(milestones.deletedAt),
            ),
          )
          .run();

        if (result.changes !== 1) {
          throw new Error("VERSION_CONFLICT");
        }
      });

      return transaction
        .select()
        .from(milestones)
        .where(and(eq(milestones.date, date), isNull(milestones.deletedAt)))
        .orderBy(asc(milestones.dayOrder))
        .all();
    });
  }

  normalizeDate(date: string): void {
    const rows = this.listByDate(date);
    this.database.orm.transaction((transaction) => {
      rows.forEach((row, dayOrder) => {
        if (row.dayOrder !== dayOrder) {
          transaction
            .update(milestones)
            .set({ dayOrder })
            .where(eq(milestones.id, row.id))
            .run();
        }
      });
    });
  }
}
