import type { Metadata } from "next";
import { CraftRequestForm } from "@/components/guild/CraftRequestForm";
import { PackCredits } from "@/components/packs/PackCredits";
import { ActionForm } from "@/components/ui/ActionForm";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Badge, Button, Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import {
  listCraftRequests,
  type CraftRequestView,
} from "@/lib/guild/craft-requests";
import { professionGameOptions } from "@/lib/roster/profession-options";
import { formatDateTime } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import {
  acceptCraftRequestAction,
  createCraftRequestAction,
  deleteCraftRequestAction,
  finishCraftRequestAction,
  returnCraftRequestAction,
} from "./actions";

export const metadata: Metadata = { title: de.requests.title };

async function RequestsContent() {
  const actor = await requireActor();
  const db = getDb();
  const { games, selectedId } = await selectedGames(db, actor.guildId);
  const shownIds = new Set(games.map((game) => game.id));
  // Only games with professions can take requests.
  const formGames = professionGameOptions(db, actor.guildId, true, {
    withRequestRecipes: true,
  }).filter((game) => shownIds.has(game.value) && game.professions.length > 0);
  const requests = listCraftRequests(
    db,
    actor,
    formGames.map((game) => game.value),
  );
  const sections = (["open", "accepted", "done"] as const).map((status) => ({
    status,
    title: de.requests.statuses[status],
    requests: requests.filter((request) => request.status === status),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.requests.title} />
      <p className="text-sm text-muted">{de.requests.hint}</p>
      {formGames.length === 0 ? (
        <p className="text-muted">{de.directory.noProfessions}</p>
      ) : (
        <Card title={de.requests.new}>
          <CraftRequestForm
            action={createCraftRequestAction}
            games={formGames}
            defaultGame={selectedId ?? formGames[0].value}
          />
          {games
            .filter((game) => formGames.some((g) => g.value === game.id))
            .map((game) => (
              <PackCredits
                key={game.id}
                meta={game.meta}
                label={de.directory.credits}
              />
            ))}
        </Card>
      )}
      {sections.map((section) => (
        <Card
          key={section.status}
          title={`${section.title} (${section.requests.length})`}
        >
          {section.requests.length === 0 ? (
            <p className="text-sm text-muted">{de.requests.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {section.requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

function RequestRow({ request }: { request: CraftRequestView }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {request.quantity > 1 && `${request.quantity} × `}
            {request.item}
          </span>
          <Badge tone="accent">{localize(request.professionName)}</Badge>
        </span>
        {request.notes && (
          <span className="text-sm text-muted">{request.notes}</span>
        )}
        <span className="text-xs text-muted">
          {de.requests.by(request.requesterName ?? "?")} ·{" "}
          {formatDateTime(request.createdAt)}
          {request.crafterName &&
            ` · ${de.requests.craftedBy(request.crafterName)}`}
        </span>
      </div>
      <span className="flex flex-wrap items-center gap-1">
        {request.canAccept && (
          <ActionForm action={acceptCraftRequestAction.bind(null, request.id)}>
            <Button icon="pi pi-check" label={de.requests.accept} />
          </ActionForm>
        )}
        {request.canProgress && (
          <>
            <ActionForm
              action={finishCraftRequestAction.bind(null, request.id)}
            >
              <Button icon="pi pi-check-circle" label={de.requests.finish} />
            </ActionForm>
            <ActionForm
              action={returnCraftRequestAction.bind(null, request.id)}
            >
              <Button
                variant="secondary"
                icon="pi pi-undo"
                label={de.requests.giveBack}
              />
            </ActionForm>
          </>
        )}
        {request.canDelete && (
          <DeleteForm
            action={deleteCraftRequestAction.bind(null, request.id)}
            question={de.requests.deleteConfirm}
          />
        )}
      </span>
    </li>
  );
}

export default function RequestsPage() {
  return (
    <PageSuspense>
      <RequestsContent />
    </PageSuspense>
  );
}
