import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GathererCard } from "@/components/farmspots/GathererCard";
import { MaterialFinder } from "@/components/farmspots/MaterialFinder";
import { SkillExplorer } from "@/components/farmspots/SkillExplorer";
import { SpotCard } from "@/components/farmspots/SpotCard";
import { SectionLabel } from "@/components/farmspots/bits";
import { PackCredits } from "@/components/packs/PackCredits";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listFarmSpots, type FarmSpotView } from "@/lib/lists/farm-spots";
import {
  gatheringTips,
  loadGatheringGuides,
  materialIndex,
  type GatheringGuide,
  type GatheringTip,
} from "@/lib/lists/gathering-guide";
import type { GuildGameInfo } from "@/lib/roster/game-catalog";
import { loadRosterMembers } from "@/lib/roster/roster";
import { textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { setProfessionSkillAction } from "@/components/today/today-actions";
import { deleteFarmSpotAction } from "./actions";

export const metadata: Metadata = { title: de.farmSpots.title };

const VIEWS = {
  "fuer-dich": "forYou",
  material: "material",
  fertigkeit: "skill",
  spots: "spots",
} as const;
type ViewParam = keyof typeof VIEWS;

const LATEST_SPOTS = 3;
const MATERIAL_SUGGESTIONS = 8;

const guideKey = (guide: { gameId: string; professionKey: string }) =>
  `${guide.gameId}:${guide.professionKey}`;

function spotsHref(professionKey?: string) {
  return professionKey
    ? `/farmspots?ansicht=spots&beruf=${encodeURIComponent(professionKey)}`
    : "/farmspots?ansicht=spots";
}

/**
 * Farm spots and where to gather: "Für dich" answers "where do I go now" per gathering
 * character, "Material finden" and "Nach Fertigkeit" look the pack's guides up, and
 * "Gilden-Spots" are the members' own tips. Without guides only the spots remain.
 */
async function FarmSpotsContent({ searchParams }: PageProps<"/farmspots">) {
  const actor = await requireActor();
  const params = await searchParams;
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const gameIds = games.map((game) => game.id);
  const guides = loadGatheringGuides(db, gameIds);
  const requested = textParam(params.ansicht);
  const view: ViewParam =
    guides.length === 0
      ? "spots"
      : requested && requested in VIEWS
        ? (requested as ViewParam)
        : "fuer-dich";
  const spots = listFarmSpots(db, actor, gameIds);
  // Game names only where the content spans games; one game needs no label.
  const namesIfMixed = (ids: Iterable<string>) =>
    new Set(ids).size > 1
      ? new Map(games.map((game) => [game.id, localize(game.name)]))
      : undefined;
  const guideGames = namesIfMixed(guides.map((guide) => guide.gameId));
  const tips = gatheringTips(
    guides,
    loadRosterMembers(db, actor.guildId, actor.userId)[0]?.characters ?? [],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={de.farmSpots.title}
        eyebrow={games.length === 1 ? localize(games[0].name) : undefined}
        meta={<p className="text-sm text-muted">{de.farmSpots.intro}</p>}
        actions={
          games.length > 0 && (
            <ButtonLink href="/farmspots/neu">
              + {de.farmSpots.share}
            </ButtonLink>
          )
        }
      />
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {guides.length > 0 && (
        <ViewTabs
          label={de.farmSpots.viewLabel}
          active={view}
          tabs={(Object.keys(VIEWS) as ViewParam[]).map((key) => ({
            key,
            href: `/farmspots?ansicht=${key}`,
            label: de.farmSpots.views[VIEWS[key]],
            count: key === "spots" ? spots.length : undefined,
          }))}
        />
      )}
      {view === "fuer-dich" && <ForYou tips={tips} spots={spots} />}
      {view === "material" && (
        <MaterialFinder
          entries={materialIndex(guides)}
          spots={spots.map((spot) => ({
            id: spot.id,
            resource: spot.resource,
            zone: spot.zone,
            coordinates: spot.coordinates,
            ownerName: spot.ownerName,
          }))}
          suggestions={materialSuggestions(guides, tips, spots)}
          initialQuery={textParam(params.material) ?? ""}
        />
      )}
      {view === "fertigkeit" && (
        <SkillExplorer
          initialKey={guideKey(
            tips.find((tip) => tip.skill !== null) ?? guides[0],
          )}
          guides={guides.map((guide) => ({
            key: guideKey(guide),
            label: guideGames
              ? `${guide.professionName} · ${guideGames.get(guide.gameId)}`
              : guide.professionName,
            guide,
            skill: ownSkill(tips, guide),
          }))}
        />
      )}
      {view === "spots" && (
        <GuildSpots
          spots={spots}
          gameNames={namesIfMixed(spots.map((spot) => spot.gameId))}
          professionKey={textParam(params.beruf)}
          query={textParam(params.suche)}
        />
      )}
      {view !== "spots" && <GuideCredits games={games} guides={guides} />}
    </div>
  );
}

function ForYou({
  tips,
  spots,
}: {
  tips: GatheringTip[];
  spots: FarmSpotView[];
}) {
  const latest = [...spots]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, LATEST_SPOTS);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-start gap-4">
      {tips.length === 0 && (
        <article className="flex flex-col items-start gap-3 rounded-[22px] border border-border bg-surface p-5">
          <h3 className="text-[17px] font-bold text-white">
            {de.farmSpots.noGatherers}
          </h3>
          <p className="text-[13.5px] text-muted">
            {de.farmSpots.noGatherersHint}
          </p>
          <span className="flex flex-wrap gap-2">
            <ButtonLink href="/charaktere">
              {de.farmSpots.toCharacters}
            </ButtonLink>
            <ButtonLink
              href="/farmspots?ansicht=fertigkeit"
              variant="secondary"
            >
              {de.farmSpots.views.skill}
            </ButtonLink>
          </span>
        </article>
      )}
      {tips.map((tip) => (
        <GathererCard
          key={`${tip.characterId}-${tip.professionKey}`}
          tip={tip}
          saveSkill={setProfessionSkillAction.bind(
            null,
            tip.characterId,
            tip.professionEntryId,
          )}
          spots={{
            count: spots.filter(
              (spot) =>
                spot.gameId === tip.gameId &&
                spot.professionKey === tip.professionKey,
            ).length,
            href: spotsHref(tip.professionKey),
          }}
        />
      ))}
      {latest.length > 0 && (
        <article className="flex flex-col gap-2.5 rounded-[22px] border border-border bg-surface px-5 py-4.5">
          <SectionLabel>{de.farmSpots.latestSpots}</SectionLabel>
          <ul className="flex flex-col gap-1.5 text-sm">
            {latest.map((spot) => (
              <li key={spot.id}>
                <strong className="text-white">{spot.resource}</strong>{" "}
                <span className="text-muted">
                  · {spot.zone}
                  {spot.ownerName && ` · ${de.farmSpots.by(spot.ownerName)}`}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={spotsHref()}
            className="-mx-2 flex min-h-10 w-fit items-center gap-1.5 rounded-xl px-2 text-[13.5px] font-semibold text-accent-strong hover:bg-raised hover:text-white"
          >
            {de.farmSpots.allSpots}
            <i className="pi pi-arrow-right text-xs" aria-hidden />
          </Link>
        </article>
      )}
    </div>
  );
}

function GuildSpots({
  spots,
  gameNames,
  professionKey,
  query,
}: {
  spots: FarmSpotView[];
  gameNames: Map<string, string> | undefined;
  professionKey: string | undefined;
  query: string | undefined;
}) {
  const professions = new Map<string, string>();
  for (const spot of spots) {
    if (spot.professionKey && spot.professionName) {
      professions.set(spot.professionKey, localize(spot.professionName));
    }
  }
  const wanted = query?.toLowerCase() ?? "";
  const shown = spots.filter(
    (spot) =>
      (!professionKey || spot.professionKey === professionKey) &&
      (!wanted ||
        [spot.resource, spot.zone, spot.notes].some((text) =>
          text?.toLowerCase().includes(wanted),
        )),
  );
  const chipHref = (key?: string) =>
    `${spotsHref(key)}${query ? `&suche=${encodeURIComponent(query)}` : ""}`;

  if (spots.length === 0) {
    return (
      <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
        {de.farmSpots.empty}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <nav
          aria-label={de.farmSpots.profession}
          className="flex flex-wrap gap-1.5"
        >
          <FilterChip href={chipHref()} active={!professionKey}>
            {de.farmSpots.allProfessions}
          </FilterChip>
          {[...professions].map(([key, name]) => (
            <FilterChip
              key={key}
              href={chipHref(key)}
              active={professionKey === key}
            >
              {name}
            </FilterChip>
          ))}
        </nav>
        <form method="get" role="search" className="w-full sm:ml-auto sm:w-64">
          <input type="hidden" name="ansicht" value="spots" />
          {professionKey && (
            <input type="hidden" name="beruf" value={professionKey} />
          )}
          <span className="flex h-10 items-center gap-2 rounded-xl border border-border bg-raised px-3 focus-within:border-accent">
            <i className="pi pi-search text-sm text-muted" aria-hidden />
            <input
              type="search"
              name="suche"
              defaultValue={query ?? ""}
              placeholder={de.farmSpots.searchPlaceholder}
              aria-label={de.farmSpots.search}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-[#8f88aa] focus:outline-none"
            />
          </span>
        </form>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{de.farmSpots.noMatches}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3">
          {shown.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              gameName={gameNames?.get(spot.gameId)}
              onDelete={deleteFarmSpotAction.bind(null, spot.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex min-h-10 items-center rounded-full border px-3.5 text-[13.5px] ${
        active
          ? "border-[#6e58c8] bg-accent-soft font-bold text-white"
          : "border-[#2c2645] bg-raised font-semibold text-foreground hover:border-[#3a3358]"
      }`}
    >
      {children}
    </Link>
  );
}

function GuideCredits({
  games,
  guides,
}: {
  games: GuildGameInfo[];
  guides: GatheringGuide[];
}) {
  return games
    .filter((game) => guides.some((guide) => guide.gameId === game.id))
    .map((game) => (
      <PackCredits
        key={game.id}
        meta={game.meta}
        label={de.farmSpots.guideCredits}
      />
    ));
}

/** The member's highest skill in the guide's profession, to start the explorer from. */
function ownSkill(tips: GatheringTip[], guide: GatheringGuide): number | null {
  const skills = tips
    .filter((tip) => guideKey(tip) === guideKey(guide) && tip.skill !== null)
    .map((tip) => tip.skill!);
  return skills.length > 0 ? Math.max(...skills) : null;
}

/**
 * Starting points for the material search: what the guild has spots for, then what the
 * member's gatherers can collect where they should go now.
 */
function materialSuggestions(
  guides: GatheringGuide[],
  tips: GatheringTip[],
  spots: FarmSpotView[],
): string[] {
  const known = new Set(materialIndex(guides).map((entry) => entry.name));
  const names = [
    ...spots.map((spot) => spot.resource),
    ...tips.flatMap((tip) =>
      Object.values(tip.offers)
        .flat()
        .filter((offer) => offer.ready)
        .map((offer) => offer.name),
    ),
  ].filter((name) => known.has(name));
  return [...new Set(names)].slice(0, MATERIAL_SUGGESTIONS);
}

export default function FarmSpotsPage(props: PageProps<"/farmspots">) {
  return (
    <PageSuspense>
      <FarmSpotsContent {...props} />
    </PageSuspense>
  );
}
