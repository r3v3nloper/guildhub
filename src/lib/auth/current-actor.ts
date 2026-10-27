import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/lib/db/client";
import { getGuild } from "@/lib/guild/guild";
import { auth } from "./auth";
import { assertAllowed, permissions, type Actor } from "./guards";
import { getActor } from "./membership";

/** The signed-in, active guild member, or undefined. Marks the render as request-time. */
export async function currentActor(): Promise<Actor | undefined> {
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return undefined;
  }
  const db = getDb();
  const actor = getActor(db, getGuild(db).id, userId);
  return actor?.status === "active" ? actor : undefined;
}

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
    assertAllowed({ allowed: false, reason: "Bitte erneut anmelden." });
  }
  return actor!;
}

export function canViewAdmin(actor: Actor): boolean {
  return permissions.viewAdmin(actor).allowed;
}
