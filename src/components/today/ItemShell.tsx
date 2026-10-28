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
}: ItemShellProps) {
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={pressLabel}
          aria-busy={pending}
          className="flex min-h-11 flex-1 touch-manipulation items-center gap-3 rounded-md px-2 text-left select-none hover:bg-border/40"
          {...pressHandlers}
        >
          <span className="flex w-12 shrink-0 justify-center">{indicator}</span>
          <span className="flex flex-col">
            <span className={done ? "text-muted line-through" : undefined}>
              {title}
            </span>
            {(meta || category || todo) && (
              <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                {category && <span>{category}</span>}
                {meta}
                {todo && <Badge tone="warning">{de.badges.todo}</Badge>}
              </span>
            )}
          </span>
        </button>
        {actions}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={de.today.guide}
            title={de.today.guide}
            className="p-2 text-muted hover:text-accent"
          >
            <i className="pi pi-external-link" aria-hidden />
          </a>
        )}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </li>
  );
}
