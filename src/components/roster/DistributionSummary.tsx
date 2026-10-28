import type { Distribution } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

/** Role colours: told apart by lightness too, not by hue alone. */
const roleColors: Record<string, string> = {
  tank: "#8fb4ff",
  dps: "#ff9a8b",
  heal: "#7be3a9",
  support: "#ffc46b",
};

/** Class and role counts of the filtered roster, for raid planning (SPEC 7.4). */
export function DistributionSummary({
  classes,
  roles,
}: {
  classes: Distribution[];
  roles: Distribution[];
}) {
  if (classes.length === 0) {
    return null;
  }
  const maxClass = Math.max(...classes.map((item) => item.count));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5 md:p-6">
        <h2 className="text-xs font-bold tracking-widest text-muted uppercase">
          {de.roster.roleDistribution}
        </h2>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {roles.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-1.5 rounded-2xl bg-raised px-3 py-3.5"
            >
              <span
                className="font-display text-3xl leading-none font-semibold"
                style={{ color: roleColors[item.key] ?? "var(--gh-accent)" }}
              >
                {item.count}
              </span>
              <span className="text-[13px] font-semibold text-soft">
                {de.roles[item.key] ?? item.key}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-5 md:p-6">
        <h2 className="text-xs font-bold tracking-widest text-muted uppercase">
          {de.roster.classDistribution}
        </h2>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {classes.map((item) => {
            const color = item.color ?? "var(--gh-accent)";
            return (
              <li
                key={item.key}
                className="flex items-center gap-2.5 text-[13px]"
              >
                <span
                  className="w-24 shrink-0 truncate font-semibold"
                  style={{ color: `color-mix(in srgb, ${color} 78%, white)` }}
                >
                  {localize(item.label)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(item.count / maxClass) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </span>
                <span className="w-5 text-right font-bold tabular-nums">
                  {item.count}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
