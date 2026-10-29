import Image from "next/image";
import Link from "next/link";
import { DateTime } from "luxon";
import { signOutAction } from "@/components/auth/auth-actions";
import { SignInButton } from "@/components/auth/SignInButton";
import { CraftRequestsToday } from "@/components/today/CraftRequestsToday";
import { QuickCharacters } from "@/components/today/QuickCharacters";
import { TodayBoard } from "@/components/today/TodayBoard";
import { TodayLists } from "@/components/today/TodayLists";
import { TodaySummary } from "@/components/today/TodaySummary";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { currentActor, currentSession } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listCraftRequestsForCrafter } from "@/lib/guild/craft-requests";
import { listPinnedChecklists } from "@/lib/lists/checklists";
import { listTodoLists } from "@/lib/lists/todo-lists";
import { LEVEL_MAX } from "@/lib/roster/character-rules";
import { SKILL_LEVEL_MAX } from "@/lib/roster/character-professions";
import { listCharactersOfUser } from "@/lib/roster/characters";
import { loadRosterMembers } from "@/lib/roster/roster";
import { buildDashboard } from "@/lib/tasks/dashboard";
import { summarizeDashboard } from "@/lib/tasks/dashboard-summary";
import { formatCountdown, formatDay } from "@/i18n/format";
import { de } from "@/i18n/de";

async function HomeContent() {
  const actor = await currentActor();

  if (!actor) {
    const session = await currentSession();
    return <Welcome signedIn={Boolean(session?.user)} />;
  }

  const db = getDb();
  const { enabled: enabledGames, games: shownGames } = await selectedGames(
    db,
    actor.guildId,
  );
  const games = shownGames.map((game) => ({
    id: game.id,
    name: game.name,
    serverLabel: game.meta.serverLabel,
  }));
  const now = DateTime.now();
  const nowIso = now.toISO()!;
  const dashboard = buildDashboard(db, actor.guildId, actor.userId, games, now);
  const summary = summarizeDashboard(dashboard);
  const requests = listCraftRequestsForCrafter(
    db,
    actor,
    games.map((game) => game.id),
  );
  const todoLists = listTodoLists(db, actor);
  const checklists = listPinnedChecklists(
    db,
    actor,
    games.map((game) => game.id),
  );
  const hasCharacters = listCharactersOfUser(db, actor.userId).length > 0;
  const shownGameIds = new Set(games.map((game) => game.id));
  const ownCharacters = (
    loadRosterMembers(db, actor.guildId, actor.userId)[0]?.characters ?? []
  ).filter((character) => shownGameIds.has(character.gameId));
  const isEmpty =
    dashboard.general.length === 0 &&
    dashboard.guild.length === 0 &&
    dashboard.games.length === 0;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={de.today.title}
        eyebrow={formatDay(now.toJSDate())}
        actions={
          summary.nextReset && (
            <span className="flex items-center gap-2 rounded-full border border-[#2a2541] bg-surface px-3.5 py-2 text-[13px] font-semibold text-soft">
              <i className="pi pi-clock text-accent" aria-hidden />
              {de.today.nextReset(formatCountdown(summary.nextReset, nowIso))}
            </span>
          )
        }
      />
      <QuickCharacters
        characters={ownCharacters}
        levelMax={LEVEL_MAX}
        skillMax={SKILL_LEVEL_MAX}
      />
      {enabledGames.length === 0 && (
        <p className="text-warning">{de.home.noGames}</p>
      )}
      {isEmpty && enabledGames.length > 0 && (
        <p className="text-muted">
          {hasCharacters ? (
            de.today.noTasks
          ) : (
            <Link href="/charaktere" className="text-accent hover:text-white">
              {de.today.noCharacters}
            </Link>
          )}
        </p>
      )}
      {!isEmpty && <TodaySummary summary={summary} />}
      <CraftRequestsToday
        requests={requests}
        actorId={actor.userId}
        now={now.toJSDate()}
      />
      <TodayLists todoLists={todoLists} checklists={checklists} />
      <TodayBoard dashboard={dashboard} now={nowIso} />
    </section>
  );
}

/** Start page for visitors: the logo and the Discord sign-in. */
function Welcome({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-10 py-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo.png"
          alt=""
          width={170}
          height={200}
          priority
          unoptimized
        />
        <h1 className="font-display text-5xl leading-none font-semibold text-white md:text-6xl">
          {de.app.name}
        </h1>
        <p className="max-w-md text-lg text-pretty text-soft">
          {de.app.description}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {signedIn ? (
          <>
            <p className="text-sm text-pretty text-muted">
              {de.auth.noAccessText}
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="min-h-12 w-full rounded-2xl border border-[#2c2645] bg-raised px-6 font-semibold text-foreground hover:bg-chip"
              >
                {de.auth.signOut}
              </button>
            </form>
          </>
        ) : (
          <>
            <SignInButton />
            <p className="text-sm text-pretty text-muted">
              {de.home.signInHint}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PageSuspense>
      <HomeContent />
    </PageSuspense>
  );
}
