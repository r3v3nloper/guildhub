import type { ResetRule } from "@/lib/reset/types";
import { de } from "./de";

/** "Täglich 05:00", "Wöchentlich Mi 05:00", "Alle 3 Tage ab 01.10.2026, 05:00" … */
export function describeResetRule(rule: ResetRule): string {
  const time = rule.time;
  switch (rule.type) {
    case "daily":
      return `${de.tasks.ruleTypes.daily} ${time}`;
    case "weekly":
      return `${de.tasks.ruleTypes.weekly} ${de.tasks.weekdays[(rule.weekday ?? 1) - 1]} ${time}`;
    case "monthly":
      return `${de.tasks.ruleTypes.monthly} am ${rule.day_of_month}. ${time}`;
    case "every_n_days": {
      const anchor = rule.anchor
        ? new Date(`${rule.anchor}T00:00:00Z`).toLocaleDateString("de-DE", {
            timeZone: "UTC",
          })
        : "?";
      return `Alle ${rule.n_days} Tage ab ${anchor}, ${time}`;
    }
  }
}
