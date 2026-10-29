import { eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { builds, type BuildStatus } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { isHttpUrl } from "@/lib/url";
import { detectBuildSource } from "./build-source";
import { ownedCharacter, requireCatalog } from "./characters";
import { catalogOfKind } from "./game-catalog";

export interface BuildInput {
  title: string;
  url: string;
  status: BuildStatus;
  targetClassKey: string;
  notes: string;
}

export type BuildErrors = Partial<Record<keyof BuildInput, string>>;

export type BuildSaveResult = { ok: true } | { ok: false; errors: BuildErrors };

/** Adds a build link, or updates it when `buildId` is given. */
export function saveBuild(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  input: BuildInput,
  buildId?: number,
): BuildSaveResult {
  const character = ownedCharacter(db, actor, characterId);
  const existing = buildId
    ? character.builds.find((build) => build.id === buildId)
    : undefined;
  if (buildId && !existing) {
    throw new NotFoundError("Build");
  }

  const catalog = requireCatalog(db, character.gameId);
  const errors: BuildErrors = {};
  const url = input.url.trim();
  if (url && !isHttpUrl(url)) {
    errors.url = "Bitte einen vollständigen Link (https://…) angeben.";
  }
  const source = url
    ? detectBuildSource(url, catalog.game.meta.buildSources)
    : undefined;
  const title = input.title.trim() || source || "";
  if (!title) {
    errors.title = "Titel oder Link angeben.";
  }

  let targetClassEntryId: number | null = null;
  if (input.status === "planned" && input.targetClassKey) {
    const entry = catalogOfKind(catalog, "class").find(
      (e) => e.key === input.targetClassKey,
    );
    if (
      !entry ||
      (entry.status !== "active" && entry.id !== existing?.targetClassEntryId)
    ) {
      errors.targetClassKey = "Klasse nicht auswählbar.";
    } else {
      targetClassEntryId = entry.id;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const values = {
    title,
    url: url || null,
    source: source ?? null,
    status: input.status,
    targetClassEntryId,
    notes: input.notes.trim() || null,
  };
  if (existing) {
    db.update(builds).set(values).where(eq(builds.id, existing.id)).run();
  } else {
    db.insert(builds)
      .values({ ...values, characterId })
      .run();
  }
  return { ok: true };
}

export function deleteBuild(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  buildId: number,
): void {
  const character = ownedCharacter(db, actor, characterId);
  if (!character.builds.some((build) => build.id === buildId)) {
    throw new NotFoundError("Build");
  }
  db.delete(builds).where(eq(builds.id, buildId)).run();
}
