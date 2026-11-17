// Daily server backup (SPEC 11.4). Runs inside the container via host cron:
//   docker compose exec -T guildhub node scripts/backup.mjs
// Plain JavaScript on purpose: the runtime image has no TypeScript tooling.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";

const BACKUP_NAME = /^guildhub-(\d{4}-\d{2}-\d{2})\.db$/;
const DEFAULT_KEEP = 14;
/** Gallery pictures (SPEC 7.6) live in one folder shared by all database backups. */
const GALLERY_FOLDER = "gallery";

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
 *
 * @param {object} options
 * @param {string} options.databasePath
 * @param {string} options.backupDirectory
 * @param {string} options.timeZone
 * @param {string} [options.galleryPath] Folder of the gallery pictures; without it none are copied.
 * @param {number} [options.keep]
 * @param {Date} [options.now]
 */
export async function runBackup({
  databasePath,
  backupDirectory,
  timeZone,
  galleryPath,
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
  const gallery = galleryPath
    ? backupGallery(galleryPath, backupDirectory)
    : { copied: 0, removed: 0 };
  return { target, pruned, gallery };
}

/**
 * Copies new gallery pictures next to the database backups, after the database itself,
 * so every picture the fresh backup knows is already there. Pictures never change under
 * their name, so existing copies are skipped. Copies no kept backup refers to any more
 * are removed; restoring any kept backup together with this folder is complete.
 */
export function backupGallery(galleryPath, backupDirectory) {
  const target = path.join(backupDirectory, GALLERY_FOLDER);
  fs.mkdirSync(target, { recursive: true });
  let copied = 0;
  const sources = fs.existsSync(galleryPath) ? fs.readdirSync(galleryPath) : [];
  for (const name of sources) {
    const copy = path.join(target, name);
    if (!fs.existsSync(copy)) {
      fs.copyFileSync(path.join(galleryPath, name), `${copy}.tmp`);
      fs.renameSync(`${copy}.tmp`, copy);
      copied += 1;
    }
  }

  const backups = fs
    .readdirSync(backupDirectory)
    .filter((name) => BACKUP_NAME.test(name))
    .map((name) => path.join(backupDirectory, name));
  const referenced = galleryFilesOf(backups);
  let removed = 0;
  for (const name of fs.readdirSync(target)) {
    // Leftovers of an interrupted copy go too; the next run copies them again.
    if (name.endsWith(".tmp") || !referenced.has(name.split(".")[0])) {
      fs.rmSync(path.join(target, name));
      removed += 1;
    }
  }
  return { copied, removed };
}

/** Picture names the given database backups refer to; backups before the gallery have none. */
export function galleryFilesOf(databasePaths) {
  const files = new Set();
  for (const databasePath of databasePaths) {
    const db = new Database(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      const hasGallery = db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'gallery_image'",
        )
        .get();
      if (hasGallery) {
        for (const row of db.prepare("SELECT file FROM gallery_image").all()) {
          files.add(row.file);
        }
      }
    } finally {
      db.close();
    }
  }
  return files;
}

async function main() {
  const databasePath = process.env.DATABASE_PATH ?? "/data/guildhub.db";
  const { target, pruned, gallery } = await runBackup({
    databasePath,
    galleryPath:
      process.env.GALLERY_PATH ||
      path.join(path.dirname(databasePath), GALLERY_FOLDER),
    backupDirectory: process.env.BACKUP_DIR ?? "/backups",
    timeZone: process.env.DEFAULT_TIMEZONE ?? "Europe/Berlin",
  });
  console.log(`Backup geschrieben: ${target}`);
  if (pruned.length > 0) {
    console.log(`Alte Backups entfernt: ${pruned.join(", ")}`);
  }
  console.log(
    `Galerie: ${gallery.copied} Dateien neu gesichert, ${gallery.removed} nicht mehr benötigte entfernt`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
