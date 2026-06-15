import { mkdirSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.js";

export type SqliteDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(dataRoot: string) {
  mkdirSync(dataRoot, { recursive: true });

  const sqlite = new Database(join(dataRoot, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return {
    close: () => sqlite.close(),
    orm: drizzle(sqlite, { schema }),
    sqlite,
  };
}
