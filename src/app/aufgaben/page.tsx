import type { Metadata } from "next";
import Link from "next/link";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { listGuildGames } from "@/lib/roster/game-catalog";
import { listOwnTasks } from "@/lib/tasks/custom-tasks";
import { resolveTasks } from "@/lib/tasks/task-context";
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
  const tasks = resolveTasks(db, actor.guildId, listOwnTasks(db, actor.userId));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={de.tasks.title}
        actions={<ButtonLink href="/aufgaben/neu">+ {de.tasks.new}</ButtonLink>}
      />
      <p className="text-sm text-muted">{de.tasks.hint}</p>
      <Card>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">{de.tasks.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <Link
                  href={`/aufgaben/${task.id}`}
                  className="flex flex-col hover:text-accent"
                >
                  <span className="font-medium">{localize(task.title)}</span>
                  <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                    <span>
                      {task.gameId
                        ? gameNames.get(task.gameId)
                        : de.tasks.crossGame}
                    </span>
                    <span>{de.tasks.kinds[task.kind]}</span>
                    <span>{de.tasks.scopes[task.scope]}</span>
                    {task.rule && <span>{describeResetRule(task.rule)}</span>}
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  {task.category && <Badge>{task.category}</Badge>}
                  <DeleteForm
                    action={deleteCustomTaskAction.bind(null, task.id)}
                    question={de.tasks.deleteConfirm}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function TasksPage() {
  return (
    <PageSuspense>
      <TasksContent />
    </PageSuspense>
  );
}
