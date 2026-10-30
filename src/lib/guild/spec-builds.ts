import { and, asc, eq, inArray } from "drizzle-orm";
import { recordAudit } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries, specBuilds } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { isGameEnabled } from "@/lib/roster/game-catalog";
import { isHttpUrl } from "@/lib/url";
import { localize } from "@/i18n/localize";

export type SpecBuildRow = typeof specBuilds.$inferSelect;

/** A recommended build with the spec it is for, as the pages show it. */
export interface SpecBuildView extends SpecBuildRow {
  specName: string;
  classKey: string;
}

export interface SpecBuildInput {
  specKey: string;
  title: string;
  url: string;
  notes: string;
}

export type SpecBuildErrors = Partial<Record<keyof SpecBuildInput, string>>;

export type SpecBuildResult =
  { ok: true } | { ok: false; errors: SpecBuildErrors };

const TITLE_MAX = 60;
const NOTES_MAX = 300;

/**
 * The builds officers recommend per spec, so members need not search for one (SPEC 10).
 * Kept apart from the characters' own build links: these are the guild's advice.
 */
export function listSpecBuilds(
  db: AppDatabase,
  gameIds: readonly string[],
): SpecBuildView[] {
  if (gameIds.length === 0) {
    return [];
  }
  return withSpecs(
    db,
    db
      .select()
      .from(specBuilds)
      .where(inArray(specBuilds.gameId, [...gameIds]))
      .orderBy(asc(specBuilds.id))
      .all(),
  );
}

/** The recommendations for some specs, e.g. a character's main and off-spec. */
export function specBuildsOf(
  db: AppDatabase,
  specEntryIds: ReadonlyArray<number | null>,
): SpecBuildView[] {
  const ids = specEntryIds.filter((id): id is number => id !== null);
  if (ids.length === 0) {
    return [];
  }
  return withSpecs(
    db,
    db
      .select()
      .from(specBuilds)
      .where(inArray(specBuilds.specEntryId, ids))
      .orderBy(asc(specBuilds.id))
      .all(),
  );
}

function withSpecs(db: AppDatabase, rows: SpecBuildRow[]): SpecBuildView[] {
  if (rows.length === 0) {
    return [];
  }
  const specs = new Map(
    db
      .select()
      .from(gameCatalogEntries)
      .where(
        inArray(
          gameCatalogEntries.id,
          rows.map((row) => row.specEntryId),
        ),
      )
      .all()
      .map((entry) => [entry.id, entry]),
  );
  return rows.map((row) => {
    const spec = specs.get(row.specEntryId);
    return {
      ...row,
      specName: localize(spec?.name),
      classKey: String(spec?.data.class ?? ""),
    };
  });
}

export function createSpecBuild(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  input: SpecBuildInput,
): SpecBuildResult {
  assertAllowed(permissions.manageStatPriorities(actor));
  if (!isGameEnabled(db, actor.guildId, gameId)) {
    throw new NotFoundError("Spiel");
  }
  const errors: SpecBuildErrors = {};
  const spec = db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        eq(gameCatalogEntries.gameId, gameId),
        eq(gameCatalogEntries.kind, "spec"),
        eq(gameCatalogEntries.key, input.specKey),
        eq(gameCatalogEntries.status, "active"),
      ),
    )
    .get();
  if (!spec) {
    errors.specKey = "Bitte eine Spezialisierung wählen.";
  }
  const title = input.title.trim();
  if (!title) {
    errors.title = "Bitte einen Titel eingeben, z. B. „Leveln“ oder „Raid“.";
  } else if (title.length > TITLE_MAX) {
    errors.title = `Höchstens ${TITLE_MAX} Zeichen.`;
  }
  const url = input.url.trim();
  if (!isHttpUrl(url)) {
    errors.url = "Bitte einen vollständigen Link (https://…) angeben.";
  }
  const notes = input.notes.trim();
  if (notes.length > NOTES_MAX) {
    errors.notes = `Höchstens ${NOTES_MAX} Zeichen.`;
  }
  if (!spec || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  db.insert(specBuilds)
    .values({
      gameId,
      specEntryId: spec.id,
      title,
      url,
      notes: notes || null,
      updatedBy: actor.userId,
    })
    .run();
  recordAudit(db, actor.userId, "specBuild.create", title, {
    specEntryId: spec.id,
  });
  return { ok: true };
}

export function deleteSpecBuild(
  db: AppDatabase,
  actor: Actor,
  buildId: number,
): void {
  assertAllowed(permissions.manageStatPriorities(actor));
  const build = db
    .select()
    .from(specBuilds)
    .where(eq(specBuilds.id, buildId))
    .get();
  if (!build) {
    throw new NotFoundError("Build-Empfehlung");
  }
  db.delete(specBuilds).where(eq(specBuilds.id, build.id)).run();
  recordAudit(db, actor.userId, "specBuild.delete", build.title, {
    specEntryId: build.specEntryId,
  });
}
