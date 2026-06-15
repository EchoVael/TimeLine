import type { SqliteDatabase } from "./client.js";

export function migrateDatabase(database: SqliteDatabase): void {
  database.sqlite.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL,
      archived_at TEXT,
      deleted_at TEXT,
      trash_batch_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS groups_active_order_idx
      ON groups (deleted_at, archived_at, sort_order);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      relative_path TEXT NOT NULL UNIQUE,
      content_revision TEXT NOT NULL,
      file_mtime_ms INTEGER NOT NULL,
      last_indexed_revision TEXT,
      deleted_at TEXT,
      trash_batch_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      completed_on TEXT,
      day_order INTEGER NOT NULL,
      document_id TEXT NOT NULL UNIQUE REFERENCES documents(id),
      deleted_at TEXT,
      trash_batch_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS milestones_date_order_idx
      ON milestones (deleted_at, date, day_order);
    CREATE INDEX IF NOT EXISTS milestones_group_date_idx
      ON milestones (group_id, deleted_at, date);
    CREATE INDEX IF NOT EXISTS milestones_status_date_idx
      ON milestones (status, deleted_at, date);
  `);
}
