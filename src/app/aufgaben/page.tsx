import type { Metadata } from "next";
import Link from "next/link";
import { RequestMenu } from "@/components/guild/RequestMenu";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { listGuildGames } from "@/lib/roster/game-catalog";
import { canEditCustomTask, listCustomTasks } from "@/lib/tasks/custom-tasks";
import { resolveTasks, type ResolvedTask } from "@/lib/tasks/task-context";
import { describeResetRule } from "@/i18n/reset-rule";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { deleteCustomTaskAction } from "./actions";

export const metadata: Metadata = { title: de.tasks.title };

async function TasksContent() {
  const actor = await requireActor();
  const db = getDb();
  const gameNames = new Map(
    listGuildGames(db, actor.guildId).map((game) => [
      game.id,
      localize(game.name),
    ]),
  );
  const tasks = resolveTasks(db, actor.guildId, listCustomTasks(db, actor));
  const sections = [
    {
      title: de.tasks.guildTasks,
      empty: de.tasks.emptyGuild,
      tasks: tasks.filter((task) => task.source === "guild"),
    },
    {
      title: de.tasks.ownTasks,
      empty: de.tasks.emptyOwn,
      tasks: tasks.filter((task) => task.source === "private"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={de.tasks.title}
        meta={<p className="max-w-3xl text-sm text-muted">{de.tasks.hint}</p>}
        actions={<ButtonLink href="/aufgaben/neu">+ {de.tasks.new}</ButtonLink>}
      />
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
            {section.title}
            {section.tasks.length > 0 && ` · ${section.tasks.length}`}
          </h2>
          {section.tasks.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
              {section.empty}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-surface px-4.5">
              {section.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  gameName={
                    task.gameId
                      ? (gameNames.get(task.gameId) ?? task.gameId)
                      : de.tasks.crossGame
                  }
                  canEdit={canEditCustomTask(actor, task)}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  gameName,
  canEdit,
}: {
  task: ResolvedTask;
  gameName: string;
  canEdit: boolean;
}) {
  const title = localize(task.title);
  const chip =
    "rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] font-semibold text-soft";
  const details = (
    <>
      <span className="text-[15px] font-bold text-white">{title}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className={chip}>{de.tasks.kinds[task.kind]}</span>
        <span className={chip}>{de.tasks.scopes[task.scope]}</span>
        {task.category && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-[#d9ccff]">
            {task.category}
          </span>
        )}
        <span className="text-xs text-muted">
          {gameName}
          {task.rule && ` · ${describeResetRule(task.rule)}`}
        </span>
      </span>
    </>
  );
  return (
    <li className="flex items-center justify-between gap-2 py-3">
      {canEdit ? (
        <Link
          href={`/aufgaben/${task.id}`}
          className="flex min-w-0 flex-col gap-1.5 hover:[&>span:first-child]:text-accent-strong"
        >
          {details}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-col gap-1.5">{details}</span>
      )}
      {canEdit && (
        <span className="-mr-2 shrink-0">
          <RequestMenu
            label={de.tasks.menuFor(title)}
            question={de.tasks.deleteConfirm}
            editHref={`/aufgaben/${task.id}`}
            onDelete={deleteCustomTaskAction.bind(null, task.id)}
          />
        </span>
      )}
    </li>
  );
}

export default function TasksPage() {
  return (
    <PageSuspense>
      <TasksContent />
    </PageSuspense>
  );
}
