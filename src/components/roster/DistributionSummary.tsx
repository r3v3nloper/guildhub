import type { Distribution } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

function DistributionList({
  title,
  items,
  labelOf,
}: {
  title: string;
  items: Distribution[];
  labelOf: (item: Distribution) => string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="flex-1">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            <span className="w-28 truncate">{labelOf(item)}</span>
            <span className="h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
              <span
                className="block h-2 rounded"
                style={{
                  width: `${(item.count / total) * 100}%`,
                  backgroundColor: item.color ?? "var(--accent)",
                }}
              />
            </span>
            <span className="w-6 text-right tabular-nums">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 sm:flex-row dark:border-zinc-800">
      <DistributionList
        title={de.roster.roleDistribution}
        items={roles}
        labelOf={(item) => de.roles[item.key] ?? item.key}
      />
      <DistributionList
        title={de.roster.classDistribution}
        items={classes}
        labelOf={(item) => localize(item.label)}
      />
    </div>
  );
}
