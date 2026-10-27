import { Button, ButtonLink, Field, Select } from "@/components/ui/ui";
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
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: Array<{ key: string; label: string }>;
  withOutdated: boolean;
}) {
  return (
    <Field label={label}>
      <Select name={name} defaultValue={value ?? ""}>
        <option value="">{de.common.all}</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
        {withOutdated && (
          <option value={OUTDATED_FILTER_KEY}>{de.roster.outdated}</option>
        )}
      </Select>
    </Field>
  );
}

/** A plain GET form, so filters live in the URL and survive reloads and sharing. */
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

  return (
    <form method="get" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FilterSelect
          name="rolle"
          label="Rolle"
          value={filters.role}
          options={roles}
          withOutdated={false}
        />
        {choices && (
          <>
            <FilterSelect
              name="klasse"
              label={de.characters.class}
              value={filters.classKey}
              options={choices.classes}
              withOutdated
            />
            {choices.professions.length > 0 && (
              <FilterSelect
                name="beruf"
                label="Beruf"
                value={filters.professionKey}
                options={choices.professions}
                withOutdated
              />
            )}
            {choices.factions.length > 0 && (
              <FilterSelect
                name="fraktion"
                label={de.characters.faction}
                value={filters.factionKey}
                options={choices.factions}
                withOutdated={false}
              />
            )}
          </>
        )}
      </div>
      {!choices && (
        <p className="text-xs text-zinc-500">{de.roster.pickGameForFilters}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ehemalige"
            value="1"
            defaultChecked={filters.showFormer}
          />
          {de.roster.showFormer}
        </label>
        <Button>{de.common.filter}</Button>
        <ButtonLink href="/roster" variant="secondary">
          {de.common.reset}
        </ButtonLink>
      </div>
    </form>
  );
}
