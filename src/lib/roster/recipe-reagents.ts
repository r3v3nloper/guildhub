import { localize } from "@/i18n/localize";
import type { LocalizedString } from "@/lib/packs/schema";

interface ReagentData {
  reagents?: Array<{ name: LocalizedString; count: number }>;
}

/** A pack recipe's reagents as one line, e.g. "2× Leinenstoff, 1× Leere Phiole". */
export function formatReagents(
  recipeData: Record<string, unknown>,
): string | null {
  const { reagents } = recipeData as ReagentData;
  if (!reagents || reagents.length === 0) {
    return null;
  }
  return reagents
    .map((reagent) => `${reagent.count}× ${localize(reagent.name)}`)
    .join(", ");
}

export interface Reagent {
  name: string;
  count: number;
}

/** A pack recipe's reagents, each count multiplied by how often it is crafted. */
export function reagentsOf(
  recipeData: Record<string, unknown>,
  times = 1,
): Reagent[] {
  const { reagents } = recipeData as ReagentData;
  return (reagents ?? []).map((reagent) => ({
    name: localize(reagent.name),
    count: reagent.count * times,
  }));
}
