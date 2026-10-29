import {
  acceptCraftRequestAction,
  deleteCraftRequestAction,
  finishCraftRequestAction,
  returnCraftRequestAction,
} from "@/app/antraege/actions";
import { ActionForm } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/ui";
import {
  crafterLabel,
  type CraftRequestView,
} from "@/lib/guild/craft-requests";
import { daysSince, formatAge } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { RequestMenu } from "./RequestMenu";

/** Open requests this old get a hint that they are waiting. */
const STALE_AFTER_DAYS = 3;
const CRAFTERS_SHOWN = 3;

const statusStyles = {
  open: "bg-chip text-soft",
  accepted: "bg-warning-soft text-warning",
  done: "bg-success-soft text-success",
} as const;

const STEPS = ["open", "accepted", "done"] as const;

/**
 * One crafting request: what, the materials for all of it, who asked and who can make
 * it, plus the one action that is due. Deleting sits behind "⋯".
 */
export function RequestCard({
  request,
  actorId,
  now,
  gameName,
  showStatus = false,
  showSteps = false,
}: {
  request: CraftRequestView;
  actorId: string;
  now: Date;
  /** Shown while requests of several games are listed together. */
  gameName?: string;
  showStatus?: boolean;
  showSteps?: boolean;
}) {
  const mine = request.requesterId === actorId;
  const waiting =
    request.status === "open" ? daysSince(request.createdAt, now) : 0;
  const title = `${request.quantity > 1 ? `${request.quantity} × ` : ""}${request.item}`;

  return (
    <article className="flex flex-wrap items-center gap-x-5 gap-y-3.5 rounded-[20px] border border-border bg-surface px-4.5 py-4">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {request.recipeLink ? (
            <a
              href={request.recipeLink}
              target="_blank"
              rel="noopener noreferrer"
              title={de.requests.openRecipe}
              className="text-[16.5px] font-bold text-white hover:text-accent-strong"
            >
              {title}
            </a>
          ) : (
            <span className="text-[16.5px] font-bold text-white">{title}</span>
          )}
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-[#d9ccff]">
            {localize(request.professionName)}
          </span>
          {gameName && (
            <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] font-semibold text-soft">
              {gameName}
            </span>
          )}
          {showStatus && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${statusStyles[request.status]}`}
            >
              {de.requests.statuses[request.status]}
            </span>
          )}
        </div>
        {request.reagents.length > 0 && (
          <p className="flex gap-2 text-[13px] leading-snug text-soft">
            <i className="pi pi-box mt-0.5 text-xs text-muted" aria-hidden />
            <span>
              {de.requests.needs}:{" "}
              {request.reagents
                .map((reagent) => `${reagent.count}× ${reagent.name}`)
                .join(" · ")}
            </span>
          </p>
        )}
        {request.notes && (
          <p className="text-[13.5px] text-foreground">„{request.notes}“</p>
        )}
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
          <span>
            {mine
              ? de.requests.yourRequest
              : de.requests.by(request.requesterName ?? "?")}{" "}
            · {formatAge(request.createdAt, now)}
          </span>
          <StatusInfo request={request} actorId={actorId} now={now} />
          {waiting >= STALE_AFTER_DAYS && (
            <span className="font-semibold text-warning">
              {de.requests.openSince(waiting)}
            </span>
          )}
        </p>
        {request.status === "open" && !mine && request.ownSkillTooLow && (
          <p className="text-[12.5px] font-semibold text-warning">
            {de.requests.ownSkillTooLow(
              request.ownSkillTooLow.have,
              request.ownSkillTooLow.need,
            )}
          </p>
        )}
        {showSteps && <Steps status={request.status} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
                text
                icon="pi pi-undo"
                label={de.requests.giveBack}
              />
            </ActionForm>
          </>
        )}
        {request.canDelete && (
          <RequestMenu
            label={de.requests.moreActions(request.item)}
            onDelete={deleteCraftRequestAction.bind(null, request.id)}
          />
        )}
      </div>
    </article>
  );
}

function StatusInfo({
  request,
  actorId,
  now,
}: {
  request: CraftRequestView;
  actorId: string;
  now: Date;
}) {
  if (request.status === "accepted") {
    return request.crafterId === actorId ? (
      <span className="font-semibold text-warning">
        {de.requests.acceptedByYou}
      </span>
    ) : (
      <span>{de.requests.makes(request.crafterName ?? "?")}</span>
    );
  }
  if (request.status === "done") {
    return (
      <span>
        {de.requests.madeBy(request.crafterName ?? "?")}
        {request.doneAt && ` · ${formatAge(request.doneAt, now)}`}
      </span>
    );
  }
  // On a request the actor can take, naming the actor as crafter says nothing new.
  const others = request.crafters.filter(
    (crafter) => crafter.userId !== actorId,
  );
  if (others.length > 0) {
    const shown = others.slice(0, CRAFTERS_SHOWN).map(crafterLabel);
    const rest = others.length - shown.length;
    return (
      <span>
        {de.requests.canCraft(
          [...shown, ...(rest > 0 ? [de.requests.andMore(rest)] : [])].join(
            ", ",
          ),
        )}
      </span>
    );
  }
  if (request.canAccept) {
    return null;
  }
  return (
    <span className="font-semibold text-warning">
      {request.professionHeld
        ? de.requests.nobodySkilled(request.requiredSkill)
        : de.requests.nobodyHas(localize(request.professionName))}
    </span>
  );
}

function Steps({ status }: { status: CraftRequestView["status"] }) {
  const reached = STEPS.indexOf(status);
  return (
    <ol
      aria-label={de.requests.progress}
      className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold"
    >
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === reached ? "step" : undefined}
          className={`flex items-center gap-1.5 ${index <= reached ? "text-foreground" : "text-[#8f88aa]"}`}
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              index < reached
                ? "bg-success"
                : index === reached
                  ? "bg-accent shadow-[0_0_0_3px_var(--gh-accent-soft)]"
                  : "bg-[#2c2645]"
            }`}
          />
          {de.requests.statuses[step]}
        </li>
      ))}
    </ol>
  );
}
