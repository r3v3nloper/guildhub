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

export type DbTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];

/** Writes that may run on their own or as part of a caller's transaction. */
export type DbExecutor = AppDatabase | DbTransaction;

export function openDatabase(filePath: string): AppDatabase {
  if (filePath !== ":memory:") {
    // A runtime path, not a build input: keeps the DB folder out of output tracing.
    const absolutePath = path.resolve(/*turbopackIgnore: true*/ filePath);
    warnIfInsideProject(absolutePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  }

  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return drizzle(sqlite, { schema });
}

/**
 * `next dev` watches the project folder and has no way to exclude a subfolder. SQLite
 * touches its -wal/-shm files even on reads, so a DB inside the project reloads pages
 * in an endless loop.
 */
function warnIfInsideProject(absolutePath: string) {
  const relative = path.relative(process.cwd(), absolutePath);
  const inside = !relative.startsWith("..") && !path.isAbsolute(relative);
  if (inside && process.env.NODE_ENV === "development") {
    console.warn(
      `[db] DATABASE_PATH liegt im Projektordner (${relative}). Der Dev-Server lädt dann ` +
        "Seiten in einer Schleife neu; bitte einen Pfad außerhalb des Projekts verwenden.",
    );
  }
}

// Survives hot reloads in `next dev`, which would otherwise open a new connection per reload.
const globalForDb = globalThis as unknown as { guildhubDb?: AppDatabase };

export function getDb(): AppDatabase {
  globalForDb.guildhubDb ??= openDatabase(serverEnv().databasePath);
  return globalForDb.guildhubDb;
}
