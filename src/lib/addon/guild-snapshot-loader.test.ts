import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { guildMembers } from "@/lib/db/schema";
import {
  acceptCraftRequest,
  createCraftRequest,
  finishCraftRequest,
} from "@/lib/guild/craft-requests";
import { saveProfessionDetails } from "@/lib/roster/character-professions";
import { saveCharacter } from "@/lib/roster/characters";
import { addonPack } from "../../../test/fixtures/addon";
import { characterInput } from "../../../test/fixtures/characters";
import { createGuildFixture } from "../../../test/fixtures/guild";
import { decodeAddonString } from "./addon-string";
import { buildGuildSnapshot } from "./guild-snapshot-loader";

describe("buildGuildSnapshot", () => {
  let db: AppDatabase;
  let anna: Actor;
  let ben: Actor;
  let carl: Actor;

  beforeEach(() => {
    ({
      db,
      actors: [anna, ben, carl],
    } = createGuildFixture(addonPack, [
      { discordId: "100000000000000001", role: "owner" },
      { discordId: "100000000000000002" },
      { discordId: "100000000000000003" },
    ]));
  });

  function alchemist(actor: Actor, name: string, recipes: string) {
    const saved = saveCharacter(
      db,
      actor,
      "wow-test",
      characterInput({
        name,
        server: "Die Aldor",
        raceKey: "orc",
        classKey: "shaman",
        professionKeys: ["alchemy"],
      }),
    );
    if (!saved.ok) {
      throw new Error("Testcharakter nicht gespeichert");
    }
    const alchemy = db.query.gameCatalogEntries
      .findFirst({ where: (entry, { eq: is }) => is(entry.key, "alchemy") })
      .sync()!.id;
    saveProfessionDetails(db, actor, saved.characterId, alchemy, {
      skillLevel: 150,
      specialization: "",
      notes: "",
      recipes,
    });
  }

  function request(actor: Actor, item: string, notes = "") {
    createCraftRequest(db, actor, {
      gameId: "wow-test",
      professionKey: "alchemy",
      item,
      quantity: 2,
      notes,
    });
  }

  function payloadFor(actor: Actor): string[] {
    const decoded = decodeAddonString(
      buildGuildSnapshot(db, actor, "wow-test"),
      {
        gameId: "wow-test",
        kind: "guild",
      },
    );
    if (!decoded.ok) {
      throw new Error(decoded.error);
    }
    return decoded.value.payload.split(";");
  }

  it("lists pack recipes as spell IDs and leaves free-text recipes out", () => {
    // Arrange
    alchemist(
      anna,
      "Thrall",
      "Beweglichkeitstrank\nSchwacher Heiltrank\nEigener Trank",
    );

    // Act
    const records = payloadFor(ben);

    // Assert
    expect(records.slice(1)).toEqual([
      "S,2",
      "M",
      "C,Die Aldor,Thrall",
      "K,171,150,2330,2335",
      "M",
      "M",
    ]);
  });

  it("carries open and accepted requests, not finished ones", () => {
    // Arrange
    alchemist(anna, "Thrall", "Schwacher Heiltrank");
    request(ben, "alchemy-2330", "bis Freitag; danke");
    request(ben, "alchemy-2335");
    request(carl, "alchemy-2330");
    acceptCraftRequest(db, anna, 2);
    acceptCraftRequest(db, anna, 3);
    finishCraftRequest(db, anna, 3);

    // Act
    const requests = payloadFor(anna).filter((record) =>
      record.startsWith("R,"),
    );

    // Assert
    expect(requests).toEqual([
      "R,1,open,2,,171,2330,2,Schwacher Heiltrank,bis Freitag%3B danke",
      "R,2,accepted,2,1,171,2335,2,Beweglichkeitstrank,",
    ]);
  });

  it("leaves out former members and their requests", () => {
    // Arrange
    alchemist(carl, "Grom", "Schwacher Heiltrank");
    request(carl, "alchemy-2335");
    db.update(guildMembers)
      .set({ status: "disabled" })
      .where(eq(guildMembers.userId, carl.userId))
      .run();

    // Act
    const records = payloadFor(anna);

    // Assert
    expect(records.filter((record) => record === "M")).toHaveLength(2);
    expect(records.some((record) => record.includes("Grom"))).toBe(false);
    expect(records.some((record) => record.startsWith("R,"))).toBe(false);
  });
});
