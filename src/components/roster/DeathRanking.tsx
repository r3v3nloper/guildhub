import type { DeathRank } from "@/lib/roster/death-ranking";
import { de } from "@/i18n/de";

/** "Die meisten Tode" of the filtered roster (SPEC 7.4); hidden while nobody has died. */
export function DeathRanking({
  ranks,
  gameNames,
}: {
  ranks: DeathRank[];
  /** Shown per character while "Alle Spiele" is selected. */
  gameNames: Map<string, string> | undefined;
}) {
  if (ranks.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-5 md:p-6">
      <h2 className="text-xs font-bold tracking-widest text-muted uppercase">
        {de.roster.mostDeaths}
      </h2>
      <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {ranks.map((rank, index) => (
          <li
            key={rank.characterId}
            className="flex items-center gap-2.5 text-[13px]"
          >
            <span className="w-5 shrink-0 text-right font-bold text-muted tabular-nums">
              {index + 1}.
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-white">
                {rank.characterName}
              </span>
              <span className="text-muted">
                {" "}
                · {rank.memberName}
                {gameNames && ` · ${gameNames.get(rank.gameId)}`}
              </span>
            </span>
            <span className="font-bold tabular-nums">
              {de.roster.deaths(rank.deathCount)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
