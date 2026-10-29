import { PackCredits } from "@/components/packs/PackCredits";
import type { GameMeta } from "@/lib/db/schema";
import type { NotableLoot } from "@/lib/lists/dungeon-instances";
import { de } from "@/i18n/de";
import { FoldCard } from "./FoldCard";

/** Loot the pack highlights for the instance a dungeon page started from; read-only. */
export function NotableLootCard({
  loot,
  meta,
}: {
  loot: NotableLoot[];
  meta: GameMeta;
}) {
  if (loot.length === 0) {
    return null;
  }
  return (
    <FoldCard
      title={de.checklists.notableLoot}
      note={de.checklists.lootCount(loot.length)}
    >
      <p className="mb-3 text-[13px] text-muted">
        {de.checklists.notableLootHint}
      </p>
      <ul className="flex flex-col gap-2.5 text-sm">
        {loot.map((item) => (
          <li key={item.name} className="flex flex-col gap-0.5">
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 self-start font-semibold text-accent-strong hover:text-white"
              >
                {item.name}
                <i className="pi pi-external-link text-[10px]" aria-hidden />
                <span className="sr-only">{de.checklists.openLink}</span>
              </a>
            ) : (
              <span className="font-semibold text-white">{item.name}</span>
            )}
            {item.reason && (
              <span className="text-[12.5px] text-muted">{item.reason}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <PackCredits meta={meta} label={de.checklists.notableLoot} />
      </div>
    </FoldCard>
  );
}
