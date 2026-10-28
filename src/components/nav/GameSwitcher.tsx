"use client";

import { Dropdown } from "primereact/dropdown";
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
  const options = [
    { value: "", label: de.nav.allGames },
    ...games.map((game) => ({ value: game.id, label: game.name })),
  ];

  return (
    <Dropdown
      aria-label={de.nav.gameSwitcher}
      value={selected ?? ""}
      options={options}
      optionLabel="label"
      optionValue="value"
      disabled={pending}
      className="w-full"
      onChange={(event) => {
        const gameId = (event.value as string | null) ?? "";
        startTransition(() => selectGame(gameId));
      }}
    />
  );
}
