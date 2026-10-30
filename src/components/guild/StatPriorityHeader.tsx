import Link from "next/link";
import {
  ClassAvatar,
  classTextColor,
} from "@/components/characters/ClassAvatar";
import type { CatalogEntry } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

/** Back to the class, its avatar and the page's title, above a ranking's form. */
export function StatPriorityHeader({
  classEntry,
  title,
}: {
  classEntry: CatalogEntry;
  title: string;
}) {
  const name = localize(classEntry.name);
  const color = (classEntry.data.color as string | undefined) ?? null;
  return (
    <header className="mb-2 flex flex-col gap-4">
      <Link
        href={`/stat-prio?klasse=${classEntry.id}`}
        className="-ml-2 flex min-h-10 w-fit items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-soft hover:bg-raised hover:text-white"
      >
        <i className="pi pi-arrow-left text-xs" aria-hidden />
        {de.statPriorities.backTo(name)}
      </Link>
      <div className="flex items-center gap-3.5">
        <ClassAvatar initial={name.charAt(0)} color={color} />
        <div className="flex flex-col">
          <span
            className="text-sm font-bold"
            style={{ color: classTextColor(color) }}
          >
            {name}
          </span>
          <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
