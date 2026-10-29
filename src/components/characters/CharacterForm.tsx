"use client";

import { useState, type ReactNode } from "react";
import { SelectField } from "@/components/ui/SelectField";
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
import { optionLabel } from "./catalog-option-label";
import { ChoiceChip } from "./ChoiceChip";
import { ClassAvatar, classTextColor } from "./ClassAvatar";

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
  /** New characters pick professions here and get a preview; edits save via a bar. */
  mode: "new" | "edit";
  /** Edit mode: shown beside the form, e.g. stat priorities and delete. */
  aside?: ReactNode;
}

const LEVEL_MAX = 1000;

/** Classes the chosen race/faction may play; the same rule the server enforces. */
function classesFor(
  options: CharacterFormOptions,
  factionKey: string,
  raceKey: string,
): CatalogOption[] {
  const race = options.races.find((option) => option.key === raceKey);
  return allowedClasses(options.classes, race, factionKey || undefined);
}

const roleLabel = (role: string | undefined) =>
  role ? (de.roles[role] ?? role) : null;

/**
 * Name, server, level, race, class and role of a character, grouped in cards. Choices
 * are chips and tiles; classes the race cannot play stay visible but disabled.
 */
export function CharacterForm({
  action,
  options,
  values,
  hints,
  knownServers,
  mode,
  aside,
}: CharacterFormProps) {
  const isNew = mode === "new";
  const { state, pending, formRef, onSubmit } = useFormAction(action);
  // Changes count as unsaved while no newer action result has arrived since.
  const [changedIn, setChangedIn] = useState<ActionState | null>(null);
  const dirty = changedIn === state;
  const markDirty = () => setChangedIn(state);
  const [name, setName] = useState(values.name);
  const [level, setLevel] = useState(values.level);
  const [isMain, setIsMain] = useState(values.isMain);
  const [faction, setFaction] = useState(values.faction);
  const [race, setRace] = useState(values.race);
  const [characterClass, setCharacterClass] = useState(values.characterClass);
  const [specKey, setSpecKey] = useState(values.specKey);
  const [offSpecKey, setOffSpecKey] = useState(values.offSpecKey);
  const [professions, setProfessions] = useState(values.professions);
  const { capabilities } = options;
  const errors = state.errors ?? {};
  const hintFor = (field: CharacterHint["field"]) =>
    hints.find((hint) => hint.field === field)?.message;

  const allowed = new Set(
    classesFor(options, faction, race).map((option) => option.key),
  );
  const chosenClass = options.classes.find((o) => o.key === characterClass);
  const chosenRace = options.races.find((o) => o.key === race);
  const specs = options.specs.filter((o) => o.specClass === characterClass);
  const usesSpecCatalog = capabilities.classes && options.specs.length > 0;
  const chosenSpec = specs.find((o) => o.key === specKey);

  const change = (apply: () => void) => {
    apply();
    markDirty();
  };
  const chooseClass = (next: string) =>
    change(() => {
      setCharacterClass(next);
      if (next !== characterClass) {
        setSpecKey("");
        setOffSpecKey("");
      }
    });
  const keepClassIfAllowed = (nextFaction: string, nextRace: string) => {
    if (
      characterClass &&
      !classesFor(options, nextFaction, nextRace).some(
        (o) => o.key === characterClass,
      )
    ) {
      setCharacterClass("");
      setSpecKey("");
      setOffSpecKey("");
    }
  };
  const discard = () => {
    formRef.current?.reset();
    setName(values.name);
    setLevel(values.level);
    setIsMain(values.isMain);
    setFaction(values.faction);
    setRace(values.race);
    setCharacterClass(values.characterClass);
    setSpecKey(values.specKey);
    setOffSpecKey(values.offSpecKey);
    setProfessions(values.professions);
    setChangedIn(null);
  };
  const changeLevel = (delta: number) =>
    change(() => {
      const current = Number(level) || 0;
      setLevel(String(Math.min(LEVEL_MAX, Math.max(1, current + delta))));
    });

  const step = (number: number, title: string, note?: string) => (
    <h2 className="flex flex-wrap items-center gap-x-2.5 font-display text-xl font-semibold text-white">
      {isNew && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm text-[#d9ccff]">
          {number}
        </span>
      )}
      {title}
      {note && (
        <span className="font-sans text-[13px] font-medium text-muted">
          {note}
        </span>
      )}
    </h2>
  );
  const groupLabel = (text: string, id: string) => (
    <span id={id} className="text-[13px] font-bold text-soft">
      {text}
    </span>
  );
  const problem = (message: string | undefined) =>
    message && <small className="text-danger">{message}</small>;
  const notice = (message: string | undefined) =>
    message && <small className="text-warning">{message}</small>;

  const factionsWithRaces = options.factions
    .map((entry) => ({
      faction: entry,
      races: options.races.filter((r) => r.faction === entry.key),
    }))
    .filter((group) => group.races.length > 0);
  const racesWithoutFaction = options.races.filter(
    (r) => !options.factions.some((f) => f.key === r.faction),
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onChange={() => markDirty()}
        className="flex flex-col gap-4"
      >
        <section className="flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5">
          {step(1, isNew ? de.characters.stepWho : de.characters.basics)}
          <div className="grid gap-3.5 sm:grid-cols-3">
            <Field label={de.characters.name} error={errors.name}>
              <TextInput
                name="name"
                defaultValue={values.name}
                required
                maxLength={40}
                placeholder={isNew ? de.characters.namePlaceholder : undefined}
                onInput={(event) => setName(event.currentTarget.value)}
              />
            </Field>
            {capabilities.servers && (
              <Field label={options.serverLabel} error={errors.server}>
                {options.servers.length > 0 ? (
                  <SelectField
                    name="server"
                    defaultValue={values.server}
                    emptyLabel={de.common.none}
                    options={options.servers.map((option) => ({
                      value: option.key,
                      label: optionLabel(option),
                    }))}
                    onChange={() => markDirty()}
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
            <div className="flex flex-col gap-1 text-sm">
              {groupLabel(de.characters.level, "level-label")}
              <div
                role="group"
                aria-labelledby="level-label"
                className="flex items-center gap-1.5"
              >
                <Button
                  type="button"
                  variant="secondary"
                  icon="pi pi-minus"
                  aria-label={de.characters.levelDown}
                  onClick={() => changeLevel(-1)}
                />
                <TextInput
                  name="level"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={LEVEL_MAX}
                  value={level}
                  aria-labelledby="level-label"
                  onChange={(event) => setLevel(event.target.value)}
                  className="max-w-20 text-center"
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon="pi pi-plus"
                  aria-label={de.characters.levelUp}
                  onClick={() => changeLevel(1)}
                />
              </div>
              {problem(errors.level)}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isMain}
            onClick={() => change(() => setIsMain(!isMain))}
            className="flex items-center gap-3.5 rounded-2xl border border-[#2c2645] bg-raised px-3.5 py-3 text-left"
          >
            <span
              className={`relative h-6 w-10.5 shrink-0 rounded-full transition-colors ${isMain ? "bg-accent" : "bg-[#3a3358]"}`}
            >
              <span
                className={`absolute top-0.75 h-4.5 w-4.5 rounded-full bg-white transition-[left] ${isMain ? "left-5.25" : "left-0.75"}`}
              />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-bold">
                {isNew ? de.characters.isMainNew : de.characters.isMain}
              </span>
              <span className="text-[12.5px] text-muted">
                {de.characters.isMainHint}
              </span>
            </span>
          </button>
          {isMain && <input type="hidden" name="isMain" value="on" />}
        </section>

        {(capabilities.classes ||
          capabilities.races ||
          capabilities.factions) && (
          <section className="flex flex-col gap-4.5 rounded-[22px] border border-border bg-surface p-5">
            {step(
              2,
              capabilities.races
                ? isNew
                  ? de.characters.stepClass
                  : de.characters.raceAndClass
                : isNew
                  ? de.characters.stepClassNoRace
                  : de.characters.classAndRole,
            )}

            {capabilities.races && (
              <div
                role="group"
                aria-labelledby="race-label"
                className="flex flex-col gap-2"
              >
                {groupLabel(de.characters.race, "race-label")}
                {[
                  ...factionsWithRaces,
                  ...(racesWithoutFaction.length > 0
                    ? [{ faction: undefined, races: racesWithoutFaction }]
                    : []),
                ].map((group) => (
                  <div
                    key={group.faction?.key ?? "none"}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {group.faction && (
                      <span className="w-16 text-xs font-bold text-muted">
                        {group.faction.label}
                      </span>
                    )}
                    {group.races.map((option) => (
                      <ChoiceChip
                        key={option.key}
                        active={race === option.key}
                        onClick={() =>
                          change(() => {
                            setRace(option.key);
                            keepClassIfAllowed(faction, option.key);
                          })
                        }
                      >
                        {optionLabel(option)}
                      </ChoiceChip>
                    ))}
                  </div>
                ))}
                <input type="hidden" name="race" value={race} />
                {notice(hintFor("raceKey"))}
                {problem(errors.raceKey)}
              </div>
            )}

            {capabilities.factions && !capabilities.races && (
              <div
                role="group"
                aria-labelledby="faction-label"
                className="flex flex-col gap-2"
              >
                {groupLabel(de.characters.faction, "faction-label")}
                <div className="flex flex-wrap gap-1.5">
                  {options.factions.map((option) => (
                    <ChoiceChip
                      key={option.key}
                      active={faction === option.key}
                      onClick={() =>
                        change(() => {
                          setFaction(option.key);
                          keepClassIfAllowed(option.key, race);
                        })
                      }
                    >
                      {optionLabel(option)}
                    </ChoiceChip>
                  ))}
                </div>
                <input type="hidden" name="faction" value={faction} />
                {notice(hintFor("factionKey"))}
                {problem(errors.factionKey)}
              </div>
            )}

            {capabilities.classes && (
              <div
                role="group"
                aria-labelledby="class-label"
                className="flex flex-col gap-2"
              >
                {groupLabel(de.characters.class, "class-label")}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                  {options.classes.map((option) => {
                    const fits = allowed.has(option.key);
                    return (
                      <ChoiceChip
                        key={option.key}
                        shape="tile"
                        active={characterClass === option.key}
                        disabled={!fits && characterClass !== option.key}
                        onClick={() => chooseClass(option.key)}
                      >
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: option.color ?? "var(--gh-accent)",
                            opacity: fits ? 1 : 0.35,
                          }}
                        />
                        <span className="flex flex-col leading-tight">
                          {optionLabel(option)}
                          {option.role && !usesSpecCatalog && (
                            <span className="text-[11.5px] font-medium text-muted">
                              {roleLabel(option.role)}
                            </span>
                          )}
                        </span>
                      </ChoiceChip>
                    );
                  })}
                </div>
                <input type="hidden" name="class" value={characterClass} />
                {chosenRace && allowed.size < options.classes.length && (
                  <span className="text-[12.5px] text-muted">
                    {de.characters.notAvailableFor(chosenRace.label)}
                  </span>
                )}
                {notice(hintFor("classKey"))}
                {problem(errors.classKey)}
              </div>
            )}

            {usesSpecCatalog ? (
              characterClass ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div
                    role="group"
                    aria-labelledby="spec-label"
                    className="flex flex-col gap-2"
                  >
                    {groupLabel(de.characters.spec, "spec-label")}
                    <div className="flex flex-wrap gap-1.5">
                      {specs.map((option) => (
                        <SpecChoice
                          key={option.key}
                          option={option}
                          active={specKey === option.key}
                          onClick={() =>
                            change(() => {
                              setSpecKey(option.key);
                              if (offSpecKey === option.key) {
                                setOffSpecKey("");
                              }
                            })
                          }
                        />
                      ))}
                    </div>
                    {notice(hintFor("specKey"))}
                    {problem(errors.specKey)}
                  </div>
                  <div
                    role="group"
                    aria-labelledby="offspec-label"
                    className="flex flex-col gap-2"
                  >
                    {groupLabel(
                      `${de.characters.offSpec} (${de.characters.optional})`,
                      "offspec-label",
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <ChoiceChip
                        shape="tile"
                        active={offSpecKey === ""}
                        onClick={() => change(() => setOffSpecKey(""))}
                      >
                        <span className="flex flex-col leading-tight">
                          {de.characters.noOffSpec}
                          <span className="text-[11.5px] font-medium text-muted">
                            {de.characters.onlyMainSpec}
                          </span>
                        </span>
                      </ChoiceChip>
                      {specs
                        .filter((option) => option.key !== specKey)
                        .map((option) => (
                          <SpecChoice
                            key={option.key}
                            option={option}
                            active={offSpecKey === option.key}
                            disabled={!specKey}
                            onClick={() =>
                              change(() => setOffSpecKey(option.key))
                            }
                          />
                        ))}
                    </div>
                    {notice(hintFor("offSpecKey"))}
                    {problem(errors.offSpecKey)}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted">
                  {de.characters.chooseClassFirst}
                </p>
              )
            ) : (
              <div className="max-w-sm">
                <Field label={de.characters.spec} error={errors.spec}>
                  <TextInput name="spec" defaultValue={values.spec} />
                </Field>
              </div>
            )}
            <input type="hidden" name="specKey" value={specKey} />
            <input type="hidden" name="offSpecKey" value={offSpecKey} />
          </section>
        )}

        {isNew &&
          capabilities.professions &&
          options.professions.length > 0 && (
            <section className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-5">
              {step(
                3,
                de.characters.stepProfessions,
                de.characters.stepProfessionsHint,
              )}
              <div className="flex flex-wrap gap-1.5">
                {options.professions.map((option) => {
                  const active = professions.includes(option.key);
                  return (
                    <ChoiceChip
                      key={option.key}
                      active={active}
                      onClick={() =>
                        change(() =>
                          setProfessions(
                            active
                              ? professions.filter((key) => key !== option.key)
                              : [...professions, option.key],
                          ),
                        )
                      }
                    >
                      {optionLabel(option)}
                    </ChoiceChip>
                  );
                })}
              </div>
              <span className="text-[12.5px] text-muted">
                {de.characters.professionsLater}
              </span>
              {problem(errors.professionKeys)}
            </section>
          )}
        {professions.map((key) => (
          <input key={key} type="hidden" name="professions" value={key} />
        ))}

        <section className="flex flex-col gap-2 rounded-[22px] border border-border bg-surface p-5">
          <Field
            label={`${de.characters.notes} (${de.characters.optional})`}
            error={errors.notes}
          >
            <TextArea name="notes" defaultValue={values.notes} rows={2} />
          </Field>
        </section>

        {isNew ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={pending}
              icon="pi pi-check"
              label={de.characters.create}
            />
            <FormMessage state={state} />
          </div>
        ) : (
          (dirty || (state.ok === false && state.message)) && (
            <div
              role="region"
              aria-label={de.characters.unsaved}
              className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-[#3a3358] bg-raised py-2.5 pr-2.5 pl-5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] md:bottom-6"
            >
              <span className="flex-1 text-sm font-semibold">
                {de.characters.unsaved}
              </span>
              <FormMessage state={state} />
              <Button
                type="button"
                variant="secondary"
                text
                label={de.characters.discard}
                onClick={discard}
              />
              <Button disabled={pending} label={de.common.save} />
            </div>
          )
        )}
      </form>

      {isNew ? (
        <aside
          aria-label={de.characters.preview}
          className="flex flex-col gap-2.5 lg:sticky lg:top-6"
        >
          <span className="text-xs font-bold tracking-widest text-muted uppercase">
            {de.characters.preview}
          </span>
          <div className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <ClassAvatar
                initial={(name || "?").charAt(0).toUpperCase()}
                color={chosenClass?.color}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[17px] font-bold text-white">
                    {name || de.characters.name}
                  </span>
                  {isMain && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-[#d9ccff]">
                      {de.badges.main}
                    </span>
                  )}
                </span>
                <span className="text-[13px] text-muted">
                  {chosenClass ? (
                    <span
                      className="font-bold"
                      style={{ color: classTextColor(chosenClass.color) }}
                    >
                      {chosenClass.label}
                    </span>
                  ) : (
                    de.characters.class
                  )}
                  {chosenSpec &&
                    ` · ${chosenSpec.label}${chosenSpec.role ? ` (${roleLabel(chosenSpec.role)})` : ""}`}
                  {level && ` · ${de.today.level(Number(level))}`}
                </span>
              </div>
            </div>
            <span className="text-[13px] text-muted">
              {professions.length > 0
                ? options.professions
                    .filter((option) => professions.includes(option.key))
                    .map((option) => option.label)
                    .join(", ")
                : de.characters.noProfessionsYet}
            </span>
          </div>
        </aside>
      ) : (
        aside && <div className="flex flex-col gap-4">{aside}</div>
      )}
    </div>
  );
}

function SpecChoice({
  option,
  active,
  disabled,
  onClick,
}: {
  option: CatalogOption;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ChoiceChip
      shape="tile"
      active={active}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="flex flex-col leading-tight">
        {optionLabel(option)}
        {option.role && (
          <span className="text-[11.5px] font-medium text-muted">
            {roleLabel(option.role)}
          </span>
        )}
      </span>
    </ChoiceChip>
  );
}
