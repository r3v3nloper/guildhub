import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatPriorityForm } from "@/components/guild/StatPriorityForm";
import { StatPriorityHeader } from "@/components/guild/StatPriorityHeader";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  getClassForPriority,
  listStatPriorities,
  statsInUse,
} from "@/lib/guild/stat-priorities";
import { orNotFound } from "@/lib/not-found";
import { idSearchParam } from "@/lib/search-params";
import { de } from "@/i18n/de";
import { createStatPriorityAction } from "../actions";

export const metadata: Metadata = { title: de.statPriorities.add };

async function NewStatPriorityContent({
  searchParams,
}: PageProps<"/stat-prio/neu">) {
  const actor = await requireActor();
  const db = getDb();
  const classEntryId = idSearchParam((await searchParams).klasse);
  if (classEntryId === undefined) {
    notFound();
  }
  const entry = orNotFound(() => getClassForPriority(db, actor, classEntryId));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <StatPriorityHeader classEntry={entry} title={de.statPriorities.add} />
      <StatPriorityForm
        action={createStatPriorityAction.bind(null, entry.id)}
        values={{ title: "", stats: [], notes: "", source: "" }}
        suggestions={statsInUse(listStatPriorities(db, [entry.gameId]))}
        cancelHref={`/stat-prio?klasse=${entry.id}`}
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
