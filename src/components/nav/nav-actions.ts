"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { GAME_FILTER_COOKIE } from "@/lib/game-filter";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function selectGame(gameId: string): Promise<void> {
  const store = await cookies();
  if (gameId) {
    store.set(GAME_FILTER_COOKIE, gameId, {
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  } else {
    store.delete(GAME_FILTER_COOKIE);
  }
  revalidatePath("/", "layout");
}
