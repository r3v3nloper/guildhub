"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { CheckboxField, SelectField } from "@/components/ui/SelectField";
import { Field } from "@/components/ui/ui";
import type { CatalogOption } from "@/lib/roster/form-options";
import { OUTDATED_FILTER_KEY, type RosterFilters } from "@/lib/roster/roster";
import { de } from "@/i18n/de";

export interface RosterFilterChoices {
  classes: CatalogOption[];
  professions: CatalogOption[];
  factions: CatalogOption[];
}

function FilterSelect({
  name,
  label,
  value,
  options,
  withOutdated,
  onChange,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: Array<{ key: string; label: string }>;
  withOutdated: boolean;
  onChange: () => void;
}) {
  return (
    <Field label={label}>
      <SelectField
        name={name}
        defaultValue={value ?? ""}
        onChange={onChange}
        emptyLabel={de.common.all}
        options={[
          ...options.map((option) => ({
            value: option.key,
            label: option.label,
          })),
          ...(withOutdated
            ? [{ value: OUTDATED_FILTER_KEY, label: de.roster.outdated }]
            : []),
        ]}
      />
    </Field>
  );
}

/**
 * Filters in the URL, so they survive reloads and sharing. Every change applies at
 * once; without JavaScript it is a plain GET form (Enter submits).
 */
export function RosterFilterForm({
  filters,
  choices,
}: {
  filters: RosterFilters;
  /** Undefined while "Alle Spiele" is selected: class keys only make sense per game. */
  choices: RosterFilterChoices | undefined;
}) {
  const roles = Object.entries(de.roles).map(([key, label]) => ({
    key,
    label,
  }));
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const isFiltered = Boolean(
    filters.role ||
    filters.classKey ||
    filters.professionKey ||
    filters.factionKey ||
    filters.showFormer,
  );
  // The hidden inputs follow the choice on the next render, so read the form then.
  const apply = () =>
    setTimeout(() => {
      if (!form.current) {
        return;
      }
      const params = new URLSearchParams();
      for (const [name, value] of new FormData(form.current)) {
        if (typeof value === "string" && value) {
          params.set(name, value);
        }
      }
      const search = params.toString();
      router.replace(search ? `/roster?${search}` : "/roster", {
        scroll: false,
      });
    }, 0);

  return (
    <form
      ref={form}
      method="get"
      className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FilterSelect
          name="rolle"
          label={de.roster.roleFilter}
          value={filters.role}
          options={roles}
          withOutdated={false}
          onChange={apply}
        />
        {choices && (
          <>
            <FilterSelect
              name="klasse"
              label={de.characters.class}
              value={filters.classKey}
              options={choices.classes}
              withOutdated
              onChange={apply}
            />
            {choices.professions.length > 0 && (
              <FilterSelect
                name="beruf"
                label={de.roster.professionFilter}
                value={filters.professionKey}
                options={choices.professions}
                withOutdated
                onChange={apply}
              />
            )}
            {choices.factions.length > 0 && (
              <FilterSelect
                name="fraktion"
                label={de.characters.faction}
                value={filters.factionKey}
                options={choices.factions}
                withOutdated={false}
                onChange={apply}
              />
            )}
          </>
        )}
      </div>
      {!choices && (
        <p className="text-xs text-muted">{de.roster.pickGameForFilters}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <CheckboxField
          name="ehemalige"
          value="1"
          label={de.roster.showFormer}
          defaultChecked={filters.showFormer}
          onChange={apply}
        />
        {isFiltered && (
          <a
            href="/roster"
            className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-soft hover:bg-raised hover:text-white"
          >
            <i className="pi pi-times text-xs" aria-hidden />
            {de.common.reset}
          </a>
        )}
      </div>
    </form>
  );
}
