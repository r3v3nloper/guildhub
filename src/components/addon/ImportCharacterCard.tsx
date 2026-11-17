"use client";

import { Checkbox } from "primereact/checkbox";
import { Badge } from "@/components/ui/ui";
import type { ImportCharacterView } from "@/lib/addon/import-view";
import { de } from "@/i18n/de";

const STATUS_TONES = {
  new: "accent",
  changed: "warning",
  unchanged: "neutral",
  foreign: "danger",
} as const;

/** One character of an addon export: what would change, and what the member decides. */
export function ImportCharacterCard({
  character,
  create,
  onCreateChange,
  dropped,
  onDropChange,
  outcome,
}: {
  character: ImportCharacterView;
  create: boolean;
  onCreateChange: (create: boolean) => void;
  dropped: number[];
  onDropChange: (entryId: number, drop: boolean) => void;
  /** Set after applying: saved, skipped or failed, with the reason. */
  outcome?: { result: string; error?: string };
}) {
  const texts = de.addonImport;
  const id = (suffix: string) => `import-${character.key}-${suffix}`;

  return (
    <li className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface px-4.5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-bold text-white">
            {character.name}
          </span>
          <span className="text-[13px] text-muted">{character.realm}</span>
        </div>
        <div className="flex items-center gap-2">
          {outcome && (
            <Badge tone={outcome.result === "failed" ? "danger" : "neutral"}>
              {texts.outcome[outcome.result]}
            </Badge>
          )}
          <Badge tone={STATUS_TONES[character.status]}>
            {texts.status[character.status]}
          </Badge>
        </div>
      </div>

      {character.status === "foreign" && (
        <p className="text-[13px] text-muted">{texts.foreignHint}</p>
      )}
      {outcome?.error && (
        <p className="text-[13px] text-danger">{outcome.error}</p>
      )}

      {character.changes.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-soft">
          {character.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}

      {character.newRecipes.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-soft">
            {texts.newRecipes(character.newRecipes.length)}
          </summary>
          <p className="mt-1 text-[13px] text-muted">
            {character.newRecipes.join(", ")}
          </p>
        </details>
      )}

      {character.missingProfessions.map((profession) => (
        <div
          key={profession.entryId}
          className="flex items-center gap-2 text-sm"
        >
          <Checkbox
            inputId={id(`drop-${profession.entryId}`)}
            checked={dropped.includes(profession.entryId)}
            onChange={(event) =>
              onDropChange(profession.entryId, Boolean(event.checked))
            }
          />
          <label htmlFor={id(`drop-${profession.entryId}`)}>
            {profession.label}
          </label>
        </div>
      ))}

      {character.status === "new" && (
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            inputId={id("create")}
            checked={create}
            onChange={(event) => onCreateChange(Boolean(event.checked))}
          />
          <label htmlFor={id("create")}>{texts.create}</label>
        </div>
      )}

      {character.unknown.length > 0 && (
        <p className="text-[13px] text-muted">
          {texts.unknown} {character.unknown.join(", ")}
        </p>
      )}
    </li>
  );
}
