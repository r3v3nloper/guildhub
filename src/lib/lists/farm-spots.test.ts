import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import {
  deleteFarmSpot,
  listFarmSpots,
  saveFarmSpot,
  type FarmSpotInput,
} from "./farm-spots";
import { createListFixture, type ListFixture } from "./test-setup";

const input: FarmSpotInput = {
  gameId: "game",
  professionKey: "mining",
  resource: "Thoriumader",
  zone: "Un'Goro-Krater",
  coordinates: "45, 60",
  link: "https://example.org/karte",
  notes: "",
  visibility: "guild",
};

describe("farm spots", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = createListFixture();
  });

  it("shares a guild spot with its profession", () => {
    // Arrange
    const { db, member, other } = fixture;

    // Act
    saveFarmSpot(db, member, input);

    // Assert
    expect(listFarmSpots(db, other, ["game"])).toEqual([
      expect.objectContaining({
        resource: "Thoriumader",
        professionKey: "mining",
        professionName: "Bergbau",
        canEdit: false,
      }),
    ]);
  });

  it("keeps a private spot to its author", () => {
    // Arrange
    const { db, member, other } = fixture;

    // Act
    saveFarmSpot(db, member, { ...input, visibility: "private" });

    // Assert
    expect(listFarmSpots(db, other, ["game"])).toEqual([]);
    expect(listFarmSpots(db, member, ["game"])).toHaveLength(1);
  });

  it("validates required fields, link and profession", () => {
    // Act
    const result = saveFarmSpot(fixture.db, fixture.member, {
      ...input,
      zone: " ",
      link: "javascript:alert(1)",
      professionKey: "alchemy",
    });

    // Assert
    expect(result).toEqual({
      ok: false,
      errors: {
        zone: expect.any(String),
        link: expect.any(String),
        professionKey: expect.any(String),
      },
    });
  });

  it("lets only the author or an officer delete a shared spot", () => {
    // Arrange
    const { db, member, other, officer } = fixture;
    saveFarmSpot(db, member, input);
    const [spot] = listFarmSpots(db, member, ["game"]);

    // Act & Assert
    expect(() => deleteFarmSpot(db, other, spot.id)).toThrow(ForbiddenError);
    deleteFarmSpot(db, officer, spot.id);
    expect(listFarmSpots(db, member, ["game"])).toEqual([]);
  });
});
