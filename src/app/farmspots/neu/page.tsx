import type { Metadata } from "next";
import { FarmSpotForm } from "@/components/lists/FarmSpotForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { farmSpotGames } from "@/lib/lists/farm-spot-form-options";
import { de } from "@/i18n/de";
import { saveFarmSpotAction } from "../actions";

export const metadata: Metadata = { title: de.farmSpots.new };

async function NewFarmSpotContent() {
  const actor = await requireActor();
  const games = farmSpotGames(getDb(), actor.guildId, true);
  const selected = await readGameFilter(games.map((game) => game.value));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.farmSpots.new} />
      <FarmSpotForm
        action={saveFarmSpotAction.bind(null, undefined)}
        games={games}
        values={{
          game: selected ?? games[0]?.value ?? "",
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
    </div>
  );
}

export default function NewFarmSpotPage() {
  return (
    <PageSuspense>
      <NewFarmSpotContent />
    </PageSuspense>
  );
}
