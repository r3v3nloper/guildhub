import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import Link from "next/link";
import { ClassName } from "@/components/characters/ClassName";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { loadRosterMembers } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.characters.title };

async function CharactersContent() {
  const actor = await requireActor();
  const db = getDb();
  const enabledGames = listEnabledGames(db, actor.guildId);
  const selectedGame = await readGameFilter(
    enabledGames.map((game) => game.id),
  );
  const games = enabledGames.filter(
    (game) => !selectedGame || game.id === selectedGame,
  );
  const own =
    loadRosterMembers(db, actor.guildId, actor.userId).find(
      (member) => member.userId === actor.userId,
    )?.characters ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.characters.title} />
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {games.map((game) => {
        const characters = own.filter(
          (character) => character.gameId === game.id,
        );
        return (
          <Card
            key={game.id}
            title={
              <span className="flex items-center justify-between gap-2">
                {localize(game.name)}
                <ButtonLink
                  href={`/charaktere/neu?spiel=${game.id}`}
                  variant="secondary"
                >
                  + {localize(game.meta.characterLabel)}
                </ButtonLink>
              </span>
            }
          >
            {characters.length === 0 ? (
              <p className="text-sm text-muted">{de.characters.empty}</p>
            ) : (
              <ul className="divide-y divide-border">
                {characters.map((character) => (
                  <li key={character.id}>
                    <Link
                      href={`/charaktere/${character.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 hover:text-accent"
                    >
                      <span className="font-medium">{character.name}</span>
                      {character.isMain && (
                        <Badge tone="accent">{de.badges.main}</Badge>
                      )}
                      <ClassName entry={character.characterClass} />
                      {character.level !== null && (
                        <span className="text-sm text-muted">
                          {de.characters.level} {character.level}
                        </span>
                      )}
                      {character.server && (
                        <span className="text-sm text-muted">
                          {character.server}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
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
