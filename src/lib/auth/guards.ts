import type { MemberRole, MemberStatus } from "@/lib/db/schema";
import { ForbiddenError } from "@/lib/errors";

export { ForbiddenError };

/** Who is acting. Built from the session and the guild membership, never from client input. */
export interface Actor {
  userId: string;
  guildId: number;
  role: MemberRole;
  status: MemberStatus;
}

export interface MemberTarget {
  userId: string;
  role: MemberRole;
  status: MemberStatus;
}

export type Permission = { allowed: true } | { allowed: false; reason: string };

const RANK: Record<MemberRole, number> = { member: 0, officer: 1, owner: 2 };

const allow: Permission = { allowed: true };
const deny = (reason: string): Permission => ({ allowed: false, reason });

function isActive(actor: Actor): boolean {
  return actor.status === "active";
}

function atLeast(actor: Actor, role: MemberRole): boolean {
  return isActive(actor) && RANK[actor.role] >= RANK[role];
}

/** Central rule set (SPEC 8). Every server action and route asks here before acting. */
export const permissions = {
  viewGuild(actor: Actor): Permission {
    return isActive(actor) ? allow : deny("Kein aktives Gildenmitglied.");
  },

  /** Characters, builds, progress and private tasks: only the owner of the data, even for owners. */
  editOwnData(actor: Actor, dataOwnerUserId: string): Permission {
    if (!isActive(actor)) {
      return deny("Kein aktives Gildenmitglied.");
    }
    return actor.userId === dataOwnerUserId
      ? allow
      : deny("Nur der Besitzer darf diese Daten ändern.");
  },

  /**
   * Entries members share with the guild (dungeon checklists, farm spots): the author, and
   * officers for moderation. Private entries stay with their author alone.
   */
  editSharedEntry(
    actor: Actor,
    entry: { ownerId: string; visibility: "private" | "guild" },
  ): Permission {
    if (!isActive(actor)) {
      return deny("Kein aktives Gildenmitglied.");
    }
    if (actor.userId === entry.ownerId) {
      return allow;
    }
    return entry.visibility === "guild" && atLeast(actor, "officer")
      ? allow
      : deny("Nur der Ersteller oder ein Officer darf das ändern.");
  },

  /** Stat rankings per class are guild knowledge officers keep in the app (SPEC 10). */
  manageStatPriorities(actor: Actor): Permission {
    return atLeast(actor, "officer")
      ? allow
      : deny("Nur für Officer und Owner.");
  },

  manageGuildTasks(actor: Actor): Permission {
    return atLeast(actor, "officer")
      ? allow
      : deny("Nur für Officer und Owner.");
  },

  manageGuild(actor: Actor): Permission {
    return atLeast(actor, "officer")
      ? allow
      : deny("Nur für Officer und Owner.");
  },

  manageGames(actor: Actor): Permission {
    return atLeast(actor, "officer")
      ? allow
      : deny("Nur für Officer und Owner.");
  },

  addToAllowlist(actor: Actor): Permission {
    return atLeast(actor, "officer")
      ? allow
      : deny("Nur für Officer und Owner.");
  },

  viewAdmin(actor: Actor): Permission {
    return atLeast(actor, "officer")
      ? allow
      : deny("Nur für Officer und Owner.");
  },

  disableMember(
    actor: Actor,
    target: MemberTarget,
    activeOwnerCount: number,
  ): Permission {
    if (!atLeast(actor, "officer")) {
      return deny("Nur für Officer und Owner.");
    }
    if (actor.role !== "owner" && RANK[target.role] >= RANK[actor.role]) {
      return deny("Officer können nur Mitglieder deaktivieren.");
    }
    if (isLastActiveOwner(target, activeOwnerCount)) {
      return deny("Der letzte aktive Owner kann nicht deaktiviert werden.");
    }
    return allow;
  },

  /** Re-enabling follows the same rank rule as disabling. */
  reactivateMember(actor: Actor, target: MemberTarget): Permission {
    if (!atLeast(actor, "officer")) {
      return deny("Nur für Officer und Owner.");
    }
    if (actor.role !== "owner" && RANK[target.role] >= RANK[actor.role]) {
      return deny("Officer können nur Mitglieder reaktivieren.");
    }
    return allow;
  },

  changeRole(
    actor: Actor,
    target: MemberTarget,
    newRole: MemberRole,
    activeOwnerCount: number,
  ): Permission {
    if (!atLeast(actor, "owner")) {
      return deny("Nur Owner können Rollen ändern.");
    }
    if (newRole !== "owner" && isLastActiveOwner(target, activeOwnerCount)) {
      return deny("Der letzte aktive Owner kann nicht herabgestuft werden.");
    }
    return allow;
  },

  downloadBackup(actor: Actor): Permission {
    return atLeast(actor, "owner") ? allow : deny("Nur für Owner.");
  },

  purgeMemberData(actor: Actor, target: MemberTarget): Permission {
    if (!atLeast(actor, "owner")) {
      return deny("Nur für Owner.");
    }
    return target.status === "disabled"
      ? allow
      : deny("Nur Daten deaktivierter Mitglieder können gelöscht werden.");
  },
};

function isLastActiveOwner(target: MemberTarget, activeOwnerCount: number) {
  return (
    target.role === "owner" &&
    target.status === "active" &&
    activeOwnerCount <= 1
  );
}

export function assertAllowed(permission: Permission): void {
  if (!permission.allowed) {
    throw new ForbiddenError(permission.reason);
  }
}
