import type { TaskScope } from "./task-kinds";

export interface ScopeOwner {
  userId: string;
  gameId: string | null;
  characterId?: number;
  /** Normalised server key of the character, if any. */
  server?: string | null;
}

/**
 * Who a progress entry belongs to (SPEC 4.1). A character without a server counts as a
 * server of its own, so it never shares progress by accident.
 */
export function scopeKey(scope: TaskScope, owner: ScopeOwner): string {
  switch (scope) {
    case "character":
      return `c:${requireCharacter(owner)}`;
    case "server": {
      const server = owner.server || `c${requireCharacter(owner)}`;
      return `s:${owner.userId}:${owner.gameId}:${server}`;
    }
    case "account":
      return `a:${owner.userId}:${owner.gameId}`;
    case "user":
      return `u:${owner.userId}`;
  }
}

function requireCharacter(owner: ScopeOwner): number {
  if (owner.characterId === undefined) {
    throw new Error("Charakter-Scope ohne Charakter");
  }
  return owner.characterId;
}
