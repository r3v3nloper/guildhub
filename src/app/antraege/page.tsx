import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NewRequestPanel } from "@/components/guild/NewRequestPanel";
import { RequestCard } from "@/components/guild/RequestCard";
import { PackCredits } from "@/components/packs/PackCredits";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import {
  listCraftRequests,
  professionCrafters,
  type CraftRequestView,
} from "@/lib/guild/craft-requests";
import { professionGameOptions } from "@/lib/roster/profession-options";
import { textParam } from "@/lib/search-params";
import { de } from "@/i18n/de";
import {
  createCraftRequestAction,
  requestRecipeChoicesAction,
} from "./actions";

export const metadata: Metadata = { title: de.requests.title };

const VIEWS = {
  "fuer-dich": "forYou",
  meine: "mine",
  alle: "all",
} as const;
type ViewParam = keyof typeof VIEWS;

async function RequestsContent({ searchParams }: PageProps<"/antraege">) {
  const actor = await requireActor();
  const db = getDb();
  const now = new Date();
  const requested = textParam((await searchParams).ansicht);
  const view: ViewParam =
    requested && requested in VIEWS ? (requested as ViewParam) : "fuer-dich";
  const { games, selectedId } = await selectedGames(db, actor.guildId);
  const shownIds = new Set(games.map((game) => game.id));
  // Only games with professions can take requests.
  const professionGames = professionGameOptions(db, actor.guildId, true).filter(
    (game) => shownIds.has(game.value) && game.professions.length > 0,
  );
  const gameIds = professionGames.map((game) => game.value);
  const crafters = professionCrafters(db, actor, gameIds);
  const formGames = professionGames.map((game) => ({
    ...game,
    professions: game.professions.map((profession) => ({
      ...profession,
      crafters: crafters[game.value]?.[profession.value] ?? [],
    })),
  }));
  const gameNames =
    professionGames.length > 1
      ? new Map(professionGames.map((game) => [game.value, game.label]))
      : undefined;

  const requests = listCraftRequests(db, actor, gameIds);
  const accepted = requests.filter((request) => request.canProgress);
  const craftable = requests.filter((request) => request.canAccept);
  const tooLow = requests.filter(
    (request) =>
      request.status === "open" &&
      request.requesterId !== actor.userId &&
      request.ownSkillTooLow !== null,
  );
  const mine = requests.filter(
    (request) => request.requesterId === actor.userId,
  );
  const running = requests.filter((request) => request.status !== "done");
  const done = requests.filter((request) => request.status === "done");

  const card = (
    request: CraftRequestView,
    options: { showStatus?: boolean; showSteps?: boolean } = {},
  ) => (
    <RequestCard
      key={request.id}
      request={request}
      actorId={actor.userId}
      now={now}
      gameName={gameNames?.get(request.gameId)}
      {...options}
    />
  );
  const counts: Record<ViewParam, number> = {
    "fuer-dich": accepted.length + craftable.length,
    meine: mine.filter((request) => request.status !== "done").length,
    alle: running.length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={de.requests.title}
        meta={<p className="text-sm text-muted">{de.requests.intro}</p>}
        actions={
          formGames.length > 0 && (
            <NewRequestPanel
              action={createCraftRequestAction}
              loadRecipes={requestRecipeChoicesAction}
              games={formGames}
              defaultGame={selectedId ?? formGames[0].value}
              credits={games
                .filter((game) => gameIds.includes(game.id))
                .map((game) => (
                  <PackCredits
                    key={game.id}
                    meta={game.meta}
                    label={de.directory.credits}
                  />
                ))}
            />
          )
        }
      />
      {formGames.length === 0 && (
        <p className="text-muted">{de.directory.noProfessions}</p>
      )}

      <nav
        aria-label={de.requests.viewLabel}
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
      >
        {(Object.keys(VIEWS) as ViewParam[]).map((key) => {
          const active = key === view;
          return (
            <Link
              key={key}
              href={`/antraege?ansicht=${key}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm sm:px-3.5 sm:text-[14.5px] ${
                active
                  ? "font-bold text-white shadow-[inset_0_-3px_0_var(--gh-accent)]"
                  : "font-semibold text-muted hover:text-white"
              }`}
            >
              {de.requests.views[VIEWS[key]]}
              <span
                className={`flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                  active ? "bg-accent text-on-accent" : "bg-chip text-soft"
                }`}
              >
                {counts[key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {view === "fuer-dich" && (
        <>
          <Group
            title={de.requests.acceptedGroup}
            hint={de.requests.acceptedGroupHint}
            empty={de.requests.emptyAccepted}
          >
            {accepted.map((request) => card(request))}
          </Group>
          <Group
            title={de.requests.craftableGroup}
            hint={de.requests.craftableGroupHint}
            empty={de.requests.emptyCraftable}
          >
            {craftable.map((request) => card(request))}
          </Group>
          {tooLow.length > 0 && (
            <Group title={de.requests.tooLowGroup}>
              {tooLow.map((request) => card(request))}
            </Group>
          )}
        </>
      )}
      {view === "meine" && (
        <Group title={de.requests.views.mine} empty={de.requests.emptyMine}>
          {mine.map((request) => card(request, { showSteps: true }))}
        </Group>
      )}
      {view === "alle" && (
        <>
          <Group
            title={de.requests.runningGroup}
            empty={de.requests.emptyRunning}
          >
            {running.map((request) => card(request, { showStatus: true }))}
          </Group>
          {done.length > 0 && (
            <details className="group flex flex-col gap-3">
              <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-soft hover:bg-raised hover:text-white [&::-webkit-details-marker]:hidden">
                {de.requests.showDone(done.length)}
                <i
                  className="pi pi-chevron-down text-xs transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="mt-3 flex flex-col gap-2.5">
                {done.map((request) => card(request, { showStatus: true }))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Group({
  title,
  hint,
  empty,
  children,
}: {
  title: string;
  hint?: string;
  empty?: string;
  children: ReactNode[];
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h2 className="text-[13px] font-bold tracking-widest text-muted uppercase">
          {title}
        </h2>
        {hint && <span className="text-[12.5px] text-muted">{hint}</span>}
      </div>
      {children.length === 0 && empty ? (
        <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
          {empty}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

export default function RequestsPage(props: PageProps<"/antraege">) {
  return (
    <PageSuspense>
      <RequestsContent {...props} />
    </PageSuspense>
  );
}
