import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { backupFileName, filesToPrune, runBackup } from "./backup.mjs";

describe("backupFileName", () => {
  it("uses the date in the given time zone", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Berlin.
    const date = new Date("2026-10-31T23:30:00Z");

    expect(backupFileName(date, "Europe/Berlin")).toBe(
      "guildhub-2026-11-01.db",
    );
    expect(backupFileName(date, "UTC")).toBe("guildhub-2026-10-31.db");
  });
});

describe("filesToPrune", () => {
  it("keeps the newest backups and ignores unrelated files", () => {
    const names = [
      "guildhub-2026-10-01.db",
      "guildhub-2026-10-03.db",
      "notes.txt",
      "guildhub-2026-10-02.db",
      "guildhub-2026-10-04.db.tmp",
    ];

    expect(filesToPrune(names, 2)).toEqual(["guildhub-2026-10-01.db"]);
  });
});

describe("runBackup", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "guildhub-backup-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("writes a consistent copy and prunes beyond the limit", async () => {
    const databasePath = path.join(directory, "live.db");
    const live = new Database(databasePath);
    live.pragma("journal_mode = WAL");
    live.exec(
      "CREATE TABLE note (text TEXT); INSERT INTO note VALUES ('hallo');",
    );
    const backupDirectory = path.join(directory, "backups");
    fs.mkdirSync(backupDirectory);
    fs.writeFileSync(path.join(backupDirectory, "guildhub-2026-01-01.db"), "");
    fs.writeFileSync(path.join(backupDirectory, "guildhub-2026-01-02.db"), "");

    const result = await runBackup({
      databasePath,
      backupDirectory,
      timeZone: "Europe/Berlin",
      keep: 2,
      now: new Date("2026-10-28T10:00:00Z"),
    });
    live.close();

    expect(fs.readdirSync(backupDirectory).sort()).toEqual([
      "guildhub-2026-01-02.db",
      "guildhub-2026-10-28.db",
    ]);
    expect(result.pruned).toEqual(["guildhub-2026-01-01.db"]);
    const copy = new Database(result.target, { readonly: true });
    expect(copy.prepare("SELECT text FROM note").get()).toEqual({
      text: "hallo",
    });
    copy.close();
  });

  it("fails with a clear message when the target folder is missing", async () => {
    await expect(
      runBackup({
        databasePath: path.join(directory, "live.db"),
        backupDirectory: path.join(directory, "missing"),
        timeZone: "UTC",
      }),
    ).rejects.toThrow(/nicht beschreibbar/);
  });
});

describe("backupGallery", () => {
  let directory: string;
  const kept = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const deleted = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  // Referenced, but only an interrupted copy made it into the backup folder.
  const interrupted = "16fd2706-8baf-433b-82eb-8c7fada847da";

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "guildhub-gallery-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function liveDatabase(files: string[]): string {
    const databasePath = path.join(directory, "live.db");
    const live = new Database(databasePath);
    live.exec("CREATE TABLE gallery_image (file TEXT)");
    const insert = live.prepare("INSERT INTO gallery_image VALUES (?)");
    for (const file of files) {
      insert.run(file);
    }
    live.close();
    return databasePath;
  }

  it("copies the pictures with the database and keeps what a kept backup refers to", async () => {
    // Arrange
    const galleryPath = path.join(directory, "gallery");
    fs.mkdirSync(galleryPath);
    fs.writeFileSync(path.join(galleryPath, `${kept}.webp`), "bild");
    fs.writeFileSync(path.join(galleryPath, `${kept}.preview.webp`), "klein");
    const backupDirectory = path.join(directory, "backups");
    fs.mkdirSync(path.join(backupDirectory, "gallery"), { recursive: true });
    fs.writeFileSync(
      path.join(backupDirectory, "gallery", `${deleted}.webp`),
      "alt",
    );
    fs.writeFileSync(
      path.join(backupDirectory, "gallery", `${interrupted}.webp.tmp`),
      "halb",
    );

    // Act
    const result = await runBackup({
      databasePath: liveDatabase([kept, interrupted]),
      backupDirectory,
      galleryPath,
      timeZone: "UTC",
      now: new Date("2026-11-06T10:00:00Z"),
    });

    // Assert
    expect(result.gallery).toEqual({ copied: 2, removed: 2 });
    expect(
      fs.readdirSync(path.join(backupDirectory, "gallery")).sort(),
    ).toEqual([`${kept}.preview.webp`, `${kept}.webp`]);
  });

  it("keeps a deleted picture while an older kept backup still shows it", async () => {
    // Arrange
    const backupDirectory = path.join(directory, "backups");
    fs.mkdirSync(path.join(backupDirectory, "gallery"), { recursive: true });
    const older = new Database(
      path.join(backupDirectory, "guildhub-2026-11-01.db"),
    );
    older.exec(
      `CREATE TABLE gallery_image (file TEXT); INSERT INTO gallery_image VALUES ('${deleted}');`,
    );
    older.close();
    fs.writeFileSync(
      path.join(backupDirectory, "gallery", `${deleted}.webp`),
      "alt",
    );

    // Act
    await runBackup({
      databasePath: liveDatabase([]),
      backupDirectory,
      galleryPath: path.join(directory, "missing"),
      timeZone: "UTC",
      now: new Date("2026-11-06T10:00:00Z"),
    });

    // Assert
    expect(fs.readdirSync(path.join(backupDirectory, "gallery"))).toEqual([
      `${deleted}.webp`,
    ]);
  });
});
