import { RequestMenu } from "@/components/guild/RequestMenu";
import type { ActionState } from "@/lib/actions/action-state";
import type { FarmSpotView } from "@/lib/lists/farm-spots";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

/** A guild member's farm spot: what, where, their note, and the map if linked. */
export function SpotCard({
  spot,
  gameName,
  onDelete,
}: {
  spot: FarmSpotView;
  /** Only while several games are shown. */
  gameName?: string;
  onDelete: () => Promise<ActionState>;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface px-4.5 py-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-[16.5px] font-bold text-white">
            {spot.resource}
          </h3>
          <span className="flex flex-wrap gap-1.5">
            {spot.professionName && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-[#d9ccff]">
                {localize(spot.professionName)}
              </span>
            )}
            {spot.visibility === "private" && (
              <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] font-bold text-soft">
                {de.visibility.private}
              </span>
            )}
            {gameName && (
              <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] font-bold text-soft">
                {gameName}
              </span>
            )}
          </span>
        </div>
        {spot.canEdit && (
          <span className="-mt-1.5 -mr-2">
            <RequestMenu
              label={de.farmSpots.menuFor(spot.resource)}
              question={de.farmSpots.deleteConfirm}
              editHref={`/farmspots/${spot.id}`}
              onDelete={onDelete}
            />
          </span>
        )}
      </div>
      <span className="flex items-start gap-2 text-sm">
        <i
          className="pi pi-map-marker mt-0.5 text-[13px] text-accent"
          aria-hidden
        />
        <span>
          <strong className="font-bold text-white">{spot.zone}</strong>
          {spot.coordinates && (
            <span className="text-muted"> · {spot.coordinates}</span>
          )}
        </span>
      </span>
      {spot.notes && (
        <p className="text-[13.5px] whitespace-pre-line text-soft">
          {spot.notes}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[12.5px] text-muted">
          {spot.ownerName && de.farmSpots.by(spot.ownerName)}
        </span>
        {spot.link && (
          <a
            href={spot.link}
            target="_blank"
            rel="noopener noreferrer"
            className="-mr-2 flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-[13px] font-bold text-accent-strong hover:bg-raised hover:text-white"
          >
            {de.farmSpots.openMap}
            <i className="pi pi-external-link text-[10px]" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}
