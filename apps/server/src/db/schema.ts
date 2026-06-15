import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const groups = sqliteTable(
  "groups",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull(),
    archivedAt: text("archived_at"),
    deletedAt: text("deleted_at"),
    trashBatchId: text("trash_batch_id"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("groups_active_order_idx").on(
      table.deletedAt,
      table.archivedAt,
      table.sortOrder,
    ),
  ],
);

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["milestone", "daily"] }).notNull(),
  relativePath: text("relative_path").notNull().unique(),
  contentRevision: text("content_revision").notNull(),
  fileMtimeMs: integer("file_mtime_ms").notNull(),
  lastIndexedRevision: text("last_indexed_revision"),
  deletedAt: text("deleted_at"),
  trashBatchId: text("trash_batch_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const milestones = sqliteTable(
  "milestones",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id),
    title: text("title").notNull(),
    date: text("date").notNull(),
    status: text("status", {
      enum: ["not_started", "in_progress", "completed", "cancelled"],
    })
      .notNull()
      .default("not_started"),
    completedOn: text("completed_on"),
    dayOrder: integer("day_order").notNull(),
    documentId: text("document_id")
      .notNull()
      .unique()
      .references(() => documents.id),
    deletedAt: text("deleted_at"),
    trashBatchId: text("trash_batch_id"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("milestones_date_order_idx").on(
      table.deletedAt,
      table.date,
      table.dayOrder,
    ),
    index("milestones_group_date_idx").on(
      table.groupId,
      table.deletedAt,
      table.date,
    ),
    index("milestones_status_date_idx").on(
      table.status,
      table.deletedAt,
      table.date,
    ),
  ],
);
