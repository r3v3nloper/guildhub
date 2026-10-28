"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { TASK_KINDS, type TaskKind } from "@/lib/reset/task-kinds";
import { RESET_RULE_TYPES } from "@/lib/reset/types";
import type {
  CustomTaskFormValues,
  TaskFormGame,
} from "@/lib/tasks/task-form-options";
import { de } from "@/i18n/de";
import { CUSTOM_RULE, NO_RULE } from "@/lib/tasks/rule-choices";

const RULE_KINDS: readonly TaskKind[] = [
  "recurring",
  "counter",
  "lockout",
  "stacking",
];
/** Without a reset a counter tracks progress for good (SPEC 6.4). */
const OPTIONAL_RULE_KINDS: readonly TaskKind[] = ["counter"];

export function CustomTaskForm({
  action,
  games,
  values,
  isNew,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  games: TaskFormGame[];
  values: CustomTaskFormValues;
  isNew: boolean;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const [gameId, setGameId] = useState(values.game);
  const [kind, setKind] = useState(values.kind as TaskKind);
  const [scope, setScope] = useState(values.scope);
  const [rule, setRule] = useState(values.rule);
  const [ruleType, setRuleType] = useState(values.ruleType);
  const errors = state.errors ?? {};
  const game = games.find((candidate) => candidate.id === gameId) ?? games[0];

  const usesRule = RULE_KINDS.includes(kind);
  const ruleOptions = [
    ...(OPTIONAL_RULE_KINDS.includes(kind)
      ? [{ value: NO_RULE, label: de.tasks.ruleNone }]
      : []),
    ...game.rules,
    { value: CUSTOM_RULE, label: de.tasks.ruleCustom },
  ];
  const changeGame = (next: string) => {
    setGameId(next);
    const nextGame = games.find((candidate) => candidate.id === next)!;
    if (!nextGame.scopes.includes(scope as never)) {
      setScope(nextGame.scopes[0]);
    }
    setRule(nextGame.rules[0]?.value ?? CUSTOM_RULE);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label={de.tasks.fieldTitle} error={errors.title}>
        <TextInput
          name="title"
          defaultValue={values.title}
          required
          maxLength={80}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={de.tasks.fieldGame} error={errors.gameId}>
          <SelectField
            name="game"
            value={gameId}
            onChange={changeGame}
            options={games.map((option) => ({
              value: option.id,
              label: option.name,
            }))}
            disabled={!isNew}
          />
        </Field>
        <Field label={de.tasks.fieldKind} error={errors.kind}>
          <SelectField
            name="kind"
            value={kind}
            onChange={(next) => setKind(next as TaskKind)}
            options={TASK_KINDS.map((option) => ({
              value: option,
              label: de.tasks.kinds[option],
            }))}
            disabled={!isNew}
          />
        </Field>
        <Field label={de.tasks.fieldScope} error={errors.scope}>
          <SelectField
            name="scope"
            value={scope}
            onChange={setScope}
            options={game.scopes.map((option) => ({
              value: option,
              label: de.tasks.scopes[option],
            }))}
            disabled={!isNew}
          />
        </Field>
      </div>
      {!isNew && <small className="text-muted">{de.tasks.fixedNote}</small>}

      {usesRule && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={de.tasks.fieldRule} error={errors.rule}>
            <SelectField
              name="rule"
              value={rule}
              onChange={setRule}
              options={ruleOptions}
            />
          </Field>
          {rule === CUSTOM_RULE && (
            <CustomRuleFields
              values={values}
              errors={errors}
              ruleType={ruleType}
              onRuleTypeChange={setRuleType}
            />
          )}
        </div>
      )}

      <KindFields kind={kind} values={values} errors={errors} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={de.tasks.fieldCategory} error={errors.category}>
          <TextInput
            name="category"
            defaultValue={values.category}
            maxLength={30}
          />
        </Field>
        <Field label={de.tasks.fieldLink} error={errors.link}>
          <TextInput name="link" type="url" defaultValue={values.link} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

type Errors = Record<string, string | undefined>;

function CustomRuleFields({
  values,
  errors,
  ruleType,
  onRuleTypeChange,
}: {
  values: CustomTaskFormValues;
  errors: Errors;
  ruleType: string;
  onRuleTypeChange: (value: string) => void;
}) {
  return (
    <>
      <Field label={de.tasks.fieldRuleType} error={errors.ruleType}>
        <SelectField
          name="ruleType"
          value={ruleType}
          onChange={onRuleTypeChange}
          options={RESET_RULE_TYPES.map((type) => ({
            value: type,
            label: de.tasks.ruleTypes[type],
          }))}
        />
      </Field>
      <Field label={de.tasks.fieldRuleTime} error={errors.ruleTime}>
        <TextInput
          name="ruleTime"
          type="time"
          defaultValue={values.ruleTime}
          required
        />
      </Field>
      {ruleType === "weekly" && (
        <Field label={de.tasks.fieldWeekday} error={errors.ruleWeekday}>
          <SelectField
            name="ruleWeekday"
            defaultValue={values.ruleWeekday || "1"}
            options={de.tasks.weekdays.map((label, index) => ({
              value: String(index + 1),
              label,
            }))}
          />
        </Field>
      )}
      {ruleType === "monthly" && (
        <Field label={de.tasks.fieldDayOfMonth} error={errors.ruleDayOfMonth}>
          <TextInput
            name="ruleDayOfMonth"
            type="number"
            min={1}
            max={28}
            defaultValue={values.ruleDayOfMonth}
          />
        </Field>
      )}
      {ruleType === "every_n_days" && (
        <>
          <Field label={de.tasks.fieldNDays} error={errors.ruleNDays}>
            <TextInput
              name="ruleNDays"
              type="number"
              min={1}
              defaultValue={values.ruleNDays}
            />
          </Field>
          <Field label={de.tasks.fieldAnchor} error={errors.ruleAnchor}>
            <TextInput
              name="ruleAnchor"
              type="date"
              defaultValue={values.ruleAnchor}
            />
          </Field>
        </>
      )}
    </>
  );
}

function KindFields({
  kind,
  values,
  errors,
}: {
  kind: TaskKind;
  values: CustomTaskFormValues;
  errors: Errors;
}) {
  const number = (
    name: keyof CustomTaskFormValues,
    label: string,
    required = false,
  ) => (
    <Field key={name} label={label} error={errors[name]}>
      <TextInput
        name={name}
        type="number"
        min={1}
        required={required}
        defaultValue={values[name]}
      />
    </Field>
  );

  switch (kind) {
    case "counter":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          {number("cap", de.tasks.fieldCap, true)}
        </div>
      );
    case "stacking":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          {number("cap", de.tasks.fieldCap, true)}
          {number("perPeriodGain", de.tasks.fieldPerPeriodGain, true)}
          {number("alertAt", de.tasks.fieldAlertAt)}
        </div>
      );
    case "regen":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          {number("cap", de.tasks.fieldCap, true)}
          {number("regenAmount", de.tasks.fieldRegenAmount, true)}
          {number("regenIntervalMinutes", de.tasks.fieldRegenInterval, true)}
          <Field
            label={de.tasks.fieldRegenAlignment}
            error={errors.regenAlignment}
          >
            <SelectField
              name="regenAlignment"
              defaultValue={values.regenAlignment || "fixed"}
              options={[
                { value: "fixed", label: de.tasks.alignmentFixed },
                { value: "relative", label: de.tasks.alignmentRelative },
              ]}
            />
          </Field>
          {number("alertAt", de.tasks.fieldAlertAt)}
        </div>
      );
    default:
      return null;
  }
}
