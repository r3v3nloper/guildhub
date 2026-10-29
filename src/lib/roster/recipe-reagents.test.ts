import { describe, expect, it } from "vitest";
import { formatReagents } from "./recipe-reagents";

describe("formatReagents", () => {
  it("lists count and localised name of every reagent", () => {
    // Act
    const line = formatReagents({
      reagents: [
        { name: { de: "Leinenstoff", en: "Linen Cloth" }, count: 2 },
        { name: "Leere Phiole", count: 1 },
      ],
    });

    // Assert
    expect(line).toBe("2× Leinenstoff, 1× Leere Phiole");
  });

  it("returns null for recipes without reagents", () => {
    // Act & Assert
    expect(formatReagents({})).toBeNull();
    expect(formatReagents({ reagents: [] })).toBeNull();
  });
});
