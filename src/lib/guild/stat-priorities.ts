import { and, asc, eq, inArray } from "drizzle-orm";
import { recordAudit } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries, statPriorities } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import type { LocalizedString } from "@/lib/packs/schema";
import { isGameEnabled } from "@/lib/roster/game-catalog";
import { isHttpUrl } from "@/lib/url";

export type StatPriorityRow = typeof statPriorities.$inferSelect;

export interface ClassStatPriorities {
  gameId: string;
  classEntryId: number;
  className: LocalizedString;
  role: string | null;
  color: string | null;
  priorities: StatPriorityRow[];
}

export interface StatPriorityInput {
  title: string;
  /** One stat per line, most important first. */
  stats: string;
  notes: string;
  source: string;
}

export type StatPriorityErrors = Partial<
  Record<keyof StatPriorityInput, string>
>;

export type StatPriorityResult =
  { ok: true } | { ok: false; errors: StatPriorityErrors };

const MAX_STATS = 20;

/**
 * Every class of the given games with the officers' stat rankings (SPEC 10, Phase 3).
 * Classes without a ranking are listed too, so officers see what is missing.
 */
export function listStatPriorities(
  db: AppDatabase,
  gameIds: readonly string[],
): ClassStatPriorities[] {
  if (gameIds.length === 0) {
    return [];
  }
  const classes = db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        inArray(gameCatalogEntries.gameId, [...gameIds]),
        eq(gameCatalogEntries.kind, "class"),
        inArray(gameCatalogEntries.status, ["active", "deprecated"]),
      ),
    )
    .orderBy(asc(gameCatalogEntries.id))
    .all();
  const priorities =
    classes.length === 0
      ? []
      : db
          .select()
          .from(statPriorities)
          .where(
            inArray(
              statPriorities.classEntryId,
              classes.map((entry) => entry.id),
            ),
          )
          .orderBy(asc(statPriorities.id))
          .all();
  return classes.map((entry) => ({
    gameId: entry.gameId,
    classEntryId: entry.id,
    className: entry.name,
    role: (entry.data.role as string | undefined) ?? null,
    color: (entry.data.color as string | undefined) ?? null,
    priorities: priorities.filter(
      (priority) => priority.classEntryId === entry.id,
    ),
  }));
}

/** Rankings of one class, e.g. for the character page. */
export function statPrioritiesOfClass(
  db: AppDatabase,
  classEntryId: number,
): StatPriorityRow[] {
  return db
    .select()
    .from(statPriorities)
    .where(eq(statPriorities.classEntryId, classEntryId))
    .orderBy(asc(statPriorities.id))
    .all();
}

export function getStatPriority(
  db: AppDatabase,
  actor: Actor,
  priorityId: number,
): StatPriorityRow {
  assertAllowed(permissions.manageStatPriorities(actor));
  const priority = db
    .select()
    .from(statPriorities)
    .where(eq(statPriorities.id, priorityId))
    .get();
  if (!priority) {
    throw new NotFoundError("Stat-Priorität");
  }
  return priority;
}

/** A class of an enabled game, to attach a new ranking to. */
export function getClassForPriority(
  db: AppDatabase,
  actor: Actor,
  classEntryId: number,
) {
  assertAllowed(permissions.manageStatPriorities(actor));
  const entry = db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        eq(gameCatalogEntries.id, classEntryId),
        eq(gameCatalogEntries.kind, "class"),
      ),
    )
    .get();
  if (!entry || !isGameEnabled(db, actor.guildId, entry.gameId)) {
    throw new NotFoundError("Klasse");
  }
  return entry;
}

export function createStatPriority(
  db: AppDatabase,
  actor: Actor,
  classEntryId: number,
  input: StatPriorityInput,
): StatPriorityResult {
  const classEntry = getClassForPriority(db, actor, classEntryId);
  const parsed = parseStatPriority(input);
  if (!parsed.ok) {
    return parsed;
  }
  db.insert(statPriorities)
    .values({
      ...parsed.values,
      updatedBy: actor.userId,
      gameId: classEntry.gameId,
      classEntryId: classEntry.id,
    })
    .run();
  auditPriority(
    db,
    actor,
    "statPriority.create",
    parsed.values.title,
    classEntry.id,
  );
  return { ok: true };
}

export function updateStatPriority(
  db: AppDatabase,
  actor: Actor,
  priorityId: number,
  input: StatPriorityInput,
): StatPriorityResult {
  const existing = getStatPriority(db, actor, priorityId);
  const parsed = parseStatPriority(input);
  if (!parsed.ok) {
    return parsed;
  }
  db.update(statPriorities)
    .set({ ...parsed.values, updatedBy: actor.userId })
    .where(eq(statPriorities.id, existing.id))
    .run();
  auditPriority(
    db,
    actor,
    "statPriority.update",
    parsed.values.title,
    existing.classEntryId,
  );
  return { ok: true };
}

function parseStatPriority(input: StatPriorityInput):
  | {
      ok: true;
      values: Pick<StatPriorityRow, "title" | "stats" | "notes" | "source">;
    }
  | { ok: false; errors: StatPriorityErrors } {
  const errors: StatPriorityErrors = {};
  const title = input.title.trim();
  if (!title) {
    errors.title = "Bitte einen Titel eingeben, z. B. „PvE“.";
  } else if (title.length > 40) {
    errors.title = "Höchstens 40 Zeichen.";
  }
  const stats = input.stats
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (stats.length === 0) {
    errors.stats = "Mindestens einen Stat eintragen, einen pro Zeile.";
  } else if (stats.length > MAX_STATS) {
    errors.stats = `Höchstens ${MAX_STATS} Stats.`;
  } else if (stats.some((stat) => stat.length > 40)) {
    errors.stats = "Ein Stat darf höchstens 40 Zeichen haben.";
  }
  const notes = input.notes.trim();
  if (notes.length > 500) {
    errors.notes = "Höchstens 500 Zeichen.";
  }
  const source = input.source.trim();
  if (source && !isHttpUrl(source)) {
    errors.source = "Bitte einen http(s)-Link eingeben.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    values: { title, stats, notes: notes || null, source: source || null },
  };
}

export function deleteStatPriority(
  db: AppDatabase,
  actor: Actor,
  priorityId: number,
): void {
  const priority = getStatPriority(db, actor, priorityId);
  db.delete(statPriorities).where(eq(statPriorities.id, priority.id)).run();
  auditPriority(
    db,
    actor,
    "statPriority.delete",
    priority.title,
    priority.classEntryId,
  );
}

function auditPriority(
  db: AppDatabase,
  actor: Actor,
  action: "statPriority.create" | "statPriority.update" | "statPriority.delete",
  title: string,
  classEntryId: number,
): void {
  recordAudit(db, actor.userId, action, title, { classEntryId });
}
