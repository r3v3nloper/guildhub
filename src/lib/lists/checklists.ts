import { and, asc, eq, inArray } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import {
  checklistItems,
  checklistPins,
  checklists,
  checklistTicks,
  users,
  VISIBILITIES,
  type Visibility,
} from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { isVisibleTo, visibleToFilter } from "./visible-entries";
import { isGameEnabled } from "@/lib/roster/game-catalog";

export type ChecklistRow = typeof checklists.$inferSelect;

export interface ChecklistView extends ChecklistRow {
  ownerName: string | null;
  items: Array<{ id: number; label: string; ticked: boolean }>;
  canEdit: boolean;
  /** Shown on the actor's overview (start page). */
  pinned: boolean;
}

export interface ChecklistInput {
  name: string;
  gameId: string;
  visibility: string;
  /** One item per line. */
  items: string;
}

export type ChecklistErrors = Partial<Record<keyof ChecklistInput, string>>;

export type ChecklistResult =
  { ok: true; checklistId: number } | { ok: false; errors: ChecklistErrors };

const MAX_ITEMS = 50;

/**
 * Dungeon checklists (SPEC 10, Phase 2): a template per dungeon, private or shared with
 * the guild. Every member ticks a shared list for their own run.
 */
export function listChecklists(
  db: AppDatabase,
  actor: Actor,
  gameIds: readonly string[],
): ChecklistView[] {
  if (gameIds.length === 0) {
    return [];
  }
  const rows = db
    .select({ checklist: checklists, ownerName: users.name })
    .from(checklists)
    .innerJoin(users, eq(users.id, checklists.ownerId))
    .where(
      and(
        inArray(checklists.gameId, [...gameIds]),
        visibleToFilter(checklists, actor.userId),
      ),
    )
    .orderBy(asc(checklists.gameId), asc(checklists.name))
    .all();
  if (rows.length === 0) {
    return [];
  }
  const items = db
    .select()
    .from(checklistItems)
    .where(
      inArray(
        checklistItems.checklistId,
        rows.map((row) => row.checklist.id),
      ),
    )
    .orderBy(asc(checklistItems.sortOrder))
    .all();
  const ticked = new Set(
    db
      .select({ itemId: checklistTicks.itemId })
      .from(checklistTicks)
      .where(eq(checklistTicks.userId, actor.userId))
      .all()
      .map((tick) => tick.itemId),
  );
  const pinned = new Set(
    db
      .select({ checklistId: checklistPins.checklistId })
      .from(checklistPins)
      .where(eq(checklistPins.userId, actor.userId))
      .all()
      .map((pin) => pin.checklistId),
  );

  return rows.map(({ checklist, ownerName }) => ({
    ...checklist,
    ownerName,
    canEdit: permissions.editSharedEntry(actor, checklist).allowed,
    pinned: pinned.has(checklist.id),
    items: items
      .filter((item) => item.checklistId === checklist.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        ticked: ticked.has(item.id),
      })),
  }));
}

function visibleChecklist(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
): ChecklistRow {
  const checklist = db
    .select()
    .from(checklists)
    .where(eq(checklists.id, checklistId))
    .get();
  if (!checklist || !isVisibleTo(checklist, actor.userId)) {
    throw new NotFoundError("Checkliste");
  }
  assertAllowed(permissions.viewGuild(actor));
  return checklist;
}

export function getEditableChecklist(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
): ChecklistRow & { items: string } {
  const checklist = visibleChecklist(db, actor, checklistId);
  assertAllowed(permissions.editSharedEntry(actor, checklist));
  const items = db
    .select({ label: checklistItems.label })
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(asc(checklistItems.sortOrder))
    .all();
  return { ...checklist, items: items.map((item) => item.label).join("\n") };
}

/**
 * Creates a checklist, or updates it when `checklistId` is given. Editing replaces the
 * items, which also clears everyone's ticks for the old ones.
 */
export function saveChecklist(
  db: AppDatabase,
  actor: Actor,
  input: ChecklistInput,
  checklistId?: number,
): ChecklistResult {
  const existing =
    checklistId === undefined
      ? undefined
      : visibleChecklist(db, actor, checklistId);
  if (existing) {
    assertAllowed(permissions.editSharedEntry(actor, existing));
  } else {
    assertAllowed(permissions.editOwnData(actor, actor.userId));
  }

  const errors: ChecklistErrors = {};
  const name = input.name.trim();
  if (!name) {
    errors.name = "Bitte einen Namen eingeben.";
  } else if (name.length > 60) {
    errors.name = "Höchstens 60 Zeichen.";
  }
  const gameId = existing?.gameId ?? input.gameId;
  if (!existing && !isGameEnabled(db, actor.guildId, gameId)) {
    errors.gameId = "Bitte ein Spiel wählen.";
  }
  if (!VISIBILITIES.includes(input.visibility as Visibility)) {
    errors.visibility = "Bitte die Sichtbarkeit wählen.";
  }
  const labels = input.items
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (labels.length === 0) {
    errors.items = "Mindestens einen Punkt eintragen, einen pro Zeile.";
  } else if (labels.length > MAX_ITEMS) {
    errors.items = `Höchstens ${MAX_ITEMS} Punkte.`;
  } else if (labels.some((label) => label.length > 120)) {
    errors.items = "Ein Punkt darf höchstens 120 Zeichen haben.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const values = { name, visibility: input.visibility as Visibility };
  const id = db.transaction((tx) => {
    const savedId = existing
      ? tx
          .update(checklists)
          .set(values)
          .where(eq(checklists.id, existing.id))
          .returning()
          .get().id
      : tx
          .insert(checklists)
          .values({ ...values, ownerId: actor.userId, gameId })
          .returning()
          .get().id;
    tx.delete(checklistItems)
      .where(eq(checklistItems.checklistId, savedId))
      .run();
    tx.insert(checklistItems)
      .values(
        labels.map((label, index) => ({
          checklistId: savedId,
          label,
          sortOrder: index,
        })),
      )
      .run();
    return savedId;
  });
  return { ok: true, checklistId: id };
}

export function deleteChecklist(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
): void {
  const checklist = visibleChecklist(db, actor, checklistId);
  assertAllowed(permissions.editSharedEntry(actor, checklist));
  db.delete(checklists).where(eq(checklists.id, checklistId)).run();
}

/** Ticks or unticks one point for the actor's own run. */
export function setChecklistItemTicked(
  db: AppDatabase,
  actor: Actor,
  itemId: number,
  ticked: boolean,
): void {
  const item = db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .get();
  if (!item) {
    throw new NotFoundError("Punkt");
  }
  visibleChecklist(db, actor, item.checklistId);
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  if (ticked) {
    db.insert(checklistTicks)
      .values({ itemId, userId: actor.userId })
      .onConflictDoNothing()
      .run();
    return;
  }
  db.delete(checklistTicks)
    .where(
      and(
        eq(checklistTicks.itemId, itemId),
        eq(checklistTicks.userId, actor.userId),
      ),
    )
    .run();
}

/** Starts a new run: clears the actor's ticks of this checklist. */
export function resetChecklistRun(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
): void {
  visibleChecklist(db, actor, checklistId);
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  const itemIds = db
    .select({ id: checklistItems.id })
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, checklistId))
    .all()
    .map((item) => item.id);
  if (itemIds.length === 0) {
    return;
  }
  db.delete(checklistTicks)
    .where(
      and(
        inArray(checklistTicks.itemId, itemIds),
        eq(checklistTicks.userId, actor.userId),
      ),
    )
    .run();
}

/** The checklists the actor pinned to the overview, with their own ticks. */
export function listPinnedChecklists(
  db: AppDatabase,
  actor: Actor,
  gameIds: readonly string[],
): ChecklistView[] {
  return listChecklists(db, actor, gameIds).filter(
    (checklist) => checklist.pinned,
  );
}

/** Pins a checklist to the actor's dashboard, or takes it off again. */
export function setChecklistPinned(
  db: AppDatabase,
  actor: Actor,
  checklistId: number,
  pinned: boolean,
): void {
  visibleChecklist(db, actor, checklistId);
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  if (pinned) {
    db.insert(checklistPins)
      .values({ checklistId, userId: actor.userId })
      .onConflictDoNothing()
      .run();
    return;
  }
  db.delete(checklistPins)
    .where(
      and(
        eq(checklistPins.checklistId, checklistId),
        eq(checklistPins.userId, actor.userId),
      ),
    )
    .run();
}
