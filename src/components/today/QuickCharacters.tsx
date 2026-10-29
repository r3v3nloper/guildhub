"use client";

import { useSyncExternalStore } from "react";
import { ClassName } from "@/components/characters/ClassName";
import { Stepper } from "@/components/ui/Stepper";
import type { RosterCharacter } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import {
  setCharacterLevelAction,
  setProfessionSkillAction,
} from "./today-actions";

const COLLAPSED_KEY = "guildhub-quick-characters-collapsed";

// Remembered per browser. Storage may be unavailable (private mode); then the choice
// lives in memory for this visit.
let collapsedInMemory = false;
const listeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return collapsedInMemory;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function rememberCollapsed(next: boolean) {
  collapsedInMemory = next;
  try {
    localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    // The in-memory value covers this visit.
  }
  listeners.forEach((listener) => listener());
}

/** The server renders it open; the browser then shows the remembered state. */
function useRememberedCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  return [collapsed, rememberCollapsed] as const;
}

/**
 * The member's own characters at the top of the overview, to raise level and profession
 * skill without opening the editor.
 */
export function QuickCharacters({
  characters,
  levelMax,
  skillMax,
}: {
  characters: RosterCharacter[];
  levelMax: number;
  skillMax: number;
}) {
  const [collapsed, setCollapsed] = useRememberedCollapsed();
  if (characters.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="quick-characters"
      className="rounded-[22px] border border-border bg-surface p-4 md:p-5"
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? de.today.showQuick : de.today.hideQuick}
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between gap-2 px-1 text-left"
      >
        <h2
          id="quick-characters"
          className="flex items-center gap-2 font-display text-xl font-semibold text-white"
        >
          <i className="pi pi-user text-accent" aria-hidden />
          {de.today.quickCharacters}
        </h2>
        <i
          className={`pi ${collapsed ? "pi-chevron-down" : "pi-chevron-up"} text-muted`}
          aria-hidden
        />
      </button>
      {!collapsed && (
        <>
          <p className="mt-1 mb-3 px-1 text-sm text-muted">
            {de.today.quickHint}
          </p>
          <ul className="flex flex-col gap-2">
            {characters.map((character) => (
              <QuickCharacterRow
                key={character.id}
                character={character}
                levelMax={levelMax}
                skillMax={skillMax}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function QuickCharacterRow({
  character,
  levelMax,
  skillMax,
}: {
  character: RosterCharacter;
  levelMax: number;
  skillMax: number;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-raised px-4 py-3">
      <span className="flex min-w-0 basis-48 flex-col gap-0.5">
        <span className="font-semibold text-white">{character.name}</span>
        <span className="text-sm">
          <ClassName entry={character.characterClass} />
        </span>
      </span>
      <QuickValue label={de.today.quickLevel}>
        <Stepper
          label={de.today.quickLevelOf(character.name)}
          value={character.level}
          min={1}
          max={levelMax}
          onSave={(level) => setCharacterLevelAction(character.id, level)}
        />
      </QuickValue>
      {character.professions.map((profession) => (
        <QuickValue key={profession.entryId} label={localize(profession.name)}>
          <Stepper
            label={de.today.quickSkill(
              character.name,
              localize(profession.name),
            )}
            value={profession.skillLevel}
            min={0}
            max={skillMax}
            onSave={(skill) =>
              setProfessionSkillAction(character.id, profession.entryId, skill)
            }
          />
        </QuickValue>
      ))}
    </li>
  );
}

function QuickValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </span>
  );
}
