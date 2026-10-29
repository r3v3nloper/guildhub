import { ClassName } from "@/components/characters/ClassName";
import { Badge, Card } from "@/components/ui/ui";
import type { RosterMember, RosterProfession } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

/** "Alchemie 300 (Tränke)": name, skill and specialisation where known. */
function professionLabel(profession: RosterProfession): string {
  const skill =
    profession.skillLevel !== null ? ` ${profession.skillLevel}` : "";
  const specialization = profession.specialization
    ? ` (${profession.specialization})`
    : "";
  return `${localize(profession.name)}${skill}${specialization}`;
}

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
        <p className="text-sm text-muted">{de.roster.noCharacters}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {member.characters.map((character) => (
            <li
              key={character.id}
              className="flex flex-col gap-1 rounded-2xl bg-raised px-3.5 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-white">{character.name}</span>
                {character.isMain && (
                  <Badge tone="accent">{de.badges.main}</Badge>
                )}
                <ClassName entry={character.characterClass} />
                {character.mainSpec && (
                  <span className="text-soft">
                    {localize(character.mainSpec.name)}
                  </span>
                )}
                {character.role && (
                  <span className="text-muted">
                    {de.roles[character.role] ?? character.role}
                  </span>
                )}
                {character.level !== null && (
                  <span className="text-muted">
                    {de.roster.levelShort} {character.level}
                  </span>
                )}
                {gameNames && (
                  <span className="text-muted">
                    {gameNames.get(character.gameId)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted">
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
                {character.offSpec && (
                  <span>
                    {de.characters.offSpec}: {localize(character.offSpec.name)}
                  </span>
                )}
                {character.professions.length > 0 && (
                  <span>
                    {character.professions.map(professionLabel).join(", ")}
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
                        className="font-semibold text-accent-strong hover:text-white"
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
