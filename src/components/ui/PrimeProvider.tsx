"use client";

import { addLocale, PrimeReactProvider } from "primereact/api";
import { ConfirmPopup } from "primereact/confirmpopup";
import type { ReactNode } from "react";

// Only the texts the app's components show; PrimeReact falls back to English otherwise.
addLocale("de", {
  accept: "Ja",
  reject: "Nein",
  choose: "Auswählen",
  clear: "Leeren",
  cancel: "Abbrechen",
  emptyMessage: "Keine Einträge",
  emptyFilterMessage: "Keine Treffer",
  aria: {
    trueLabel: "Ja",
    falseLabel: "Nein",
    selectAll: "Alle auswählen",
    unselectAll: "Auswahl aufheben",
    close: "Schließen",
  },
});

/** Shared PrimeReact configuration; the theme itself comes from globals.css. */
export function PrimeProvider({ children }: { children: ReactNode }) {
  return (
    <PrimeReactProvider value={{ ripple: true, locale: "de" }}>
      {children}
      <ConfirmPopup />
    </PrimeReactProvider>
  );
}
