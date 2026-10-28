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
