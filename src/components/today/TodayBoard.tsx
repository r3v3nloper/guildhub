import type { Dashboard, DashboardGame } from "@/lib/tasks/dashboard";
import { Card } from "@/components/ui/ui";
import { de } from "@/i18n/de";
import { TaskList } from "./TaskList";

/** The personal "Heute" dashboard: general block, then game → server → character. */
export function TodayBoard({
  dashboard,
  now,
}: {
  dashboard: Dashboard;
  now: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {dashboard.guild.length > 0 && (
        <Card title={de.today.guild}>
          <TaskList items={dashboard.guild} now={now} />
        </Card>
      )}
      {dashboard.general.length > 0 && (
        <Card title={de.today.general}>
          <TaskList items={dashboard.general} now={now} />
        </Card>
      )}
      {dashboard.games.map((game) => (
        <GameCard key={game.id} game={game} now={now} />
      ))}
    </div>
  );
}

function GameCard({ game, now }: { game: DashboardGame; now: string }) {
  return (
    <Card title={game.name}>
      <div className="flex flex-col gap-4">
        {game.items.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted">
              {de.today.account}
            </h3>
            <TaskList items={game.items} now={now} />
          </section>
        )}
        {game.servers.map((server) => (
          <section key={server.key} className="flex flex-col gap-3">
            {server.items.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted">
                  {game.serverLabel}: {server.name ?? de.today.noServer}
                </h3>
                <TaskList items={server.items} now={now} />
              </div>
            )}
            {server.characters
              .filter((character) => character.items.length > 0)
              .map((character) => (
                <div key={character.id}>
                  <h3 className="font-semibold">{character.name}</h3>
                  <TaskList items={character.items} now={now} />
                </div>
              ))}
          </section>
        ))}
      </div>
    </Card>
  );
}
