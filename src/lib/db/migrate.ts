import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { AppDatabase } from "./client";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function migrateDatabase(
  db: AppDatabase,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): void {
  migrate(db, { migrationsFolder });
}
