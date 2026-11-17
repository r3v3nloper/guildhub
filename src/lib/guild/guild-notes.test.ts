import { beforeEach, describe, expect, it } from "vitest";
import { listAudit } from "@/lib/audit/audit";
import { ForbiddenError } from "@/lib/errors";
import {
  createTaskFixture,
  type TaskFixture,
} from "../../../test/fixtures/tasks";
import {
  createGuildNote,
  deleteGuildNote,
  getGuildNote,
  listGuildNotes,
  setGuildNotePinned,
  updateGuildNote,
  type GuildNoteInput,
} from "./guild-notes";

const rules: GuildNoteInput = {
  title: " Gildenregeln ",
  body: "Kein Ninja-Looten.  \r\n\r\nPünktlich zum Raid.\n",
  gameId: "",
  pinned: true,
};

function created(fixture: TaskFixture, input: GuildNoteInput): number {
  const result = createGuildNote(fixture.db, fixture.officer, input);
  if (!result.ok) {
    throw new Error(JSON.stringify(result.errors));
  }
  return result.id;
}

describe("guild notes", () => {
  let fixture: TaskFixture;

  beforeEach(() => {
    fixture = createTaskFixture();
  });

  it("lets officers write a note with tidied text", () => {
    // Act
    const result = createGuildNote(fixture.db, fixture.officer, rules);

    // Assert
    expect(result).toEqual({ ok: true, id: expect.any(Number) });
    expect(listGuildNotes(fixture.db, ["game"])).toEqual([
      expect.objectContaining({
        title: "Gildenregeln",
        body: "Kein Ninja-Looten.\n\nPünktlich zum Raid.",
        gameId: null,
        pinned: true,
        updatedByName: "Mara",
      }),
    ]);
    expect(listAudit(fixture.db)).toEqual([
      expect.objectContaining({
        action: "guildNote.create",
        target: "Gildenregeln",
      }),
    ]);
  });

  it("keeps members from writing, pinning and deleting", () => {
    // Arrange
    const noteId = created(fixture, rules);

    // Act & Assert
    expect(() => createGuildNote(fixture.db, fixture.actor, rules)).toThrow(
      ForbiddenError,
    );
    expect(() =>
      setGuildNotePinned(fixture.db, fixture.actor, noteId, false),
    ).toThrow(ForbiddenError);
    expect(() => deleteGuildNote(fixture.db, fixture.actor, noteId)).toThrow(
      ForbiddenError,
    );
    expect(() => getGuildNote(fixture.db, fixture.actor, noteId)).toThrow(
      ForbiddenError,
    );
  });

  it("reports missing and too long fields and games that are not enabled", () => {
    // Act
    const result = createGuildNote(fixture.db, fixture.officer, {
      title: "x".repeat(81),
      body: "  \n ",
      gameId: "unknown",
      pinned: false,
    });

    // Assert
    expect(result).toEqual({
      ok: false,
      errors: {
        title: "Höchstens 80 Zeichen.",
        body: "Bitte einen Text eingeben.",
        gameId: "Dieses Spiel ist nicht aktiviert.",
      },
    });
    expect(listGuildNotes(fixture.db, ["game"])).toEqual([]);
  });

  it("shows game notes only while their game is shown", () => {
    // Arrange
    created(fixture, { ...rules, title: "Allgemein" });
    created(fixture, { ...rules, title: "Raid", gameId: "game" });

    // Act
    const withGame = listGuildNotes(fixture.db, ["game"]);
    const withoutGame = listGuildNotes(fixture.db, []);

    // Assert
    expect(withGame.map((note) => note.title).sort()).toEqual([
      "Allgemein",
      "Raid",
    ]);
    expect(withoutGame.map((note) => note.title)).toEqual(["Allgemein"]);
  });

  it("lists pinned notes first and only pinned ones for the overview", () => {
    // Arrange
    const loose = created(fixture, { ...rules, title: "Lose", pinned: false });
    created(fixture, { ...rules, title: "Angepinnt" });

    // Act
    const all = listGuildNotes(fixture.db, ["game"]);
    const pinned = listGuildNotes(fixture.db, ["game"], { pinnedOnly: true });

    // Assert
    expect(all.map((note) => note.title)).toEqual(["Angepinnt", "Lose"]);
    expect(pinned.map((note) => note.id)).not.toContain(loose);
    expect(pinned.map((note) => note.title)).toEqual(["Angepinnt"]);
  });

  it("pins and unpins without touching the edit stamp", () => {
    // Arrange
    const noteId = created(fixture, { ...rules, pinned: false });
    const before = getGuildNote(fixture.db, fixture.officer, noteId);

    // Act
    setGuildNotePinned(fixture.db, fixture.officer, noteId, true);
    setGuildNotePinned(fixture.db, fixture.officer, noteId, true);

    // Assert
    const after = getGuildNote(fixture.db, fixture.officer, noteId);
    expect(after.pinned).toBe(true);
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(
      listAudit(fixture.db).filter((entry) => entry.action === "guildNote.pin"),
    ).toHaveLength(1);
  });

  it("updates and deletes notes", () => {
    // Arrange
    const noteId = created(fixture, rules);

    // Act
    const result = updateGuildNote(fixture.db, fixture.officer, noteId, {
      ...rules,
      title: "Neue Regeln",
      pinned: false,
    });

    // Assert
    expect(result).toEqual({ ok: true, id: noteId });
    expect(listGuildNotes(fixture.db, ["game"])).toEqual([
      expect.objectContaining({ title: "Neue Regeln", pinned: false }),
    ]);

    // Act
    deleteGuildNote(fixture.db, fixture.officer, noteId);

    // Assert
    expect(listGuildNotes(fixture.db, ["game"])).toEqual([]);
  });
});
