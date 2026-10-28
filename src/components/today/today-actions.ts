"use server";

import { z } from "zod";
import { flagArg, idArg, parseArg } from "@/lib/actions/action-args";
import type { ActionState } from "@/lib/actions/action-state";
import { runMutation } from "@/lib/actions/mutation";
import {
  adjustCounter,
  consumeStacking,
  setBossKilled,
  setResourceValue,
  setTaskDone,
  type ProgressTarget,
} from "@/lib/tasks/progress";

const targetArg = z.strictObject({
  taskId: idArg,
  characterId: idArg.nullable(),
});

const DASHBOARD = ["/"];

export async function setTaskDoneAction(
  target: ProgressTarget,
  done: boolean,
): Promise<ActionState> {
  return runMutation(DASHBOARD, (db, actor) =>
    setTaskDone(
      db,
      actor,
      parseArg(targetArg, target),
      parseArg(flagArg, done),
    ),
  );
}

export async function adjustCounterAction(
  target: ProgressTarget,
  delta: number,
): Promise<ActionState> {
  return runMutation(DASHBOARD, (db, actor) =>
    adjustCounter(
      db,
      actor,
      parseArg(targetArg, target),
      parseArg(z.union([z.literal(1), z.literal(-1)]), delta),
    ),
  );
}

export async function setBossKilledAction(
  target: ProgressTarget,
  bossKey: string,
  killed: boolean,
): Promise<ActionState> {
  return runMutation(DASHBOARD, (db, actor) =>
    setBossKilled(
      db,
      actor,
      parseArg(targetArg, target),
      parseArg(z.string().min(1), bossKey),
      parseArg(flagArg, killed),
    ),
  );
}

export async function setResourceValueAction(
  target: ProgressTarget,
  value: number,
): Promise<ActionState> {
  return runMutation(DASHBOARD, (db, actor) =>
    setResourceValue(
      db,
      actor,
      parseArg(targetArg, target),
      parseArg(z.number(), value),
    ),
  );
}

export async function consumeStackingAction(
  target: ProgressTarget,
): Promise<ActionState> {
  return runMutation(DASHBOARD, (db, actor) =>
    consumeStacking(db, actor, parseArg(targetArg, target)),
  );
}
