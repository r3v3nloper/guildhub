import type { Metadata } from "next";
import Link from "next/link";
import {
  ClassAvatar,
  classTextColor,
} from "@/components/characters/ClassAvatar";
import { RequestMenu } from "@/components/guild/RequestMenu";
import { BuildRow } from "@/components/guild/SpecBuildList";
import { SpecBuildForm } from "@/components/guild/SpecBuildForm";
import { StatList } from "@/components/guild/StatList";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import type { CharacterRow } from "@/lib/roster/characters";
import { selectedGames } from "@/lib/game-filter";
import { listSpecBuilds, type SpecBuildView } from "@/lib/guild/spec-builds";
import {
  listStatPriorities,
  type ClassStatPriorities,
} from "@/lib/guild/stat-priorities";
import { keyOfEntry } from "@/lib/roster/form-options";
import { listCharactersOfUser } from "@/lib/roster/characters";
import {
  loadGameCatalog,
  selectableOfKind,
  type CatalogEntry,
} from "@/lib/roster/game-catalog";
import { idSearchParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { createSpecBuildAction, removeStatPriorityAction } from "./actions";

export const metadata: Metadata = { title: de.statPriorities.title };

/** A class with everything the page shows about it. */
interface ClassView {
  entry: ClassStatPriorities;
  name: string;
  specs: CatalogEntry[];
  builds: SpecBuildView[];
  /** The member's characters of this class. */
  own: CharacterRow[];
}

/**
 * Stat rankings and recommended builds, one class at a time: a picker with every class
 * (the member's own marked, and what each has), then the picked class. Without a pick
 * it opens on the member's main's class.
 */
async function StatPrioritiesContent({
  searchParams,
}: PageProps<"/stat-prio">) {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const withClasses = games.filter((game) => game.meta.capabilities.classes);
  const gameIds = withClasses.map((game) => game.id);
  const canEdit = permissions.manageStatPriorities(actor).allowed;
  const builds = listSpecBuilds(db, gameIds);
  const characters = listCharactersOfUser(db, actor.userId);
  const catalogs = new Map(
    gameIds.map((gameId) => [gameId, loadGameCatalog(db, gameId)]),
  );
  const views: ClassView[] = listStatPriorities(db, gameIds).map((entry) => {
    const catalog = catalogs.get(entry.gameId);
    const classKey = catalog ? keyOfEntry(catalog, entry.classEntryId) : "";
    return {
      entry,
      name: localize(entry.className),
      specs: catalog
        ? selectableOfKind(catalog, "spec").filter(
            (spec) => spec.data.class === classKey,
          )
        : [],
      builds: builds.filter(
        (build) => build.gameId === entry.gameId && build.classKey === classKey,
      ),
      own: characters.filter(
        (character) => character.classEntryId === entry.classEntryId,
      ),
    };
  });
  const requested = idSearchParam((await searchParams).klasse);
  const selected =
    views.find((view) => view.entry.classEntryId === requested) ??
    views.find((view) => view.own.some((character) => character.isMain)) ??
    views.find((view) => view.own.length > 0) ??
    views.find(
      (view) => view.entry.priorities.length + view.builds.length > 0,
    ) ??
    views[0];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={de.statPriorities.title}
        meta={<p className="text-sm text-muted">{de.statPriorities.intro}</p>}
      />
      {views.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {withClasses.map((game) => {
        const ofGame = views.filter((view) => view.entry.gameId === game.id);
        return (
          ofGame.length > 0 && (
            <ClassPicker
              key={game.id}
              label={
                withClasses.length > 1
                  ? localize(game.name)
                  : de.statPriorities.classPicker
              }
              showLabel={withClasses.length > 1}
              views={ofGame}
              selectedId={selected?.entry.classEntryId}
            />
          )
        );
      })}
      {selected && <ClassDetail view={selected} canEdit={canEdit} />}
    </div>
  );
}

function ClassPicker({
  label,
  showLabel,
  views,
  selectedId,
}: {
  label: string;
  showLabel: boolean;
  views: ClassView[];
  selectedId: number | undefined;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      {showLabel && (
        <span className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
          {label}
        </span>
      )}
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] md:overflow-visible md:px-0 md:pb-0">
        {views.map((view) => {
          const active = view.entry.classEntryId === selectedId;
          const filled = view.entry.priorities.length + view.builds.length > 0;
          return (
            <li key={view.entry.classEntryId} className="shrink-0 snap-start">
              <Link
                href={`/stat-prio?klasse=${view.entry.classEntryId}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-15 w-44 items-center gap-2.5 rounded-2xl border px-3 py-2 md:w-auto ${
                  active
                    ? "border-[#6e58c8] bg-accent-soft"
                    : "border-border bg-surface hover:border-[#3a3358]"
                }`}
              >
                <span className="relative">
                  <ClassAvatar
                    initial={view.name.charAt(0)}
                    color={view.entry.color}
                  />
                  {view.own.length > 0 && (
                    <span
                      title={de.statPriorities.yourClass}
                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success"
                    >
                      <span className="sr-only">
                        {de.statPriorities.yourClass}
                      </span>
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className="truncate text-sm font-bold"
                    style={{ color: classTextColor(view.entry.color) }}
                  >
                    {view.name}
                  </span>
                  <span
                    className={`truncate text-xs ${filled ? "text-soft" : "text-muted"}`}
                  >
                    {de.statPriorities.counts(
                      view.entry.priorities.length,
                      view.builds.length,
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ClassDetail({ view, canEdit }: { view: ClassView; canEdit: boolean }) {
  const { entry } = view;
  const ownSpecs = new Set(
    view.own.flatMap((character) => [
      character.specEntryId,
      character.offSpecEntryId,
    ]),
  );
  // Members only see specs with builds; officers see every spec to fill it.
  const specs = view.specs.filter(
    (spec) =>
      canEdit || view.builds.some((build) => build.specEntryId === spec.id),
  );

  return (
    <section
      aria-labelledby="class-title"
      className="flex flex-col gap-6 rounded-[26px] border border-border bg-[#120f20] p-4 md:p-6"
    >
      <header className="flex flex-wrap items-center gap-4">
        <ClassAvatar
          initial={view.name.charAt(0)}
          color={entry.color}
          size="lg"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id="class-title"
            className="font-display text-3xl font-semibold"
            style={{ color: classTextColor(entry.color) }}
          >
            {view.name}
          </h2>
          <span className="text-sm text-muted">
            {entry.role && (de.roles[entry.role] ?? entry.role)}
            {entry.role && view.own.length > 0 && " · "}
            {view.own.length > 0 &&
              de.statPriorities.yourCharacters(
                view.own.map((character) => character.name).join(", "),
              )}
          </span>
        </div>
        {canEdit && (
          <span className="w-full sm:w-auto">
            <ButtonLink href={`/stat-prio/neu?klasse=${entry.classEntryId}`}>
              + {de.statPriorities.addShort}
            </ButtonLink>
          </span>
        )}
      </header>

      <div className="flex flex-col gap-3">
        <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
          {de.statPriorities.title}
        </h3>
        {entry.priorities.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
            {canEdit
              ? de.statPriorities.emptyOfficer
              : de.statPriorities.emptyMember(view.name)}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-start gap-3">
            {entry.priorities.map((priority) => (
              <li
                key={priority.id}
                className="rounded-[20px] border border-border bg-surface p-4.5"
              >
                <StatList
                  priority={priority}
                  menu={
                    canEdit && (
                      <RequestMenu
                        label={de.statPriorities.menuFor(priority.title)}
                        question={de.statPriorities.deleteConfirm}
                        editHref={`/stat-prio/${priority.id}`}
                        onDelete={removeStatPriorityAction.bind(
                          null,
                          priority.id,
                        )}
                      />
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {view.specs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
            {de.specBuilds.title}
          </h3>
          {specs.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
              {de.specBuilds.emptyMember}
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] items-start gap-3">
              {specs.map((spec) => {
                const ofSpec = view.builds.filter(
                  (build) => build.specEntryId === spec.id,
                );
                const specName = localize(spec.name);
                return (
                  <li
                    key={spec.id}
                    className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-4.5"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-white">
                        {specName}
                      </span>
                      {ownSpecs.has(spec.id) && (
                        <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11.5px] font-bold text-success">
                          {de.specBuilds.yourSpec}
                        </span>
                      )}
                    </span>
                    {ofSpec.length === 0 ? (
                      <p className="text-[13px] text-muted">
                        {de.specBuilds.noneForSpec}
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-border">
                        {ofSpec.map((build) => (
                          <BuildRow
                            key={build.id}
                            build={build}
                            canEdit={canEdit}
                          />
                        ))}
                      </ul>
                    )}
                    {canEdit && (
                      <details className="group">
                        <summary className="-mx-2 flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-accent-strong hover:bg-raised hover:text-white [&::-webkit-details-marker]:hidden">
                          <i
                            className="pi pi-plus text-[11px] group-open:hidden"
                            aria-hidden
                          />
                          <i
                            className="pi pi-minus hidden text-[11px] group-open:inline"
                            aria-hidden
                          />
                          {de.specBuilds.addFor(specName)}
                        </summary>
                        <div className="mt-2">
                          <SpecBuildForm
                            action={createSpecBuildAction.bind(
                              null,
                              entry.gameId,
                            )}
                            specs={[]}
                            fixedSpec={spec.key}
                          />
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default function StatPrioritiesPage(props: PageProps<"/stat-prio">) {
  return (
    <PageSuspense>
      <StatPrioritiesContent {...props} />
    </PageSuspense>
  );
}
