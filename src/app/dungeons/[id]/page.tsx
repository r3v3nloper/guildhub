import type { Metadata } from "next";
import { BossForm } from "@/components/lists/BossForm";
import { TickItem } from "@/components/lists/TickItem";
import { ActionForm } from "@/components/ui/ActionForm";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  PageHeader,
} from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getChecklist, type ChecklistView } from "@/lib/lists/checklists";
import { listBosses, type BossView } from "@/lib/lists/dungeon-bosses";
import { idParam, orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import { NotableLootCard } from "@/components/lists/NotableLootCard";
import { notableLootOf } from "@/lib/lists/dungeon-instances";
import { listGuildGames } from "@/lib/roster/game-catalog";
import {
  deleteBossAction,
  resetChecklistRunAction,
  saveBossAction,
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
  const gameMeta = listGuildGames(db, actor.guildId).find(
    (game) => game.id === checklist.gameId,
  )?.meta;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={checklist.name}
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
                variant="secondary"
                icon="pi pi-thumbtack"
                label={
                  checklist.pinned ? de.checklists.unpin : de.checklists.pin
                }
              />
            </ActionForm>
            {checklist.canEdit && (
              <ButtonLink
                href={`/dungeons/${checklist.id}/bearbeiten`}
                variant="secondary"
              >
                {de.checklists.editTitle}
              </ButtonLink>
            )}
          </span>
        }
      />
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge>{de.visibility[checklist.visibility]}</Badge>
        {checklist.ownerName}
      </span>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <RunCard checklist={checklist} />
          {checklist.notes && (
            <Card title={de.checklists.notes}>
              <p className="text-sm whitespace-pre-line">{checklist.notes}</p>
            </Card>
          )}
          {gameMeta && <NotableLootCard loot={notableLoot} meta={gameMeta} />}
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-white">
            {de.checklists.bosses}
          </h2>
          {bosses.length === 0 && (
            <p className="text-sm text-muted">{de.checklists.noBosses}</p>
          )}
          {bosses.map((boss) => (
            <BossCard
              key={boss.id}
              boss={boss}
              checklistId={checklist.id}
              canEdit={checklist.canEdit}
            />
          ))}
          {checklist.canEdit && (
            <Card title={de.checklists.addBoss}>
              <BossForm
                action={saveBossAction.bind(null, checklist.id, undefined)}
                values={{ name: "", mechanics: "", loot: "" }}
                isNew
              />
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function RunCard({ checklist }: { checklist: ChecklistView }) {
  const ticked = checklist.items.filter((item) => item.ticked).length;
  return (
    <Card
      title={`${de.checklists.checklist} ${de.checklists.progress(ticked, checklist.items.length)}`}
    >
      <div className="flex flex-col gap-3">
        <ul className="divide-y divide-border">
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
          <ActionForm action={resetChecklistRunAction.bind(null, checklist.id)}>
            <Button
              variant="secondary"
              icon="pi pi-refresh"
              label={de.checklists.newRun}
            />
          </ActionForm>
        )}
      </div>
    </Card>
  );
}

function BossCard({
  boss,
  checklistId,
  canEdit,
}: {
  boss: BossView;
  checklistId: number;
  canEdit: boolean;
}) {
  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2">
          {boss.name}
          {canEdit && (
            <DeleteForm
              action={deleteBossAction.bind(null, checklistId, boss.id)}
              question={de.checklists.deleteBossConfirm}
            />
          )}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {boss.mechanics && (
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold tracking-widest text-muted uppercase">
              {de.checklists.mechanics}
            </h3>
            <p className="text-sm whitespace-pre-line">{boss.mechanics}</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-bold tracking-widest text-muted uppercase">
            {de.checklists.loot}
          </h3>
          {boss.loot.length === 0 ? (
            <p className="text-sm text-muted">{de.checklists.noLoot}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {boss.loot.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-2"
                >
                  {entry.link ? (
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={de.checklists.openLink}
                      className="font-semibold text-accent-strong hover:text-white"
                    >
                      {entry.name}
                      <i
                        className="pi pi-external-link ml-1 text-[10px]"
                        aria-hidden
                      />
                    </a>
                  ) : (
                    <span className="font-semibold">{entry.name}</span>
                  )}
                  {entry.notes && (
                    <span className="text-muted">{entry.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {canEdit && (
          <details>
            <summary className="cursor-pointer text-sm text-muted">
              {de.checklists.editBoss}
            </summary>
            <div className="pt-3">
              <BossForm
                action={saveBossAction.bind(null, checklistId, boss.id)}
                values={{
                  name: boss.name,
                  mechanics: boss.mechanics ?? "",
                  loot: boss.lootText,
                }}
                isNew={false}
              />
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}

export default function DungeonPage(props: PageProps<"/dungeons/[id]">) {
  return (
    <PageSuspense>
      <DungeonContent {...props} />
    </PageSuspense>
  );
}
