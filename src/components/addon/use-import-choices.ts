"use client";

import { useState } from "react";
import type { ImportChoices } from "@/lib/addon/character-import";

const NO_CHOICES: ImportChoices = { create: [], dropProfessions: {} };

/** The ticks of an import preview: which new characters to create, which professions to drop. */
export function useImportChoices() {
  const [choices, setChoices] = useState<ImportChoices>(NO_CHOICES);

  const toggleCreate = (key: string, create: boolean) =>
    setChoices((current) => ({
      ...current,
      create: create
        ? [...current.create, key]
        : current.create.filter((entry) => entry !== key),
    }));

  const toggleDrop = (key: string, entryId: number, drop: boolean) =>
    setChoices((current) => {
      const dropped = current.dropProfessions[key] ?? [];
      return {
        ...current,
        dropProfessions: {
          ...current.dropProfessions,
          [key]: drop
            ? [...dropped, entryId]
            : dropped.filter((id) => id !== entryId),
        },
      };
    });

  return {
    choices,
    toggleCreate,
    toggleDrop,
    reset: () => setChoices(NO_CHOICES),
  };
}
