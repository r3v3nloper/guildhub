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
  intro:
    "Wohin mit deiner Fertigkeit, wo es was gibt, und die Geheimtipps der Gilde.",
  new: "Neuer Farmspot",
  share: "Farmspot teilen",
  editTitle: "Farmspot bearbeiten",
  viewLabel: "Ansicht",
  views: {
    forYou: "Für dich",
    material: "Material finden",
    skill: "Nach Fertigkeit",
    spots: "Gilden-Spots",
  },
  guideCredits: "Sammeldaten",
  /** ForeverDB has maps with every spawn point on its herb and ore pages. */
  nodeMaps: "Karten mit allen Fundstellen",
  moreAtSource: "Mehr dazu",
  opensExternally: "öffnet die Karte bei der Datenquelle",
  mapOf: (zone: string) => `Karte von ${zone} öffnen`,
  // "Für dich"
  skillOf: (character: string, profession: string) =>
    `Fertigkeit ${profession} von ${character}`,
  skillRange: (from: number, to: number) => `Stufe ${from}–${to}`,
  goNow: "Jetzt hin",
  offersIn: (zone: string) => `In ${zone} für dich`,
  nextStep: (skill: number) => `Ab ${skill}:`,
  moreOffers: (count: number) => `+ ${count} weitere`,
  fewerOffers: "Weniger zeigen",
  topRange: "Du bist in der höchsten Stufe – hier lohnt sich alles.",
  skillMissing: "Fertigkeit fehlt",
  enterSkill: "Trag deine Fertigkeit ein, dann zeigen wir dir, wohin es geht.",
  guildSpotsFor: (count: number, profession: string) =>
    count === 1
      ? `1 Gilden-Spot für ${profession}`
      : `${count} Gilden-Spots für ${profession}`,
  latestSpots: "Neu von der Gilde",
  allSpots: "Alle Gilden-Spots",
  noGatherers: "Noch kein Sammelberuf bei deinen Charakteren",
  noGatherersHint:
    "Trag bei einem Charakter einen Sammelberuf ein, dann siehst du hier, wohin es für ihn geht. Bis dahin hilft „Nach Fertigkeit“.",
  toCharacters: "Zu deinen Charakteren",
  // "Material finden"
  materialLabel: "Was suchst du?",
  materialPlaceholder: "Kraut, Erz oder Fisch …",
  fromSkill: (skill: number) => `ab Fertigkeit ${skill}`,
  foundIn: (count: number) =>
    count === 1 ? "Kommt in 1 Zone vor" : `Kommt in ${count} Zonen vor`,
  recommendedFirst: "empfohlene zuerst",
  recommendedZone: "Empfohlene Sammelzone",
  otherMatches: "Meintest du",
  guildTip: "Tipp der Gilde",
  noMaterial:
    "Nichts gefunden. Probier einen anderen Namen oder schau unter „Nach Fertigkeit“.",
  // "Nach Fertigkeit"
  skill: "Fertigkeit",
  rangesLabel: "Fertigkeitsbereiche",
  yourRange: "du",
  bestZonesFor: (from: number, to: number) => `Beste Zonen für ${from}–${to}`,
  gatherable: (ready: number, total: number) =>
    `${ready} von ${total} sammelbar`,
  legend:
    "Grün: kannst du schon sammeln · Grau: braucht mehr Fertigkeit (Zahl = ab Fertigkeit).",
  moreZones: (count: number) => `Weitere Zonen (${count})`,
  waters: "Passende Gewässer",
  nextWaters: "Als Nächstes",
  zoneSkill: (skill: number | null, max: number | null) =>
    skill === null || skill <= 0
      ? "jede Fertigkeit"
      : max !== null && max !== skill
        ? `Fertigkeit ${skill}–${max}`
        : `ab Fertigkeit ${skill}`,
  chance: (percent: number) =>
    `${percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`,
  // "Gilden-Spots" and the form
  profession: "Beruf",
  resource: "Was",
  zone: "Zone",
  coordinates: "Koordinaten",
  link: "Karte (Link)",
  notes: "Notiz",
  openMap: "Karte",
  deleteConfirm: "Diesen Farmspot löschen?",
  allProfessions: "Alle",
  search: "Material oder Zone suchen",
  searchPlaceholder: "Material oder Zone …",
  empty: "Noch keine Gilden-Spots. Teil den ersten!",
  noMatches: "Keine Farmspots für diese Auswahl.",
  by: (name: string) => `von ${name}`,
  menuFor: (resource: string) => `Weitere Aktionen für ${resource}`,
} as const;

export const visibility = {
  label: "Sichtbar für",
  private: "Nur mich",
  guild: "Die Gilde",
} as Record<string, string>;
