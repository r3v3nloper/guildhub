import { sql } from "drizzle-orm";
import type { AppDatabase } from "./client";

export type DatabaseHealth = { ok: true } | { ok: false; error: string };

export function checkDatabase(db: AppDatabase): DatabaseHealth {
  try {
    db.get(sql`select 1`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
