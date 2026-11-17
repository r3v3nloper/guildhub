import { describe, expect, it } from "vitest";
import { packSchema } from "../../src/lib/packs/schema";
import { addonDataLua } from "./data-lua";

const pack = packSchema.parse({
  id: "wow-forever",
  name: "WoW",
  version: "1.0.0",
  capabilities: { professions: true },
  professions: [
    { id: "alchemy", name: { de: "Alchemie", en: "Alchemy" }, game_ref: "171" },
    { id: "enchanting", name: "Verzauberkunst", game_ref: "333" },
    { id: "archaeology", name: "Archäologie" },
  ],
  recipes: [
    {
      id: "alchemy-2330",
      name: "Schwacher Heiltrank",
      profession: "alchemy",
      creates: 118,
      recipe_items: [2555],
      reagents: [
        { name: "Friedensblume", count: 1, item: 2447 },
        { name: "Silberblatt", count: 2, item: 765 },
      ],
    },
    {
      id: "enchanting-7418",
      name: "Armschiene – Schwache Gesundheit",
      profession: "enchanting",
      reagents: [{ name: "Seltsamer Staub", count: 1, item: 10940 }],
    },
    { id: "archaeology-1", name: "Fund", profession: "archaeology" },
  ],
});

describe("addonDataLua", () => {
  it("maps every name of a profession to its game_ref and skips those without", () => {
    // Act
    const lua = addonDataLua(pack);

    // Assert
    expect(lua).toContain('ns.gameId = "wow-forever"');
    expect(lua).toContain('  ["Alchemie"] = 171,\n  ["Alchemy"] = 171,');
    expect(lua).toContain('  [171] = { de = "Alchemie", en = "Alchemy" },');
    expect(lua).not.toContain("Archäologie");
  });

  it("lists the item IDs of each recipe under its profession and spell", () => {
    // Act
    const lua = addonDataLua(pack);

    // Assert
    expect(lua).toContain(
      "  [171] = {\n    [2330] = { 118, { 2555 }, { 2447, 1, 765, 2 } },\n  },",
    );
    expect(lua).toContain(
      "  [333] = {\n    [7418] = { false, {  }, { 10940, 1 } },\n  },",
    );
  });
});
