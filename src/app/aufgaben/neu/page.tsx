import type { Metadata } from "next";
import { CustomTaskForm } from "@/components/tasks/CustomTaskForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  newTaskFormValues,
  taskFormGames,
} from "@/lib/tasks/task-form-options";
import { de } from "@/i18n/de";
import { saveCustomTaskAction } from "../actions";

export const metadata: Metadata = { title: de.tasks.new };

async function NewTaskContent() {
  const actor = await requireActor();
  const games = taskFormGames(getDb(), actor.guildId, de.tasks.crossGame);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.tasks.new} />
      <CustomTaskForm
        action={saveCustomTaskAction.bind(null, undefined)}
        games={games}
        values={newTaskFormValues(games)}
        isNew
      />
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <PageSuspense>
      <NewTaskContent />
    </PageSuspense>
  );
}
