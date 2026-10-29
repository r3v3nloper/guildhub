import { PackCredits } from "@/components/packs/PackCredits";
import { Card } from "@/components/ui/ui";
import type { GameMeta } from "@/lib/db/schema";
import type { NotableLoot } from "@/lib/lists/dungeon-instances";
import { de } from "@/i18n/de";

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
    <Card title={de.checklists.notableLoot}>
      <p className="mb-2 text-sm text-muted">{de.checklists.notableLootHint}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {loot.map((item) => (
          <li key={item.name}>
            <span className="font-semibold text-white">{item.name}</span>
            {item.reason && (
              <span className="block text-xs text-muted italic">
                {item.reason}
              </span>
            )}
          </li>
        ))}
      </ul>
      <PackCredits meta={meta} label={de.checklists.notableLoot} />
    </Card>
  );
}
