export const todos = {
  title: "To-do-Listen",
  hint: "Einmalige Aufgaben ohne Reset. Private Listen siehst nur du; Gilden-Listen sehen und bearbeiten alle, ein abgehakter Eintrag ist für alle erledigt.",
  guildLists: "Gilde",
  ownLists: "Meine Listen",
  rename: "Umbenennen",
  doneBy: (name: string) => `✓ ${name}`,
  empty: "Noch keine Listen.",
  newList: "Neue Liste",
  listName: "Name der Liste",
  newItem: "Neuer Eintrag",
  clearDone: "Erledigte entfernen",
  deleteListConfirm: "Diese Liste mit allen Einträgen löschen?",
  noItems: "Noch keine Einträge.",
} as const;

export const checklists = {
  title: "Dungeon-Checklisten",
  hint: "Eine Vorlage pro Dungeon. Jeder hakt für seinen eigenen Run ab; „Neuer Run“ setzt deine Haken zurück.",
  empty: "Noch keine Checklisten für dieses Spiel.",
  new: "Neue Checkliste",
  editTitle: "Checkliste bearbeiten",
  name: "Dungeon",
  items: "Punkte (einer pro Zeile)",
  itemsHint: "Beim Speichern werden alle Haken dieser Liste zurückgesetzt.",
  newRun: "Neuer Run",
  pin: "An die Übersicht anheften",
  unpin: "Von der Übersicht lösen",
  deleteConfirm: "Diese Checkliste löschen?",
  progress: (ticked: number, total: number) => `${ticked}/${total}`,
} as const;

export const farmSpots = {
  title: "Farmspots",
  hint: "Wo gibt es was? Zone und Koordinaten als Text, optional mit Link zu einer Karte.",
  empty: "Noch keine Farmspots für dieses Spiel.",
  new: "Neuer Farmspot",
  editTitle: "Farmspot bearbeiten",
  profession: "Beruf",
  resource: "Was",
  zone: "Zone",
  coordinates: "Koordinaten",
  link: "Karte (Link)",
  notes: "Notiz",
  openMap: "Karte öffnen",
  deleteConfirm: "Diesen Farmspot löschen?",
  allProfessions: "Alle Berufe",
  search: "Material oder Zone suchen",
  searchPlaceholder: "Material oder Zone …",
  noMatches: "Keine Farmspots für diese Auswahl.",
} as const;

export const visibility = {
  label: "Sichtbar für",
  private: "Nur mich",
  guild: "Die Gilde",
} as Record<string, string>;
