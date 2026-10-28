import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { DistributionSummary } from "@/components/roster/DistributionSummary";
import { MemberCard } from "@/components/roster/MemberCard";
import { RosterFilterForm } from "@/components/roster/RosterFilterForm";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { optionsOfKind } from "@/lib/roster/form-options";
import { listEnabledGames, loadGameCatalog } from "@/lib/roster/game-catalog";
import {
  filterRoster,
  loadRosterMembers,
  type RosterFilters,
} from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { textParam } from "@/lib/search-params";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.roster.title };

async function RosterContent({ searchParams }: PageProps<"/roster">) {
  const actor = await requireActor();
  const db = getDb();
  const games = listEnabledGames(db, actor.guildId);
  const gameId = await readGameFilter(games.map((game) => game.id));
  const query = await searchParams;

  const filters: RosterFilters = {
    gameId,
    classKey: gameId ? textParam(query.klasse) : undefined,
    professionKey: gameId ? textParam(query.beruf) : undefined,
    factionKey: gameId ? textParam(query.fraktion) : undefined,
    role: textParam(query.rolle),
    showFormer: query.ehemalige === "1",
  };
  const roster = filterRoster(loadRosterMembers(db, actor.guildId), filters);

  const catalog = gameId ? loadGameCatalog(db, gameId) : undefined;
  const choices = catalog && {
    classes: optionsOfKind(catalog, "class"),
    professions: optionsOfKind(catalog, "profession"),
    factions: optionsOfKind(catalog, "faction"),
  };
  const gameNames = gameId
    ? undefined
    : new Map(games.map((game) => [game.id, localize(game.name)]));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          catalog
            ? `${de.roster.title}: ${localize(catalog.game.name)}`
            : de.roster.title
        }
      />
      <RosterFilterForm filters={filters} choices={choices} />
      <DistributionSummary classes={roster.classes} roles={roster.roles} />
      {roster.members.length === 0 ? (
        <p className="text-muted">{de.roster.empty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {roster.members.map((member) => (
            <MemberCard
              key={member.userId}
              member={member}
              gameNames={gameNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RosterPage(props: PageProps<"/roster">) {
  return (
    <PageSuspense>
      <RosterContent {...props} />
    </PageSuspense>
  );
}
