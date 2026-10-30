import type { Metadata } from "next";
import { FarmSpotForm } from "@/components/lists/FarmSpotForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { FormPage } from "@/components/ui/FormPage";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { professionGameOptions } from "@/lib/roster/profession-options";
import { getEditableFarmSpot } from "@/lib/lists/farm-spots";
import { idParam, orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import { saveFarmSpotAction } from "../actions";

export const metadata: Metadata = { title: de.farmSpots.editTitle };

async function EditFarmSpotContent({ params }: PageProps<"/farmspots/[id]">) {
  const actor = await requireActor();
  const spotId = await idParam(params);
  const db = getDb();
  const spot = orNotFound(() => getEditableFarmSpot(db, actor, spotId));

  return (
    <FormPage
      backHref="/farmspots?ansicht=spots"
      backLabel={de.common.backTo(de.farmSpots.views.spots)}
      title={de.farmSpots.editTitle}
    >
      <FarmSpotForm
        action={saveFarmSpotAction.bind(null, spot.id)}
        games={professionGameOptions(db, actor.guildId, false)}
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
    </FormPage>
  );
}

export default function EditFarmSpotPage(props: PageProps<"/farmspots/[id]">) {
  return (
    <PageSuspense>
      <EditFarmSpotContent {...props} />
    </PageSuspense>
  );
}
