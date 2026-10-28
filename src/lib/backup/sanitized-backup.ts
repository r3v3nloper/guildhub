import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { recordAudit } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";

/**
 * A full DB copy that is safe to hand out (SPEC 11.4): no sessions, no verification
 * tokens, no OAuth tokens. Restoring it signs everybody out, which is intended.
 */
export async function createSanitizedBackup(
  db: AppDatabase,
  actor: Actor,
): Promise<Buffer> {
  assertAllowed(permissions.downloadBackup(actor));

  const temporary = path.join(
    os.tmpdir(),
    `guildhub-download-${crypto.randomUUID()}.db`,
  );
  try {
    await db.$client.backup(temporary);
    stripSecrets(temporary);
    const content = fs.readFileSync(temporary);
    recordAudit(db, actor.userId, "backup.download", "db", {
      bytes: content.length,
    });
    return content;
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${temporary}${suffix}`, { force: true });
    }
  }
}

function stripSecrets(file: string) {
  const copy = new Database(file);
  try {
    copy.exec(`
      DELETE FROM session;
      DELETE FROM verification_token;
      UPDATE account SET access_token = NULL, refresh_token = NULL, id_token = NULL;
    `);
    // Deleted rows would otherwise still sit in free pages of the file.
    copy.pragma("journal_mode = DELETE");
    copy.exec("VACUUM");
  } finally {
    copy.close();
  }
}
