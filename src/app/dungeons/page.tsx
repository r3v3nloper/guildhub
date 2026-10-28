import type { Metadata } from "next";
import Link from "next/link";
import { TickItem } from "@/components/lists/TickItem";
import { ActionForm } from "@/components/ui/ActionForm";
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
import { selectedGames } from "@/lib/game-filter";
import { listChecklists, type ChecklistView } from "@/lib/lists/checklists";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import {
  resetChecklistRunAction,
  setChecklistItemTickedAction,
} from "./actions";

export const metadata: Metadata = { title: de.checklists.title };

async function ChecklistsContent() {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const checklists = listChecklists(
    db,
    actor,
    games.map((game) => game.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={de.checklists.title}
        actions={
          games.length > 0 && (
            <ButtonLink href="/dungeons/neu">+ {de.checklists.new}</ButtonLink>
          )
        }
      />
      <p className="text-sm text-muted">{de.checklists.hint}</p>
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {games.map((game) => {
        const ofGame = checklists.filter(
          (checklist) => checklist.gameId === game.id,
        );
        return (
          <section key={game.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{localize(game.name)}</h2>
            {ofGame.length === 0 ? (
              <p className="text-sm text-muted">{de.checklists.empty}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {ofGame.map((checklist) => (
                  <ChecklistCard key={checklist.id} checklist={checklist} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ChecklistCard({ checklist }: { checklist: ChecklistView }) {
  const ticked = checklist.items.filter((item) => item.ticked).length;
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {checklist.name}
            <span className="text-sm font-normal text-muted">
              {de.checklists.progress(ticked, checklist.items.length)}
            </span>
          </span>
          {checklist.canEdit && (
            <Link
              href={`/dungeons/${checklist.id}`}
              aria-label={de.checklists.editTitle}
              title={de.checklists.editTitle}
              className="text-base text-muted hover:text-accent"
            >
              <i className="pi pi-pencil" aria-hidden />
            </Link>
          )}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge>{de.visibility[checklist.visibility]}</Badge>
          {checklist.ownerName}
        </span>
        <ul className="divide-y divide-border">
          {checklist.items.map((item) => (
            <TickItem
              key={item.id}
              id={`checklist-${item.id}`}
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

export default function ChecklistsPage() {
  return (
    <PageSuspense>
      <ChecklistsContent />
    </PageSuspense>
  );
}
