import { PackCredits } from "@/components/packs/PackCredits";
import { Card } from "@/components/ui/ui";
import type { GameMeta } from "@/lib/db/schema";
import type {
  GatheringGuide,
  GatheringTip,
  GuideZone,
  ZoneLink,
} from "@/lib/lists/gathering-guide";
import { de } from "@/i18n/de";
import { FoldCard } from "./FoldCard";

/**
 * "Wo sammeln?": the member's gathering characters with the zones for their skill,
 * then per profession the best zones by skill range and what every zone offers.
 */
export function GatheringGuideSection({
  guides,
  tips,
  meta,
}: {
  guides: GatheringGuide[];
  tips: GatheringTip[];
  /** For the source line of the pack the guides come from. */
  meta: GameMeta | undefined;
}) {
  if (guides.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-semibold text-white">
        {de.farmSpots.guideTitle}
      </h2>
      <p className="text-sm text-muted">{de.farmSpots.guideHint}</p>
      {tips.length > 0 && (
        <Card title={de.farmSpots.yourGatherers}>
          <ul className="flex flex-col gap-2 text-sm">
            {tips.map((tip) => (
              <li key={`${tip.characterName}-${tip.professionKey}`}>
                <span className="font-semibold text-white">
                  {tip.characterName}
                </span>{" "}
                <span className="text-muted">
                  · {tip.professionName}
                  {tip.skill !== null && ` ${tip.skill}`}
                </span>
                {tip.zones.length > 0 ? (
                  <span> → {tip.zones.join(", ")}</span>
                ) : (
                  <span className="block text-xs text-muted">
                    {de.farmSpots.enterSkill}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {guides.map((guide) => (
        <GuideCard
          key={`${guide.gameId}-${guide.professionKey}`}
          guide={guide}
        />
      ))}
      {meta && <PackCredits meta={meta} label={de.farmSpots.guideCredits} />}
    </section>
  );
}

function GuideCard({ guide }: { guide: GatheringGuide }) {
  return (
    <FoldCard title={guide.professionName}>
      {guide.ranges.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5 text-sm">
          {guide.ranges.map((range) => (
            <li key={range.fromSkill}>
              <span className="font-semibold text-white tabular-nums">
                {de.farmSpots.skillRange(range.fromSkill, range.toSkill)}
              </span>
              <span className="text-muted">
                {" · "}
                {range.zones.map((zone, index) => (
                  <span key={zone.name}>
                    {index > 0 && ", "}
                    <ZoneName zone={zone} />
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-accent-strong hover:text-white">
          {de.farmSpots.allZones(guide.zones.length)}
        </summary>
        <ul className="mt-2 divide-y divide-border text-sm">
          {guide.zones.map((zone) => (
            <ZoneRow key={zone.name} zone={zone} />
          ))}
        </ul>
      </details>
      {guide.link && (
        <a
          href={guide.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent-strong hover:text-white"
        >
          {guide.link.endsWith("/nodes")
            ? de.farmSpots.nodeMaps
            : de.farmSpots.moreAtSource}
          <i className="pi pi-external-link text-[10px]" aria-hidden />
        </a>
      )}
    </FoldCard>
  );
}

/** The zone name, linking to its map at the data source where known. */
function ZoneName({ zone }: { zone: ZoneLink }) {
  if (!zone.link) {
    return <>{zone.name}</>;
  }
  return (
    <a
      href={zone.link}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-strong hover:text-white"
    >
      {zone.name}
    </a>
  );
}

function ZoneRow({ zone }: { zone: GuideZone }) {
  const offers =
    zone.nodes.length > 0
      ? zone.nodes.map((node) =>
          node.skill === null ? node.name : `${node.name} ${node.skill}`,
        )
      : zone.catches.map(
          (item) => `${item.name} ${de.farmSpots.chance(item.chance)}`,
        );
  return (
    <li className="flex flex-col gap-0.5 py-1.5">
      <span>
        <span className="font-medium">
          <ZoneName zone={zone} />
        </span>
        {(zone.skill !== null || zone.nodes.length === 0) && (
          <span className="text-muted">
            {" "}
            · {de.farmSpots.zoneSkill(zone.skill, zone.skillMax)}
          </span>
        )}
      </span>
      {offers.length > 0 && (
        <span className="text-xs text-muted">{offers.join(" · ")}</span>
      )}
    </li>
  );
}
