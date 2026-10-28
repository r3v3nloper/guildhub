import Link from "next/link";
import { DateTime } from "luxon";
import { TodayBoard } from "@/components/today/TodayBoard";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { currentActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listCharactersOfUser } from "@/lib/roster/characters";
import { buildDashboard } from "@/lib/tasks/dashboard";
import { de } from "@/i18n/de";

async function HomeContent() {
  const actor = await currentActor();

  if (!actor) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-2">
        <h1 className="text-2xl font-semibold">{de.home.welcome}</h1>
        <p className="text-muted">{de.home.signInHint}</p>
      </section>
    );
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
  const dashboard = buildDashboard(db, actor.guildId, actor.userId, games, now);
  const hasCharacters = listCharactersOfUser(db, actor.userId).length > 0;
  const isEmpty =
    dashboard.general.length === 0 &&
    dashboard.guild.length === 0 &&
    dashboard.games.length === 0;

  return (
    <section className="flex flex-col gap-2">
      <PageHeader
        title={de.today.title}
        actions={
          !isEmpty && (
            <span className="text-sm text-muted">
              {dashboard.openCount > 0
                ? de.today.openCount(dashboard.openCount)
                : de.today.allDone}
            </span>
          )
        }
      />
      {enabledGames.length === 0 && (
        <p className="text-orange-500">{de.home.noGames}</p>
      )}
      {isEmpty && enabledGames.length > 0 && (
        <p className="text-muted">
          {hasCharacters ? (
            de.today.noTasks
          ) : (
            <Link href="/charaktere" className="hover:text-accent">
              {de.today.noCharacters}
            </Link>
          )}
        </p>
      )}
      <TodayBoard dashboard={dashboard} now={now.toISO()!} />
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
