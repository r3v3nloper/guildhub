import type { BisEnhancement } from "@/lib/guild/best-in-slot";
import { de } from "@/i18n/de";
import { BisBelowBest } from "./BisBelowBest";

const texts = de.bestInSlot;

/** The ranked enchantments, kits and arcana for a slot's pick, best first. */
export function BisEnhancementList({
  enhancements,
}: {
  enhancements: BisEnhancement[];
}) {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {enhancements.map((enhancement) => (
        <EnhancementRow key={enhancement.rank} enhancement={enhancement} />
      ))}
    </ol>
  );
}

function EnhancementRow({ enhancement }: { enhancement: BisEnhancement }) {
  const facts = [
    enhancement.effect,
    texts.kinds[enhancement.kind] ?? enhancement.kind,
    enhancement.profession &&
      texts.profession(enhancement.profession, enhancement.skill),
  ].filter(Boolean);
  const hardToGet = enhancement.hardToGet.length > 0;

  return (
    <li className="flex gap-2.5 py-1.5 text-sm">
      <span className="w-4 shrink-0 text-right text-xs text-muted tabular-nums">
        {enhancement.rank}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 text-white">
            {enhancement.name}
            {hardToGet && (
              <i
                className="pi pi-exclamation-triangle ml-1.5 text-[10px] text-warning"
                title={texts.hardToGet}
                aria-hidden
              />
            )}
          </span>
          {/* The first rank is the measure; the others say how far they are behind it. */}
          {enhancement.rank > 1 && (
            <BisBelowBest percent={enhancement.percentBelowBest} />
          )}
        </span>
        <span className="text-xs text-muted">{facts.join(" · ")}</span>
        {enhancement.materials.length > 0 && (
          <span className="text-[11.5px] text-muted">
            {texts.materials}:{" "}
            {enhancement.materials
              .map((material) => `${material.count}× ${material.name}`)
              .join(", ")}
          </span>
        )}
        {hardToGet && (
          <span className="text-[11.5px] text-muted">
            <span className="sr-only">{texts.hardToGet}: </span>
            {enhancement.hardToGet.join(" · ")}
          </span>
        )}
      </span>
    </li>
  );
}
