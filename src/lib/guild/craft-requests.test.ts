import { beforeEach, describe, expect, it } from "vitest";
import { DomainError, ForbiddenError } from "@/lib/errors";
import { saveCharacter } from "@/lib/roster/characters";
import type { CharacterInput } from "@/lib/roster/character-rules";
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

const miner: CharacterInput = {
  name: "Gimli",
  server: "",
  factionKey: "",
  raceKey: "",
  classKey: "",
  spec: "",
  level: null,
  isMain: false,
  notes: "",
  professionKeys: ["mining"],
};

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
