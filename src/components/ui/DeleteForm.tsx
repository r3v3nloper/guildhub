import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";
import { ActionForm } from "./ActionForm";
import { ConfirmButton } from "./ConfirmButton";

/** Icon-only delete button for list rows, with confirmation. */
export function DeleteForm({
  action,
  question,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  question: string;
}) {
  return (
    <ActionForm action={action}>
      <ConfirmButton
        question={question}
        variant="secondary"
        icon="pi pi-trash"
        label={de.common.delete}
      />
    </ActionForm>
  );
}
