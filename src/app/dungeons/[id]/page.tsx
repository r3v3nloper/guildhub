import type { Metadata } from "next";
import { ChecklistForm } from "@/components/lists/ChecklistForm";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getEditableChecklist } from "@/lib/lists/checklists";
import { listGuildGames } from "@/lib/roster/game-catalog";
import { idParam, orNotFound } from "@/lib/not-found";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { deleteChecklistAction, saveChecklistAction } from "../actions";

export const metadata: Metadata = { title: de.checklists.editTitle };

async function EditChecklistContent({ params }: PageProps<"/dungeons/[id]">) {
  const actor = await requireActor();
  const checklistId = await idParam(params);
  const db = getDb();
  const checklist = orNotFound(() =>
    getEditableChecklist(db, actor, checklistId),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.checklists.editTitle} />
      <ChecklistForm
        action={saveChecklistAction.bind(null, checklist.id)}
        games={listGuildGames(db, actor.guildId).map((game) => ({
          value: game.id,
          label: localize(game.name),
        }))}
        values={{
          name: checklist.name,
          game: checklist.gameId,
          visibility: checklist.visibility,
          items: checklist.items,
        }}
        isNew={false}
      />
      <ActionForm action={deleteChecklistAction.bind(null, checklist.id)}>
        <ConfirmButton question={de.checklists.deleteConfirm}>
          {de.common.delete}
        </ConfirmButton>
      </ActionForm>
    </div>
  );
}

export default function EditChecklistPage(props: PageProps<"/dungeons/[id]">) {
  return (
    <PageSuspense>
      <EditChecklistContent {...props} />
    </PageSuspense>
  );
}
