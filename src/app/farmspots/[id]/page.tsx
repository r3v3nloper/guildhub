import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FarmSpotForm } from "@/components/lists/FarmSpotForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { farmSpotGames } from "@/lib/lists/farm-spot-form-options";
import { getEditableFarmSpot } from "@/lib/lists/farm-spots";
import { orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import { saveFarmSpotAction } from "../actions";

export const metadata: Metadata = { title: de.farmSpots.editTitle };

async function EditFarmSpotContent({ params }: PageProps<"/farmspots/[id]">) {
  const actor = await requireActor();
  const spotId = Number((await params).id);
  const db = getDb();
  if (!Number.isInteger(spotId)) {
    notFound();
  }
  const spot = orNotFound(() => getEditableFarmSpot(db, actor, spotId));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.farmSpots.editTitle} />
      <FarmSpotForm
        action={saveFarmSpotAction.bind(null, spot.id)}
        games={farmSpotGames(db, actor.guildId, false)}
        values={{
          game: spot.gameId,
          profession: spot.professionKey,
          resource: spot.resource,
          zone: spot.zone,
          coordinates: spot.coordinates ?? "",
          link: spot.link ?? "",
          notes: spot.notes ?? "",
          visibility: spot.visibility,
        }}
        isNew={false}
      />
    </div>
  );
}

export default function EditFarmSpotPage(props: PageProps<"/farmspots/[id]">) {
  return (
    <PageSuspense>
      <EditFarmSpotContent {...props} />
    </PageSuspense>
  );
}
