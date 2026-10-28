export const today = {
  title: "Heute",
  openCount: (count: number) =>
    count === 1 ? "1 offene Aufgabe" : `${count} offene Aufgaben`,
  allDone: "Alles erledigt.",
  general: "Allgemein",
  account: "Für alle Charaktere",
  noServer: "ohne Server",
  done: (count: number) => `Erledigt (${count})`,
  resetIn: (time: string) => `Reset in ${time}`,
  noCharacters:
    "Lege zuerst einen Charakter an, dann erscheinen hier seine Aufgaben.",
  noTasks:
    "Für deine Spiele gibt es noch keine Aufgaben. Eigene Aufgaben kannst du unter „Aufgaben“ anlegen.",
  decrease: "Eins zurück",
  longPressHint: "Lang drücken: eins zurück",
  bossesOf: (killed: number, total: number) => `${killed}/${total} Bosse`,
  enterValue: "Stand eintragen",
  currentValue: "Aktueller Stand",
  editValue: "Exakten Stand eintragen",
  useOne: "Einen verbrauchen",
  fullIn: (time: string) => `Voll in ${time}`,
  full: "Läuft voll, verbrauchen!",
  guide: "Guide öffnen",
  collapseDone: "Erledigte ausblenden",
} as const;
