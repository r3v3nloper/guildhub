import type { Metadata } from "next";
import { BestInSlotList } from "@/components/guild/BestInSlotList";
import { StatPriorityHeader } from "@/components/guild/StatPriorityHeader";
import { PackCredits } from "@/components/packs/PackCredits";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getSpecBestInSlot } from "@/lib/guild/best-in-slot";
import { idParam, orNotFound } from "@/lib/not-found";
import { textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.bestInSlot.title };

const texts = de.bestInSlot;

/** One spec's best gear, PvE or PvP (`?modus=pvp`), as the pack has it from ForeverDB. */
async function BestInSlotContent({
  params,
  searchParams,
}: PageProps<"/stat-prio/bis/[id]">) {
  const actor = await requireActor();
  const specEntryId = await idParam(params);
  const { game, spec, classEntry, lists } = orNotFound(() =>
    getSpecBestInSlot(getDb(), actor, specEntryId),
  );
  const requested = textParam((await searchParams).modus);
  const list = lists.find((entry) => entry.mode === requested) ?? lists[0];
  const specName = localize(spec.name);
  const baseHref = `/stat-prio/bis/${spec.id}`;

  return (
    <div className="flex flex-col gap-5">
      {classEntry && (
        <StatPriorityHeader
          classEntry={classEntry}
          title={texts.heading(specName)}
        />
      )}
      {!list ? (
        <p className="text-muted">{texts.none}</p>
      ) : (
        <>
          {lists.length > 1 && (
            <ViewTabs
              label={texts.modeLabel}
              active={list.mode}
              tabs={lists.map((entry, index) => ({
                key: entry.mode,
                label: texts.modes[entry.mode] ?? entry.mode,
                href:
                  index === 0 ? baseHref : `${baseHref}?modus=${entry.mode}`,
              }))}
            />
          )}
          <BestInSlotList list={list} />
          <PackCredits meta={game.meta} label={texts.credits} />
        </>
      )}
    </div>
  );
}

export default function BestInSlotPage(
  props: PageProps<"/stat-prio/bis/[id]">,
) {
  return (
    <PageSuspense>
      <BestInSlotContent {...props} />
    </PageSuspense>
  );
}
