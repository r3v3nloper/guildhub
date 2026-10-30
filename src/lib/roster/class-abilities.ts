import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries } from "@/lib/db/schema";
import type { PackClassAbilities } from "@/lib/packs/schema";
import { localize } from "@/i18n/localize";

/** Something a character can learn at a level. */
export interface Learning {
  name: string;
  /** Null for abilities without ranks. */
  rank: number | null;
  /** Learned from a quest rather than the trainer. */
  fromQuest: boolean;
}

export interface LevelLearnings {
  level: number;
  learnings: Learning[];
}

/** How many levels with something new to show. */
const LEVELS_SHOWN = 3;

/** Every ability rank of a class by level, from the pack; empty without data. */
export function loadClassLearnings(
  db: AppDatabase,
  gameId: string,
  classKey: string,
): LevelLearnings[] {
  if (!classKey) {
    return [];
  }
  const entry = db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        eq(gameCatalogEntries.gameId, gameId),
        eq(gameCatalogEntries.kind, "abilities"),
        eq(gameCatalogEntries.key, classKey),
        eq(gameCatalogEntries.status, "active"),
      ),
    )
    .get();
  if (!entry) {
    return [];
  }
  const { abilities = [] } = entry.data as Pick<
    PackClassAbilities,
    "abilities"
  >;
  return learningsByLevel(abilities);
}

export function learningsByLevel(
  abilities: PackClassAbilities["abilities"],
): LevelLearnings[] {
  const byLevel = new Map<number, Learning[]>();
  for (const ability of abilities) {
    const name = localize(ability.name);
    for (const rank of ability.ranks) {
      const learnings = byLevel.get(rank.level) ?? [];
      learnings.push({
        name,
        rank: rank.rank,
        fromQuest: ability.learned === "quest",
      });
      byLevel.set(rank.level, learnings);
    }
  }
  return [...byLevel]
    .sort(([a], [b]) => a - b)
    .map(([level, learnings]) => ({
      level,
      learnings: learnings.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

/**
 * What comes next: the current level (in case the trainer has not been visited yet) and
 * the following levels that bring something new.
 */
export function upcomingLearnings(
  learnings: readonly LevelLearnings[],
  level: number,
  levelsShown = LEVELS_SHOWN,
): LevelLearnings[] {
  return learnings
    .filter((entry) => entry.level >= level)
    .slice(0, levelsShown);
}
