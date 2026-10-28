"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/ui";
import { de } from "@/i18n/de";

export interface ItemShellProps {
  title: string;
  category: string | null;
  todo: boolean;
  link: string | null;
  done?: boolean;
  /** Status icon or value badge on the left. */
  indicator: ReactNode;
  /** Second line: countdown, progress, hints. */
  meta?: ReactNode;
  /** Extra controls on the right, e.g. −1 or the pencil. */
  actions?: ReactNode;
  /** Expanded content below, e.g. the boss list or a value field. */
  children?: ReactNode;
  error?: string;
  /** Handlers of the main tap area (see useLongPress). */
  pressHandlers: Record<string, unknown>;
  pressLabel: string;
  pending?: boolean;
  /** Fill level 0–1 drawn as a thin bar, e.g. for resources. */
  fill?: number;
  /** Warning colour for the bar, when the resource wants spending. */
  fillWarning?: boolean;
  /** Set for rows that unfold, e.g. the boss list; shows a chevron. */
  expanded?: boolean;
}

/** Layout shared by every task row: one large tap area plus optional side controls. */
export function ItemShell({
  title,
  category,
  todo,
  link,
  done = false,
  indicator,
  meta,
  actions,
  children,
  error,
  pressHandlers,
  pressLabel,
  pending = false,
  fill,
  fillWarning = false,
  expanded,
}: ItemShellProps) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={pressLabel}
          aria-busy={pending}
          className="flex min-h-14 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors select-none hover:bg-raised"
          {...pressHandlers}
        >
          <span className="flex w-16 shrink-0 justify-center">{indicator}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={`text-[15px] leading-snug ${
                done
                  ? "font-medium text-muted line-through"
                  : "font-semibold text-foreground"
              }`}
            >
              {title}
            </span>
            {(meta || category || todo) && (
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
                {category && (
                  <span className="rounded-full bg-chip px-2 py-0.5 text-[11.5px] font-semibold text-soft">
                    {category}
                  </span>
                )}
                {meta}
                {todo && <Badge tone="warning">{de.badges.todo}</Badge>}
              </span>
            )}
            {fill !== undefined && (
              <span className="mt-0.5 block h-1.5 max-w-60 overflow-hidden rounded-full bg-chip">
                <span
                  className={`block h-full rounded-full transition-[width] duration-300 ${fillWarning ? "bg-warning" : "bg-accent"}`}
                  style={{ width: `${Math.round(Math.min(1, fill) * 100)}%` }}
                />
              </span>
            )}
          </span>
          {expanded !== undefined && (
            <i
              className={`pi pi-chevron-down shrink-0 text-sm text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          )}
        </button>
        {actions}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={de.today.guide}
            title={de.today.guide}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-accent"
          >
            <i className="pi pi-external-link" aria-hidden />
          </a>
        )}
      </div>
      {children}
      {error && (
        <p role="alert" className="px-3 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
