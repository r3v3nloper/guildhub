import type { Metadata } from "next";
import { ChecklistForm } from "@/components/lists/ChecklistForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { instanceTemplates } from "@/lib/lists/dungeon-instances";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { saveChecklistAction } from "../actions";

export const metadata: Metadata = { title: de.checklists.new };

async function NewChecklistContent() {
  const actor = await requireActor();
  const db = getDb();
  const games = listEnabledGames(db, actor.guildId);
  const selected = await readGameFilter(games.map((game) => game.id));
  const instancesByGame = Object.fromEntries(
    games.map((game) => [
      game.id,
      instanceTemplates(db, game.id).map((instance) => ({
        value: instance.key,
        label: de.checklists.instanceLabel(
          instance.name,
          instance.kind,
          instance.players,
          instance.levelMin,
          instance.levelMax,
        ),
        name: instance.name,
        bosses: instance.bosses,
      })),
    ]),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.checklists.new} />
      <ChecklistForm
        action={saveChecklistAction.bind(null, undefined)}
        games={games.map((game) => ({
          value: game.id,
          label: localize(game.name),
        }))}
        instancesByGame={instancesByGame}
        values={{
          name: "",
          game: selected ?? games[0]?.id ?? "",
          visibility: "guild",
          items: "",
          notes: "",
        }}
        isNew
      />
    </div>
  );
}

export default function NewChecklistPage() {
  return (
    <PageSuspense>
      <NewChecklistContent />
    </PageSuspense>
  );
}
