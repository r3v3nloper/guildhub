import { ClassName } from "@/components/characters/ClassName";
import { Badge, Card } from "@/components/ui/ui";
import type { RosterMember } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export function MemberCard({
  member,
  gameNames,
}: {
  member: RosterMember;
  /** Shown per character while "Alle Spiele" is selected. */
  gameNames: Map<string, string> | undefined;
}) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {member.image && (
            // eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar, no optimisation needed
            <img src={member.image} alt="" className="h-7 w-7 rounded-full" />
          )}
          {member.name}
          {member.role !== "member" && (
            <Badge tone="accent">{de.memberRoles[member.role]}</Badge>
          )}
          {member.status === "disabled" && (
            <Badge tone="danger">{de.badges.former}</Badge>
          )}
        </span>
      }
    >
      {member.characters.length === 0 ? (
        <p className="text-sm text-zinc-500">{de.roster.noCharacters}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {member.characters.map((character) => (
            <li key={character.id} className="flex flex-col gap-1 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{character.name}</span>
                {character.isMain && (
                  <Badge tone="accent">{de.badges.main}</Badge>
                )}
                <ClassName entry={character.characterClass} />
                {character.characterClass?.role && (
                  <span className="text-zinc-500">
                    {de.roles[character.characterClass.role]}
                  </span>
                )}
                {character.level !== null && (
                  <span className="text-zinc-500">Lvl {character.level}</span>
                )}
                {gameNames && (
                  <span className="text-zinc-500">
                    {gameNames.get(character.gameId)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-zinc-600 dark:text-zinc-400">
                {(character.race || character.faction) && (
                  <span>
                    {[character.race, character.faction]
                      .filter((ref) => ref !== null)
                      .map((ref) => localize(ref.name))
                      .join(" · ")}
                  </span>
                )}
                {character.server && <span>{character.server}</span>}
                {character.spec && <span>{character.spec}</span>}
                {character.professions.length > 0 && (
                  <span>
                    {character.professions
                      .map((p) => localize(p.name))
                      .join(", ")}
                  </span>
                )}
                {character.currentBuild && (
                  <span>
                    {de.roster.currentBuild}:{" "}
                    {character.currentBuild.url ? (
                      <a
                        href={character.currentBuild.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline"
                      >
                        {character.currentBuild.title}
                      </a>
                    ) : (
                      character.currentBuild.title
                    )}
                  </span>
                )}
                {character.plannedClass && (
                  <span className="inline-flex items-center gap-1">
                    {de.roster.plannedClass}:{" "}
                    <ClassName entry={character.plannedClass} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
