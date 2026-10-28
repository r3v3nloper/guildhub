import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, type Actor } from "@/lib/auth/guards";
import { openDatabase, type AppDatabase } from "@/lib/db/client";
import { migrateDatabase } from "@/lib/db/migrate";
import { accounts, auditLogs, sessions, users } from "@/lib/db/schema";
import { createSanitizedBackup } from "./sanitized-backup";

describe("createSanitizedBackup", () => {
  let directory: string;
  let db: AppDatabase;
  let owner: Actor;

  beforeEach(() => {
    // A file-based DB: the backup API copies pages, which needs a real database file.
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "guildhub-sanitize-"));
    db = openDatabase(path.join(directory, "live.db"));
    migrateDatabase(db);
    const user = db.insert(users).values({ name: "Anna" }).returning().get();
    db.insert(accounts)
      .values({
        userId: user.id,
        type: "oauth",
        provider: "discord",
        providerAccountId: "100000000000000001",
        access_token: "leaked-if-copied",
      })
      .run();
    db.insert(sessions)
      .values({
        sessionToken: "secret-session",
        userId: user.id,
        expires: new Date(Date.now() + 1e6),
      })
      .run();
    owner = { userId: user.id, guildId: 1, role: "owner", status: "active" };
  });

  afterEach(() => {
    db.$client.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function openCopy(content: Buffer) {
    const file = path.join(directory, "copy.db");
    fs.writeFileSync(file, content);
    return new Database(file, { readonly: true });
  }

  it("keeps the data but drops sessions and tokens", async () => {
    const copy = openCopy(await createSanitizedBackup(db, owner));

    expect(copy.prepare("SELECT name FROM user").all()).toEqual([
      { name: "Anna" },
    ]);
    expect(copy.prepare("SELECT count(*) AS c FROM session").get()).toEqual({
      c: 0,
    });
    expect(copy.prepare("SELECT access_token FROM account").get()).toEqual({
      access_token: null,
    });
    copy.close();
  });

  it("leaves the live database untouched and records the download", async () => {
    await createSanitizedBackup(db, owner);

    expect(db.select().from(sessions).all()).toHaveLength(1);
    expect(db.select().from(auditLogs).get()?.action).toBe("backup.download");
  });

  it("is only for owners", async () => {
    await expect(
      createSanitizedBackup(db, { ...owner, role: "officer" }),
    ).rejects.toThrow(ForbiddenError);
  });
});
