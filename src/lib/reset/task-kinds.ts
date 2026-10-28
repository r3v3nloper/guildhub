export const TASK_KINDS = [
  "recurring",
  "counter",
  "lockout",
  "regen",
  "stacking",
  "one_time",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_SCOPES = [
  "character",
  "server",
  "account",
  "user",
  "guild",
] as const;
export type TaskScope = (typeof TASK_SCOPES)[number];

/** Only custom tasks use these: one user across games, or the whole guild together. */
export const CUSTOM_ONLY_SCOPES: readonly TaskScope[] = ["user", "guild"];

/** Kinds whose state is a snapshot in ResourceState rather than per-period progress. */
export const RESOURCE_KINDS: readonly TaskKind[] = ["regen", "stacking"];

export function isResourceKind(kind: TaskKind): boolean {
  return RESOURCE_KINDS.includes(kind);
}
