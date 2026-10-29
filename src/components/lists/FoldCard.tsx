import type { ReactNode } from "react";

/** A card that folds away, for reference material next to the checklist. */
export function FoldCard({
  title,
  note,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Small text after the title, e.g. a count or the source. */
  note?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[22px] border border-border bg-surface px-3"
    >
      <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-2 px-2 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display text-lg font-semibold text-white">
            {title}
          </span>
          {note && (
            <span className="text-[12.5px] font-semibold text-muted">
              {note}
            </span>
          )}
        </span>
        <i
          className="pi pi-chevron-down text-sm text-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-2 pb-4">{children}</div>
    </details>
  );
}
