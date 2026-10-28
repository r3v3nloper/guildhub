import type { Metadata } from "next";
import { StatPriorityForm } from "@/components/guild/StatPriorityForm";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getStatPriority } from "@/lib/guild/stat-priorities";
import { idParam, orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import { deleteStatPriorityAction, updateStatPriorityAction } from "../actions";

export const metadata: Metadata = { title: de.statPriorities.edit };

async function EditStatPriorityContent({
  params,
}: PageProps<"/stat-prio/[id]">) {
  const actor = await requireActor();
  const priorityId = await idParam(params);
  const priority = orNotFound(() =>
    getStatPriority(getDb(), actor, priorityId),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.statPriorities.edit} />
      <StatPriorityForm
        action={updateStatPriorityAction.bind(null, priority.id)}
        values={{
          title: priority.title,
          stats: priority.stats.join("\n"),
          notes: priority.notes ?? "",
          source: priority.source ?? "",
        }}
      />
      <ActionForm action={deleteStatPriorityAction.bind(null, priority.id)}>
        <ConfirmButton question={de.statPriorities.deleteConfirm}>
          {de.common.delete}
        </ConfirmButton>
      </ActionForm>
    </div>
  );
}

export default function EditStatPriorityPage(
  props: PageProps<"/stat-prio/[id]">,
) {
  return (
    <PageSuspense>
      <EditStatPriorityContent {...props} />
    </PageSuspense>
  );
}
