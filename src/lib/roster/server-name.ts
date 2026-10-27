/**
 * Free-text servers end up in the scope key of server tasks, so spelling variants must not
 * split them (SPEC 4.6): trimmed, inner whitespace collapsed, lower case.
 */
export function normalizeServerKey(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export function cleanServerName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
