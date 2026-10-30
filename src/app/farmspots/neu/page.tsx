import type { Metadata } from "next";
import { FarmSpotForm } from "@/components/lists/FarmSpotForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { FormPage } from "@/components/ui/FormPage";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { professionGameOptions } from "@/lib/roster/profession-options";
import { de } from "@/i18n/de";
import { saveFarmSpotAction } from "../actions";

export const metadata: Metadata = { title: de.farmSpots.new };

async function NewFarmSpotContent() {
  const actor = await requireActor();
  const games = professionGameOptions(getDb(), actor.guildId, true);
  const selected = await readGameFilter(games.map((game) => game.value));

  return (
    <FormPage
      backHref="/farmspots?ansicht=spots"
      backLabel={de.common.backTo(de.farmSpots.views.spots)}
      title={de.farmSpots.new}
    >
      <FarmSpotForm
        action={saveFarmSpotAction.bind(null, undefined)}
        games={games}
        values={{
          game:
            selected ??
            games.find((game) => game.professions.length > 0)?.value ??
            games[0]?.value ??
            "",
          profession: "",
          resource: "",
          zone: "",
          coordinates: "",
          link: "",
          notes: "",
          visibility: "guild",
        }}
        isNew
      />
    </FormPage>
  );
}

export default function NewFarmSpotPage() {
  return (
    <PageSuspense>
      <NewFarmSpotContent />
    </PageSuspense>
  );
}
