"use client";

import { useState, type ReactNode } from "react";
import { de } from "@/i18n/de";

type Tab = "prep" | "bosses" | "info";

/**
 * Layout of a dungeon page. Wide screens show everything side by side; phones get
 * three tabs, so nobody scrolls past every boss to reach the checklist.
 */
export function DungeonTabs({
  prep,
  prepLabel,
  bosses,
  info,
}: {
  prep: ReactNode;
  /** Tab label with progress, e.g. "Vorbereitung 3/7". */
  prepLabel: string;
  bosses: ReactNode;
  /** Notes and notable loot; the tab is left out when there is none. */
  info: ReactNode | null;
}) {
  const [tab, setTab] = useState<Tab>("prep");
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "prep", label: prepLabel },
    { key: "bosses", label: de.checklists.bosses },
    ...(info ? [{ key: "info" as const, label: de.checklists.infoTab }] : []),
  ];
  const shown = (key: Tab) => (tab === key ? "flex" : "hidden lg:flex");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={de.checklists.tabs}
        className="grid border-b border-border lg:hidden"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={`min-h-12 text-sm ${
              tab === entry.key
                ? "font-bold text-white shadow-[inset_0_-3px_0_var(--gh-accent)]"
                : "font-semibold text-muted"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:grid-rows-[auto_1fr]">
        <div
          className={`${shown("prep")} flex-col gap-4 lg:col-start-1 lg:row-start-1`}
        >
          {prep}
        </div>
        {info && (
          <div
            className={`${shown("info")} flex-col gap-4 lg:col-start-1 lg:row-start-2`}
          >
            {info}
          </div>
        )}
        <div
          className={`${shown("bosses")} flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1`}
        >
          {bosses}
        </div>
      </div>
    </div>
  );
}
