import { describe, expect, it } from "vitest";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import { catalogOfKind, loadGameCatalog } from "./game-catalog";

describe("loadGameCatalog", () => {
  const load = (fixture: ListFixture, withRecipes?: boolean) =>
    loadGameCatalog(fixture.db, "game", { withRecipes })!;

  it("leaves recipes out by default and refuses to look them up", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const catalog = load(fixture);

    // Assert
    expect(catalogOfKind(catalog, "profession")).toHaveLength(2);
    expect(catalog.entries.some((entry) => entry.kind === "recipe")).toBe(
      false,
    );
    expect(() => catalogOfKind(catalog, "recipe")).toThrow();
    expect(catalog.entries.some((entry) => entry.kind === "gathering")).toBe(
      false,
    );
    expect(() => catalogOfKind(catalog, "gathering")).toThrow();
  });

  it("includes recipes when asked for", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const catalog = load(fixture, true);

    // Assert
    expect(catalogOfKind(catalog, "recipe").map((r) => r.key)).toEqual([
      "mining-thorium",
      "leatherworking-kit",
      "leatherworking-boots",
    ]);
  });
});
