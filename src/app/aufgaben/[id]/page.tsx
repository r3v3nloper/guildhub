import type { Metadata } from "next";
import { CustomTaskForm } from "@/components/tasks/CustomTaskForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { FormPage } from "@/components/ui/FormPage";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { idParam, orNotFound } from "@/lib/not-found";
import { getEditableTask, packRuleKeyOf } from "@/lib/tasks/custom-tasks";
import { taskFormGames, taskFormValues } from "@/lib/tasks/task-form-options";
import { de } from "@/i18n/de";
import { saveCustomTaskAction } from "../actions";

export const metadata: Metadata = { title: de.tasks.editTitle };

async function EditTaskContent({ params }: PageProps<"/aufgaben/[id]">) {
  const actor = await requireActor();
  const taskId = await idParam(params);
  const db = getDb();
  const task = orNotFound(() => getEditableTask(db, actor, taskId));
  const games = taskFormGames(db, actor, de.tasks.crossGame);

  return (
    <FormPage
      backHref="/aufgaben"
      backLabel={de.common.backTo(de.tasks.title)}
      title={de.tasks.editTitle}
    >
      <CustomTaskForm
        action={saveCustomTaskAction.bind(null, task.id)}
        games={games}
        values={taskFormValues(task, packRuleKeyOf(db, task))}
        isNew={false}
      />
    </FormPage>
  );
}

export default function EditTaskPage(props: PageProps<"/aufgaben/[id]">) {
  return (
    <PageSuspense>
      <EditTaskContent {...props} />
    </PageSuspense>
  );
}
