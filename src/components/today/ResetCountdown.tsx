import type { DashboardItem } from "@/lib/tasks/dashboard";
import { formatCountdown } from "@/i18n/format";
import { de } from "@/i18n/de";

/** "Reset in 4 Std. 12 Min." – computed from the server's `now`, so SSR and client agree. */
export function ResetCountdown({
  item,
  now,
}: {
  item: Pick<DashboardItem, "nextReset">;
  now: string;
}) {
  if (!item.nextReset) {
    return null;
  }
  return <span>{de.today.resetIn(formatCountdown(item.nextReset, now))}</span>;
}
