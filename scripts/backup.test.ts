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
