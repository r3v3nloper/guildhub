import type { AppDatabase } from "@/lib/db/client";
import {
  listGuildGames,
  loadGameCatalog,
  selectableOfKind,
} from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { recipeChoices } from "./form-options";
import { requestRecipesOf } from "./request-recipes";

export interface ProfessionOption {
  value: string;
  label: string;
  /** Crafting requests: the recipes to choose from; absent means free text. */
  recipes?: Array<{ value: string; label: string }>;
}

export interface ProfessionGameOption {
  value: string;
  label: string;
  professions: ProfessionOption[];
}

/**
 * Games with their selectable professions, for farm spots and crafting requests. Only the
 * request form needs the recipes, and they are many, so they are added on request.
 */
export function professionGameOptions(
  db: AppDatabase,
  guildId: number,
  onlyEnabled: boolean,
  options: { withRequestRecipes?: boolean } = {},
): ProfessionGameOption[] {
  return listGuildGames(db, guildId)
    .filter((game) => game.enabled || !onlyEnabled)
    .map((game) => {
      const catalog = loadGameCatalog(db, game.id);
      return {
        value: game.id,
        label: localize(game.name),
        professions: catalog
          ? selectableOfKind(catalog, "profession").map((entry) => {
              const recipes = options.withRequestRecipes
                ? requestRecipesOf(catalog, entry)
                : null;
              return {
                value: entry.key,
                label: localize(entry.name),
                ...(recipes && {
                  recipes: recipeChoices(
                    recipes,
                    de.characters.recipeFromSkill,
                  ).map(({ key, label }) => ({ value: key, label })),
                }),
              };
            })
          : [],
      };
    });
}
