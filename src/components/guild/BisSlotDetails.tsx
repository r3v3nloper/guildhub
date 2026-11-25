import type { ReactNode } from "react";
import type { BisItem, BisSlot } from "@/lib/guild/best-in-slot";
import { de } from "@/i18n/de";
import { BisBelowBest } from "./BisBelowBest";
import { BisEaseMarker } from "./BisEaseMarker";
import { BisEnhancementList } from "./BisEnhancementList";
import { BisItemName } from "./BisItemName";

const texts = de.bestInSlot;

/** What an opened slot shows: the pick in full, then the alternatives and enchantments. */
export function BisSlotDetails({
  slot,
  best,
}: {
  slot: BisSlot;
  best: BisItem;
}) {
  const facts = [
    best.itemLevel !== null && texts.itemLevel(best.itemLevel),
    best.fromLevel !== null && texts.fromLevel(best.fromLevel),
    best.ease && (texts.ease[best.ease]?.label ?? texts.easeUnknown),
    best.seenInForever && texts.seenInForever,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      {/* The row above already names the pick; here only its facts and its page. */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
        <span>{facts.join(" · ")}</span>
        {best.link && (
          <a
            href={best.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-accent-strong hover:text-white"
          >
            {texts.itemPage}
            <i className="pi pi-external-link text-[9px]" aria-hidden />
          </a>
        )}
      </p>
      {slot.alternatives.length > 0 && (
        <DetailBlock title={texts.alternatives}>
          <ul className="flex flex-col gap-1">
            {slot.alternatives.map((item) => (
              <li key={item.itemId} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1">
                  <BisItemName item={item} linked />
                </span>
                <BisBelowBest percent={item.percentBelowBest} />
                <BisEaseMarker ease={item.ease} />
              </li>
            ))}
          </ul>
        </DetailBlock>
      )}
      {slot.enhancements.length > 0 && (
        <DetailBlock title={texts.enhancements}>
          <BisEnhancementList enhancements={slot.enhancements} />
        </DetailBlock>
      )}
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-wider text-muted uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}
