import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { SqliteDatabase } from "../db/client.js";
import { groups } from "../db/schema.js";

export type GroupRecord = typeof groups.$inferSelect;
export type NewGroupRecord = typeof groups.$inferInsert;

export class GroupRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(includeArchived = false): GroupRecord[] {
    const activeCondition = includeArchived
      ? isNull(groups.deletedAt)
      : and(isNull(groups.deletedAt), isNull(groups.archivedAt));

    return this.database.orm
      .select()
      .from(groups)
      .where(activeCondition)
      .orderBy(asc(groups.sortOrder))
      .all();
  }

  findById(id: string): GroupRecord | undefined {
    return this.database.orm
      .select()
      .from(groups)
      .where(and(eq(groups.id, id), isNull(groups.deletedAt)))
      .get();
  }

  insert(record: NewGroupRecord): GroupRecord {
    return this.database.orm.insert(groups).values(record).returning().get();
  }

  update(
    id: string,
    expectedVersion: number,
    changes: Partial<
      Pick<GroupRecord, "archivedAt" | "color" | "description" | "name">
    >,
    updatedAt: string,
  ): GroupRecord | undefined {
    return this.database.orm
      .update(groups)
      .set({
        ...changes,
        updatedAt,
        version: sql`${groups.version} + 1`,
      })
      .where(
        and(
          eq(groups.id, id),
          eq(groups.version, expectedVersion),
          isNull(groups.deletedAt),
        ),
      )
      .returning()
      .get();
  }

  reorder(
    orderedIds: string[],
    expectedVersions: Record<string, number>,
    updatedAt: string,
  ): GroupRecord[] {
    return this.database.orm.transaction((transaction) => {
      orderedIds.forEach((id, sortOrder) => {
        const result = transaction
          .update(groups)
          .set({
            sortOrder,
            updatedAt,
            version: sql`${groups.version} + 1`,
          })
          .where(
            and(
              eq(groups.id, id),
              eq(groups.version, expectedVersions[id] ?? -1),
              isNull(groups.deletedAt),
              isNull(groups.archivedAt),
            ),
          )
          .run();

        if (result.changes !== 1) {
          throw new Error("VERSION_CONFLICT");
        }
      });

      return transaction
        .select()
        .from(groups)
        .where(and(isNull(groups.deletedAt), isNull(groups.archivedAt)))
        .orderBy(asc(groups.sortOrder))
        .all();
    });
  }
}
