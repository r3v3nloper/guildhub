/** A string list from a catalog entry's JSON data; anything else reads as empty. */
export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
