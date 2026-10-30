import { revalidatePath } from "next/cache";
import type { Actor } from "@/lib/auth/guards";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb, type AppDatabase } from "@/lib/db/client";
import { guarded, type ActionState } from "./action-state";

/** Refreshes the pages; a path with a [segment] refreshes every page of that route. */
export function revalidatePages(paths: readonly string[]): void {
  for (const path of paths) {
    revalidatePath(path, path.includes("[") ? "page" : undefined);
  }
}

/**
 * Runs a change as the signed-in member and refreshes the given pages. They are
 * refreshed on failure too, so an optimistic update shows the real state again.
 */
export async function runMutation(
  paths: readonly string[],
  change: (db: AppDatabase, actor: Actor) => void,
): Promise<ActionState> {
  const state = await guarded(async () => {
    change(getDb(), await actorForAction());
    return { ok: true };
  });
  revalidatePages(paths);
  return state;
}
