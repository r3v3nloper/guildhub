import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatPriorityForm } from "@/components/guild/StatPriorityForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getClassForPriority } from "@/lib/guild/stat-priorities";
import { orNotFound } from "@/lib/not-found";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { saveStatPriorityAction } from "../actions";

export const metadata: Metadata = { title: de.statPriorities.add };

async function NewStatPriorityContent({
  searchParams,
}: PageProps<"/stat-prio/neu">) {
  const actor = await requireActor();
  const classEntryId = Number((await searchParams).klasse);
  if (!Number.isInteger(classEntryId)) {
    notFound();
  }
  const entry = orNotFound(() =>
    getClassForPriority(getDb(), actor, classEntryId),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`${de.statPriorities.add}: ${localize(entry.name)}`} />
      <StatPriorityForm
        action={saveStatPriorityAction.bind(null, { classEntryId: entry.id })}
        values={{ title: "", stats: "", notes: "", source: "" }}
      />
    </div>
  );
}

export default function NewStatPriorityPage(
  props: PageProps<"/stat-prio/neu">,
) {
  return (
    <PageSuspense>
      <NewStatPriorityContent {...props} />
    </PageSuspense>
  );
}
