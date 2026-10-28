import { SelectField } from "@/components/ui/SelectField";
import { VISIBILITIES } from "@/lib/lists/visibility";
import { de } from "@/i18n/de";

/** "Nur mich" or "Die Gilde", for entries members may share. */
export function VisibilityField({
  defaultValue,
  id,
}: {
  defaultValue: string;
  id?: string;
}) {
  return (
    <SelectField
      name="visibility"
      id={id}
      defaultValue={defaultValue}
      options={VISIBILITIES.map((value) => ({
        value,
        label: de.visibility[value],
      }))}
    />
  );
}
