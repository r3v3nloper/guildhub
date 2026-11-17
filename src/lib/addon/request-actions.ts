import { eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { craftRequests } from "@/lib/db/schema";
import { DomainError } from "@/lib/errors";
import {
  acceptCraftRequest,
  finishCraftRequest,
  returnCraftRequest,
} from "@/lib/guild/craft-requests";
import type { ExportedRequestAction, RequestAction } from "./export-payload";

// Crafting request actions the member took in the game (SPEC 7.3.2). They run through
// the same functions as the buttons on the requests page, so the same rules apply; an
// action the current state no longer allows is dropped with the reason.

export interface RequestActionOutcome {
  requestId: number;
  action: RequestAction;
  /** What the request asks for; null when it no longer exists. */
  item: string | null;
  result: "applied" | "discarded";
  reason?: string;
}

class Rollback extends Error {}

/** What applying would do, worked out on the real data and then rolled back. */
export function previewRequestActions(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  actions: readonly ExportedRequestAction[],
): RequestActionOutcome[] {
  let outcomes: RequestActionOutcome[] = [];
  try {
    db.transaction(() => {
      outcomes = runActions(db, actor, gameId, actions);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      throw error;
    }
  }
  return outcomes;
}

export function applyRequestActions(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  actions: readonly ExportedRequestAction[],
): RequestActionOutcome[] {
  return db.transaction(() => runActions(db, actor, gameId, actions));
}

const RUN: Record<
  RequestAction,
  (db: AppDatabase, actor: Actor, requestId: number, at: Date) => void
> = {
  accept: (db, actor, requestId, at) =>
    acceptCraftRequest(db, actor, requestId, at),
  done: (db, actor, requestId, at) =>
    finishCraftRequest(db, actor, requestId, at),
  return: (db, actor, requestId) => returnCraftRequest(db, actor, requestId),
};

/** In the order they happened, so "accept, then done" works on the same request. */
function runActions(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  actions: readonly ExportedRequestAction[],
): RequestActionOutcome[] {
  const now = new Date();
  return [...actions]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map(({ requestId, action, at }): RequestActionOutcome => {
      const request = db
        .select({ item: craftRequests.item, gameId: craftRequests.gameId })
        .from(craftRequests)
        .where(eq(craftRequests.id, requestId))
        .get();
      const outcome = { requestId, action, item: request?.item ?? null };
      if (!request || request.gameId !== gameId) {
        return {
          ...outcome,
          result: "discarded",
          reason: "Den Antrag gibt es nicht mehr.",
        };
      }
      try {
        // A clock running ahead in the game must not date anything into the future.
        RUN[action](db, actor, requestId, at < now ? at : now);
        return { ...outcome, result: "applied" };
      } catch (error) {
        if (error instanceof DomainError) {
          return { ...outcome, result: "discarded", reason: error.message };
        }
        throw error;
      }
    });
}
