import type { CharacterInput } from "@/lib/roster/character-rules";

/** A character form input with every field empty; tests set only what matters to them. */
export function characterInput(
  overrides: Partial<CharacterInput> = {},
): CharacterInput {
  return {
    name: "Held",
    server: "",
    factionKey: "",
    raceKey: "",
    classKey: "",
    specKey: "",
    offSpecKey: "",
    spec: "",
    level: null,
    isMain: false,
    notes: "",
    professionKeys: [],
    ...overrides,
  };
}
