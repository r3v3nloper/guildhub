import { z } from "zod";
import { DomainError } from "@/lib/errors";

/**
 * Server actions called straight from client components receive their arguments from
 * the browser, unchecked whatever TypeScript says. Every such argument goes through here.
 */
export function parseArg<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new DomainError("Ungültige Eingabe.");
  }
  return result.data;
}

export const idArg = z.number().int().positive();
export const flagArg = z.boolean();
