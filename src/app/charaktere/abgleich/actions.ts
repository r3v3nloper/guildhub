"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guarded, type ActionState } from "@/lib/actions/action-state";
import { idArg, parseArg } from "@/lib/actions/action-args";
import { ADDON_STRING_MAX_LENGTH } from "@/lib/addon/addon-string";
import {
  applyImport,
  previewImport,
  type ImportOutcome,
} from "@/lib/addon/character-import";
import {
  describeImport,
  type ImportCharacterView,
} from "@/lib/addon/import-view";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { requireCatalog } from "@/lib/roster/characters";
import { de } from "@/i18n/de";

const gameArg = z.string().min(1).max(100);
const textArg = z.string().max(ADDON_STRING_MAX_LENGTH);
const choicesArg = z.strictObject({
  create: z.array(z.string().max(200)).max(100),
  dropProfessions: z.record(z.string().max(200), z.array(idArg).max(50)),
});

export interface ImportPreviewState extends ActionState {
  characters?: ImportCharacterView[];
}

export interface ImportApplyState extends ActionState {
  outcomes?: ImportOutcome[];
}

export async function previewAddonImportAction(
  gameId: string,
  text: string,
): Promise<ImportPreviewState> {
  let characters: ImportCharacterView[] | undefined;
  const state = await guarded(async () => {
    const db = getDb();
    const game = parseArg(gameArg, gameId);
    const preview = previewImport(
      db,
      await actorForAction(),
      game,
      parseArg(textArg, text),
    );
    if (!preview.ok) {
      return { ok: false, message: preview.error };
    }
    characters = describeImport(requireCatalog(db, game), preview.characters);
    return { ok: true };
  });
  return { ...state, characters };
}

export async function applyAddonImportAction(
  gameId: string,
  text: string,
  choices: unknown,
): Promise<ImportApplyState> {
  let outcomes: ImportOutcome[] | undefined;
  const state = await guarded(async () => {
    const result = applyImport(
      getDb(),
      await actorForAction(),
      parseArg(gameArg, gameId),
      parseArg(textArg, text),
      parseArg(choicesArg, choices),
    );
    if (!result.ok) {
      return { ok: false, message: result.error };
    }
    outcomes = result.outcomes;
    return { ok: true, message: de.addonImport.applied };
  });
  if (state.ok) {
    revalidatePath("/charaktere");
    revalidatePath("/roster");
    revalidatePath("/berufe");
  }
  return { ...state, outcomes };
}
