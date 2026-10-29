import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { createGuildFixture } from "./guild";

const raw = {
  id: "game",
  name: "Spiel",
  version: "1.0.0",
  capabilities: { professions: true },
  professions: [
    { id: "mining", name: "Bergbau", kind: "gathering" },
    { id: "leatherworking", name: "Lederverarbeitung", kind: "primary" },
  ],
  instances: [
    {
      id: "deadmines",
      name: "Deadmines",
      kind: "dungeon",
      players: 5,
      level_min: 17,
      level_max: 26,
      bosses: ["Rhahk'Zor", "Edwin VanCleef"],
      loot: [
        {
          name: "Cape of the Brotherhood",
          reason: "top pick for rogues",
          link: "https://example.org/item/5193",
        },
      ],
    },
  ],
  recipes: [
    {
      id: "mining-thorium",
      name: { de: "Thoriumbarren", en: "Smelt Thorium" },
      profession: "mining",
      skill: 250,
      reagents: [{ name: { de: "Thoriumerz", en: "Thorium Ore" }, count: 1 }],
      link: "https://example.org/thorium",
    },
    {
      id: "leatherworking-kit",
      name: { de: "Leichtes Rüstungsset", en: "Light Armor Kit" },
      profession: "leatherworking",
      skill: 1,
    },
    {
      id: "leatherworking-boots",
      name: { de: "Wildlederstiefel", en: "Wild Leather Boots" },
      profession: "leatherworking",
      skill: 200,
      link: "https://example.org/boots",
      reagents: [
        { name: { de: "Dickes Leder", en: "Thick Leather" }, count: 4 },
      ],
    },
  ],
};

export interface ListFixture {
  db: AppDatabase;
  member: Actor;
  other: Actor;
  officer: Actor;
}

/** One enabled game with a profession, and three members of different rank. */
export function createListFixture(): ListFixture {
  const {
    db,
    actors: [member, other, officer],
  } = createGuildFixture(raw, [
    { discordId: "111111111111111111" },
    { discordId: "222222222222222222" },
    { discordId: "333333333333333333", role: "officer" },
  ]);
  return { db, member, other, officer };
}
