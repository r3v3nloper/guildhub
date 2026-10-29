import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import Link from "next/link";
import { notFound } from "next/navigation";
import { idParam } from "@/lib/not-found";
import { BuildForm } from "@/components/characters/BuildForm";
import { BuildItem } from "@/components/characters/BuildItem";
import { CharacterForm } from "@/components/characters/CharacterForm";
import { ProfessionDetailsForm } from "@/components/characters/ProfessionDetailsForm";
import { StatList } from "@/components/guild/StatList";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { statPrioritiesOfClass } from "@/lib/guild/stat-priorities";
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
  saveProfessionDetailsAction,
} from "../actions";

export const metadata: Metadata = { title: de.characters.title };

async function EditCharacterContent({ params }: PageProps<"/charaktere/[id]">) {
  const actor = await requireActor();
  const characterId = await idParam(params);
  const db = getDb();
  const character = getCharacter(db, characterId);
  if (!character || !permissions.editOwnData(actor, character.userId).allowed) {
    notFound();
  }
  const catalog = loadGameCatalog(db, character.gameId);
  if (!catalog) {
    notFound();
  }
  const statPriorities =
    character.classEntryId === null
      ? []
      : statPrioritiesOfClass(db, character.classEntryId);

  const selection = selectionOf(character);
  const selectedIds = [
    selection.factionEntryId,
    selection.raceEntryId,
    selection.classEntryId,
    selection.specEntryId,
    selection.offSpecEntryId,
    ...selection.professionEntryIds,
  ].filter((id): id is number => id !== null);
  const options = characterFormOptions(catalog, selectedIds);
  const targetClasses = optionsOfKind(catalog, "class");
  const entryName = (entryId: number | null) =>
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
      <p className="-mt-4 text-sm text-muted">{localize(catalog.game.name)}</p>

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
          specKey: keyOfEntry(catalog, character.specEntryId),
          offSpecKey: keyOfEntry(catalog, character.offSpecEntryId),
          spec: character.spec ?? "",
          level: character.level?.toString() ?? "",
          isMain: character.isMain,
          notes: character.notes ?? "",
          professions: character.professionEntryIds.map((id) =>
            keyOfEntry(catalog, id),
          ),
        }}
      />

      {catalog.game.meta.capabilities.professions &&
        character.professions.length > 0 && (
          <Card title={de.characters.professionDetails}>
            <p className="text-sm text-muted">
              {de.characters.professionDetailsHint}
            </p>
            <div className="divide-y divide-border">
              {character.professions.map((profession) => (
                <ProfessionDetailsForm
                  key={profession.professionEntryId}
                  label={entryName(profession.professionEntryId)}
                  values={profession}
                  action={saveProfessionDetailsAction.bind(
                    null,
                    character.id,
                    profession.professionEntryId,
                  )}
                />
              ))}
            </div>
          </Card>
        )}

      {catalog.game.meta.capabilities.builds && (
        <Card title={de.characters.builds}>
          {character.builds.length === 0 ? (
            <p className="mb-4 text-sm text-muted">{de.characters.noBuilds}</p>
          ) : (
            <ul className="mb-4 divide-y divide-border">
              {character.builds.map((build) => (
                <BuildItem
                  key={build.id}
                  values={{
                    title: build.title,
                    url: build.url ?? "",
                    status: build.status,
                    targetClassKey: keyOfEntry(
                      catalog,
                      build.targetClassEntryId,
                    ),
                    notes: build.notes ?? "",
                  }}
                  targetClassName={
                    build.targetClassEntryId === null
                      ? undefined
                      : entryName(build.targetClassEntryId)
                  }
                  classes={targetClasses}
                  saveAction={saveBuildAction.bind(
                    null,
                    character.id,
                    build.id,
                  )}
                  deleteAction={deleteBuildAction.bind(
                    null,
                    character.id,
                    build.id,
                  )}
                />
              ))}
            </ul>
          )}
          <BuildForm
            action={saveBuildAction.bind(null, character.id, undefined)}
            classes={targetClasses}
          />
        </Card>
      )}

      {statPriorities.length > 0 && (
        <Card title={de.statPriorities.ofClass}>
          <div className="flex flex-col gap-3">
            {statPriorities.map((priority) => (
              <StatList key={priority.id} priority={priority} />
            ))}
          </div>
        </Card>
      )}

      <ActionForm action={deleteCharacterAction.bind(null, character.id)}>
        <ConfirmButton question={de.characters.deleteConfirm}>
          {de.common.delete}
        </ConfirmButton>
      </ActionForm>
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
