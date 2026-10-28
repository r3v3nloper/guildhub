import { and, asc, eq, inArray } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import {
  farmSpots,
  gameCatalogEntries,
  users,
  VISIBILITIES,
  type Visibility,
} from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { isVisibleTo, visibleToFilter } from "./visible-entries";
import type { LocalizedString } from "@/lib/packs/schema";
import { isHttpUrl } from "@/lib/url";
import {
  catalogOfKind,
  isGameEnabled,
  loadGameCatalog,
} from "@/lib/roster/game-catalog";

export type FarmSpotRow = typeof farmSpots.$inferSelect;

export interface FarmSpotView extends FarmSpotRow {
  ownerName: string | null;
  professionKey: string | null;
  professionName: LocalizedString | null;
  canEdit: boolean;
}

export interface FarmSpotInput {
  gameId: string;
  professionKey: string;
  resource: string;
  zone: string;
  coordinates: string;
  link: string;
  notes: string;
  visibility: string;
}

export type FarmSpotErrors = Partial<Record<keyof FarmSpotInput, string>>;

export type FarmSpotResult =
  { ok: true } | { ok: false; errors: FarmSpotErrors };

/**
 * Farm spots for professions (SPEC 10, Phase 2): what, where (zone and coordinates as
 * text) and an optional link to an external map. Members keep them in the app, not in
 * the pack; each spot is private or shared with the guild.
 */
export function listFarmSpots(
  db: AppDatabase,
  actor: Actor,
  gameIds: readonly string[],
): FarmSpotView[] {
  if (gameIds.length === 0) {
    return [];
  }
  return db
    .select({
      spot: farmSpots,
      ownerName: users.name,
      professionKey: gameCatalogEntries.key,
      professionName: gameCatalogEntries.name,
    })
    .from(farmSpots)
    .innerJoin(users, eq(users.id, farmSpots.ownerId))
    .leftJoin(
      gameCatalogEntries,
      eq(gameCatalogEntries.id, farmSpots.professionEntryId),
    )
    .where(
      and(
        inArray(farmSpots.gameId, [...gameIds]),
        visibleToFilter(farmSpots, actor.userId),
      ),
    )
    .orderBy(asc(farmSpots.gameId), asc(farmSpots.resource))
    .all()
    .map(({ spot, ownerName, professionKey, professionName }) => ({
      ...spot,
      ownerName,
      professionKey,
      professionName,
      canEdit: permissions.editSharedEntry(actor, spot).allowed,
    }));
}

function visibleSpot(
  db: AppDatabase,
  actor: Actor,
  spotId: number,
): FarmSpotRow {
  const spot = db
    .select()
    .from(farmSpots)
    .where(eq(farmSpots.id, spotId))
    .get();
  if (!spot || !isVisibleTo(spot, actor.userId)) {
    throw new NotFoundError("Farmspot");
  }
  return spot;
}

export function getEditableFarmSpot(
  db: AppDatabase,
  actor: Actor,
  spotId: number,
): FarmSpotRow & { professionKey: string } {
  const spot = visibleSpot(db, actor, spotId);
  assertAllowed(permissions.editSharedEntry(actor, spot));
  const profession =
    spot.professionEntryId === null
      ? undefined
      : db
          .select({ key: gameCatalogEntries.key })
          .from(gameCatalogEntries)
          .where(eq(gameCatalogEntries.id, spot.professionEntryId))
          .get();
  return { ...spot, professionKey: profession?.key ?? "" };
}

/** Creates a farm spot, or updates it when `spotId` is given. */
export function saveFarmSpot(
  db: AppDatabase,
  actor: Actor,
  input: FarmSpotInput,
  spotId?: number,
): FarmSpotResult {
  const existing =
    spotId === undefined ? undefined : visibleSpot(db, actor, spotId);
  if (existing) {
    assertAllowed(permissions.editSharedEntry(actor, existing));
  } else {
    assertAllowed(permissions.editOwnData(actor, actor.userId));
  }

  const errors: FarmSpotErrors = {};
  const gameId = existing?.gameId ?? input.gameId;
  const catalog = loadGameCatalog(db, gameId);
  if (!catalog || (!existing && !isGameEnabled(db, actor.guildId, gameId))) {
    errors.gameId = "Bitte ein Spiel wählen.";
  }
  const text = (field: keyof FarmSpotInput, max: number, required = false) => {
    const value = input[field].trim();
    if (required && !value) {
      errors[field] = "Pflichtfeld.";
    } else if (value.length > max) {
      errors[field] = `Höchstens ${max} Zeichen.`;
    }
    return value || null;
  };
  const resource = text("resource", 60, true);
  const zone = text("zone", 60, true);
  const coordinates = text("coordinates", 40);
  const notes = text("notes", 500);
  const link = text("link", 300);
  if (link && !isHttpUrl(link)) {
    errors.link = "Bitte einen http(s)-Link eingeben.";
  }
  if (!VISIBILITIES.includes(input.visibility as Visibility)) {
    errors.visibility = "Bitte die Sichtbarkeit wählen.";
  }
  const profession = input.professionKey
    ? catalog &&
      catalogOfKind(catalog, "profession").find(
        (entry) =>
          entry.key === input.professionKey && entry.status !== "removed",
      )
    : undefined;
  if (input.professionKey && !profession) {
    errors.professionKey = "Unbekannter Beruf.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const values = {
    professionEntryId: profession?.id ?? null,
    resource: resource!,
    zone: zone!,
    coordinates,
    link,
    notes,
    visibility: input.visibility as Visibility,
  };
  if (existing) {
    db.update(farmSpots).set(values).where(eq(farmSpots.id, existing.id)).run();
  } else {
    db.insert(farmSpots)
      .values({ ...values, ownerId: actor.userId, gameId })
      .run();
  }
  return { ok: true };
}

export function deleteFarmSpot(
  db: AppDatabase,
  actor: Actor,
  spotId: number,
): void {
  const spot = visibleSpot(db, actor, spotId);
  assertAllowed(permissions.editSharedEntry(actor, spot));
  db.delete(farmSpots).where(eq(farmSpots.id, spotId)).run();
}
