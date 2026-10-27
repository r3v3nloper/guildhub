import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuildForm } from "@/components/characters/BuildForm";
import { CharacterForm } from "@/components/characters/CharacterForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Badge, Button, Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { characterHints } from "@/lib/roster/character-rules";
import {
  getCharacter,
  listKnownServers,
  selectionOf,
} from "@/lib/roster/characters";
import {
  characterFormOptions,
  keyOfEntry,
  optionsOfKind,
} from "@/lib/roster/form-options";
import { loadGameCatalog } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import {
  deleteBuildAction,
  deleteCharacterAction,
  saveBuildAction,
  saveCharacterAction,
} from "../actions";

export const metadata: Metadata = { title: de.characters.title };

async function EditCharacterContent({ params }: PageProps<"/charaktere/[id]">) {
  const actor = await requireActor();
  const characterId = Number((await params).id);
  const db = getDb();
  const character = Number.isInteger(characterId)
    ? getCharacter(db, characterId)
    : undefined;
  if (!character || !permissions.editOwnData(actor, character.userId).allowed) {
    notFound();
  }
  const catalog = loadGameCatalog(db, character.gameId);
  if (!catalog) {
    notFound();
  }

  const selection = selectionOf(character);
  const selectedIds = [
    selection.factionEntryId,
    selection.raceEntryId,
    selection.classEntryId,
    ...selection.professionEntryIds,
  ].filter((id): id is number => id !== null);
  const options = characterFormOptions(catalog, selectedIds);
  const targetClasses = optionsOfKind(catalog, "class");
  const className = (entryId: number | null) =>
    localize(catalog.entries.find((entry) => entry.id === entryId)?.name);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${character.name} ${de.characters.editTitle}`}
        actions={
          <Link href="/charaktere" className="text-sm text-accent">
            {de.common.back}
          </Link>
        }
      />
      <p className="-mt-4 text-sm text-zinc-500">
        {localize(catalog.game.name)}
      </p>

      <CharacterForm
        action={saveCharacterAction.bind(null, character.gameId, character.id)}
        options={options}
        knownServers={listKnownServers(db, character.gameId)}
        hints={characterHints(catalog, selection)}
        values={{
          name: character.name,
          server: character.serverName ?? character.serverKey ?? "",
          faction: keyOfEntry(catalog, character.factionEntryId),
          race: keyOfEntry(catalog, character.raceEntryId),
          characterClass: keyOfEntry(catalog, character.classEntryId),
          spec: character.spec ?? "",
          level: character.level?.toString() ?? "",
          isMain: character.isMain,
          notes: character.notes ?? "",
          professions: character.professionEntryIds.map((id) =>
            keyOfEntry(catalog, id),
          ),
        }}
      />

      {catalog.game.meta.capabilities.builds && (
        <Card title={de.characters.builds}>
          {character.builds.length === 0 ? (
            <p className="mb-4 text-sm text-zinc-500">
              {de.characters.noBuilds}
            </p>
          ) : (
            <ul className="mb-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {character.builds.map((build) => (
                <li
                  key={build.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <Badge
                    tone={build.status === "current" ? "accent" : "neutral"}
                  >
                    {build.status === "current"
                      ? de.characters.buildCurrent
                      : de.characters.buildPlanned}
                  </Badge>
                  {build.url ? (
                    <a
                      href={build.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline"
                    >
                      {build.title}
                    </a>
                  ) : (
                    <span>{build.title}</span>
                  )}
                  {build.targetClassEntryId !== null && (
                    <span className="text-zinc-500">
                      → {className(build.targetClassEntryId)}
                    </span>
                  )}
                  {build.notes && (
                    <span className="text-zinc-500">{build.notes}</span>
                  )}
                  <form
                    action={deleteBuildAction.bind(
                      null,
                      character.id,
                      build.id,
                    )}
                    className="ml-auto"
                  >
                    <Button variant="secondary">{de.common.delete}</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <BuildForm
            action={saveBuildAction.bind(null, character.id)}
            classes={targetClasses}
          />
        </Card>
      )}

      <form action={deleteCharacterAction.bind(null, character.id)}>
        <ConfirmButton question={de.characters.deleteConfirm}>
          {de.common.delete}
        </ConfirmButton>
      </form>
    </div>
  );
}

export default function EditCharacterPage(
  props: PageProps<"/charaktere/[id]">,
) {
  return (
    <PageSuspense>
      <EditCharacterContent {...props} />
    </PageSuspense>
  );
}
