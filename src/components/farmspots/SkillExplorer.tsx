"use client";

import { useState } from "react";
import { ChoiceChip } from "@/components/characters/ChoiceChip";
import { Button } from "@/components/ui/ui";
import type { GatheringGuide, GuideZone } from "@/lib/lists/gathering-guide";
import { zoneOffers } from "@/lib/lists/gathering-offers";
import { de } from "@/i18n/de";
import { ZoneName } from "./bits";
import { OfferList } from "./OfferList";

export interface ExplorerGuide {
  /** Unique across games. */
  key: string;
  /** The profession, with the game while several are shown. */
  label: string;
  guide: GatheringGuide;
  /** The member's own skill, to start from. */
  skill: number | null;
}

const SKILL_STEP = 5;
const WATERS_SHOWN = 6;
const NEXT_WATERS_SHOWN = 3;

function topSkill(guide: GatheringGuide): number {
  return Math.max(
    300,
    ...guide.ranges.map((range) => range.toSkill),
    ...guide.zones.map((zone) => zone.skill ?? 0),
  );
}

/**
 * Pick a profession and a skill, see the skill ranges as a timeline and the best zones
 * of a range with what can be gathered there already. Nothing is saved: it is for
 * looking ahead (or back), the member's own skill is only the start.
 */
export function SkillExplorer({
  guides,
  initialKey,
}: {
  guides: ExplorerGuide[];
  initialKey: string;
}) {
  const [key, setKey] = useState(initialKey);
  const current = guides.find((entry) => entry.key === key) ?? guides[0];
  const [skills, setSkills] = useState<Record<string, number>>(() =>
    Object.fromEntries(guides.map((entry) => [entry.key, entry.skill ?? 1])),
  );
  // A picked range; null follows the skill.
  const [picked, setPicked] = useState<number | null>(null);
  const skill = skills[current.key] ?? 1;
  const max = topSkill(current.guide);
  const setSkill = (next: number) => {
    setSkills({
      ...skills,
      [current.key]: Math.max(0, Math.min(max, Math.round(next))),
    });
    setPicked(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5 rounded-[22px] border border-border bg-surface px-5 py-4.5">
        <div
          role="group"
          aria-label={de.farmSpots.profession}
          className="flex flex-wrap gap-1.5"
        >
          {guides.map((entry) => (
            <ChoiceChip
              key={entry.key}
              active={entry.key === current.key}
              onClick={() => {
                setKey(entry.key);
                setPicked(null);
              }}
            >
              {entry.label}
            </ChoiceChip>
          ))}
        </div>
        <div
          role="group"
          aria-label={de.farmSpots.skill}
          className="flex items-center gap-2 sm:ml-auto"
        >
          <span className="text-[13px] font-bold text-soft">
            {de.farmSpots.skill}
          </span>
          <Button
            type="button"
            variant="secondary"
            icon="pi pi-minus"
            aria-label={de.stepper.decrease(de.farmSpots.skill)}
            disabled={skill <= 0}
            onClick={() => setSkill(skill - SKILL_STEP)}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            value={skill}
            aria-label={de.farmSpots.skill}
            onChange={(event) => setSkill(Number(event.target.value) || 0)}
            className="h-10 w-16 rounded-xl border border-border bg-raised text-center text-lg font-bold tabular-nums [appearance:textfield] focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            type="button"
            variant="secondary"
            icon="pi pi-plus"
            aria-label={de.stepper.increase(de.farmSpots.skill)}
            disabled={skill >= max}
            onClick={() => setSkill(skill + SKILL_STEP)}
          />
        </div>
      </div>

      {current.guide.ranges.length > 0 ? (
        <RangeView
          guide={current.guide}
          skill={skill}
          picked={picked}
          onPick={setPicked}
        />
      ) : (
        <WaterView guide={current.guide} skill={skill} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span>{de.farmSpots.legend}</span>
        {current.guide.link && (
          <a
            href={current.guide.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-accent-strong hover:text-white"
          >
            {current.guide.link.endsWith("/nodes")
              ? de.farmSpots.nodeMaps
              : de.farmSpots.moreAtSource}
            <i className="pi pi-external-link text-[10px]" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}

function RangeView({
  guide,
  skill,
  picked,
  onPick,
}: {
  guide: GatheringGuide;
  skill: number;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const found = guide.ranges.findIndex((range) => skill < range.toSkill);
  const own = found < 0 ? guide.ranges.length - 1 : found;
  const shown = picked ?? own;
  const range = guide.ranges[shown];
  const zoneOf = (name: string) =>
    guide.zones.find((zone) => zone.name === name);
  const inRange = new Set(range.zones.map((zone) => zone.name));
  const others = guide.zones
    .filter((zone) => !inRange.has(zone.name))
    .map((zone) => {
      const offers = zoneOffers(zone, skill, Infinity);
      return {
        zone,
        ready: offers.filter((offer) => offer.ready).length,
        total: offers.length,
      };
    })
    .filter((entry) => entry.ready > 0)
    .sort(
      (a, b) => b.ready - a.ready || a.zone.name.localeCompare(b.zone.name),
    );

  return (
    <>
      <ol
        aria-label={de.farmSpots.rangesLabel}
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]"
      >
        {guide.ranges.map((entry, index) => {
          const active = index === shown;
          const mine = index === own;
          return (
            <li key={entry.fromSkill}>
              <button
                type="button"
                aria-pressed={active}
                aria-current={mine ? "step" : undefined}
                onClick={() => onPick(index)}
                className={`flex h-full w-full flex-col items-start gap-1 rounded-[14px] border px-3 py-2.5 text-left ${
                  active
                    ? "border-[#6e58c8] bg-accent-soft text-white"
                    : mine
                      ? "border-[#6e58c8] bg-raised text-foreground"
                      : "border-[#2c2645] bg-raised text-foreground hover:border-[#3a3358]"
                }`}
              >
                <span className="text-[13px] font-bold tabular-nums">
                  {entry.fromSkill}–{entry.toSkill}
                  {mine && (
                    <span className="text-accent-strong">
                      {" "}
                      · {de.farmSpots.yourRange}
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 text-xs text-muted">
                  {entry.zones.map((zone) => zone.name).join(", ")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
          {de.farmSpots.bestZonesFor(range.fromSkill, range.toSkill)}
        </h2>
        {range.zones.map((link) => {
          const zone = zoneOf(link.name);
          return (
            <ZoneCard
              key={link.name}
              zone={zone ?? null}
              link={link}
              skill={skill}
            />
          );
        })}
      </section>
      {others.length > 0 && (
        <details className="group">
          <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-soft hover:bg-raised hover:text-white [&::-webkit-details-marker]:hidden">
            {de.farmSpots.moreZones(others.length)}
            <i
              className="pi pi-chevron-down text-xs transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-2">
            {others.map(({ zone, ready, total }) => (
              <li
                key={zone.name}
                className="flex items-center justify-between gap-2 rounded-[14px] border border-[#2c2645] bg-raised px-3.5 py-2.5 text-sm"
              >
                <ZoneName zone={zone} className="font-semibold" />
                <span className="text-xs text-muted tabular-nums">
                  {de.farmSpots.gatherable(ready, total)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function WaterView({ guide, skill }: { guide: GatheringGuide; skill: number }) {
  const byNeed = [...guide.zones].sort(
    (a, b) => (a.skill ?? 0) - (b.skill ?? 0),
  );
  const reachable = byNeed
    .filter((zone) => (zone.skill ?? 0) <= skill)
    .reverse()
    .slice(0, WATERS_SHOWN);
  const ahead = byNeed
    .filter((zone) => (zone.skill ?? 0) > skill)
    .slice(0, NEXT_WATERS_SHOWN);
  return (
    <>
      {reachable.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
            {de.farmSpots.waters}
          </h2>
          {reachable.map((zone) => (
            <ZoneCard key={zone.name} zone={zone} link={zone} skill={skill} />
          ))}
        </section>
      )}
      {ahead.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
            {de.farmSpots.nextWaters}
          </h2>
          {ahead.map((zone) => (
            <ZoneCard key={zone.name} zone={zone} link={zone} skill={skill} />
          ))}
        </section>
      )}
    </>
  );
}

function ZoneCard({
  zone,
  link,
  skill,
}: {
  /** Null where the guide lists the zone as best but knows nothing about it. */
  zone: GuideZone | null;
  link: { name: string; link: string | null };
  skill: number;
}) {
  const offers = zone ? zoneOffers(zone, skill, Infinity) : [];
  const ready = offers.filter((offer) => offer.ready).length;
  const isWater = zone !== null && zone.nodes.length === 0;
  return (
    <article className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-surface px-4.5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
        <ZoneName zone={link} className="text-[16.5px] font-bold" />
        <span className="text-[12.5px] text-muted tabular-nums">
          {zone && isWater
            ? de.farmSpots.zoneSkill(zone.skill, zone.skillMax)
            : offers.length > 0 &&
              de.farmSpots.gatherable(ready, offers.length)}
        </span>
      </div>
      {offers.length > 0 && <OfferList offers={offers} />}
    </article>
  );
}
