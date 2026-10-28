import { CheckboxField, SelectField } from "@/components/ui/SelectField";
import { Button, ButtonLink, Field } from "@/components/ui/ui";
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
      <SelectField
        name={name}
        defaultValue={value ?? ""}
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
    <form
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
                label={de.roster.professionFilter}
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
        <p className="text-xs text-muted">{de.roster.pickGameForFilters}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <CheckboxField
          name="ehemalige"
          value="1"
          label={de.roster.showFormer}
          defaultChecked={filters.showFormer}
        />
        <Button>{de.common.filter}</Button>
        <ButtonLink href="/roster" variant="secondary">
          {de.common.reset}
        </ButtonLink>
      </div>
    </form>
  );
}
