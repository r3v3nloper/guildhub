import Link from "next/link";
import {
  acceptCraftRequestAction,
  finishCraftRequestAction,
  returnCraftRequestAction,
} from "@/app/antraege/actions";
import { ActionForm } from "@/components/ui/ActionForm";
import { Badge, Button } from "@/components/ui/ui";
import type { CraftRequestView } from "@/lib/guild/craft-requests";
import { formatDateTime } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

/**
 * Requests the member can craft: only for professions their characters hold, plus the
 * ones they accepted. Hidden while there is nothing to do.
 */
export function CraftRequestsToday({
  requests,
}: {
  requests: CraftRequestView[];
}) {
  if (requests.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="craft-requests-today"
      className="rounded-[22px] border border-border bg-surface p-4 md:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 px-1">
        <div className="flex flex-col gap-0.5">
          <h2
            id="craft-requests-today"
            className="flex items-center gap-2 font-display text-xl font-semibold text-white"
          >
            <i className="pi pi-inbox text-accent" aria-hidden />
            {de.requests.forYou}
          </h2>
          <p className="text-sm text-muted">{de.requests.forYouHint}</p>
        </div>
        <Link
          href="/antraege"
          className="flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-accent-strong hover:text-white"
        >
          {de.requests.showAll}
          <i className="pi pi-arrow-right text-xs" aria-hidden />
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl bg-raised px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">
                  {request.quantity > 1 && `${request.quantity} × `}
                  {request.item}
                </span>
                <Badge tone="accent">{localize(request.professionName)}</Badge>
                {request.status === "accepted" && (
                  <Badge tone="warning">{de.requests.acceptedByYou}</Badge>
                )}
              </span>
              {request.notes && (
                <span className="text-sm text-soft">{request.notes}</span>
              )}
              <span className="text-xs text-muted">
                {de.requests.by(request.requesterName ?? "?")} ·{" "}
                {formatDateTime(request.createdAt)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {request.canAccept && (
                <ActionForm
                  action={acceptCraftRequestAction.bind(null, request.id)}
                >
                  <Button icon="pi pi-check" label={de.requests.accept} />
                </ActionForm>
              )}
              {request.canProgress && (
                <>
                  <ActionForm
                    action={finishCraftRequestAction.bind(null, request.id)}
                  >
                    <Button
                      icon="pi pi-check-circle"
                      label={de.requests.finish}
                    />
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
