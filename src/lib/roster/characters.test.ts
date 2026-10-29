import path from "node:path";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { seedAllowlistFromEnv } from "@/lib/auth/allowlist";
import { ForbiddenError, type Actor } from "@/lib/auth/guards";
import { ensureMembershipOnSignIn, getActor } from "@/lib/auth/membership";
import type { AppDatabase } from "@/lib/db/client";
import { guildGames } from "@/lib/db/schema";
import { createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { DomainError, NotFoundError } from "@/lib/errors";
import { ensureGuild } from "@/lib/guild/guild";
import { loadPacks } from "@/lib/packs/loader";
import { syncPacks } from "@/lib/packs/sync";
import { characterInput } from "../../../test/fixtures/characters";
import { deleteBuild, saveBuild } from "./builds";
import {
  saveProfessionDetails,
  setProfessionSkill,
} from "./character-professions";
import { getCharacter, saveCharacter, setCharacterLevel } from "./characters";
import { filterRoster, loadRosterMembers, OUTDATED_FILTER_KEY } from "./roster";

const OWNER = "100000000000000001";

const input = characterInput;

describe("characters and roster with the shipped packs", () => {
  let db: AppDatabase;
  let guildId: number;

  beforeEach(() => {
    db = createTestDb();
    guildId = ensureGuild(db, {
      guildName: "Gilde",
      defaultTimezone: "Europe/Berlin",
    }).id;
    syncPacks(db, loadPacks(path.resolve("packs"), { includeHidden: false }));
    db.update(guildGames).set({ enabled: true }).run();
  });

  function member(discordId: string, name: string): Actor {
    const userId = createDiscordUser(db, discordId, name);
    ensureMembershipOnSignIn(db, guildId, userId, discordId, {
      ownerDiscordId: OWNER,
    });
    return getActor(db, guildId, userId)!;
  }

  /** Members other than the owner need an allowlist entry to become members. */
  function memberAllowed(discordId: string, name: string): Actor {
    seedAllowlistFromEnv(db, {
      ownerDiscordId: undefined,
      allowedDiscordIds: [discordId],
    });
    return member(discordId, name);
  }

  it("two members create characters in both games and see each other in the roster", () => {
    const anna = member(OWNER, "Anna");
    const ben = memberAllowed("100000000000000002", "Ben");

    expect(
      saveCharacter(
        db,
        anna,
        "wow-forever",
        input({ name: "Jaina", raceKey: "human", classKey: "mage" }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      saveCharacter(
        db,
        anna,
        "aion2",
        input({ name: "Lyra", factionKey: "elyos", classKey: "cleric" }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      saveCharacter(
        db,
        ben,
        "wow-forever",
        input({
          name: "Thrall",
          raceKey: "orc",
          classKey: "shaman",
          specKey: "shaman-wiederherstellung",
        }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      saveCharacter(
        db,
        ben,
        "aion2",
        input({ name: "Kael", factionKey: "asmodian", classKey: "templar" }),
      ),
    ).toMatchObject({ ok: true });

    const roster = filterRoster(loadRosterMembers(db, guildId), {});

    expect(
      roster.members.map((m) => [
        m.name,
        m.characters.map((c) => c.name).sort(),
      ]),
    ).toEqual([
      ["Anna", ["Jaina", "Lyra"]],
      ["Ben", ["Kael", "Thrall"]],
    ]);
    const thrall = roster.members[1].characters.find(
      (c) => c.name === "Thrall",
    )!;
    expect(thrall.faction?.key).toBe("horde");
    expect(roster.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "heal", count: 2 }),
        expect.objectContaining({ key: "unknown", count: 1 }),
      ]),
    );
  });

  it("filters the roster by game, role and class", () => {
    const anna = member(OWNER, "Anna");
    saveCharacter(
      db,
      anna,
      "wow-forever",
      input({ name: "Jaina", raceKey: "human", classKey: "mage" }),
    );
    saveCharacter(
      db,
      anna,
      "wow-forever",
      input({
        name: "Uther",
        raceKey: "human",
        classKey: "paladin",
        specKey: "paladin-heilig",
        offSpecKey: "paladin-schutz",
      }),
    );
    saveCharacter(
      db,
      anna,
      "aion2",
      input({ name: "Lyra", factionKey: "elyos", classKey: "cleric" }),
    );
    const all = loadRosterMembers(db, guildId);

    const healers = filterRoster(all, { gameId: "wow-forever", role: "heal" });
    const mages = filterRoster(all, { classKey: "mage" });

    expect(healers.members[0].characters.map((c) => c.name)).toEqual(["Uther"]);
    expect(mages.members[0].characters.map((c) => c.name)).toEqual(["Jaina"]);
    expect(mages.members[0].characters[0].role).toBe("unknown");
    expect(healers.members[0].characters[0].offSpec?.key).toBe(
      "paladin-schutz",
    );
    expect(
      filterRoster(all, { classKey: OUTDATED_FILTER_KEY }).members,
    ).toEqual([]);
  });

  it("does not let anyone edit another member's character, not even the owner", () => {
    const anna = member(OWNER, "Anna");
    const ben = memberAllowed("100000000000000002", "Ben");
    const saved = saveCharacter(
      db,
      ben,
      "aion2",
      input({ name: "Kael", factionKey: "asmodian", classKey: "templar" }),
    );
    const characterId = saved.ok ? saved.characterId : -1;

    expect(() =>
      saveCharacter(
        db,
        anna,
        "aion2",
        input({ name: "Hacked", factionKey: "asmodian", classKey: "templar" }),
        characterId,
      ),
    ).toThrow(ForbiddenError);
  });

  it("refuses characters in games the guild has not enabled", () => {
    const anna = member(OWNER, "Anna");
    db.update(guildGames)
      .set({ enabled: false })
      .where(
        and(eq(guildGames.guildId, guildId), eq(guildGames.gameId, "aion2")),
      )
      .run();

    expect(() =>
      saveCharacter(
        db,
        anna,
        "aion2",
        input({ factionKey: "elyos", classKey: "cleric" }),
      ),
    ).toThrow(NotFoundError);
  });

  it("keeps one main per user and game", () => {
    const anna = member(OWNER, "Anna");
    const first = saveCharacter(
      db,
      anna,
      "aion2",
      input({
        name: "A",
        factionKey: "elyos",
        classKey: "cleric",
        isMain: true,
      }),
    );
    const second = saveCharacter(
      db,
      anna,
      "aion2",
      input({
        name: "B",
        factionKey: "elyos",
        classKey: "chanter",
        isMain: true,
      }),
    );

    expect(first.ok && getCharacter(db, first.characterId)?.isMain).toBe(false);
    expect(second.ok && getCharacter(db, second.characterId)?.isMain).toBe(
      true,
    );
  });

  it("shows a free-text server in the spelling of its first entry", () => {
    const anna = member(OWNER, "Anna");
    const ben = memberAllowed("100000000000000002", "Ben");
    saveCharacter(
      db,
      anna,
      "aion2",
      input({
        name: "A",
        factionKey: "elyos",
        classKey: "cleric",
        server: "Ariel",
      }),
    );
    const saved = saveCharacter(
      db,
      ben,
      "aion2",
      input({
        name: "B",
        factionKey: "elyos",
        classKey: "cleric",
        server: " ariel ",
      }),
    );

    const character = saved.ok
      ? getCharacter(db, saved.characterId)
      : undefined;
    expect(character).toMatchObject({
      serverKey: "ariel",
      serverName: "Ariel",
    });
  });

  it("stores build links with the source detected from the domain", () => {
    const anna = member(OWNER, "Anna");
    const saved = saveCharacter(
      db,
      anna,
      "aion2",
      input({ factionKey: "elyos", classKey: "cleric" }),
    );
    const characterId = saved.ok ? saved.characterId : -1;

    expect(
      saveBuild(db, anna, characterId, {
        title: "",
        url: "https://metabot.gg/aion2/cleric",
        status: "current",
        targetClassKey: "",
        notes: "",
      }),
    ).toEqual({ ok: true });
    saveBuild(db, anna, characterId, {
      title: "Umstieg",
      url: "",
      status: "planned",
      targetClassKey: "chanter",
      notes: "",
    });

    const roster = filterRoster(loadRosterMembers(db, guildId), {});
    const character = roster.members[0].characters[0];
    expect(character.currentBuild).toMatchObject({
      title: "MetaBot",
      source: "MetaBot",
    });
    expect(character.plannedClass?.key).toBe("chanter");

    const buildId = getCharacter(db, characterId)!.builds[0].id;
    deleteBuild(db, anna, characterId, buildId);
    expect(getCharacter(db, characterId)!.builds).toHaveLength(1);
  });

  it("rejects build links that are not http(s)", () => {
    const anna = member(OWNER, "Anna");
    const saved = saveCharacter(
      db,
      anna,
      "aion2",
      input({ factionKey: "elyos", classKey: "cleric" }),
    );

    const result = saveBuild(db, anna, saved.ok ? saved.characterId : -1, {
      title: "x",
      url: "javascript:alert(1)",
      status: "current",
      targetClassKey: "",
      notes: "",
    });

    expect(result).toMatchObject({
      ok: false,
      errors: { url: expect.any(String) },
    });
  });
  it("updates an existing build instead of adding a new one", () => {
    const anna = member(OWNER, "Anna");
    const saved = saveCharacter(
      db,
      anna,
      "aion2",
      input({ factionKey: "elyos", classKey: "cleric" }),
    );
    const characterId = saved.ok ? saved.characterId : -1;
    const build = {
      title: "Heiler",
      url: "",
      status: "current" as const,
      targetClassKey: "",
      notes: "",
    };
    saveBuild(db, anna, characterId, build);
    const buildId = getCharacter(db, characterId)!.builds[0].id;

    saveBuild(
      db,
      anna,
      characterId,
      { ...build, title: "PvP-Heiler", url: "https://metabot.gg/x" },
      buildId,
    );

    expect(getCharacter(db, characterId)!.builds).toEqual([
      expect.objectContaining({
        id: buildId,
        title: "PvP-Heiler",
        source: "MetaBot",
      }),
    ]);
  });

  it("stores profession details and shows them in the roster", () => {
    const anna = member(OWNER, "Anna");
    const saved = saveCharacter(
      db,
      anna,
      "wow-forever",
      input({
        raceKey: "human",
        classKey: "mage",
        professionKeys: ["tailoring"],
      }),
    );
    const character = getCharacter(db, saved.ok ? saved.characterId : -1)!;
    const tailoring = character.professionEntryIds[0];

    const result = saveProfessionDetails(db, anna, character.id, tailoring, {
      skillLevel: 300,
      specialization: " Mondstoff ",
      notes: "",
      recipes: "Runenstoffbeutel\nMondstoff – nur alle 4 Tage",
    });

    expect(result).toEqual({ ok: true });
    expect(getCharacter(db, character.id)!.professions[0].recipes).toBe(
      "Runenstoffbeutel\nMondstoff – nur alle 4 Tage",
    );
    const roster = filterRoster(loadRosterMembers(db, guildId), {});
    expect(roster.members[0].characters[0].professions).toEqual([
      expect.objectContaining({
        key: "tailoring",
        skillLevel: 300,
        specialization: "Mondstoff",
      }),
    ]);
  });

  it("validates profession details and only for held professions", () => {
    const anna = member(OWNER, "Anna");
    const saved = saveCharacter(
      db,
      anna,
      "wow-forever",
      input({
        raceKey: "human",
        classKey: "mage",
        professionKeys: ["tailoring"],
      }),
    );
    const character = getCharacter(db, saved.ok ? saved.characterId : -1)!;
    const details = {
      skillLevel: -1,
      specialization: "",
      notes: "",
      recipes: "",
    };

    expect(
      saveProfessionDetails(
        db,
        anna,
        character.id,
        character.professionEntryIds[0],
        details,
      ),
    ).toMatchObject({ ok: false, errors: { skillLevel: expect.any(String) } });
    expect(() =>
      saveProfessionDetails(db, anna, character.id, 999999, {
        ...details,
        skillLevel: 1,
      }),
    ).toThrow(NotFoundError);
  });

  describe("quick changes from the overview", () => {
    function tailor(actor: Actor) {
      const saved = saveCharacter(
        db,
        actor,
        "wow-forever",
        input({
          raceKey: "human",
          classKey: "mage",
          level: 10,
          professionKeys: ["tailoring"],
        }),
      );
      return getCharacter(db, saved.ok ? saved.characterId : -1)!;
    }

    it("sets level and profession skill without touching anything else", () => {
      // Arrange
      const anna = member(OWNER, "Anna");
      const character = tailor(anna);
      const tailoring = character.professionEntryIds[0];

      // Act
      setCharacterLevel(db, anna, character.id, 11);
      setProfessionSkill(db, anna, character.id, tailoring, 75);

      // Assert
      const updated = getCharacter(db, character.id)!;
      expect(updated).toMatchObject({ level: 11, name: character.name });
      expect(updated.professions[0].skillLevel).toBe(75);
    });

    it("rejects values outside the editor's bounds", () => {
      // Arrange
      const anna = member(OWNER, "Anna");
      const character = tailor(anna);
      const tailoring = character.professionEntryIds[0];

      // Act & Assert
      expect(() => setCharacterLevel(db, anna, character.id, 0)).toThrow(
        DomainError,
      );
      expect(() =>
        setProfessionSkill(db, anna, character.id, tailoring, -1),
      ).toThrow(DomainError);
      expect(getCharacter(db, character.id)!.level).toBe(10);
    });

    it("only changes the member's own characters and held professions", () => {
      // Arrange
      const anna = member(OWNER, "Anna");
      const ben = memberAllowed("100000000000000002", "Ben");
      const character = tailor(anna);

      // Act & Assert
      expect(() => setCharacterLevel(db, ben, character.id, 12)).toThrow(
        ForbiddenError,
      );
      expect(() =>
        setProfessionSkill(db, anna, character.id, 999999, 10),
      ).toThrow(NotFoundError);
    });
  });
});
