import { unstable_rethrow } from "next/navigation";
import { DomainError } from "@/lib/errors";

/** What every form-backed server action returns to its useActionState hook. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string | undefined>;
}

/** Turns permission and lookup failures into a message instead of an error page. */
export async function guarded(
  action: () => Promise<ActionState> | ActionState,
): Promise<ActionState> {
  try {
    return await action();
  } catch (error) {
    // redirect() and notFound() work by throwing; they must reach Next.js.
    unstable_rethrow(error);
    if (error instanceof DomainError) {
      return { ok: false, message: error.message };
    }
    // Anything else may carry internals (SQL, paths); log it, show a generic message.
    console.error(error);
    return {
      ok: false,
      message: "Das hat nicht geklappt. Bitte erneut versuchen.",
    };
  }
}

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function formNumber(formData: FormData, name: string): number | null {
  const text = formText(formData, name).trim();
  if (!text) {
    return null;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : Number.NaN;
}
