/**
 * Item name colours by quality, as the game shows them. Rare and epic are lightened a little
 * so they stay readable on the app's dark surfaces.
 */
const QUALITY_COLORS = [
  "#9d9d9d", // poor
  "#ffffff", // common
  "#1eff00", // uncommon
  "#4aa3ff", // rare
  "#b866f5", // epic
  "#ff8000", // legendary
  "#e6cc80", // artifact
  "#00ccff", // heirloom
] as const;

export function qualityColor(quality: number): string {
  return QUALITY_COLORS[quality] ?? QUALITY_COLORS[1];
}
