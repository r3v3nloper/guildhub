import { describe, expect, it } from "vitest";
import { instanceName, instancesForPack, type ApiInstance } from "./instances";

const instance = (overrides: Partial<ApiInstance>): ApiInstance => ({
  id: 36,
  name: "Deadmines",
  status: "classic",
  kind: "dungeon",
  players: 5,
  levelRange: [17, 26],
  bosses: ["Edwin VanCleef"],
  notableLoot: [{ itemId: 5193, name: "Cape of the Brotherhood", why: [] }],
  ...overrides,
});

describe("instances from ForeverDB", () => {
  it("keeps Forever instances with bosses, lowest level first, with item links", () => {
    // Act
    const result = instancesForPack(
      [
        instance({}),
        instance({ id: 389, name: "Ragefire Chasm", levelRange: [13, 18] }),
        instance({ id: 2875, name: "Karazhan Crypts", status: "other" }),
        instance({ id: 169, name: "Emerald Dream", bosses: [] }),
      ],
      new Map(),
    );

    // Assert
    expect(result.map((entry) => entry.id)).toEqual([
      "ragefire-chasm",
      "deadmines",
    ]);
    expect(result[1].loot[0].link).toBe("https://foreverdb.net/item/5193");
  });

  it("keeps a German name maintained by hand", () => {
    // Act
    const result = instancesForPack(
      [instance({})],
      new Map([["deadmines", { de: "Die Todesminen", en: "Old" }]]),
    );

    // Assert
    expect(result[0].name).toEqual({ de: "Die Todesminen", en: "Deadmines" });
    expect(instanceName("Molten Core", "Molten Core")).toBe("Molten Core");
  });

  it("keeps two instances with the same name apart", () => {
    // Act
    const result = instancesForPack(
      [instance({ id: 533 }), instance({ id: 2921 })],
      new Map(),
    );

    // Assert
    expect(result.map((entry) => entry.id).sort()).toEqual([
      "deadmines",
      "deadmines-2921",
    ]);
  });
});
