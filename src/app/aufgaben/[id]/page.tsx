import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomTaskForm } from "@/components/tasks/CustomTaskForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { orNotFound } from "@/lib/not-found";
import { getOwnTask, packRuleKeyOf } from "@/lib/tasks/custom-tasks";
import { taskFormGames, taskFormValues } from "@/lib/tasks/task-form-options";
import { de } from "@/i18n/de";
import { saveCustomTaskAction } from "../actions";

export const metadata: Metadata = { title: de.tasks.editTitle };

async function EditTaskContent({ params }: PageProps<"/aufgaben/[id]">) {
  const actor = await requireActor();
  const taskId = Number((await params).id);
  const db = getDb();
  if (!Number.isInteger(taskId)) {
    notFound();
  }
  const task = orNotFound(() => getOwnTask(db, actor, taskId));
  const games = taskFormGames(db, actor.guildId, de.tasks.crossGame);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.tasks.editTitle} />
      <CustomTaskForm
        action={saveCustomTaskAction.bind(null, task.id)}
        games={games}
        values={taskFormValues(task, packRuleKeyOf(db, task))}
        isNew={false}
      />
    </div>
  );
}

export default function EditTaskPage(props: PageProps<"/aufgaben/[id]">) {
  return (
    <PageSuspense>
      <EditTaskContent {...props} />
    </PageSuspense>
  );
}
