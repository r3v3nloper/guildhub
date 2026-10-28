/** One query parameter as text; empty, repeated or missing values count as absent. */
export function textParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/** A positive whole number from the query, e.g. an ID; anything else is absent. */
export function idSearchParam(
  value: string | string[] | undefined,
): number | undefined {
  const id = Number(textParam(value));
  return Number.isInteger(id) && id > 0 ? id : undefined;
}
