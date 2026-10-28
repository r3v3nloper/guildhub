import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/lib/db/client";
import { ForbiddenError } from "@/lib/errors";
import { getGuild } from "@/lib/guild/guild";
import { auth } from "./auth";
import { permissions, type Actor } from "./guards";
import { getActor } from "./membership";

/**
 * The session of this request. Cached per request, because header, menu and page all ask
 * for it and each lookup is a DB query. auth() uses crypto.getRandomValues(), which Cache
 * Components forbids while prerendering, so connection() marks the render as request-time.
 */
export const currentSession = cache(async () => {
  await connection();
  return auth();
});

/** The signed-in, active guild member, or undefined. */
export const currentActor = cache(async (): Promise<Actor | undefined> => {
  const userId = (await currentSession())?.user?.id;
  if (!userId) {
    return undefined;
  }
  const db = getDb();
  const actor = getActor(db, getGuild(db).id, userId);
  return actor?.status === "active" ? actor : undefined;
});

/** For pages: sends visitors without an active membership to the start page. */
export async function requireActor(): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) {
    redirect("/");
  }
  return actor;
}

/** For server actions: fails instead of redirecting, the caller turns it into a message. */
export async function actorForAction(): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) {
    throw new ForbiddenError("Bitte erneut anmelden.");
  }
  return actor;
}

export function canViewAdmin(actor: Actor): boolean {
  return permissions.viewAdmin(actor).allowed;
}
