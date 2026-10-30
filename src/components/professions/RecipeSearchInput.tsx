"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { de } from "@/i18n/de";

const SEARCH_DELAY_MS = 300;

/**
 * The search field for "Wer kann … bauen?": searches while typing (the page answers on
 * the server, so only the hits travel). Without JavaScript it is a plain GET form.
 */
export function RecipeSearchInput({
  initialQuery,
  keep,
  hint,
}: {
  initialQuery: string;
  /** Other query parameters to keep, e.g. the picked profession. */
  keep: Record<string, string>;
  /** Shown at the end of the field, e.g. how many recipes there are. */
  hint: string;
}) {
  const inputId = useId();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const hrefFor = (next: string) => {
    const params = new URLSearchParams(keep);
    if (next.trim()) {
      params.set("suche", next.trim());
    }
    const search = params.toString();
    return search ? `/berufe?${search}` : "/berufe";
  };
  const search = (next: string, delay = SEARCH_DELAY_MS) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => router.replace(hrefFor(next), { scroll: false }),
      delay,
    );
  };

  return (
    <form
      method="get"
      action="/berufe"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search(query, 0);
      }}
      className="flex flex-col gap-2.5"
    >
      {Object.entries(keep).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor={inputId} className="text-sm font-bold text-white">
        {de.directory.searchLabel}
      </label>
      <div className="flex h-13 items-center gap-2.5 rounded-[14px] border border-[#3a3358] bg-background px-4 focus-within:border-accent">
        <i className="pi pi-search text-muted" aria-hidden />
        <input
          id={inputId}
          type="search"
          name="suche"
          value={query}
          autoComplete="off"
          placeholder={de.directory.searchPlaceholder}
          onChange={(event) => {
            setQuery(event.target.value);
            search(event.target.value);
          }}
          className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-[#8f88aa] focus:outline-none"
        />
        <span className="hidden shrink-0 text-xs text-[#8f88aa] sm:inline">
          {hint}
        </span>
      </div>
    </form>
  );
}
