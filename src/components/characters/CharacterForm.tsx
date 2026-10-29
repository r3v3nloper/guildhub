"use client";

import { useState } from "react";
import {
  CheckboxField,
  MultiSelectField,
  SelectField,
  type SelectOption,
} from "@/components/ui/SelectField";
import {
  Button,
  Field,
  FormMessage,
  TextArea,
  TextInput,
} from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import type { CharacterHint } from "@/lib/roster/character-rules";
import { allowedClasses } from "@/lib/roster/class-restrictions";
import type {
  CatalogOption,
  CharacterFormOptions,
} from "@/lib/roster/form-options";
import { de } from "@/i18n/de";

export interface CharacterFormValues {
  name: string;
  server: string;
  faction: string;
  race: string;
  characterClass: string;
  specKey: string;
  offSpecKey: string;
  spec: string;
  level: string;
  isMain: boolean;
  notes: string;
  professions: string[];
}

interface CharacterFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  options: CharacterFormOptions;
  values: CharacterFormValues;
  hints: CharacterHint[];
  knownServers: string[];
}

function toSelectOption(option: CatalogOption): SelectOption {
  return { value: option.key, label: optionLabel(option) };
}

function optionLabel(option: CatalogOption): string {
  if (option.status === "removed") {
    return `${option.label} (${de.badges.removed})`;
  }
  if (option.status === "deprecated") {
    return `${option.label} (${de.badges.deprecated})`;
  }
  return option.todo ? `${option.label} (${de.badges.todo})` : option.label;
}

/** Classes the chosen race/faction may play; the same rule the server enforces. */
function classesFor(
  options: CharacterFormOptions,
  factionKey: string,
  raceKey: string,
): CatalogOption[] {
  const race = options.races.find((option) => option.key === raceKey);
  return allowedClasses(options.classes, race, factionKey || undefined);
}

export function CharacterForm({
  action,
  options,
  values,
  hints,
  knownServers,
}: CharacterFormProps) {
  const { state, pending, onSubmit } = useFormAction(action);
  const [faction, setFaction] = useState(values.faction);
  const [race, setRace] = useState(values.race);
  const [characterClass, setCharacterClass] = useState(values.characterClass);
  const [specKey, setSpecKey] = useState(values.specKey);
  const [offSpecKey, setOffSpecKey] = useState(values.offSpecKey);
  const { capabilities } = options;
  const errors = state.errors ?? {};
  const hintFor = (field: CharacterHint["field"]) =>
    hints.find((hint) => hint.field === field)?.message;

  const classes = classesFor(options, faction, race);
  const chooseClass = (next: string) => {
    if (next !== characterClass) {
      setSpecKey("");
      setOffSpecKey("");
    }
    setCharacterClass(next);
  };
  const keepClassIfAllowed = (nextFaction: string, nextRace: string) => {
    if (
      !classesFor(options, nextFaction, nextRace).some(
        (o) => o.key === characterClass,
      )
    ) {
      chooseClass("");
    }
  };
  const usesSpecCatalog = capabilities.classes && options.specs.length > 0;
  const specOptions = options.specs
    .filter((option) => option.specClass === characterClass)
    .map((option) => ({
      value: option.key,
      label: option.role
        ? `${optionLabel(option)} – ${de.roles[option.role] ?? option.role}`
        : optionLabel(option),
    }));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={de.characters.name} error={errors.name}>
          <TextInput
            name="name"
            defaultValue={values.name}
            required
            maxLength={40}
          />
        </Field>

        {capabilities.servers && (
          <Field label={options.serverLabel} error={errors.server}>
            {options.servers.length > 0 ? (
              <SelectField
                name="server"
                defaultValue={values.server}
                emptyLabel={de.common.none}
                options={options.servers.map(toSelectOption)}
              />
            ) : (
              <>
                <TextInput
                  name="server"
                  defaultValue={values.server}
                  list="known-servers"
                />
                <datalist id="known-servers">
                  {knownServers.map((server) => (
                    <option key={server} value={server} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        )}

        {capabilities.factions && !capabilities.races && (
          <Field
            label={de.characters.faction}
            error={errors.factionKey}
            hint={hintFor("factionKey")}
          >
            <SelectField
              name="faction"
              value={faction}
              placeholder={de.common.choose}
              options={options.factions.map(toSelectOption)}
              onChange={(next) => {
                setFaction(next);
                keepClassIfAllowed(next, race);
              }}
            />
          </Field>
        )}

        {capabilities.races && (
          <Field
            label={de.characters.race}
            error={errors.raceKey}
            hint={hintFor("raceKey")}
          >
            <SelectField
              name="race"
              value={race}
              placeholder={de.common.choose}
              options={options.races.map((option) => {
                const factionName = options.factions.find(
                  (f) => f.key === option.faction,
                )?.label;
                return {
                  value: option.key,
                  label: factionName
                    ? `${optionLabel(option)} – ${factionName}`
                    : optionLabel(option),
                };
              })}
              onChange={(next) => {
                setRace(next);
                keepClassIfAllowed(faction, next);
              }}
            />
          </Field>
        )}

        {capabilities.classes && (
          <Field
            label={de.characters.class}
            error={errors.classKey}
            hint={hintFor("classKey")}
          >
            <SelectField
              name="class"
              value={characterClass}
              placeholder={de.common.choose}
              options={classes.map((option) => ({
                value: option.key,
                label: option.role
                  ? `${optionLabel(option)} – ${de.roles[option.role] ?? option.role}`
                  : optionLabel(option),
              }))}
              onChange={chooseClass}
            />
          </Field>
        )}

        {usesSpecCatalog ? (
          <>
            <Field
              label={de.characters.spec}
              error={errors.specKey}
              hint={hintFor("specKey")}
            >
              <SelectField
                name="specKey"
                value={specKey}
                emptyLabel={de.common.none}
                disabled={!characterClass}
                options={specOptions}
                onChange={(next) => {
                  setSpecKey(next);
                  if (!next || next === offSpecKey) {
                    setOffSpecKey("");
                  }
                }}
              />
            </Field>
            <Field
              label={de.characters.offSpec}
              error={errors.offSpecKey}
              hint={hintFor("offSpecKey")}
            >
              <SelectField
                name="offSpecKey"
                value={offSpecKey}
                emptyLabel={de.common.none}
                disabled={!specKey}
                options={specOptions.filter((o) => o.value !== specKey)}
                onChange={setOffSpecKey}
              />
            </Field>
          </>
        ) : (
          <Field label={de.characters.spec} error={errors.spec}>
            <TextInput name="spec" defaultValue={values.spec} />
          </Field>
        )}

        <Field label={de.characters.level} error={errors.level}>
          <TextInput
            name="level"
            type="number"
            min={1}
            max={1000}
            defaultValue={values.level}
          />
        </Field>
      </div>

      <CheckboxField
        name="isMain"
        label={de.characters.isMain}
        defaultChecked={values.isMain}
      />

      {capabilities.professions && options.professions.length > 0 && (
        <Field
          label={de.characters.professions}
          error={errors.professionKeys}
          hint={hintFor("professionKeys")}
        >
          <MultiSelectField
            name="professions"
            defaultValue={values.professions}
            placeholder={de.common.choose}
            options={options.professions.map(toSelectOption)}
          />
        </Field>
      )}

      <Field label={de.characters.notes} error={errors.notes}>
        <TextArea name="notes" defaultValue={values.notes} />
      </Field>

      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
