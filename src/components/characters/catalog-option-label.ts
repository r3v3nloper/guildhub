import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";

/** A catalog choice's label, marked when it is outdated or not yet verified. */
export function optionLabel(option: CatalogOption): string {
  if (option.status === "removed") {
    return `${option.label} (${de.badges.removed})`;
  }
  if (option.status === "deprecated") {
    return `${option.label} (${de.badges.deprecated})`;
  }
  return option.todo ? `${option.label} (${de.badges.todo})` : option.label;
}
