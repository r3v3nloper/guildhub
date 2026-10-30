import Link from "next/link";
import { ClassAvatar } from "@/components/characters/ClassAvatar";
import { Stepper } from "@/components/ui/Stepper";
import type { ActionState } from "@/lib/actions/action-state";
import type { GatheringTip } from "@/lib/lists/gathering-guide";
import { SKILL_LEVEL_MAX } from "@/lib/roster/character-professions";
import { de } from "@/i18n/de";
import { ZoneName } from "./bits";
import { ZonePicker } from "./ZonePicker";

/**
 * One gathering character: its skill (editable right here, the tips follow), where to
 * go now, what it can gather there, and what comes next.
 */
export function GathererCard({
  tip,
  saveSkill,
  spots,
}: {
  tip: GatheringTip;
  saveSkill: (skill: number) => Promise<ActionState>;
  /** The guild's spots for the profession, with where to see them. */
  spots: { count: number; href: string };
}) {
  const { range, skill } = tip;
  const progress =
    range && skill !== null
      ? Math.min(
          100,
          Math.max(
            0,
            ((skill - range.fromSkill) / (range.toSkill - range.fromSkill)) *
              100,
          ),
        )
      : null;

  return (
    <article className="flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5 md:px-5.5">
      <div className="flex flex-wrap items-center gap-3">
        <ClassAvatar
          initial={tip.characterName.charAt(0)}
          color={tip.classColor}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-[17px] font-bold text-white">
            {tip.characterName}{" "}
            <span className="font-semibold text-soft">
              · {tip.professionName}
            </span>
          </h3>
          {skill === null ? (
            <span className="text-[13px] font-semibold text-warning">
              {de.farmSpots.skillMissing}
            </span>
          ) : (
            range && (
              <span className="text-[13px] text-muted tabular-nums">
                {de.farmSpots.skillRange(range.fromSkill, range.toSkill)}
              </span>
            )
          )}
        </div>
        <span className="w-full sm:w-auto">
          <Stepper
            label={de.farmSpots.skillOf(tip.characterName, tip.professionName)}
            value={skill}
            min={0}
            max={SKILL_LEVEL_MAX}
            onSave={saveSkill}
          />
        </span>
      </div>

      {skill === null ? (
        <p className="text-[13.5px] text-muted">{de.farmSpots.enterSkill}</p>
      ) : (
        <>
          {progress !== null && range && (
            <div className="flex flex-col gap-1.5" aria-hidden>
              <span className="flex justify-between text-xs font-semibold text-muted tabular-nums">
                <span>{range.fromSkill}</span>
                <span>{range.toSkill}</span>
              </span>
              <span className="block h-2 overflow-hidden rounded-full bg-chip">
                <span
                  className="block h-full rounded-full bg-success"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </div>
          )}
          {tip.zones.length > 0 && (
            <ZonePicker zones={tip.zones} offers={tip.offers} />
          )}
          {tip.next ? (
            <p className="rounded-xl bg-raised px-3 py-2.5 text-[13px] text-soft">
              <span className="font-bold text-white tabular-nums">
                {de.farmSpots.nextStep(tip.next.skill)}
              </span>{" "}
              {tip.next.zones.map((zone, index) => (
                <span key={zone.name}>
                  {index > 0 && ", "}
                  <ZoneName zone={zone} />
                </span>
              ))}
            </p>
          ) : (
            range && (
              <p className="rounded-xl bg-raised px-3 py-2.5 text-[13px] text-soft">
                {de.farmSpots.topRange}
              </p>
            )
          )}
        </>
      )}

      {spots.count > 0 && (
        <Link
          href={spots.href}
          className="-mx-2 -mb-1 flex min-h-10 w-fit items-center gap-1.5 rounded-xl px-2 text-[13.5px] font-semibold text-accent-strong hover:bg-raised hover:text-white"
        >
          {de.farmSpots.guildSpotsFor(spots.count, tip.professionName)}
          <i className="pi pi-arrow-right text-xs" aria-hidden />
        </Link>
      )}
    </article>
  );
}
