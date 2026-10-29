import type { Metadata } from "next";
import Link from "next/link";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listChecklists, type ChecklistView } from "@/lib/lists/checklists";
import { bossStatsOf, type BossStats } from "@/lib/lists/dungeon-bosses";
import {
  instancesById,
  type InstanceTemplate,
} from "@/lib/lists/dungeon-instances";
import { textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.checklists.title };

const KINDS = ["all", "dungeon", "raid"] as const;
type KindFilter = (typeof KINDS)[number];

async function ChecklistsContent({ searchParams }: PageProps<"/dungeons">) {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const requested = textParam((await searchParams).art);
  const kind: KindFilter = KINDS.find((entry) => entry === requested) ?? "all";
  const checklists = listChecklists(
    db,
    actor,
    games.map((game) => game.id),
  );
  const instances = instancesById(
    db,
    checklists.map((checklist) => checklist.instanceEntryId),
  );
  const stats = bossStatsOf(
    db,
    checklists.map((checklist) => checklist.id),
  );
  const instanceOf = (checklist: ChecklistView) =>
    checklist.instanceEntryId === null
      ? undefined
      : instances.get(checklist.instanceEntryId);
  // Pages without a pack template have no known kind; they only show under "Alle".
  const shown = checklists.filter(
    (checklist) => kind === "all" || instanceOf(checklist)?.kind === kind,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={de.checklists.title}
        actions={
          games.length > 0 && (
            <ButtonLink href="/dungeons/neu">
              <i className="pi pi-plus mr-2 text-xs" aria-hidden />
              {de.checklists.new}
            </ButtonLink>
          )
        }
      />
      <p className="-mt-4 max-w-2xl text-sm text-muted">{de.checklists.hint}</p>
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {checklists.length > 0 && (
        <nav aria-label={de.checklists.kindFilter} className="flex gap-1.5">
          {KINDS.map((entry) => (
            <Link
              key={entry}
              href={entry === "all" ? "/dungeons" : `/dungeons?art=${entry}`}
              aria-current={kind === entry ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-full border px-4 text-[13.5px] ${
                kind === entry
                  ? "border-[#3a2f66] bg-accent-soft font-bold text-[#e4daff]"
                  : "border-[#2c2645] bg-surface font-semibold text-soft hover:text-white"
              }`}
            >
              {de.checklists.kinds[entry]}
            </Link>
          ))}
        </nav>
      )}
      {games.map((game) => {
        const ofGame = shown.filter(
          (checklist) => checklist.gameId === game.id,
        );
        return (
          <section key={game.id} className="flex flex-col gap-3.5">
            <h2 className="font-display text-2xl font-semibold text-white">
              {localize(game.name)}
            </h2>
            {ofGame.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-[#2c2645] px-5 py-4 text-sm text-muted">
                {kind === "all"
                  ? de.checklists.empty
                  : de.checklists.noneOfKind}
              </p>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {ofGame.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    instance={instanceOf(checklist)}
                    stats={stats.get(checklist.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ChecklistCard({
  checklist,
  instance,
  stats,
}: {
  checklist: ChecklistView;
  instance: InstanceTemplate | undefined;
  stats: BossStats | undefined;
}) {
  const total = checklist.items.length;
  const ticked = checklist.items.filter((item) => item.ticked).length;
  const facts = instance
    ? [
        de.checklists.instanceSize(instance.kind, instance.players),
        ...(instance.levelMin === null
          ? []
          : [de.checklists.levelRange(instance.levelMin, instance.levelMax)]),
      ].join(" · ")
    : null;

  return (
    <Link
      href={`/dungeons/${checklist.id}`}
      className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-surface px-5 py-4.5 transition-colors hover:border-[#3a3358] hover:bg-[#1a1630]"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg font-bold text-white">{checklist.name}</span>
          {facts && <span className="text-[13px] text-muted">{facts}</span>}
        </div>
        {checklist.pinned && (
          <span
            title={de.checklists.pinnedHint}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-[#d9ccff]"
          >
            <i className="pi pi-thumbtack text-[10px]" aria-hidden />
            {de.checklists.pinned}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[12.5px] font-semibold text-soft">
            <span>{de.checklists.preparation}</span>
            <span className="tabular-nums">
              {de.checklists.progress(ticked, total)}
            </span>
          </div>
          <span className="block h-1.5 overflow-hidden rounded-full bg-chip">
            <span
              className="block h-full rounded-full bg-success"
              style={{ width: `${(ticked / total) * 100}%` }}
            />
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
        {stats && (
          <>
            <span>
              {de.checklists.bossCount(stats.bosses)} ·{" "}
              {de.checklists.withInfoShort(stats.withInfo)}
            </span>
            <span aria-hidden>·</span>
          </>
        )}
        <span>
          {de.checklists.sharedBy(
            de.visibility[checklist.visibility],
            checklist.ownerName,
          )}
        </span>
      </div>
    </Link>
  );
}

export default function ChecklistsPage(props: PageProps<"/dungeons">) {
  return (
    <PageSuspense>
      <ChecklistsContent {...props} />
    </PageSuspense>
  );
}
