import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import Link from "next/link";
import {
  ClassAvatar,
  classTextColor,
} from "@/components/characters/ClassAvatar";
import { Badge, ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { loadRosterMembers } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.characters.title };

async function CharactersContent() {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const own =
    loadRosterMembers(db, actor.guildId, actor.userId).find(
      (member) => member.userId === actor.userId,
    )?.characters ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={de.characters.title} />
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {games.map((game) => {
        const characters = own.filter(
          (character) => character.gameId === game.id,
        );
        return (
          <section key={game.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold text-white">
                {localize(game.name)}
              </h2>
              <ButtonLink
                href={`/charaktere/neu?spiel=${game.id}`}
                variant="secondary"
              >
                <i className="pi pi-plus mr-2 text-xs" aria-hidden />
                {localize(game.meta.characterLabel)}
              </ButtonLink>
            </div>
            {characters.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
                {de.characters.empty}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {characters.map((character) => (
                  <li key={character.id}>
                    <Link
                      href={`/charaktere/${character.id}`}
                      className="flex items-center gap-3.5 rounded-[20px] border border-border bg-surface px-4 py-3.5 transition-colors hover:border-[#3a3358] hover:bg-[#1a1630]"
                    >
                      <ClassAvatar
                        initial={character.name.charAt(0).toUpperCase()}
                        color={character.characterClass?.color}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-base font-bold text-white">
                            {character.name}
                          </span>
                          {character.isMain && (
                            <Badge tone="accent">{de.badges.main}</Badge>
                          )}
                        </span>
                        <span className="flex flex-wrap gap-x-2.5 text-[13px] text-muted">
                          {character.characterClass && (
                            <span
                              className="font-bold"
                              style={{
                                color: classTextColor(
                                  character.characterClass.color,
                                ),
                              }}
                            >
                              {localize(character.characterClass.name)}
                            </span>
                          )}
                          {character.level !== null && (
                            <span>{de.today.level(character.level)}</span>
                          )}
                          {character.server && <span>{character.server}</span>}
                        </span>
                      </span>
                      <i
                        className="pi pi-chevron-right text-xs text-muted"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function CharactersPage() {
  return (
    <PageSuspense>
      <CharactersContent />
    </PageSuspense>
  );
}
