/**
 * Recipes a character can learn with the skill entered for the profession. Without a
 * skill everything is offered. Recipes whose skill the pack does not know are mostly
 * endgame items whose data the game still hides, so a skill filter leaves them out;
 * they stay reachable by clearing the skill or typing the name.
 */
export function learnableAt<T extends { skill: number | null }>(
  recipes: readonly T[],
  skillLevel: number | null,
): T[] {
  if (skillLevel === null) {
    return [...recipes];
  }
  return recipes.filter(
    (recipe) => recipe.skill !== null && recipe.skill <= skillLevel,
  );
}
