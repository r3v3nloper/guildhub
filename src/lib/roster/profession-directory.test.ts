import { beforeEach, describe, expect, it } from "vitest";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import { saveProfessionDetails } from "./character-professions";
import { getCharacter, saveCharacter } from "./characters";
import { characterInput } from "../../../test/fixtures/characters";
import {
  listProfessions,
  loadProfessionDirectory,
} from "./profession-directory";

const input = characterInput({ name: "Gimli", professionKeys: ["mining"] });

describe("loadProfessionDirectory", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = createListFixture();
    const saved = saveCharacter(fixture.db, fixture.member, "game", input);
    const character = getCharacter(
      fixture.db,
      saved.ok ? saved.characterId : -1,
    )!;
    saveProfessionDetails(
      fixture.db,
      fixture.member,
      character.id,
      character.professionEntryIds[0],
      {
        skillLevel: 250,
        specialization: "",
        notes: "",
        recipes: "smelt thorium\nArkanitbarren – nur mit eigenem Kristall",
      },
    );
  });

  const search = (query?: string, professionKey?: string) =>
    loadProfessionDirectory(fixture.db, fixture.member.guildId, ["game"], {
      query,
      professionKey,
    });

  it("lists who has a profession, with skill and recipes", () => {
    // Act
    const directory = search();

    // Assert
    expect(directory).toEqual([
      expect.objectContaining({
        key: "mining",
        crafters: [
          expect.objectContaining({
            characterName: "Gimli",
            skillLevel: 250,
            recipes: [
              expect.objectContaining({
                name: "Arkanitbarren",
                notes: "nur mit eigenem Kristall",
                skill: null,
              }),
              expect.objectContaining({
                name: "Thoriumbarren",
                notes: null,
                skill: 250,
                reagents: "1× Thoriumerz",
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("finds crafters by recipe and narrows the recipes to the hits", () => {
    // Act
    const directory = search("arkanit");

    // Assert
    expect(directory[0].crafters[0].recipes.map((r) => r.name)).toEqual([
      "Arkanitbarren",
    ]);
  });

  it("links pack recipes typed in any language and finds them by either name", () => {
    // Act
    const byEnglishName = search("smelt thorium");

    // Assert
    expect(byEnglishName[0].crafters[0].recipes.map((r) => r.name)).toEqual([
      "Thoriumbarren",
    ]);
  });

  it("finds a profession by name and returns nothing for misses", () => {
    // Act & Assert
    expect(search("bergbau")[0].crafters[0].recipes).toHaveLength(2);
    expect(search("schneiderei")).toEqual([]);
    expect(search(undefined, "alchemy")).toEqual([]);
  });
});

describe("listProfessions", () => {
  it("lists every profession of the game with its recipe count", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const professions = listProfessions(fixture.db, ["game"]);

    // Assert
    expect(
      professions.map(({ key, kind, recipeCount, topRecipeSkill }) => [
        key,
        kind,
        recipeCount,
        topRecipeSkill,
      ]),
    ).toEqual([
      ["mining", "gathering", 1, 250],
      ["leatherworking", "primary", 2, 200],
    ]);
  });
});
