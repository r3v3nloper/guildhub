import { describe, expect, it } from "vitest";
import { packSchema } from "../../src/lib/packs/schema";
import { professionDataLua } from "./profession-data";

describe("professionDataLua", () => {
  it("maps every name of a profession to its game_ref and skips those without", () => {
    // Arrange
    const pack = packSchema.parse({
      id: "wow-forever",
      name: "WoW",
      version: "1.0.0",
      capabilities: { professions: true },
      professions: [
        {
          id: "alchemy",
          name: { de: "Alchemie", en: "Alchemy" },
          game_ref: "171",
        },
        { id: "archaeology", name: "Archäologie" },
      ],
    });

    // Act
    const lua = professionDataLua(pack);

    // Assert
    expect(lua).toContain('ns.gameId = "wow-forever"');
    expect(lua).toContain('  ["Alchemie"] = 171,\n  ["Alchemy"] = 171,');
    expect(lua).toContain('  [171] = { de = "Alchemie", en = "Alchemy" },');
    expect(lua).not.toContain("Archäologie");
  });
});
