import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./client";
import { checkDatabase } from "./health";
import { migrateDatabase } from "./migrate";

function tableNames(db: ReturnType<typeof openDatabase>): string[] {
  return db
    .all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' order by name`,
    )
    .map((row) => row.name);
}

describe("migrateDatabase", () => {
  it("creates the Auth.js tables in an empty database", () => {
    const db = openDatabase(":memory:");

    migrateDatabase(db);

    expect(tableNames(db)).toEqual(
      expect.arrayContaining([
        "account",
        "session",
        "user",
        "verification_token",
      ]),
    );
  });

  it("is idempotent, so every container start can run it", () => {
    const db = openDatabase(":memory:");
    migrateDatabase(db);

    expect(() => migrateDatabase(db)).not.toThrow();
  });
});

describe("openDatabase", () => {
  it("enables foreign keys", () => {
    const db = openDatabase(":memory:");

    expect(db.$client.pragma("foreign_keys", { simple: true })).toBe(1);
  });
});

describe("checkDatabase", () => {
  it("reports ok for an open database", () => {
    expect(checkDatabase(openDatabase(":memory:"))).toEqual({ ok: true });
  });

  it("reports the error for a closed database", () => {
    const db = openDatabase(":memory:");
    db.$client.close();

    const result = checkDatabase(db);

    expect(result.ok).toBe(false);
  });
});
