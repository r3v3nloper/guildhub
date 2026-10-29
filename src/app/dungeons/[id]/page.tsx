import type { Metadata } from "next";
import Link from "next/link";
import { BossList } from "@/components/lists/BossList";
import { DungeonTabs } from "@/components/lists/DungeonTabs";
import { FoldCard } from "@/components/lists/FoldCard";
import { NotableLootCard } from "@/components/lists/NotableLootCard";
import { TickItem } from "@/components/lists/TickItem";
import { ActionForm } from "@/components/ui/ActionForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Button, ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getChecklist, type ChecklistView } from "@/lib/lists/checklists";
import { listBosses } from "@/lib/lists/dungeon-bosses";
import {
  instancesById,
  notableLootOf,
  type InstanceTemplate,
} from "@/lib/lists/dungeon-instances";
import { idParam, orNotFound } from "@/lib/not-found";
import { listGuildGames } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import {
  resetChecklistRunAction,
  setChecklistItemTickedAction,
  setChecklistPinnedAction,
} from "../actions";

export const metadata: Metadata = { title: de.checklists.title };

/** One dungeon: the checklist for the run, notes, bosses with mechanics and loot. */
async function DungeonContent({ params }: PageProps<"/dungeons/[id]">) {
  const actor = await requireActor();
  const checklistId = await idParam(params);
  const db = getDb();
  const checklist = orNotFound(() => getChecklist(db, actor, checklistId));
  const bosses = listBosses(db, checklist.id);
  const notableLoot = notableLootOf(db, checklist.instanceEntryId);
  const instance = instancesById(db, [checklist.instanceEntryId]).get(
    checklist.instanceEntryId ?? -1,
  );
  const game = listGuildGames(db, actor.guildId).find(
    (entry) => entry.id === checklist.gameId,
  );
  const ticked = checklist.items.filter((item) => item.ticked).length;
  const notes = (checklist.notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const hasLoot = Boolean(game) && notableLoot.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title={checklist.name}
        eyebrow={
          <nav
            aria-label={de.checklists.title}
            className="flex items-center gap-2"
          >
            <Link href="/dungeons" className="text-muted hover:text-white">
              {de.checklists.title}
            </Link>
            {game && (
              <>
                <span aria-hidden>/</span>
                <span>{localize(game.name)}</span>
              </>
            )}
          </nav>
        }
        meta={
          <>
            {instanceFacts(instance, bosses.length).map((fact) => (
              <span
                key={fact}
                className="rounded-full border border-[#2a2541] bg-raised px-3 py-1 text-[13px] font-semibold text-soft"
              >
                {fact}
              </span>
            ))}
            <span className="px-1 py-1 text-[13px] text-muted">
              {de.checklists.sharedBy(
                de.visibility[checklist.visibility],
                checklist.ownerName,
              )}
            </span>
          </>
        }
        actions={
          <span className="flex flex-wrap gap-2">
            <ActionForm
              action={setChecklistPinnedAction.bind(
                null,
                checklist.id,
                !checklist.pinned,
              )}
            >
              <Button
                variant={checklist.pinned ? "primary" : "secondary"}
                icon="pi pi-thumbtack"
                aria-pressed={checklist.pinned}
                title={
                  checklist.pinned ? de.checklists.unpin : de.checklists.pin
                }
                label={
                  checklist.pinned
                    ? de.checklists.pinned
                    : de.checklists.pinShort
                }
              />
            </ActionForm>
            {checklist.canEdit && (
              <ButtonLink
                href={`/dungeons/${checklist.id}/bearbeiten`}
                variant="secondary"
              >
                <i className="pi pi-pencil mr-2 text-sm" aria-hidden />
                {de.checklists.edit}
              </ButtonLink>
            )}
          </span>
        }
      />

      <DungeonTabs
        prepLabel={`${de.checklists.preparation} ${de.checklists.progress(ticked, checklist.items.length)}`}
        prep={<PreparationCard checklist={checklist} ticked={ticked} />}
        bosses={
          <BossList
            checklistId={checklist.id}
            bosses={bosses}
            canEdit={checklist.canEdit}
          />
        }
        info={
          notes.length > 0 || hasLoot ? (
            <>
              {notes.length > 0 && (
                <FoldCard title={de.checklists.notes} defaultOpen>
                  {notes.length === 1 ? (
                    <p className="text-sm leading-relaxed text-soft">
                      {notes[0]}
                    </p>
                  ) : (
                    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-soft">
                      {notes.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  )}
                </FoldCard>
              )}
              {game && <NotableLootCard loot={notableLoot} meta={game.meta} />}
            </>
          ) : null
        }
      />
    </div>
  );
}

/** "Dungeon · 5 Spieler", "Stufe 17–26", "8 Bosse", as far as they are known. */
function instanceFacts(
  instance: InstanceTemplate | undefined,
  bossCount: number,
): string[] {
  const facts: string[] = [];
  if (instance) {
    facts.push(de.checklists.instanceSize(instance.kind, instance.players));
    if (instance.levelMin !== null) {
      facts.push(
        de.checklists.levelRange(instance.levelMin, instance.levelMax),
      );
    }
  }
  if (bossCount > 0) {
    facts.push(de.checklists.bossCount(bossCount));
  }
  return facts;
}

function PreparationCard({
  checklist,
  ticked,
}: {
  checklist: ChecklistView;
  ticked: number;
}) {
  const total = checklist.items.length;
  return (
    <section
      aria-labelledby="preparation"
      className="flex flex-col gap-1.5 rounded-[22px] border border-border bg-surface px-3 pt-4 pb-2"
    >
      <div className="flex items-baseline justify-between gap-2 px-2.5">
        <h2
          id="preparation"
          className="font-display text-xl font-semibold text-white"
        >
          {de.checklists.preparation}
        </h2>
        {total > 0 && (
          <span className="text-sm font-bold tabular-nums">
            {de.checklists.progress(ticked, total)}
          </span>
        )}
      </div>
      {total > 0 && (
        <span className="mx-2.5 mt-1 mb-2 block h-2 overflow-hidden rounded-full bg-chip">
          <span
            className="block h-full rounded-full bg-success transition-[width] duration-300"
            style={{ width: `${(ticked / total) * 100}%` }}
          />
        </span>
      )}
      <ul className="flex flex-col gap-0.5">
        {checklist.items.map((item) => (
          <TickItem
            key={item.id}
            id={`dungeon-${item.id}`}
            label={item.label}
            checked={item.ticked}
            onToggle={setChecklistItemTickedAction.bind(null, item.id)}
          />
        ))}
      </ul>
      {ticked > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#2a2541] px-2.5 pt-1.5">
          <span className="text-[12.5px] text-muted">
            {de.checklists.newRunHint}
          </span>
          <ActionForm action={resetChecklistRunAction.bind(null, checklist.id)}>
            <Button
              variant="secondary"
              text
              icon="pi pi-refresh"
              label={de.checklists.newRun}
            />
          </ActionForm>
        </div>
      )}
    </section>
  );
}

export default function DungeonPage(props: PageProps<"/dungeons/[id]">) {
  return (
    <PageSuspense>
      <DungeonContent {...props} />
    </PageSuspense>
  );
}
