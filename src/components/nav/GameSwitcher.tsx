"use client";

import { useTransition } from "react";
import { de } from "@/i18n/de";
import { selectGame } from "./nav-actions";

export interface GameOption {
  id: string;
  name: string;
}

export function GameSwitcher({
  games,
  selected,
}: {
  games: GameOption[];
  selected: string | undefined;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={de.nav.gameSwitcher}
      value={selected ?? ""}
      disabled={pending}
      onChange={(event) => {
        const gameId = event.target.value;
        startTransition(() => selectGame(gameId));
      }}
      className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
    >
      <option value="">{de.nav.allGames}</option>
      {games.map((game) => (
        <option key={game.id} value={game.id}>
          {game.name}
        </option>
      ))}
    </select>
  );
}
