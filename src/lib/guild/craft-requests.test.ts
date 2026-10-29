import { beforeEach, describe, expect, it } from "vitest";
import { listAudit } from "@/lib/audit/audit";
import { DomainError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { saveProfessionDetails } from "@/lib/roster/character-professions";
import { getCharacter, saveCharacter } from "@/lib/roster/characters";
import type { Actor } from "@/lib/auth/guards";
import { characterInput } from "../../../test/fixtures/characters";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import {
  acceptCraftRequest,
  createCraftRequest,
  deleteCraftRequest,
  finishCraftRequest,
  listCraftRequests,
  listCraftRequestsForCrafter,
  requestRecipeChoices,
  professionCrafters,
  returnCraftRequest,
  type CraftRequestInput,
} from "./craft-requests";

const request: CraftRequestInput = {
  gameId: "game",
  professionKey: "mining",
  item: "Thoriumbarren",
  quantity: 20,
  notes: "Erz bringe ich mit",
};

const miner = characterInput({ name: "Gimli", professionKeys: ["mining"] });

describe("craft requests", () => {
  let fixture: ListFixture;
  let requestId: number;

  beforeEach(() => {
    fixture = createListFixture();
    saveCharacter(fixture.db, fixture.other, "game", miner);
    createCraftRequest(fixture.db, fixture.member, request);
    requestId = listCraftRequests(fixture.db, fixture.member, ["game"])[0].id;
  });

  const viewOf = (actor = fixture.member) =>
    listCraftRequests(fixture.db, actor, ["game"])[0];

  it("goes from open to accepted to done", () => {
    // Act
    acceptCraftRequest(fixture.db, fixture.other, requestId);
    const accepted = viewOf();
    finishCraftRequest(fixture.db, fixture.other, requestId);

    // Assert
    expect(accepted).toMatchObject({
      status: "accepted",
      crafterName: "User 2222",
    });
    expect(viewOf()).toMatchObject({
      status: "done",
      item: "Thoriumbarren",
      quantity: 20,
    });
  });

  it("can only be accepted by someone with the profession", () => {
    // Act & Assert
    expect(viewOf(fixture.member).canAccept).toBe(false);
    expect(viewOf(fixture.other).canAccept).toBe(true);
    expect(() =>
      acceptCraftRequest(fixture.db, fixture.member, requestId),
    ).toThrow(DomainError);
  });

  it("cannot be accepted by the requester, even with the profession", () => {
    // Arrange
    saveCharacter(fixture.db, fixture.member, "game", miner);

    // Act & Assert
    expect(viewOf(fixture.member).canAccept).toBe(false);
    expect(() =>
      acceptCraftRequest(fixture.db, fixture.member, requestId),
    ).toThrow("Den eigenen Antrag kann man nicht annehmen.");
  });

  it("lets the crafter hand it back, open for others again", () => {
    // Arrange
    acceptCraftRequest(fixture.db, fixture.other, requestId);

    // Act & Assert
    expect(() =>
      finishCraftRequest(fixture.db, fixture.member, requestId),
    ).toThrow(DomainError);
    returnCraftRequest(fixture.db, fixture.other, requestId);
    expect(viewOf()).toMatchObject({ status: "open", crafterId: null });
  });

  it("lets the requester and officers delete it, nobody else", () => {
    // Act & Assert
    expect(() =>
      deleteCraftRequest(fixture.db, fixture.other, requestId),
    ).toThrow(ForbiddenError);
    deleteCraftRequest(fixture.db, fixture.officer, requestId);
    expect(listCraftRequests(fixture.db, fixture.member, ["game"])).toEqual([]);
    expect(listAudit(fixture.db)).toEqual([
      expect.objectContaining({
        action: "craftRequest.delete",
        target: "Thoriumbarren",
      }),
    ]);
  });

  it("logs nothing when requesters delete their own request", () => {
    // Act
    deleteCraftRequest(fixture.db, fixture.member, requestId);

    // Assert
    expect(listAudit(fixture.db)).toEqual([]);
  });

  describe("for the crafter's dashboard", () => {
    const itemsFor = (actor: typeof fixture.member) =>
      listCraftRequestsForCrafter(fixture.db, actor, ["game"]).map(
        (view) => `${view.item} (${view.status})`,
      );

    it("shows only requests for the crafter's own professions", () => {
      // Arrange
      createCraftRequest(fixture.db, fixture.member, {
        ...request,
        professionKey: "leatherworking",
        item: "Lederrüstung",
      });

      // Act & Assert
      expect(itemsFor(fixture.other)).toEqual(["Thoriumbarren (open)"]);
      expect(itemsFor(fixture.officer)).toEqual([]);
    });

    it("keeps an accepted request until it is done", () => {
      // Act
      acceptCraftRequest(fixture.db, fixture.other, requestId);
      const accepted = itemsFor(fixture.other);
      finishCraftRequest(fixture.db, fixture.other, requestId);

      // Assert
      expect(accepted).toEqual(["Thoriumbarren (accepted)"]);
      expect(itemsFor(fixture.other)).toEqual([]);
    });

    it("leaves out the user's own requests", () => {
      // Arrange
      saveCharacter(fixture.db, fixture.member, "game", {
        ...miner,
        name: "Dwalin",
      });

      // Act & Assert
      expect(itemsFor(fixture.member)).toEqual([]);
    });
  });

  it("validates item, quantity and profession", () => {
    // Act
    const result = createCraftRequest(fixture.db, fixture.member, {
      ...request,
      item: " ",
      quantity: 0,
      professionKey: "alchemy",
    });

    // Assert
    expect(result).toEqual({
      ok: false,
      errors: {
        item: expect.any(String),
        quantity: expect.any(String),
        professionKey: expect.any(String),
      },
    });
  });
});

describe("what a request asks for", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = createListFixture();
  });

  const create = (professionKey: string, item: string) =>
    createCraftRequest(fixture.db, fixture.member, {
      ...request,
      professionKey,
      item,
    });

  it("takes only a pack recipe for a crafting profession and stores its name", () => {
    // Act
    const invented = create("leatherworking", "Lederhose der Unbesiegbarkeit");
    const chosen = create("leatherworking", "leatherworking-kit");

    // Assert
    expect(invented).toEqual({
      ok: false,
      errors: { item: "Bitte ein Rezept aus der Liste wählen." },
    });
    expect(chosen).toEqual({ ok: true });
    expect(listCraftRequests(fixture.db, fixture.member, ["game"])).toEqual([
      expect.objectContaining({
        item: "Leichtes Rüstungsset",
        recipeEntryId: expect.any(Number),
      }),
    ]);
  });

  it("keeps free text for gathering professions, even with recipes", () => {
    // Act
    const result = create("mining", "20 Thoriumerz");

    // Assert
    expect(result).toEqual({ ok: true });
    expect(listCraftRequests(fixture.db, fixture.member, ["game"])).toEqual([
      expect.objectContaining({ item: "20 Thoriumerz", recipeEntryId: null }),
    ]);
  });
});

describe("requestRecipeChoices", () => {
  it("offers the recipes of a crafting profession, free text for gathering", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const leatherworking = requestRecipeChoices(
      fixture.db,
      fixture.member,
      "game",
      "leatherworking",
    );
    const mining = requestRecipeChoices(
      fixture.db,
      fixture.member,
      "game",
      "mining",
    );

    // Assert
    expect(leatherworking).toEqual([
      {
        value: "leatherworking-kit",
        label: "Leichtes Rüstungsset (ab 1)",
        reagents: [],
        crafters: [],
      },
      {
        value: "leatherworking-boots",
        label: "Wildlederstiefel (ab 200)",
        reagents: [{ name: "Dickes Leder", count: 4 }],
        crafters: [],
      },
    ]);
    expect(mining).toBeNull();
  });

  it("refuses unknown professions", () => {
    // Arrange
    const fixture = createListFixture();

    // Act & Assert
    expect(() =>
      requestRecipeChoices(fixture.db, fixture.member, "game", "alchemy"),
    ).toThrow(NotFoundError);
  });
});

describe("skill check", () => {
  let fixture: ListFixture;

  /** A leatherworker for the actor, with the given skill (null: not entered). */
  function leatherworker(
    actor: Actor,
    name: string,
    skill: number | null,
    recipes = "",
  ) {
    const saved = saveCharacter(
      fixture.db,
      actor,
      "game",
      characterInput({ name, professionKeys: ["leatherworking"] }),
    );
    const character = getCharacter(
      fixture.db,
      saved.ok ? saved.characterId : -1,
    )!;
    saveProfessionDetails(
      fixture.db,
      actor,
      character.id,
      character.professionEntryIds[0],
      { skillLevel: skill, specialization: "", notes: "", recipes },
    );
  }

  const bootsView = (actor: Actor) =>
    listCraftRequests(fixture.db, actor, ["game"])[0];

  beforeEach(() => {
    fixture = createListFixture();
    createCraftRequest(fixture.db, fixture.member, {
      ...request,
      professionKey: "leatherworking",
      item: "leatherworking-boots",
      quantity: 2,
    });
  });

  it("lists the materials for the whole request and who is skilled enough", () => {
    // Arrange
    leatherworker(fixture.other, "Brakka", 210);
    leatherworker(fixture.officer, "Lehrling", 50);

    // Act
    const view = bootsView(fixture.member);

    // Assert
    expect(view).toMatchObject({
      reagents: [{ name: "Dickes Leder", count: 8 }],
      requiredSkill: 200,
      recipeLink: "https://example.org/boots",
      professionHeld: true,
      crafters: [
        expect.objectContaining({ characterName: "Brakka", skill: 210 }),
      ],
    });
  });

  it("offers accepting only with enough skill and refuses it otherwise", () => {
    // Arrange
    leatherworker(fixture.other, "Brakka", 210);
    leatherworker(fixture.officer, "Lehrling", 50);
    const id = bootsView(fixture.member).id;

    // Act & Assert
    expect(bootsView(fixture.other).canAccept).toBe(true);
    expect(bootsView(fixture.officer)).toMatchObject({
      canAccept: false,
      ownSkillTooLow: { have: 50, need: 200 },
    });
    expect(() => acceptCraftRequest(fixture.db, fixture.officer, id)).toThrow(
      DomainError,
    );
    acceptCraftRequest(fixture.db, fixture.other, id);
    expect(bootsView(fixture.member).status).toBe("accepted");
  });

  it("counts an entered rare recipe whatever the skill, and lists that crafter first", () => {
    // Arrange
    leatherworker(fixture.other, "Brakka", 250);
    leatherworker(fixture.officer, "Sammler", 40, "Wildlederstiefel");

    // Act
    const forOfficer = bootsView(fixture.officer);
    const recipes = requestRecipeChoices(
      fixture.db,
      fixture.member,
      "game",
      "leatherworking",
    )!;

    // Assert
    expect(forOfficer).toMatchObject({ canAccept: true, ownSkillTooLow: null });
    expect(bootsView(fixture.member).crafters).toEqual([
      expect.objectContaining({ characterName: "Sammler", hasRecipe: true }),
      expect.objectContaining({ characterName: "Brakka", hasRecipe: false }),
    ]);
    expect(
      recipes.find((recipe) => recipe.value === "leatherworking-boots")
        ?.crafters,
    ).toEqual([
      "User 3333 (Sammler, 40, hat das Rezept)",
      "User 2222 (Brakka, 250)",
    ]);
    acceptCraftRequest(fixture.db, fixture.officer, forOfficer.id);
  });

  it("does not block on a skill nobody entered", () => {
    // Arrange
    leatherworker(fixture.other, "Brakka", null);

    // Act & Assert
    expect(bootsView(fixture.other)).toMatchObject({
      canAccept: true,
      ownSkillTooLow: null,
    });
  });

  it("notices when nobody but the requester has the profession", () => {
    // Arrange
    leatherworker(fixture.member, "Selbst", 300);

    // Act
    const view = bootsView(fixture.member);

    // Assert
    expect(view).toMatchObject({
      professionHeld: false,
      crafters: [],
      canAccept: false,
    });
  });

  it("names the crafters per profession and recipe for the form", () => {
    // Arrange
    leatherworker(fixture.other, "Brakka", 210);
    leatherworker(fixture.officer, "Lehrling", 50);

    // Act
    const byProfession = professionCrafters(fixture.db, fixture.member, [
      "game",
    ]);
    const recipes = requestRecipeChoices(
      fixture.db,
      fixture.member,
      "game",
      "leatherworking",
    )!;

    // Assert
    expect(byProfession.game.leatherworking).toEqual([
      "User 2222 (Brakka, 210)",
      "User 3333 (Lehrling, 50)",
    ]);
    expect(byProfession.game.mining).toEqual([]);
    expect(
      recipes.find((recipe) => recipe.value === "leatherworking-boots")
        ?.crafters,
    ).toEqual(["User 2222 (Brakka, 210)"]);
  });
});
