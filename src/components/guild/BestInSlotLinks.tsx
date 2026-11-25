import Link from "next/link";
import type { CatalogEntry } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

const texts = de.bestInSlot;

/** The class's specs that have a best in slot list, each opening its list. */
export function BestInSlotLinks({
  specs,
  ownSpecIds,
}: {
  specs: CatalogEntry[];
  /** Specs the member plays, marked like in the build recommendations. */
  ownSpecIds: ReadonlySet<number | null>;
}) {
  if (specs.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
          {texts.title}
        </h3>
        <p className="text-sm text-muted">{texts.hint}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {specs.map((spec) => {
          const name = localize(spec.name);
          return (
            <li key={spec.id}>
              <Link
                href={`/stat-prio/bis/${spec.id}`}
                aria-label={texts.open(name)}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-sm font-semibold text-white hover:border-[#3a3358]"
              >
                {name}
                {ownSpecIds.has(spec.id) && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">
                    {de.specBuilds.yourSpec}
                  </span>
                )}
                <i className="pi pi-chevron-right text-[10px]" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
