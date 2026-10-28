import type { ReactNode } from "react";
import type {
  Dashboard,
  DashboardCharacter,
  DashboardGame,
} from "@/lib/tasks/dashboard";
import { isResourceKind } from "@/lib/reset/task-kinds";
import { Badge } from "@/components/ui/ui";
import { de } from "@/i18n/de";
import { TaskList } from "./TaskList";

/** The personal "Heute" dashboard: guild and general tasks, then game → server → character. */
export function TodayBoard({
  dashboard,
  now,
}: {
  dashboard: Dashboard;
  now: string;
}) {
  const hasShared = dashboard.guild.length > 0 || dashboard.general.length > 0;
  return (
    <div className="flex flex-col gap-8">
      {hasShared && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {dashboard.guild.length > 0 && (
            <Panel title={de.today.guild}>
              <TaskList items={dashboard.guild} now={now} />
            </Panel>
          )}
          {dashboard.general.length > 0 && (
            <Panel title={de.today.general}>
              <TaskList items={dashboard.general} now={now} />
            </Panel>
          )}
        </div>
      )}
      {dashboard.games.map((game) => (
        <GameSection key={game.id} game={game} now={now} />
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-border bg-surface px-2 pt-4 pb-2 md:px-3">
      <h3 className="px-3 pb-2 text-xs font-bold tracking-widest text-muted uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function GameSection({ game, now }: { game: DashboardGame; now: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
        {game.name}
      </h2>
      {game.items.length > 0 && (
        <Panel title={de.today.account}>
          <TaskList items={game.items} now={now} />
        </Panel>
      )}
      {game.servers.map((server) => {
        const characters = server.characters.filter(
          (character) => character.items.length > 0,
        );
        return (
          <div key={server.key} className="flex flex-col gap-4">
            {server.items.length > 0 && (
              <Panel
                title={`${game.serverLabel}: ${server.name ?? de.today.noServer}`}
              >
                <TaskList items={server.items} now={now} />
              </Panel>
            )}
            {characters.length > 0 && (
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {characters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    now={now}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CharacterCard({
  character,
  now,
}: {
  character: DashboardCharacter;
  now: string;
}) {
  const tasks = character.items.filter((item) => !isResourceKind(item.kind));
  const done = tasks.filter((item) => item.status === "done").length;
  const color = character.classColor ?? "var(--gh-accent)";
  // Some class colours are dark blues; lifting them keeps the class name readable.
  const textColor = `color-mix(in srgb, ${color} 78%, white)`;

  return (
    <article className="rounded-[22px] border border-border bg-surface px-2 pt-4 pb-2 md:px-3">
      <header className="mb-1 flex items-center gap-3.5 border-b border-border px-3 pb-3.5">
        <span
          aria-hidden
          className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-[14px] border font-display text-[22px] font-semibold"
          style={{
            color: textColor,
            borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
          }}
        >
          {character.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold text-white">
              {character.name}
            </h3>
            {character.isMain && <Badge tone="accent">{de.badges.main}</Badge>}
          </div>
          <div className="flex flex-wrap gap-x-2.5 text-[13px] text-muted">
            {character.className && (
              <span className="font-bold" style={{ color: textColor }}>
                {character.className}
              </span>
            )}
            {character.level !== null && (
              <span>{de.today.level(character.level)}</span>
            )}
          </div>
        </div>
        {tasks.length > 0 && (
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[13px] font-bold tabular-nums">
              {done}/{tasks.length}
            </span>
            <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-chip">
              <span
                className="block h-full rounded-full bg-success"
                style={{ width: `${(done / tasks.length) * 100}%` }}
              />
            </span>
          </div>
        )}
      </header>
      <TaskList
        items={character.items}
        now={now}
        allDoneLabel={de.today.allDoneFor(character.name)}
      />
    </article>
  );
}
