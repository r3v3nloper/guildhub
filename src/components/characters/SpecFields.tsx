"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Field } from "@/components/ui/ui";
import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";
import { optionLabel } from "./catalog-option-label";

/**
 * Main spec and off-spec from the specs of one class; the main spec decides the role.
 * The parent remounts it (key = class) when the class changes, which clears both.
 */
export function SpecFields({
  specs,
  classKey,
  defaultSpec,
  defaultOffSpec,
  errors,
  hints,
}: {
  specs: CatalogOption[];
  classKey: string;
  defaultSpec: string;
  defaultOffSpec: string;
  errors: { spec?: string; offSpec?: string };
  hints: { spec?: string; offSpec?: string };
}) {
  const [specKey, setSpecKey] = useState(defaultSpec);
  const [offSpecKey, setOffSpecKey] = useState(defaultOffSpec);
  const options = specs
    .filter((option) => option.specClass === classKey)
    .map((option) => ({
      value: option.key,
      label: option.role
        ? `${optionLabel(option)} – ${de.roles[option.role] ?? option.role}`
        : optionLabel(option),
    }));

  const chooseSpec = (next: string) => {
    setSpecKey(next);
    if (!next || next === offSpecKey) {
      setOffSpecKey("");
    }
  };

  return (
    <>
      <Field label={de.characters.spec} error={errors.spec} hint={hints.spec}>
        <SelectField
          name="specKey"
          value={specKey}
          emptyLabel={de.common.none}
          disabled={!classKey}
          options={options}
          onChange={chooseSpec}
        />
      </Field>
      <Field
        label={de.characters.offSpec}
        error={errors.offSpec}
        hint={hints.offSpec}
      >
        <SelectField
          name="offSpecKey"
          value={offSpecKey}
          emptyLabel={de.common.none}
          disabled={!specKey}
          options={options.filter((o) => o.value !== specKey)}
          onChange={setOffSpecKey}
        />
      </Field>
    </>
  );
}
