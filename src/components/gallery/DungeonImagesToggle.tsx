"use client";

import { InputSwitch } from "primereact/inputswitch";
import { useOptimistic, useTransition } from "react";
import { de } from "@/i18n/de";
import { setDungeonImagesShownAction } from "@/app/galerie/actions";

/** "Dungeon-Bilder anzeigen" in the general gallery; the browser remembers it (SPEC 7.6). */
export function DungeonImagesToggle({ shown }: { shown: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(shown);
  const [, startTransition] = useTransition();
  const id = "gallery-show-dungeons";

  return (
    <div className="flex items-center gap-2.5 text-sm">
      <InputSwitch
        inputId={id}
        checked={optimistic}
        onChange={(event) =>
          startTransition(async () => {
            setOptimistic(Boolean(event.value));
            await setDungeonImagesShownAction(Boolean(event.value));
          })
        }
      />
      <label htmlFor={id} className="font-semibold text-soft">
        {de.gallery.showDungeons}
      </label>
    </div>
  );
}
