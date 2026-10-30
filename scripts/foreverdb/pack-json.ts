// Writing imported data into pack.json so that the file stays readable and its diffs small.

/**
 * Drops what the schema fills in anyway: undefined fields, empty lists (bosses stay, an
 * instance needs them) and lifecycle flags left at false.
 */
export function compact(entry: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(entry).filter(([key, value]) => {
      if (value === undefined) {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0 || key === "bosses";
      }
      return !(["deprecated", "todo"].includes(key) && value === false);
    }),
  );
}

/** Inserts `value` under `key` right after `afterKey`, keeping the file's key order. */
export function withKeyAfter(
  object: Record<string, unknown>,
  afterKey: string,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [existingKey, existingValue] of Object.entries(object)) {
    if (existingKey === key) {
      continue;
    }
    result[existingKey] = existingValue;
    if (existingKey === afterKey) {
      result[key] = value;
    }
  }
  if (!(key in result)) {
    result[key] = value;
  }
  return result;
}
