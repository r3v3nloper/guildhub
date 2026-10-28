import { notFound } from "next/navigation";
import { DomainError } from "@/lib/errors";

/**
 * For pages that load something the visitor may not see: a lookup or permission failure
 * shows the 404 page, which reveals nothing about whether the entry exists.
 */
export function orNotFound<T>(load: () => T): T {
  try {
    return load();
  } catch (error) {
    if (error instanceof DomainError) {
      notFound();
    }
    throw error;
  }
}
