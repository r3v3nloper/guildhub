import { describe, expect, it } from "vitest";
import type { CatalogKind } from "@/lib/packs/catalog";
import type { CatalogEntry, GameCatalog } from "./game-catalog";
import { requestRecipesOf } from "./request-recipes";

let nextId = 1;
function entry(
  kind: CatalogKind,
  key: string,
  data: Record<string, unknown>,
): CatalogEntry {
  return {
    id: nextId++,
    gameId: "wow",
    kind,
    key,
    name: key,
    data,
    status: "active",
    lastSeenPackVersion: "1.0.0",
    todo: false,
  };
}

const cooking = entry("profession", "cooking", { kind: "secondary" });
const fishing = entry("profession", "fishing", {
  kind: "secondary",
  requests: "free",
});
const herbalism = entry("profession", "herbalism", { kind: "gathering" });
const firstAid = entry("profession", "first-aid", { kind: "secondary" });
const catalog = {
  game: {} as GameCatalog["game"],
  entries: [
    cooking,
    fishing,
    herbalism,
    firstAid,
    entry("recipe", "cooking-bread", { profession: "cooking" }),
    entry("recipe", "fishing-oil", { profession: "fishing" }),
    entry("recipe", "herbalism-x", { profession: "herbalism" }),
  ],
} as GameCatalog;

describe("requestRecipesOf", () => {
  it("requires a recipe for crafting professions with recipes", () => {
    // Act & Assert
    expect(requestRecipesOf(catalog, cooking)?.map((r) => r.key)).toEqual([
      "cooking-bread",
    ]);
  });

  it("leaves gathering professions and explicit free ones to free text", () => {
    // Act & Assert
    expect(requestRecipesOf(catalog, herbalism)).toBeNull();
    expect(requestRecipesOf(catalog, fishing)).toBeNull();
  });

  it("falls back to free text when the pack lists no recipes", () => {
    // Act & Assert
    expect(requestRecipesOf(catalog, firstAid)).toBeNull();
  });
});
