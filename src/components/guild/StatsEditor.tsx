"use client";

import { useId, useState } from "react";
import { de } from "@/i18n/de";

/**
 * The ranking as a list to build: add a stat (Enter), move it up or down, remove it.
 * Submits as `stats`, one per line, like the plain text field it replaces.
 */
export function StatsEditor({
  name,
  defaultValue,
  suggestions,
  id,
  "aria-describedby": describedBy,
}: {
  name: string;
  defaultValue: string[];
  /** Stats other rankings of the game use, to keep the names alike. */
  suggestions: string[];
  /** From Field: the label points at the input for new stats. */
  id?: string;
  "aria-describedby"?: string;
}) {
  const ownId = useId();
  const inputId = id ?? ownId;
  const [stats, setStats] = useState(defaultValue);
  const [draft, setDraft] = useState("");
  const offered = suggestions.filter((stat) => !stats.includes(stat));

  const add = (stat: string) => {
    const clean = stat.trim();
    if (clean && !stats.includes(clean)) {
      setStats([...stats, clean]);
    }
    setDraft("");
  };
  const move = (index: number, delta: -1 | 1) => {
    const next = [...stats];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setStats(next);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <input type="hidden" name={name} value={stats.join("\n")} />
      {stats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#2c2645] px-3.5 py-3 text-sm text-muted">
          {de.statPriorities.statsEmpty}
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {stats.map((stat, index) => (
            <li
              key={stat}
              className={`flex items-center gap-2 rounded-xl border py-1 pr-1 pl-2.5 ${
                index === 0
                  ? "border-[#6e58c8] bg-accent-soft"
                  : "border-[#2c2645] bg-raised"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  index === 0 ? "bg-accent text-on-accent" : "bg-chip text-soft"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold break-words text-white">
                {stat}
              </span>
              <IconButton
                icon="pi-arrow-up"
                label={de.statPriorities.moveUp(stat)}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              />
              <IconButton
                icon="pi-arrow-down"
                label={de.statPriorities.moveDown(stat)}
                disabled={index === stats.length - 1}
                onClick={() => move(index, 1)}
              />
              <IconButton
                icon="pi-times"
                label={de.statPriorities.removeStat(stat)}
                onClick={() =>
                  setStats(stats.filter((other) => other !== stat))
                }
              />
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          value={draft}
          maxLength={60}
          aria-describedby={describedBy}
          placeholder={de.statPriorities.addStatPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Enter adds the stat instead of submitting the whole form.
              event.preventDefault();
              add(draft);
            }
          }}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-raised px-3.5 text-sm text-foreground placeholder:text-[#8f88aa] focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="h-11 shrink-0 rounded-xl border border-[#3a3358] px-4 text-sm font-bold text-accent-strong hover:bg-raised hover:text-white disabled:opacity-50"
        >
          + {de.common.add}
        </button>
      </div>
      {offered.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            {de.statPriorities.usedElsewhere}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {offered.map((stat) => (
              <button
                key={stat}
                type="button"
                onClick={() => add(stat)}
                className="min-h-9 rounded-full border border-dashed border-[#3a3358] px-3 text-[13px] font-semibold text-soft hover:border-accent hover:text-white"
              >
                + {stat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-chip hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <i className={`pi ${icon} text-xs`} aria-hidden />
    </button>
  );
}
