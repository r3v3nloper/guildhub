"use client";

import { useActionState, useState } from "react";
import {
  Badge,
  Button,
  Field,
  FormMessage,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import type { CharacterHint } from "@/lib/roster/character-rules";
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

function optionLabel(option: CatalogOption): string {
  if (option.status === "removed") {
    return `${option.label} (${de.badges.removed})`;
  }
  if (option.status === "deprecated") {
    return `${option.label} (${de.badges.deprecated})`;
  }
  return option.todo ? `${option.label} (${de.badges.todo})` : option.label;
}

/** Classes the chosen race/faction may play (SPEC 4.5); the server checks the same rules. */
function allowedClasses(
  options: CharacterFormOptions,
  factionKey: string,
  raceKey: string,
): CatalogOption[] {
  const race = options.races.find((option) => option.key === raceKey);
  const faction = options.capabilities.races ? race?.faction : factionKey;
  return options.classes.filter(
    (option) =>
      (!race ||
        race.allowedClasses.length === 0 ||
        race.allowedClasses.includes(option.key)) &&
      (!faction ||
        option.factions.length === 0 ||
        option.factions.includes(faction)),
  );
}

export function CharacterForm({
  action,
  options,
  values,
  hints,
  knownServers,
}: CharacterFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [faction, setFaction] = useState(values.faction);
  const [race, setRace] = useState(values.race);
  const [characterClass, setCharacterClass] = useState(values.characterClass);
  const { capabilities } = options;
  const errors = state.errors ?? {};
  const hintFor = (field: CharacterHint["field"]) =>
    hints.find((hint) => hint.field === field)?.message;

  const classes = allowedClasses(options, faction, race);
  const keepClassIfAllowed = (nextFaction: string, nextRace: string) => {
    if (
      !allowedClasses(options, nextFaction, nextRace).some(
        (o) => o.key === characterClass,
      )
    ) {
      setCharacterClass("");
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
              <Select name="server" defaultValue={values.server}>
                <option value="">{de.common.none}</option>
                {options.servers.map((option) => (
                  <option key={option.key} value={option.key}>
                    {optionLabel(option)}
                  </option>
                ))}
              </Select>
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
            <Select
              name="faction"
              value={faction}
              onChange={(event) => {
                setFaction(event.target.value);
                keepClassIfAllowed(event.target.value, race);
              }}
            >
              <option value="">{de.common.choose}</option>
              {options.factions.map((option) => (
                <option key={option.key} value={option.key}>
                  {optionLabel(option)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {capabilities.races && (
          <Field
            label={de.characters.race}
            error={errors.raceKey}
            hint={hintFor("raceKey")}
          >
            <Select
              name="race"
              value={race}
              onChange={(event) => {
                setRace(event.target.value);
                keepClassIfAllowed(faction, event.target.value);
              }}
            >
              <option value="">{de.common.choose}</option>
              {options.races.map((option) => {
                const factionName = options.factions.find(
                  (f) => f.key === option.faction,
                )?.label;
                return (
                  <option key={option.key} value={option.key}>
                    {optionLabel(option)}
                    {factionName ? ` – ${factionName}` : ""}
                  </option>
                );
              })}
            </Select>
          </Field>
        )}

        {capabilities.classes && (
          <Field
            label={de.characters.class}
            error={errors.classKey}
            hint={hintFor("classKey")}
          >
            <Select
              name="class"
              value={characterClass}
              onChange={(event) => setCharacterClass(event.target.value)}
            >
              <option value="">{de.common.choose}</option>
              {classes.map((option) => (
                <option key={option.key} value={option.key}>
                  {optionLabel(option)}
                  {option.role
                    ? ` – ${de.roles[option.role] ?? option.role}`
                    : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label={de.characters.spec} error={errors.spec}>
          <TextInput name="spec" defaultValue={values.spec} />
        </Field>

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

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isMain" defaultChecked={values.isMain} />
        {de.characters.isMain}
      </label>

      {capabilities.professions && options.professions.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            {de.characters.professions}
          </legend>
          {hintFor("professionKeys") && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {hintFor("professionKeys")}
            </span>
          )}
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {options.professions.map((option) => (
              <label
                key={option.key}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="professions"
                  value={option.key}
                  defaultChecked={values.professions.includes(option.key)}
                />
                {option.label}
                {option.status !== "active" && (
                  <Badge tone="warning">{de.badges[option.status]}</Badge>
                )}
              </label>
            ))}
          </div>
          {errors.professionKeys && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {errors.professionKeys}
            </span>
          )}
        </fieldset>
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
