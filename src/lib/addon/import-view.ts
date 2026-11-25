import { de } from "@/i18n/de";
import { localize } from "@/i18n/localize";
import type { GameCatalog } from "@/lib/roster/game-catalog";
import {
  previewKey,
  type ImportCharacter,
  type SkippedAccount,
} from "./character-import";
import type {
  CharacterPreview,
  PreviewStatus,
  UnknownValue,
} from "./import-preview";

/** One character of the preview, in words, as the import page shows it. */
export interface ImportCharacterView {
  key: string;
  name: string;
  realm: string;
  /** The member an officer imports this character for; null for the actor's own. */
  memberName: string | null;
  status: PreviewStatus;
  changes: string[];
  newRecipes: string[];
  missingProfessions: Array<{ entryId: number; label: string }>;
  unknown: string[];
}

/** A skipped account, in words: its characters and why it was left out. */
export function describeSkipped(account: SkippedAccount): string {
  const texts = de.addonImport;
  return texts.skippedAccount(
    account.characterNames.join(", ") || texts.noCharacters,
    texts.skipReason[account.reason],
  );
}

function describeUnknown(value: UnknownValue): string {
  const texts = de.addonImport;
  return value.kind === "recipes"
    ? texts.unknownRecipes(value.count)
    : texts.unknownValue(texts.unknownKinds[value.kind], value.ref);
}

export function describeImport(
  catalog: GameCatalog,
  previews: readonly ImportCharacter[],
): ImportCharacterView[] {
  const nameOf = (entryId: number | null) =>
    localize(catalog.entries.find((entry) => entry.id === entryId)?.name);
  const texts = de.addonImport;

  return previews.map((preview) => {
    const { values, previous } = preview;
    const changes: string[] = [];
    const isNew = preview.status === "new";
    const shows = (field: CharacterPreview["changedFields"][number]) =>
      isNew || preview.changedFields.includes(field);

    if (shows("race") && values.raceEntryId !== null) {
      changes.push(texts.field(de.characters.race, nameOf(values.raceEntryId)));
    }
    if (shows("class") && values.classEntryId !== null) {
      changes.push(
        texts.field(de.characters.class, nameOf(values.classEntryId)),
      );
    }
    if (shows("level") && values.level !== null) {
      changes.push(texts.level(previous?.level ?? null, values.level));
    }
    if (preview.fillsInServer) {
      changes.push(texts.realm(preview.realm));
    }
    for (const profession of preview.professions) {
      const label = nameOf(profession.entryId);
      if (profession.previousSkillLevel === undefined) {
        changes.push(texts.newProfession(label, profession.skillLevel));
      } else if (profession.skillLevel !== null) {
        changes.push(
          texts.skill(
            label,
            profession.previousSkillLevel,
            profession.skillLevel,
          ),
        );
      }
    }
    if (preview.deathsToAdd > 0) {
      changes.push(texts.deaths(preview.deathsToAdd));
    }

    return {
      key: previewKey(preview),
      name: preview.name,
      realm: preview.realm,
      memberName: preview.memberName,
      status: preview.status,
      changes,
      newRecipes: preview.newRecipes.map((recipe) => localize(recipe.name)),
      missingProfessions: preview.missingProfessionEntryIds.map((entryId) => ({
        entryId,
        label: texts.missingProfession(nameOf(entryId)),
      })),
      unknown: preview.unknown.map(describeUnknown),
    };
  });
}
