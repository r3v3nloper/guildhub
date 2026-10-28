import type { Metadata } from "next";
import Link from "next/link";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listFarmSpots, type FarmSpotView } from "@/lib/lists/farm-spots";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { deleteFarmSpotAction } from "./actions";

export const metadata: Metadata = { title: de.farmSpots.title };

async function FarmSpotsContent() {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const spots = listFarmSpots(
    db,
    actor,
    games.map((game) => game.id),
  );

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
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {games.map((game) => {
        const ofGame = spots.filter((spot) => spot.gameId === game.id);
        return (
          <Card key={game.id} title={localize(game.name)}>
            {ofGame.length === 0 ? (
              <p className="text-sm text-muted">{de.farmSpots.empty}</p>
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

export default function FarmSpotsPage() {
  return (
    <PageSuspense>
      <FarmSpotsContent />
    </PageSuspense>
  );
}
