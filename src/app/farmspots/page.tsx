import type { Metadata } from "next";
import Link from "next/link";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { SelectField } from "@/components/ui/SelectField";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  PageHeader,
  TextInput,
} from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listFarmSpots, type FarmSpotView } from "@/lib/lists/farm-spots";
import { professionGameOptions } from "@/lib/roster/profession-options";
import { textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { deleteFarmSpotAction } from "./actions";

export const metadata: Metadata = { title: de.farmSpots.title };

async function FarmSpotsContent({ searchParams }: PageProps<"/farmspots">) {
  const actor = await requireActor();
  const params = await searchParams;
  const db = getDb();
  const { games, selectedId } = await selectedGames(db, actor.guildId);
  const gameIds = games.map((game) => game.id);
  // Profession keys are only unique within a game, so that filter needs one game picked.
  const professions = selectedId
    ? (professionGameOptions(db, actor.guildId, true).find(
        (game) => game.value === selectedId,
      )?.professions ?? [])
    : [];
  const filter = {
    professionKey: professions.length > 0 ? textParam(params.beruf) : undefined,
    query: textParam(params.suche),
  };
  const allSpots = listFarmSpots(db, actor, gameIds);
  const spots = listFarmSpots(db, actor, gameIds, filter);
  const materials = [...new Set(allSpots.map((spot) => spot.resource))].sort(
    (a, b) => a.localeCompare(b),
  );
  const isFiltered = Boolean(filter.professionKey || filter.query);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={de.farmSpots.title}
        actions={
          games.length > 0 && (
            <ButtonLink href="/farmspots/neu">+ {de.farmSpots.new}</ButtonLink>
          )
        }
      />
      <p className="text-sm text-muted">{de.farmSpots.hint}</p>
      {allSpots.length > 0 && (
        <FarmSpotFilterForm
          professions={professions}
          materials={materials}
          values={filter}
          isFiltered={isFiltered}
        />
      )}
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {games.map((game) => {
        const ofGame = spots.filter((spot) => spot.gameId === game.id);
        return (
          <Card key={game.id} title={localize(game.name)}>
            {ofGame.length === 0 ? (
              <p className="text-sm text-muted">
                {isFiltered ? de.farmSpots.noMatches : de.farmSpots.empty}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {ofGame.map((spot) => (
                  <FarmSpotRow key={spot.id} spot={spot} />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function FarmSpotRow({ spot }: { spot: FarmSpotView }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{spot.resource}</span>
          {spot.professionName && (
            <Badge tone="accent">{localize(spot.professionName)}</Badge>
          )}
          {spot.visibility === "private" && (
            <Badge>{de.visibility.private}</Badge>
          )}
        </span>
        <span className="text-sm">
          {spot.zone}
          {spot.coordinates && (
            <span className="text-muted"> · {spot.coordinates}</span>
          )}
        </span>
        {spot.notes && (
          <span className="text-sm whitespace-pre-line text-muted">
            {spot.notes}
          </span>
        )}
        <span className="text-xs text-muted">{spot.ownerName}</span>
      </div>
      <span className="flex items-center gap-1">
        {spot.link && (
          <a
            href={spot.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={de.farmSpots.openMap}
            title={de.farmSpots.openMap}
            className="p-2 text-muted hover:text-accent"
          >
            <i className="pi pi-map" aria-hidden />
          </a>
        )}
        {spot.canEdit && (
          <>
            <Link
              href={`/farmspots/${spot.id}`}
              aria-label={de.farmSpots.editTitle}
              title={de.farmSpots.editTitle}
              className="p-2 text-muted hover:text-accent"
            >
              <i className="pi pi-pencil" aria-hidden />
            </Link>
            <DeleteForm
              action={deleteFarmSpotAction.bind(null, spot.id)}
              question={de.farmSpots.deleteConfirm}
            />
          </>
        )}
      </span>
    </li>
  );
}

function FarmSpotFilterForm({
  professions,
  materials,
  values,
  isFiltered,
}: {
  professions: Array<{ value: string; label: string }>;
  materials: string[];
  values: { professionKey?: string; query?: string };
  isFiltered: boolean;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <TextInput
        name="suche"
        defaultValue={values.query ?? ""}
        placeholder={de.farmSpots.searchPlaceholder}
        aria-label={de.farmSpots.search}
        list="farmspot-materials"
        className="max-w-xs"
      />
      <datalist id="farmspot-materials">
        {materials.map((material) => (
          <option key={material} value={material} />
        ))}
      </datalist>
      {professions.length > 0 && (
        <div className="w-48">
          <SelectField
            name="beruf"
            defaultValue={values.professionKey ?? ""}
            emptyLabel={de.farmSpots.allProfessions}
            options={professions}
            aria-label={de.farmSpots.profession}
          />
        </div>
      )}
      <Button icon="pi pi-filter" label={de.common.filter} />
      {isFiltered && (
        <ButtonLink href="/farmspots" variant="secondary">
          {de.common.reset}
        </ButtonLink>
      )}
    </form>
  );
}

export default function FarmSpotsPage(props: PageProps<"/farmspots">) {
  return (
    <PageSuspense>
      <FarmSpotsContent {...props} />
    </PageSuspense>
  );
}
