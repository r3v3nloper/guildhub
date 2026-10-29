import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getActor } from "@/lib/auth/membership";
import { openDatabase, type AppDatabase } from "@/lib/db/client";
import { addMember, createDiscordUser } from "@/lib/db/test-db";
import { taskDefinitions } from "@/lib/db/schema";
import { buildGameMatrix } from "@/lib/guild/matrix";
import { setGameEnabled } from "@/lib/guild/games-admin";
import { getGuild } from "@/lib/guild/guild";
import { saveCharacter } from "@/lib/roster/characters";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { runStartup } from "@/lib/startup";
import { buildDashboard } from "@/lib/tasks/dashboard";
import { adjustCounter, setTaskDone } from "@/lib/tasks/progress";
import { characterInput } from "../../../test/fixtures/characters";
import { packsDirectory } from "./loader";

const FIXTURE_PACKS = path.resolve("test/fixtures/packs");
const OWNER = "100000000000000001";
const PLAYER = "100000000000000002";

/**
 * Acceptance test for extensibility (SPEC 6.4, Phase 4): a singleplayer game that exists
 * only as a pack – no line of code knows "beispiel-rpg" – can be enabled, gets
 * playthroughs and tracks progress, going through the same startup path as production.
 */
describe("a new game from a pack alone", () => {
  let db: AppDatabase;
  const previousPacksDir = process.env.PACKS_DIR;
  const env = {
    databasePath: ":memory:",
    ownerDiscordId: OWNER,
    allowedDiscordIds: [],
    guildName: "Testgilde",
    defaultTimezone: "Europe/Berlin",
  };

  beforeEach(() => {
    process.env.PACKS_DIR = FIXTURE_PACKS;
    db = openDatabase(":memory:");
    runStartup(db, env, packsDirectory());
  });

  afterEach(() => {
    if (previousPacksDir === undefined) {
      delete process.env.PACKS_DIR;
    } else {
      process.env.PACKS_DIR = previousPacksDir;
    }
  });

  function signIn(discordId: string, name: string) {
    const userId = createDiscordUser(db, discordId, name);
    // The owner comes from the environment on the next start, like in production.
    if (discordId === OWNER) {
      runStartup(db, env, packsDirectory());
    } else {
      addMember(db, getGuild(db).id, userId);
    }
    return getActor(db, getGuild(db).id, userId)!;
  }

  it("keeps the fixture copy identical to the shipped example", () => {
    // Arrange
    const example = path.resolve("packs/_examples/beispiel-rpg/pack.json");
    const fixture = path.join(FIXTURE_PACKS, "beispiel-rpg/pack.json");

    // Act & Assert
    expect(JSON.parse(fs.readFileSync(fixture, "utf8"))).toEqual(
      JSON.parse(fs.readFileSync(example, "utf8")),
    );
  });

  it("can be enabled, played and tracked without code changes", () => {
    // Arrange: the pack is synced, but new games start disabled (SPEC 6.1).
    const owner = signIn(OWNER, "Owner");
    const player = signIn(PLAYER, "Spieler");
    expect(listEnabledGames(db, owner.guildId)).toEqual([]);

    // Act: enable, create a playthrough, make progress.
    setGameEnabled(db, owner, "beispiel-rpg", true);
    const saved = saveCharacter(
      db,
      player,
      "beispiel-rpg",
      characterInput({
        name: "Erster Durchlauf",
        classKey: "krieger",
        isMain: true,
      }),
    );
    const characterId = saved.ok ? saved.characterId : -1;
    const taskId = (key: string) =>
      db
        .select()
        .from(taskDefinitions)
        .where(eq(taskDefinitions.key, key))
        .get()!.id;
    const now = DateTime.fromISO("2026-10-27T12:00:00", {
      zone: "Europe/Berlin",
    });
    setTaskDone(db, player, { taskId: taskId("act1"), characterId }, true, now);
    for (let boss = 0; boss < 7; boss++) {
      adjustCounter(
        db,
        player,
        { taskId: taskId("optional-bosses"), characterId },
        1,
        now,
      );
    }

    // Assert: the game is listed with its own wording ...
    const [game] = listEnabledGames(db, owner.guildId);
    expect(game).toMatchObject({
      id: "beispiel-rpg",
      meta: {
        type: "singleplayer",
        characterLabel: { de: "Durchlauf", en: "Playthrough" },
      },
    });

    // ... progress never resets, even weeks later ...
    const later = now.plus({ weeks: 3 });
    const items = buildDashboard(
      db,
      player.guildId,
      player.userId,
      [{ id: game.id, name: game.name, serverLabel: game.meta.serverLabel }],
      later,
    ).games[0].servers[0].characters[0].items;
    expect(
      items.map(({ title, status, value, nextReset }) => ({
        title,
        status,
        value,
        nextReset,
      })),
    ).toEqual([
      {
        title: "Akt 1 abgeschlossen",
        status: "done",
        value: 0,
        nextReset: null,
      },
      { title: "Optionale Bosse", status: "open", value: 7, nextReset: null },
    ]);

    // ... and the guild view shows how far everyone is.
    const matrix = buildGameMatrix(
      db,
      owner.guildId,
      "beispiel-rpg",
      "character",
      undefined,
      later,
    );
    expect(matrix.columns.map((column) => column.label)).toEqual([
      "Erster Durchlauf",
    ]);
    expect(matrix.rows.map((row) => [row.title, row.cells[0].text])).toEqual([
      ["Akt 1 abgeschlossen", "✓"],
      ["Optionale Bosse", "7/12"],
    ]);
  });
});
