import { asc, eq, inArray, max } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase, DbExecutor } from "@/lib/db/client";
import { bossLoot, checklistBosses } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { editableChecklist } from "./checklists";
import { formatLootLines, parseLootLines, type LootEntry } from "./loot-lines";

export interface BossView {
  id: number;
  name: string;
  mechanics: string | null;
  loot: Array<LootEntry & { id: number }>;
  /** Loot as edited: one item per line. */
  lootText: string;
}

export interface BossInput {
  name: string;
  mechanics: string;
  /** One item per line: "Name – Notiz", a link anywhere in the line. */
  loot: string;
}

export type BossErrors = Partial<Record<keyof BossInput, string>>;

export type BossResult = { ok: true } | { ok: false; errors: BossErrors };

/**
 * Bosses of a dungeon checklist with their mechanics and loot, in the order they were
 * added. Visibility follows the checklist; callers load the checklist first.
 */
export function listBosses(db: AppDatabase, checklistId: number): BossView[] {
  const bosses = db
    .select()
    .from(checklistBosses)
    .where(eq(checklistBosses.checklistId, checklistId))
    .orderBy(asc(checklistBosses.sortOrder), asc(checklistBosses.id))
    .all();
  const loot =
    bosses.length === 0
      ? []
      : db
          .select()
          .from(bossLoot)
          .where(
            inArray(
              bossLoot.bossId,
              bosses.map((boss) => boss.id),
            ),
          )
          .orderBy(asc(bossLoot.sortOrder))
          .all();
  return bosses.map((boss) => {
    const items = loot
      .filter((entry) => entry.bossId === boss.id)
      .map(({ id, name, link, notes }) => ({ id, name, link, notes }));
    return {
      id: boss.id,
      name: boss.name,
      mechanics: boss.mechanics,
      loot: items,
      lootText: formatLootLines(items),
    };
  });
}

/** Adds a boss to the checklist, or updates `bossId`; loot is replaced as a whole. */
export function saveBoss(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
  input: BossInput,
  bossId?: number,
): BossResult {
  editableChecklist(db, actor, checklistId);
  const existing =
    bossId === undefined ? undefined : bossOf(db, checklistId, bossId);

  const errors: BossErrors = {};
  const name = input.name.trim();
  if (!name) {
    errors.name = "Bitte einen Namen eingeben.";
  } else if (name.length > 60) {
    errors.name = "Höchstens 60 Zeichen.";
  }
  const mechanics = input.mechanics.trim();
  if (mechanics.length > 4000) {
    errors.mechanics = "Höchstens 4000 Zeichen.";
  }
  const loot = parseLootLines(input.loot);
  if (!loot.ok) {
    errors.loot = loot.error;
  }
  if (!loot.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  db.transaction((tx) => {
    const values = { name, mechanics: mechanics || null };
    const id = existing
      ? tx
          .update(checklistBosses)
          .set(values)
          .where(eq(checklistBosses.id, existing.id))
          .returning()
          .get().id
      : tx
          .insert(checklistBosses)
          .values({
            ...values,
            checklistId,
            sortOrder: nextSortOrder(tx, checklistId),
          })
          .returning()
          .get().id;
    tx.delete(bossLoot).where(eq(bossLoot.bossId, id)).run();
    if (loot.loot.length > 0) {
      tx.insert(bossLoot)
        .values(
          loot.loot.map((entry, index) => ({
            ...entry,
            bossId: id,
            sortOrder: index,
          })),
        )
        .run();
    }
  });
  return { ok: true };
}

export function deleteBoss(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
  bossId: number,
): void {
  editableChecklist(db, actor, checklistId);
  const boss = bossOf(db, checklistId, bossId);
  // Loot goes with it (foreign key cascade).
  db.delete(checklistBosses).where(eq(checklistBosses.id, boss.id)).run();
}

function bossOf(db: AppDatabase, checklistId: number, bossId: number) {
  const boss = db
    .select()
    .from(checklistBosses)
    .where(eq(checklistBosses.id, bossId))
    .get();
  if (!boss || boss.checklistId !== checklistId) {
    throw new NotFoundError("Boss");
  }
  return boss;
}

function nextSortOrder(db: DbExecutor, checklistId: number): number {
  const row = db
    .select({ last: max(checklistBosses.sortOrder) })
    .from(checklistBosses)
    .where(eq(checklistBosses.checklistId, checklistId))
    .get();
  return (row?.last ?? -1) + 1;
}
