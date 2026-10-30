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
  instance: "Instanz als Vorlage",
  instanceNone: "Ohne Vorlage",
  instanceHint:
    "Übernimmt Name und Bosse; Punkte, Mechaniken und Loot trägst du danach selbst ein.",
  instanceLabel: (
    name: string,
    kind: "dungeon" | "raid",
    players: number | null,
    levelMin: number | null,
    levelMax: number | null,
  ) => {
    const size =
      kind === "raid" ? `Raid${players ? ` ${players}` : ""}` : "Dungeon";
    const level =
      levelMin === null
        ? ""
        : levelMin === levelMax
          ? `, Stufe ${levelMin}`
          : `, Stufe ${levelMin}–${levelMax}`;
    return `${name} (${size}${level})`;
  },
  notableLoot: "Wichtige Beute",
  notableLootHint:
    "Laut ForeverDB besonders begehrt; euer Loot steht bei den Bossen.",
  items: "Punkte (einer pro Zeile)",
  itemsHint:
    "Wer die Punkte ändert, setzt damit alle Haken dieser Liste zurück. Name und Notizen ändern die Haken nicht.",
  notes: "Notizen",
  notesHint: "Allgemeines zum Dungeon: Weg, Tipps, was man mitbringen sollte.",
  detail: "Dungeon öffnen",
  checklist: "Checkliste",
  bosses: "Bosse",
  noBosses: "Noch keine Bosse eingetragen.",
  addBoss: "Boss hinzufügen",
  editBoss: "Boss bearbeiten",
  deleteBossConfirm: "Diesen Boss mit seinem Loot löschen?",
  bossName: "Name",
  mechanics: "Mechaniken",
  mechanicsHint: "Eine Mechanik pro Zeile: Phasen, Fähigkeiten, Aufstellung.",
  loot: "Loot",
  lootHint:
    "Ein Item pro Zeile, optional mit Notiz und Link: „Arkanitschnitter – BiS Krieger – https://…“",
  noLoot: "Kein Loot eingetragen.",
  openLink: "Link öffnen",
  newRun: "Neuer Run",
  pin: "An die Übersicht anheften",
  unpin: "Von der Übersicht lösen",
  deleteConfirm: "Diese Checkliste löschen?",
  progress: (ticked: number, total: number) => `${ticked}/${total}`,
  preparation: "Vorbereitung",
  newRunHint: "Setzt nur deine Haken zurück.",
  pinned: "Angeheftet",
  pinShort: "Anheften",
  edit: "Bearbeiten",
  instanceSize: (kind: "dungeon" | "raid", players: number | null) =>
    `${kind === "raid" ? "Raid" : "Dungeon"}${players ? ` · ${players} Spieler` : ""}`,
  levelRange: (min: number, max: number | null) =>
    max === null || max === min ? `Stufe ${min}` : `Stufe ${min}–${max}`,
  bossCount: (count: number) => (count === 1 ? "1 Boss" : `${count} Bosse`),
  withInfoShort: (count: number) => `${count} mit Infos`,
  withInfo: (count: number, total: number) => `${count} von ${total} mit Infos`,
  sharedBy: (visibility: string, owner: string | null) =>
    owner ? `${visibility} · ${owner}` : visibility,
  expandAll: "Alle aufklappen",
  collapseAll: "Alle zuklappen",
  nothingYet: "Noch nichts eingetragen",
  nothingFor: (name: string) => `Noch keine Mechaniken oder Loot für ${name}.`,
  fillIn: "Jetzt eintragen",
  editBossNamed: (name: string) => `${name} bearbeiten`,
  deleteBoss: "Boss löschen",
  lootCount: (count: number) => (count === 1 ? "1 Item" : `${count} Items`),
  newBoss: "Neuer Boss",
  newBossHint: "Mechaniken und Loot trägst du danach direkt beim Boss ein.",
  tabs: "Bereiche",
  infoTab: "Infos",
  kindFilter: "Art",
  kinds: { all: "Alle", dungeon: "Dungeons", raid: "Raids" },
  noneOfKind: "Keine Checklisten dieser Art.",
  pinnedHint: "An die Übersicht angeheftet",
} as const;

export const farmSpots = {
  title: "Farmspots",
  hint: "Wo gibt es was? Zone und Koordinaten als Text, optional mit Link zu einer Karte.",
  empty: "Noch keine Farmspots für dieses Spiel.",
  new: "Neuer Farmspot",
  editTitle: "Farmspot bearbeiten",
  guideTitle: "Wo sammeln?",
  guideHint:
    "Die besten Zonen je Fertigkeit laut ForeverDB. Wo Vorkommen stehen, sind teils noch Classic-Daten.",
  guideCredits: "Sammeldaten",
  /** ForeverDB has maps with every spawn point on its herb and ore pages. */
  nodeMaps: "Karten mit allen Fundstellen",
  moreAtSource: "Mehr dazu",
  yourGatherers: "Deine Sammler",
  enterSkill:
    "Fertigkeit beim Charakter eintragen, dann gibt es hier eine Empfehlung.",
  skillRange: (from: number, to: number) => `Fertigkeit ${from}–${to}`,
  allZones: (count: number) => `Alle Zonen (${count})`,
  zoneSkill: (skill: number | null, max: number | null) =>
    skill === null || skill <= 0
      ? "jede Fertigkeit"
      : max !== null && max !== skill
        ? `Fertigkeit ${skill}–${max}`
        : `ab Fertigkeit ${skill}`,
  chance: (percent: number) =>
    `${percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`,
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
