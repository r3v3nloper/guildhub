import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

export type AppDatabase = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

export function openDatabase(filePath: string): AppDatabase {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }

  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return drizzle(sqlite, { schema });
}

// Survives hot reloads in `next dev`, which would otherwise open a new connection per reload.
const globalForDb = globalThis as unknown as { guildhubDb?: AppDatabase };

export function getDb(): AppDatabase {
  globalForDb.guildhubDb ??= openDatabase(serverEnv().databasePath);
  return globalForDb.guildhubDb;
}
