import { FoldCard } from "@/components/lists/FoldCard";
import { PackCredits } from "@/components/packs/PackCredits";
import { Badge } from "@/components/ui/ui";
import type { GameMeta } from "@/lib/db/schema";
import type { LevelLearnings } from "@/lib/roster/class-abilities";
import { de } from "@/i18n/de";

/** What the character learns now and on the next levels, from the pack (ForeverDB). */
export function NextLearningsCard({
  upcoming,
  level,
  meta,
}: {
  upcoming: LevelLearnings[];
  level: number | null;
  meta: GameMeta;
}) {
  return (
    <FoldCard title={de.learnings.title} defaultOpen>
      {level === null ? (
        <p className="text-sm text-muted">{de.learnings.noLevel}</p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-muted">{de.learnings.allLearned}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((entry) => (
            <div key={entry.level} className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-muted uppercase">
                {de.learnings.atLevel(entry.level, entry.level === level)}
              </span>
              <ul className="flex flex-col gap-1 text-sm">
                {entry.learnings.map((learning) => (
                  <li
                    key={`${learning.name}-${learning.rank}`}
                    className="flex flex-wrap items-center gap-x-2"
                  >
                    <span className="font-medium text-white">
                      {learning.name}
                    </span>
                    {learning.rank !== null && (
                      <span className="text-muted">
                        {de.learnings.rank(learning.rank)}
                      </span>
                    )}
                    {learning.fromQuest && (
                      <Badge>{de.learnings.fromQuest}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        <PackCredits meta={meta} label={de.learnings.title} />
      </div>
    </FoldCard>
  );
}
