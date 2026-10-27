"use server";

import { revalidatePath } from "next/cache";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { actorForAction } from "@/lib/auth/current-actor";
import {
  admitToAllowlist,
  changeMemberRole,
  disableMember,
  getActor,
  listMembers,
  purgeMember,
  reactivateMember,
  revokeAllowlistEntry,
} from "@/lib/auth/membership";
import { getDb } from "@/lib/db/client";
import { MEMBER_ROLES, type MemberRole } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import {
  renameGuildAsAdmin,
  setGameEnabled,
  setGameRegion,
} from "@/lib/guild/games-admin";
import { de } from "@/i18n/de";

const DISCORD_ID = /^\d{17,20}$/;

/** Every admin action: resolve the actor, run, refresh the affected pages. */
async function adminAction(
  run: (
    actor: Awaited<ReturnType<typeof actorForAction>>,
  ) => ActionState | void,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const actor = await actorForAction();
    return run(actor) ?? { ok: true, message: de.common.saved };
  });
  if (state.ok) {
    revalidatePath("/", "layout");
  }
  return state;
}

export async function renameGuildAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction((actor) =>
    renameGuildAsAdmin(getDb(), actor, formText(formData, "name")),
  );
}

export async function setGameEnabledAction(
  gameId: string,
  enabled: boolean,
): Promise<ActionState> {
  return adminAction((actor) =>
    setGameEnabled(getDb(), actor, gameId, enabled),
  );
}

export async function setGameRegionAction(
  gameId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction((actor) =>
    setGameRegion(getDb(), actor, gameId, formText(formData, "region")),
  );
}

export async function admitAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction((actor) => {
    const discordId = formText(formData, "discordId").trim();
    if (!DISCORD_ID.test(discordId)) {
      throw new DomainError("Eine Discord-ID besteht aus 17 bis 20 Ziffern.");
    }
    admitToAllowlist(getDb(), actor, discordId);
  });
}

export async function revokeAllowlistAction(
  discordId: string,
): Promise<ActionState> {
  return adminAction((actor) =>
    revokeAllowlistEntry(getDb(), actor, discordId),
  );
}

export async function disableMemberAction(
  userId: string,
): Promise<ActionState> {
  return adminAction((actor) => {
    const result = disableMember(getDb(), actor, userId, serverEnv());
    return result.readmittedOnRestart
      ? { ok: true, message: de.admin.readmittedWarning }
      : undefined;
  });
}

export async function reactivateMemberAction(
  userId: string,
): Promise<ActionState> {
  return adminAction((actor) => reactivateMember(getDb(), actor, userId));
}

export async function changeRoleAction(
  userId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction((actor) => {
    const role = formText(formData, "role");
    if (!(MEMBER_ROLES as readonly string[]).includes(role)) {
      throw new DomainError("Unbekannte Rolle.");
    }
    changeMemberRole(getDb(), actor, userId, role as MemberRole);
  });
}

/** Needs the member's name typed in as confirmation, because it cannot be undone (SPEC 7.2). */
export async function purgeMemberAction(
  userId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction((actor) => {
    const db = getDb();
    const member = listMembers(db, actor.guildId).find(
      (m) => m.userId === userId,
    );
    if (!member || !getActor(db, actor.guildId, userId)) {
      throw new DomainError("Mitglied nicht gefunden.");
    }
    if (formText(formData, "confirm").trim() !== (member.name ?? "")) {
      throw new DomainError("Der eingetippte Name stimmt nicht.");
    }
    purgeMember(db, actor, userId);
  });
}
