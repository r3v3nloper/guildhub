export const matrix = {
  title: "Gilden-Matrix",
  task: "Aufgabe",
  perMember: "Pro Mitglied",
  perCharacter: "Pro Charakter",
  empty: "Für dieses Spiel gibt es noch keine Aufgaben oder Charaktere.",
  shared: "Gemeinsamer Stand mit anderen Charakteren",
  guildTasks: "Gildenaufgaben",
} as const;

export const directory = {
  title: "Berufe",
  search: "Suchen",
  searchPlaceholder: "Wer kann … (Rezept, Beruf)",
  allProfessions: "Alle Berufe",
  empty: "Keine Treffer.",
  noProfessions: "In den gewählten Spielen gibt es keine Berufe.",
} as const;

export const requests = {
  title: "Crafting-Anträge",
  hint: "Jedes Mitglied kann etwas anfragen. Annehmen kann, wer den Beruf hat; wer annimmt, meldet es als erledigt oder gibt es zurück.",
  new: "Neuer Antrag",
  item: "Was",
  quantity: "Anzahl",
  notes: "Notiz",
  submit: "Anfragen",
  created: "Antrag gestellt.",
  empty: "Keine Anträge.",
  accept: "Annehmen",
  finish: "Erledigt",
  giveBack: "Zurückgeben",
  deleteConfirm: "Diesen Antrag löschen?",
  by: (name: string) => `von ${name}`,
  craftedBy: (name: string) => `Hersteller: ${name}`,
  statuses: {
    open: "Offen",
    accepted: "Angenommen",
    done: "Erledigt",
  },
} as const;

export const statPriorities = {
  title: "Stat-Prioritäten",
  hint: "Welche Stats für welche Klasse in welcher Reihenfolge zählen. Officers pflegen sie.",
  empty: "Noch keine Stat-Priorität.",
  add: "Stat-Priorität hinzufügen",
  edit: "Stat-Priorität bearbeiten",
  variant: "Variante",
  variantHint: "Zum Beispiel „PvE“, „PvP“ oder „Tank“.",
  stats: "Stats",
  statsHint: "Einer pro Zeile, der wichtigste zuerst.",
  notes: "Notiz",
  source: "Quelle (Link)",
  sourceLink: "Quelle öffnen",
  deleteConfirm: "Diese Stat-Priorität löschen?",
  ofClass: "Stat-Prioritäten der Klasse",
} as const;
