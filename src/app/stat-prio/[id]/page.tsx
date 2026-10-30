import type { Metadata } from "next";
import { StatPriorityForm } from "@/components/guild/StatPriorityForm";
import { StatPriorityHeader } from "@/components/guild/StatPriorityHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  getClassForPriority,
  getStatPriority,
  listStatPriorities,
  statsInUse,
} from "@/lib/guild/stat-priorities";
import { idParam, orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import { deleteStatPriorityAction, updateStatPriorityAction } from "../actions";

export const metadata: Metadata = { title: de.statPriorities.edit };

async function EditStatPriorityContent({
  params,
}: PageProps<"/stat-prio/[id]">) {
  const actor = await requireActor();
  const db = getDb();
  const priorityId = await idParam(params);
  const priority = orNotFound(() => getStatPriority(db, actor, priorityId));
  const entry = orNotFound(() =>
    getClassForPriority(db, actor, priority.classEntryId),
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <StatPriorityHeader classEntry={entry} title={priority.title} />
      <StatPriorityForm
        action={updateStatPriorityAction.bind(null, priority.id)}
        values={{
          title: priority.title,
          stats: priority.stats,
          notes: priority.notes ?? "",
          source: priority.source ?? "",
        }}
        suggestions={statsInUse(listStatPriorities(db, [entry.gameId]))}
        cancelHref={`/stat-prio?klasse=${entry.id}`}
      />
      <section
        aria-labelledby="delete-priority"
        className="flex flex-col gap-2 rounded-[22px] border border-[#4a2430] p-4.5"
      >
        <h2 id="delete-priority" className="text-sm font-bold text-danger">
          {de.statPriorities.deleteTitle}
        </h2>
        <p className="text-[13px] text-muted">{de.statPriorities.deleteHint}</p>
        <ActionForm action={deleteStatPriorityAction.bind(null, priority.id)}>
          <ConfirmButton
            question={de.statPriorities.deleteConfirm}
            variant="danger"
            text
          >
            {de.common.delete}
          </ConfirmButton>
        </ActionForm>
      </section>
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
