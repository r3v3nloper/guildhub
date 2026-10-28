// Daily server backup (SPEC 11.4). Runs inside the container via host cron:
//   docker compose exec -T guildhub node scripts/backup.mjs
// Plain JavaScript on purpose: the runtime image has no TypeScript tooling.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";

const BACKUP_NAME = /^guildhub-(\d{4}-\d{2}-\d{2})\.db$/;
const DEFAULT_KEEP = 14;

/** `guildhub-YYYY-MM-DD.db`, dated in the guild's time zone so "today" matches the guild's day. */
export function backupFileName(date, timeZone) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return `guildhub-${day}.db`;
}

/** Backups beyond the newest `keep`; files that do not look like backups are left alone. */
export function filesToPrune(fileNames, keep) {
  return fileNames
    .filter((name) => BACKUP_NAME.test(name))
    .sort()
    .reverse()
    .slice(keep);
}

export function assertWritable(directory) {
  try {
    fs.accessSync(directory, fs.constants.W_OK);
  } catch {
    throw new Error(
      `Backup-Ordner ${directory} ist nicht beschreibbar. Auf dem Host: ` +
        "mkdir -p backups && sudo chown 1000:1000 backups",
    );
  }
}

/**
 * Online backup via SQLite's backup API, which is consistent while the app keeps writing.
 * Written to a temporary name first, so an interrupted run never leaves a broken backup.
 */
export async function runBackup({
  databasePath,
  backupDirectory,
  timeZone,
  keep = DEFAULT_KEEP,
  now = new Date(),
}) {
  assertWritable(backupDirectory);

  const target = path.join(backupDirectory, backupFileName(now, timeZone));
  const temporary = `${target}.tmp`;
  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    await db.backup(temporary);
  } finally {
    db.close();
  }
  fs.renameSync(temporary, target);

  const pruned = filesToPrune(fs.readdirSync(backupDirectory), keep);
  for (const name of pruned) {
    fs.rmSync(path.join(backupDirectory, name));
  }
  return { target, pruned };
}

async function main() {
  const { target, pruned } = await runBackup({
    databasePath: process.env.DATABASE_PATH ?? "/data/guildhub.db",
    backupDirectory: process.env.BACKUP_DIR ?? "/backups",
    timeZone: process.env.DEFAULT_TIMEZONE ?? "Europe/Berlin",
  });
  console.log(`Backup geschrieben: ${target}`);
  if (pruned.length > 0) {
    console.log(`Alte Backups entfernt: ${pruned.join(", ")}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
