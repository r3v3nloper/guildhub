import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { notFound } from "next/navigation";
import { CharacterForm } from "@/components/characters/CharacterForm";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { listKnownServers } from "@/lib/roster/characters";
import { characterFormOptions } from "@/lib/roster/form-options";
import { isGameEnabled, loadGameCatalog } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { textParam } from "@/lib/search-params";
import { de } from "@/i18n/de";
import { saveCharacterAction } from "../actions";

export const metadata: Metadata = { title: de.characters.title };

async function NewCharacterContent({
  searchParams,
}: PageProps<"/charaktere/neu">) {
  const actor = await requireActor();
  const { spiel } = await searchParams;
  const gameId = textParam(spiel) ?? "";
  const db = getDb();
  const catalog = loadGameCatalog(db, gameId);
  if (!catalog || !isGameEnabled(db, actor.guildId, gameId)) {
    notFound();
  }

  const options = characterFormOptions(catalog);
  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title={de.characters.newTitle}
        eyebrow={localize(catalog.game.name)}
      />
      <CharacterForm
        mode="new"
        action={saveCharacterAction.bind(null, gameId, undefined)}
        options={options}
        knownServers={listKnownServers(db, gameId)}
        hints={[]}
        values={{
          name: "",
          server: "",
          faction: "",
          race: "",
          characterClass: "",
          specKey: "",
          offSpecKey: "",
          spec: "",
          level: "",
          isMain: false,
          notes: "",
          professions: [],
        }}
      />
    </div>
  );
}

export default function NewCharacterPage(props: PageProps<"/charaktere/neu">) {
  return (
    <PageSuspense>
      <NewCharacterContent {...props} />
    </PageSuspense>
  );
}
