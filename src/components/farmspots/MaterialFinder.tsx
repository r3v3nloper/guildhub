"use client";

import { useId, useState } from "react";
import { ChoiceChip } from "@/components/characters/ChoiceChip";
import type { MaterialEntry } from "@/lib/lists/gathering-guide";
import { de } from "@/i18n/de";
import { SectionLabel } from "./bits";

export interface GuildSpotHint {
  id: number;
  resource: string;
  zone: string;
  coordinates: string | null;
  ownerName: string | null;
}

const MAX_MATCHES = 8;

/** Lower case without accents, so "konigsblut" finds "Königsblut". */
function normalized(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Exact names first, then names starting with the query, then the rest. */
function matchesOf(entries: readonly MaterialEntry[], query: string) {
  const wanted = normalized(query);
  if (!wanted) {
    return [];
  }
  const rank = (entry: MaterialEntry) => {
    const name = normalized(entry.name);
    return name === wanted ? 0 : name.startsWith(wanted) ? 1 : 2;
  };
  return entries
    .filter((entry) => normalized(entry.name).includes(wanted))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/**
 * "Where do I get X?": type a material, see the zones it grows in (the recommended
 * ones first) and whether someone in the guild knows a good spot.
 */
export function MaterialFinder({
  entries,
  spots,
  suggestions,
  initialQuery,
}: {
  entries: MaterialEntry[];
  spots: GuildSpotHint[];
  /** Picks to start from while the field is empty. */
  suggestions: string[];
  initialQuery: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const matches = matchesOf(entries, query);
  const material = matches[0];
  const others = matches.slice(1, MAX_MATCHES);
  const tips = material
    ? spots.filter(
        (spot) => normalized(spot.resource) === normalized(material.name),
      )
    : [];
  const hasRecommended = material?.zones.some((zone) => zone.recommended);
  const chips = query.trim() ? others.map((entry) => entry.name) : suggestions;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-[22px] border border-border bg-surface p-5">
        <label htmlFor={inputId} className="text-sm font-bold text-white">
          {de.farmSpots.materialLabel}
        </label>
        <div className="flex h-13 items-center gap-2.5 rounded-[14px] border border-[#3a3358] bg-background px-4 focus-within:border-accent">
          <i className="pi pi-search text-muted" aria-hidden />
          <input
            id={inputId}
            type="search"
            value={query}
            autoComplete="off"
            placeholder={de.farmSpots.materialPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-[#8f88aa] focus:outline-none"
          />
        </div>
        {chips.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {query.trim() && (
              <span className="text-xs text-muted">
                {de.farmSpots.otherMatches}
              </span>
            )}
            <div className="flex flex-wrap gap-1.5">
              {chips.map((name) => (
                <ChoiceChip
                  key={name}
                  active={false}
                  onClick={() => setQuery(name)}
                >
                  {name}
                </ChoiceChip>
              ))}
            </div>
          </div>
        )}
      </div>

      {material && (
        <section
          aria-live="polite"
          className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-surface p-5"
        >
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
            <h2 className="font-display text-[26px] font-semibold text-white">
              {material.name}
            </h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-[#d9ccff]">
              {material.professionName}
            </span>
            {material.skill !== null && material.skill > 0 && (
              <span className="text-sm text-muted">
                {de.farmSpots.fromSkill(material.skill)}
              </span>
            )}
          </div>
          {tips.map((spot) => (
            <p
              key={spot.id}
              className="rounded-[14px] bg-success-soft px-3.5 py-3 text-[13.5px] font-semibold text-success"
            >
              {de.farmSpots.guildTip}: {spot.zone}
              {spot.coordinates && ` · ${spot.coordinates}`}
              {spot.ownerName && ` (${de.farmSpots.by(spot.ownerName)})`}
            </p>
          ))}
          <SectionLabel>
            {de.farmSpots.foundIn(material.zones.length)}
            {hasRecommended && ` · ${de.farmSpots.recommendedFirst}`}
          </SectionLabel>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-2">
            {material.zones.map((zone) => (
              <li key={zone.name}>
                <MaterialZone zone={zone} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {!material && query.trim() && (
        <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
          {de.farmSpots.noMaterial}
        </p>
      )}
    </div>
  );
}

function MaterialZone({ zone }: { zone: MaterialEntry["zones"][number] }) {
  const note = zone.recommended
    ? de.farmSpots.recommendedZone
    : zone.chance !== null
      ? de.farmSpots.chance(zone.chance)
      : null;
  const className = `flex h-full flex-col gap-0.5 rounded-[14px] border px-3.5 py-3 ${
    zone.recommended
      ? "border-[#6e58c8] bg-[#1f1a38]"
      : "border-[#2c2645] bg-raised"
  }`;
  const content = (
    <>
      <span className="flex items-center gap-1.5 text-[14.5px] font-bold text-white">
        {zone.name}
        {zone.link && (
          <i
            className="pi pi-external-link text-[10px] text-muted"
            aria-hidden
          />
        )}
      </span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </>
  );
  if (!zone.link) {
    return <span className={className}>{content}</span>;
  }
  return (
    <a
      href={zone.link}
      target="_blank"
      rel="noopener noreferrer"
      title={de.farmSpots.opensExternally}
      className={`${className} hover:border-[#8a74e0]`}
    >
      {content}
    </a>
  );
}
