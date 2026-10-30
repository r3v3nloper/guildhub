import type { Metadata } from "next";
import Link from "next/link";
import { StatList } from "@/components/guild/StatList";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import {
  listStatPriorities,
  type ClassStatPriorities,
} from "@/lib/guild/stat-priorities";
import { localize } from "@/i18n/localize";
import { SpecBuildForm } from "@/components/guild/SpecBuildForm";
import { SpecBuildList } from "@/components/guild/SpecBuildList";
import type { SelectOption } from "@/components/ui/SelectField";
import { listSpecBuilds, type SpecBuildView } from "@/lib/guild/spec-builds";
import { keyOfEntry } from "@/lib/roster/form-options";
import { loadGameCatalog, selectableOfKind } from "@/lib/roster/game-catalog";
import { createSpecBuildAction } from "./actions";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.statPriorities.title };

async function StatPrioritiesContent() {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const withClasses = games.filter((game) => game.meta.capabilities.classes);
  const classes = listStatPriorities(
    db,
    withClasses.map((game) => game.id),
  );
  const canEdit = permissions.manageStatPriorities(actor).allowed;
  const builds = listSpecBuilds(
    db,
    withClasses.map((game) => game.id),
  );
  const catalogs = new Map(
    withClasses.map((game) => [game.id, loadGameCatalog(db, game.id)]),
  );
  /** The class key and its active specs, as choices for new recommendations. */
  const specsOf = (entry: ClassStatPriorities) => {
    const catalog = catalogs.get(entry.gameId);
    const classKey = catalog ? keyOfEntry(catalog, entry.classEntryId) : "";
    const specs = catalog
      ? selectableOfKind(catalog, "spec")
          .filter((spec) => spec.data.class === classKey)
          .map((spec) => ({ value: spec.key, label: localize(spec.name) }))
      : [];
    return { classKey, specs };
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.statPriorities.title} />
      <p className="text-sm text-muted">
        {de.statPriorities.hint} {de.specBuilds.hint}
      </p>
      {withClasses.map((game) => (
        <section key={game.id} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{localize(game.name)}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {classes
              .filter((entry) => entry.gameId === game.id)
              .map((entry) => (
                <ClassCard
                  key={entry.classEntryId}
                  entry={entry}
                  canEdit={canEdit}
                  builds={builds.filter(
                    (build) =>
                      build.gameId === entry.gameId &&
                      build.classKey === specsOf(entry).classKey,
                  )}
                  specs={specsOf(entry).specs}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ClassCard({
  entry,
  canEdit,
  builds,
  specs,
}: {
  entry: ClassStatPriorities;
  canEdit: boolean;
  builds: SpecBuildView[];
  /** The class's specs; without any the game has no spec catalog. */
  specs: SelectOption[];
}) {
  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2">
          <span style={entry.color ? { color: entry.color } : undefined}>
            {localize(entry.className)}
            {entry.role && (
              <span className="ml-2 text-sm font-normal text-muted">
                {de.roles[entry.role] ?? entry.role}
              </span>
            )}
          </span>
          {canEdit && (
            <Link
              href={`/stat-prio/neu?klasse=${entry.classEntryId}`}
              aria-label={de.statPriorities.add}
              title={de.statPriorities.add}
              className="text-base text-muted hover:text-accent"
            >
              <i className="pi pi-plus" aria-hidden />
            </Link>
          )}
        </span>
      }
    >
      {entry.priorities.length === 0 ? (
        <p className="text-sm text-muted">{de.statPriorities.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {entry.priorities.map((priority) => (
            <li
              key={priority.id}
              className="flex items-start justify-between gap-2 py-2"
            >
              <StatList priority={priority} />
              {canEdit && (
                <Link
                  href={`/stat-prio/${priority.id}`}
                  aria-label={de.statPriorities.edit}
                  title={de.statPriorities.edit}
                  className="text-muted hover:text-accent"
                >
                  <i className="pi pi-pencil" aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {specs.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
          <span className="text-sm font-semibold">{de.specBuilds.title}</span>
          {builds.length === 0 ? (
            <p className="text-sm text-muted">{de.specBuilds.empty}</p>
          ) : (
            <SpecBuildList builds={builds} canEdit={canEdit} />
          )}
          {canEdit && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-accent-strong hover:text-white">
                {de.specBuilds.add}
              </summary>
              <div className="mt-2">
                <SpecBuildForm
                  action={createSpecBuildAction.bind(null, entry.gameId)}
                  specs={specs}
                />
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}

export default function StatPrioritiesPage() {
  return (
    <PageSuspense>
      <StatPrioritiesContent />
    </PageSuspense>
  );
}
