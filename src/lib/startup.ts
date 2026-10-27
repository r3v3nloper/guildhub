import { seedAllowlistFromEnv } from "@/lib/auth/allowlist";
import { ensureOwnerFromEnv } from "@/lib/auth/membership";
import type { AppDatabase } from "@/lib/db/client";
import { migrateDatabase } from "@/lib/db/migrate";
import type { ServerEnv } from "@/lib/env";
import { ensureGuild } from "@/lib/guild/guild";
import { loadPacks } from "@/lib/packs/loader";
import { syncPacks, type PackSyncResult } from "@/lib/packs/sync";

/**
 * Everything that has to happen before the first request (SPEC 11.1). A failing pack is
 * logged and skipped; it never stops the server from starting (SPEC 6.5).
 */
export function runStartup(
  db: AppDatabase,
  env: ServerEnv,
  packsDirectory: string,
): PackSyncResult[] {
  migrateDatabase(db);
  const guild = ensureGuild(db, env);
  seedAllowlistFromEnv(db, env);
  ensureOwnerFromEnv(db, guild.id, env);

  const results = syncPacks(
    db,
    loadPacks(packsDirectory, { includeHidden: false }),
  );
  for (const result of results) {
    if (result.status === "error") {
      console.error(`[packs] ${result.gameId}: übersprungen\n${result.error}`);
    } else {
      console.info(`[packs] ${result.gameId}: ${result.status}`);
    }
  }
  return results;
}
