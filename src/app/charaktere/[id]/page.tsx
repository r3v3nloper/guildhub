import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddBuild } from "@/components/characters/AddBuild";
import { AddProfession } from "@/components/characters/AddProfession";
import { BuildItem } from "@/components/characters/BuildItem";
import { CharacterForm } from "@/components/characters/CharacterForm";
import {
  ClassAvatar,
  classTextColor,
} from "@/components/characters/ClassAvatar";
import { ProfessionDetailsForm } from "@/components/characters/ProfessionDetailsForm";
import { StatList } from "@/components/guild/StatList";
import { FoldCard } from "@/components/lists/FoldCard";
import { PackCredits } from "@/components/packs/PackCredits";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { statPrioritiesOfClass } from "@/lib/guild/stat-priorities";
import { specBuildsOf } from "@/lib/guild/spec-builds";
import {
  loadClassLearnings,
  upcomingLearnings,
} from "@/lib/roster/class-abilities";
import { NextLearningsCard } from "@/components/characters/NextLearningsCard";
import { SpecBuildList } from "@/components/guild/SpecBuildList";
import { idParam } from "@/lib/not-found";
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
  recipeOptionsOf,
} from "@/lib/roster/form-options";
import { loadGameCatalog } from "@/lib/roster/game-catalog";
import { textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import {
  deleteBuildAction,
  deleteCharacterAction,
  saveBuildAction,
  saveCharacterAction,
  saveProfessionDetailsAction,
  setProfessionsAction,
} from "../actions";

export const metadata: Metadata = { title: de.characters.title };

const SECTIONS = {
  allgemein: "general",
  berufe: "professions",
  builds: "builds",
} as const;
type SectionParam = keyof typeof SECTIONS;

async function EditCharacterContent({
  params,
  searchParams,
}: PageProps<"/charaktere/[id]">) {
  const actor = await requireActor();
  const characterId = await idParam(params);
  const requested = textParam((await searchParams).bereich);
  const db = getDb();
  const character = getCharacter(db, characterId);
  if (!character || !permissions.editOwnData(actor, character.userId).allowed) {
    notFound();
  }
  const catalog = loadGameCatalog(db, character.gameId, {
    withRecipes: true,
  });
  if (!catalog) {
    notFound();
  }
  const { capabilities } = catalog.game.meta;
  const statPriorities =
    character.classEntryId === null
      ? []
      : statPrioritiesOfClass(db, character.classEntryId);
  const classLearnings = loadClassLearnings(
    db,
    character.gameId,
    keyOfEntry(catalog, character.classEntryId),
  );
  const specBuilds = specBuildsOf(db, [
    character.specEntryId,
    character.offSpecEntryId,
  ]);

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
  const key = (entryId: number | null) => keyOfEntry(catalog, entryId);
  const professionKeys = character.professionEntryIds.map(key);

  const sections = (Object.keys(SECTIONS) as SectionParam[]).filter(
    (section) =>
      section === "allgemein" ||
      (section === "berufe" && capabilities.professions) ||
      (section === "builds" && capabilities.builds),
  );
  const section: SectionParam =
    requested && (sections as string[]).includes(requested)
      ? (requested as SectionParam)
      : "allgemein";
  const counts: Partial<Record<SectionParam, number>> = {
    berufe: character.professions.length,
    builds: character.builds.length,
  };

  const characterClass = options.classes.find(
    (option) => option.key === key(character.classEntryId),
  );
  const spec = options.specs.find(
    (option) => option.key === key(character.specEntryId),
  );
  const facts = [
    spec
      ? `${spec.label}${spec.role ? ` (${de.roles[spec.role] ?? spec.role})` : ""}`
      : character.spec,
    character.offSpecEntryId !== null &&
      `${de.characters.offSpec} ${entryName(character.offSpecEntryId)}`,
    character.level !== null && de.today.level(character.level),
    [
      character.serverName ?? character.serverKey,
      character.raceEntryId !== null && entryName(character.raceEntryId),
      character.factionEntryId !== null && entryName(character.factionEntryId),
    ]
      .filter(Boolean)
      .join(" · "),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/charaktere"
        className="flex min-h-9 w-fit items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-white"
      >
        <i className="pi pi-chevron-left text-xs" aria-hidden />
        {de.characters.backToList}
      </Link>

      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border border-border bg-surface px-6 py-5">
        <ClassAvatar
          size="lg"
          initial={character.name.charAt(0).toUpperCase()}
          color={characterClass?.color}
        />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-4xl leading-none font-semibold text-white">
              {character.name}
            </h1>
            {character.isMain && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-[#d9ccff]">
                {de.badges.main}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-muted">
            {characterClass && (
              <span
                className="font-bold"
                style={{ color: classTextColor(characterClass.color) }}
              >
                {characterClass.label}
              </span>
            )}
            {facts.map((fact) => (
              <span key={String(fact)}>{fact}</span>
            ))}
          </div>
        </div>
        <span className="text-[13px] text-muted">
          {localize(catalog.game.name)}
        </span>
      </header>

      {sections.length > 1 && (
        <nav
          aria-label={de.characters.sectionsLabel}
          className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
        >
          {sections.map((entry) => {
            const active = entry === section;
            const count = counts[entry];
            return (
              <Link
                key={entry}
                href={
                  entry === "allgemein"
                    ? `/charaktere/${character.id}`
                    : `/charaktere/${character.id}?bereich=${entry}`
                }
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-[14.5px] ${
                  active
                    ? "font-bold text-white shadow-[inset_0_-3px_0_var(--gh-accent)]"
                    : "font-semibold text-muted hover:text-white"
                }`}
              >
                {de.characters.sections[SECTIONS[entry]]}
                {count !== undefined && count > 0 && (
                  <span className="flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-chip px-1.5 text-xs font-bold text-soft tabular-nums">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {section === "allgemein" && (
        <CharacterForm
          mode="edit"
          action={saveCharacterAction.bind(
            null,
            character.gameId,
            character.id,
          )}
          options={options}
          knownServers={listKnownServers(db, character.gameId)}
          hints={characterHints(catalog, selection)}
          values={{
            name: character.name,
            server: character.serverName ?? character.serverKey ?? "",
            faction: key(character.factionEntryId),
            race: key(character.raceEntryId),
            characterClass: key(character.classEntryId),
            specKey: key(character.specEntryId),
            offSpecKey: key(character.offSpecEntryId),
            spec: character.spec ?? "",
            level: character.level?.toString() ?? "",
            isMain: character.isMain,
            notes: character.notes ?? "",
            professions: professionKeys,
          }}
          aside={
            <>
              {classLearnings.length > 0 && (
                <NextLearningsCard
                  upcoming={
                    character.level === null
                      ? []
                      : upcomingLearnings(classLearnings, character.level)
                  }
                  level={character.level}
                  meta={catalog.game.meta}
                />
              )}
              {specBuilds.length > 0 && (
                <FoldCard title={de.specBuilds.ofCharacter} defaultOpen>
                  <SpecBuildList
                    builds={specBuilds}
                    labelFor={(build) =>
                      build.specEntryId === character.offSpecEntryId
                        ? de.specBuilds.offSpec
                        : undefined
                    }
                  />
                </FoldCard>
              )}
              {statPriorities.length > 0 && (
                <FoldCard
                  title={de.statPriorities.ofClass}
                  note={characterClass?.label}
                >
                  <div className="flex flex-col gap-3">
                    {statPriorities.map((priority) => (
                      <StatList key={priority.id} priority={priority} />
                    ))}
                  </div>
                </FoldCard>
              )}
              <section
                aria-labelledby="delete-character"
                className="flex flex-col gap-2 rounded-[22px] border border-[#4a2430] p-4.5"
              >
                <h2
                  id="delete-character"
                  className="text-sm font-bold text-danger"
                >
                  {de.characters.deleteTitle}
                </h2>
                <p className="text-[13px] leading-relaxed text-muted">
                  {de.characters.deleteText(character.name)}
                </p>
                <ActionForm
                  action={deleteCharacterAction.bind(null, character.id)}
                >
                  <ConfirmButton
                    question={de.characters.deleteConfirm}
                    variant="danger"
                    text
                  >
                    {de.common.delete} …
                  </ConfirmButton>
                </ActionForm>
              </section>
            </>
          }
        />
      )}

      {section === "berufe" && (
        <div className="flex flex-col gap-3">
          {character.professions.length === 0 && (
            <p className="text-sm text-muted">{de.characters.noProfessions}</p>
          )}
          {character.professions.map((profession, index) => {
            const professionKey = key(profession.professionEntryId);
            const option = options.professions.find(
              (entry) => entry.key === professionKey,
            );
            return (
              <ProfessionDetailsForm
                key={profession.professionEntryId}
                entryId={profession.professionEntryId}
                label={entryName(profession.professionEntryId)}
                gathering={option?.professionKind === "gathering"}
                defaultOpen={index === 0}
                values={profession}
                recipeOptions={recipeOptionsOf(
                  catalog,
                  professionKey,
                  de.characters.recipeFromSkill,
                )}
                action={saveProfessionDetailsAction.bind(
                  null,
                  character.id,
                  profession.professionEntryId,
                )}
                removeControl={
                  <ActionForm
                    action={setProfessionsAction.bind(
                      null,
                      character.id,
                      professionKeys.filter((k) => k !== professionKey),
                    )}
                  >
                    <ConfirmButton
                      question={de.characters.removeProfessionConfirm}
                      variant="danger"
                      text
                    >
                      {de.characters.removeProfession}
                    </ConfirmButton>
                  </ActionForm>
                }
              />
            );
          })}
          <AddProfession
            options={options.professions
              .filter((option) => !professionKeys.includes(option.key))
              .map((option) => ({ value: option.key, label: option.label }))}
            currentKeys={professionKeys}
            setProfessions={setProfessionsAction.bind(null, character.id)}
          />
          <PackCredits meta={catalog.game.meta} label={de.directory.credits} />
        </div>
      )}

      {section === "builds" && (
        <div className="flex flex-col gap-2.5">
          {character.builds.length === 0 && (
            <p className="text-sm text-muted">{de.characters.noBuilds}</p>
          )}
          <ul className="flex flex-col gap-2.5">
            {character.builds.map((build) => (
              <BuildItem
                key={build.id}
                values={{
                  title: build.title,
                  url: build.url ?? "",
                  status: build.status,
                  targetClassKey: key(build.targetClassEntryId),
                  notes: build.notes ?? "",
                }}
                targetClassName={
                  build.targetClassEntryId === null
                    ? undefined
                    : entryName(build.targetClassEntryId)
                }
                classes={targetClasses}
                saveAction={saveBuildAction.bind(null, character.id, build.id)}
                deleteAction={deleteBuildAction.bind(
                  null,
                  character.id,
                  build.id,
                )}
              />
            ))}
          </ul>
          <AddBuild
            action={saveBuildAction.bind(null, character.id, undefined)}
            classes={targetClasses}
          />
        </div>
      )}
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
