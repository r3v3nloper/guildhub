"use client";

import { Checkbox as PrimeCheckbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

// PrimeReact's Dropdown and MultiSelect keep their value in React state, not in a
// native form control. A hidden input carries it into FormData, so server actions and
// plain GET forms receive it like from a <select>.

interface SelectFieldProps {
  name: string;
  options: SelectOption[];
  /** Uncontrolled start value. */
  defaultValue?: string;
  /** Controlled value; pair with onChange. */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Adds an empty choice that clears the selection. */
  emptyLabel?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
}

export function SelectField({
  name,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder,
  emptyLabel,
  id,
  invalid,
  disabled,
  className = "w-full",
  ...aria
}: SelectFieldProps) {
  const [ownValue, setOwnValue] = useState(defaultValue);
  const current = value ?? ownValue;
  const choices =
    emptyLabel !== undefined
      ? [{ value: "", label: emptyLabel }, ...options]
      : options;

  return (
    <>
      <Dropdown
        inputId={id}
        value={current}
        options={choices}
        optionLabel="label"
        optionValue="value"
        placeholder={placeholder}
        invalid={invalid}
        disabled={disabled}
        filter={choices.length > 10}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        className={className}
        onChange={(event) => {
          const next = (event.value as string | null) ?? "";
          setOwnValue(next);
          onChange?.(next);
        }}
      />
      <input type="hidden" name={name} value={current} />
    </>
  );
}

interface MultiSelectFieldProps {
  name: string;
  options: SelectOption[];
  defaultValue?: string[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
}

export function MultiSelectField({
  name,
  options,
  defaultValue = [],
  placeholder,
  id,
  invalid,
  ...aria
}: MultiSelectFieldProps) {
  const [values, setValues] = useState<string[]>(defaultValue);

  return (
    <>
      <MultiSelect
        inputId={id}
        value={values}
        options={options}
        optionLabel="label"
        optionValue="value"
        display="chip"
        placeholder={placeholder}
        invalid={invalid}
        filter={options.length > 10}
        aria-describedby={aria["aria-describedby"]}
        className="w-full"
        onChange={(event) => setValues((event.value as string[]) ?? [])}
      />
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

interface CheckboxFieldProps {
  name: string;
  label: string;
  defaultChecked?: boolean;
  /** Submitted value when checked; GET forms use it, e.g. "1". */
  value?: string;
}

/** A labelled checkbox that submits like a native one ("on" or the given value). */
export function CheckboxField({
  name,
  label,
  defaultChecked = false,
  value = "on",
}: CheckboxFieldProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const id = `check-${name}`;

  return (
    <div className="flex items-center gap-2 text-sm">
      <PrimeCheckbox
        inputId={id}
        checked={checked}
        onChange={(event) => setChecked(Boolean(event.checked))}
      />
      <label htmlFor={id}>{label}</label>
      {checked && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
