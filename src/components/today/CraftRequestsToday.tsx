import Link from "next/link";
import { RequestCard } from "@/components/guild/RequestCard";
import type { CraftRequestView } from "@/lib/guild/craft-requests";
import { de } from "@/i18n/de";

/**
 * Requests the member can craft: only for professions their characters hold with enough
 * skill, plus the ones they accepted. Hidden while there is nothing to do.
 */
export function CraftRequestsToday({
  requests,
  actorId,
  now,
}: {
  requests: CraftRequestView[];
  actorId: string;
  now: Date;
}) {
  if (requests.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="craft-requests-today"
      className="flex flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
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
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          actorId={actorId}
          now={now}
        />
      ))}
    </section>
  );
}
