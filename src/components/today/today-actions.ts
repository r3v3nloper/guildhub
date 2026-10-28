"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guarded, type ActionState } from "@/lib/actions/action-state";
import type { Actor } from "@/lib/auth/guards";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb, type AppDatabase } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import {
  adjustCounter,
  consumeStacking,
  setBossKilled,
  setResourceValue,
  setTaskDone,
  type ProgressTarget,
} from "@/lib/tasks/progress";

// Server action arguments arrive from the client unchecked, whatever TypeScript says.
const targetSchema = z.strictObject({
  taskId: z.number().int().positive(),
  characterId: z.number().int().positive().nullable(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new DomainError("Ungültige Eingabe.");
  }
  return result.data;
}

async function progressAction(
  change: (db: AppDatabase, actor: Actor) => void,
): Promise<ActionState> {
  const state = await guarded(async () => {
    change(getDb(), await actorForAction());
    return { ok: true };
  });
  revalidatePath("/");
  return state;
}

export async function setTaskDoneAction(
  target: ProgressTarget,
  done: boolean,
): Promise<ActionState> {
  return progressAction((db, actor) =>
    setTaskDone(
      db,
      actor,
      parse(targetSchema, target),
      parse(z.boolean(), done),
    ),
  );
}

export async function adjustCounterAction(
  target: ProgressTarget,
  delta: number,
): Promise<ActionState> {
  return progressAction((db, actor) =>
    adjustCounter(
      db,
      actor,
      parse(targetSchema, target),
      parse(z.union([z.literal(1), z.literal(-1)]), delta),
    ),
  );
}

export async function setBossKilledAction(
  target: ProgressTarget,
  bossKey: string,
  killed: boolean,
): Promise<ActionState> {
  return progressAction((db, actor) =>
    setBossKilled(
      db,
      actor,
      parse(targetSchema, target),
      parse(z.string().min(1), bossKey),
      parse(z.boolean(), killed),
    ),
  );
}

export async function setResourceValueAction(
  target: ProgressTarget,
  value: number,
): Promise<ActionState> {
  return progressAction((db, actor) =>
    setResourceValue(
      db,
      actor,
      parse(targetSchema, target),
      parse(z.number(), value),
    ),
  );
}

export async function consumeStackingAction(
  target: ProgressTarget,
): Promise<ActionState> {
  return progressAction((db, actor) =>
    consumeStacking(db, actor, parse(targetSchema, target)),
  );
}
