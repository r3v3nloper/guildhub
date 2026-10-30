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
  intro: "Wer in der Gilde was herstellen kann – nach Rezept oder Beruf.",
  reagents: "Benötigt",
  credits: "Rezeptdaten",
  search: "Suchen",
  searchLabel: "Wer kann … bauen?",
  searchPlaceholder: "Rezept, z. B. Stiefel oder Elixier …",
  recipeCount: (count: number) =>
    `${count.toLocaleString("de-DE")} Rezepte aus dem Pack`,
  noRecipe:
    "Kein Rezept gefunden. Probier einen anderen Namen – oder frag per Crafting-Antrag mit freiem Text.",
  fromSkill: (skill: number) => `ab Fertigkeit ${skill}`,
  openSource: "Details",
  canCraft: (count: number) => `Können es bauen · ${count}`,
  maybe: (count: number) => `Fertigkeit nicht eingetragen · ${count}`,
  tooLow: (count: number) => `Noch zu niedrig · ${count}`,
  nobodyCan: "Noch kann es niemand in der Gilde.",
  hasRecipe: "hat das Rezept",
  can: "kann es",
  needs: (skill: number) => `braucht ${skill}`,
  skillMissing: "Fertigkeit fehlt",
  you: "Du",
  request: "Crafting-Antrag stellen",
  requestHint: "Das Rezept ist im Antrag schon ausgewählt.",
  groups: {
    primary: "Herstellen",
    secondary: "Nebenberufe",
    gathering: "Sammeln",
  } as Record<string, string>,
  gatheringHint: "Wo es was gibt, steht bei",
  toFarmspots: "Farmspots",
  holders: (count: number, top: number | null) =>
    count === 0
      ? "Niemand in der Gilde"
      : `${count} ${count === 1 ? "Charakter" : "Charaktere"}${top === null ? "" : ` · bis ${top}`}`,
  youHaveIt: "Du hast diesen Beruf",
  packRecipes: (count: number) =>
    count === 0 ? "" : ` · ${count.toLocaleString("de-DE")} Rezepte im Pack`,
  nobodyHasIt: (profession: string) =>
    `Noch hat niemand in der Gilde ${profession}. Vielleicht ein Plan für einen Twink?`,
  rareRecipes: "Seltene Rezepte",
  toCharacter: "eintragen",
  allProfessions: "Alle Berufe",
  empty: "Keine Treffer.",
  noProfessions: "In den gewählten Spielen gibt es keine Berufe.",
} as const;

export const requests = {
  title: "Crafting-Anträge",
  hint: "Jedes Mitglied kann etwas anfragen. Annehmen kann, wer den Beruf hat; wer annimmt, meldet es als erledigt oder gibt es zurück.",
  new: "Neuer Antrag",
  item: "Was",
  chooseRecipe: "Rezept wählen",
  reagents: "Benötigt",
  itemFreeText: "z. B. 20 Silberblatt",
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
  forYou: "Crafting-Anträge für dich",
  forYouHint: "Passend zu den Berufen deiner Charaktere.",
  showAll: "Alle Anträge",
  acceptedByYou: "Von dir angenommen",
  statuses: {
    open: "Offen",
    accepted: "Angenommen",
    done: "Erledigt",
  },
  intro: "Wünsch dir etwas von der Gilde, oder stell her, was andere brauchen.",
  viewLabel: "Ansicht",
  views: { forYou: "Für dich", mine: "Meine Anträge", all: "Alle" },
  acceptedGroup: "Von dir angenommen",
  acceptedGroupHint: "Herstellen und als erledigt melden",
  craftableGroup: "Kannst du herstellen",
  craftableGroupHint: "Passend zu Berufen und Fertigkeit deiner Charaktere",
  tooLowGroup: "Dafür fehlt dir noch Fertigkeit",
  runningGroup: "Laufend",
  doneGroup: "Erledigt",
  showDone: (count: number) => `Erledigte anzeigen (${count})`,
  emptyAccepted: "Gerade nichts in Arbeit.",
  emptyCraftable: "Keine offenen Anträge für deine Berufe.",
  emptyMine: "Du hast nichts angefragt.",
  emptyRunning: "Keine laufenden Anträge.",
  needs: "Benötigt",
  yourRequest: "Dein Antrag",
  canCraft: (names: string) => `Kann herstellen: ${names}`,
  andMore: (count: number) => `+${count}`,
  nobodyHas: (profession: string) => `Noch kein Hersteller für ${profession}`,
  nobodySkilled: (skill: number | null) =>
    skill === null
      ? "Noch niemand kann das herstellen"
      : `Noch niemand mit genug Fertigkeit (ab ${skill})`,
  makes: (name: string) => `Stellt her: ${name}`,
  madeBy: (name: string) => `Hergestellt von ${name}`,
  ownSkillTooLow: (have: number, need: number) =>
    `Deine Fertigkeit reicht noch nicht (${have} von ${need})`,
  openSince: (days: number) => `seit ${days} Tagen offen`,
  progress: "Fortschritt",
  moreActions: (item: string) => `Weitere Aktionen für ${item}`,
  openRecipe: "Rezept öffnen",
  profession: "Beruf",
  recipe: "Rezept",
  crafterCount: (count: number) =>
    count === 0
      ? "noch kein Hersteller"
      : count === 1
        ? "1 Hersteller"
        : `${count} Hersteller`,
  totalNeeds: "Benötigt insgesamt",
  craftersFor: (names: string) => `Kann herstellen: ${names}`,
  nobodyForRecipe: "Noch niemand sonst ist dafür weit genug.",
  fewer: "Weniger",
  more: "Mehr",
  close: "Schließen",
  optional: "optional",
  notePlaceholder: "z. B. Material bringe ich mit",
  hasRecipe: "hat das Rezept",
} as const;

export const statPriorities = {
  title: "Stat-Prioritäten",
  intro:
    "Welche Stats zählen und welche Builds die Officers empfehlen – pro Klasse.",
  hint: "Welche Stats für welche Klasse in welcher Reihenfolge zählen. Officers pflegen sie.",
  classPicker: "Klasse",
  counts: (priorities: number, builds: number) =>
    priorities + builds === 0
      ? "noch leer"
      : [
          priorities > 0 &&
            `${priorities} ${priorities === 1 ? "Priorität" : "Prioritäten"}`,
          builds > 0 && `${builds} ${builds === 1 ? "Build" : "Builds"}`,
        ]
          .filter(Boolean)
          .join(" · "),
  yourClass: "Deine Klasse",
  yourCharacters: (names: string) => `Deine Charaktere: ${names}`,
  empty: "Noch keine Stat-Priorität.",
  emptyMember: (className: string) =>
    `Für ${className} haben die Officers noch keine Stat-Priorität hinterlegt.`,
  emptyOfficer:
    "Noch keine Stat-Priorität. Leg die erste an, zum Beispiel für PvE oder Tank.",
  add: "Stat-Priorität hinzufügen",
  addShort: "Stat-Priorität",
  edit: "Stat-Priorität bearbeiten",
  menuFor: (title: string) => `Weitere Aktionen für ${title}`,
  variant: "Variante",
  variantHint: "Zum Beispiel „PvE“, „PvP“ oder „Tank“.",
  stats: "Stats",
  statsHint:
    "Der wichtigste zuerst. Mit den Pfeilen sortierst du um, Enter fügt hinzu.",
  addStat: "Stat hinzufügen",
  addStatPlaceholder: "z. B. Stärke oder Trefferwertung bis 9 %",
  statsEmpty: "Noch keine Stats. Füg den wichtigsten zuerst hinzu.",
  usedElsewhere: "Schon verwendet",
  moveUp: (stat: string) => `${stat} nach oben`,
  moveDown: (stat: string) => `${stat} nach unten`,
  removeStat: (stat: string) => `${stat} entfernen`,
  notes: "Notiz",
  source: "Quelle (Link)",
  sourceLink: "Quelle",
  backTo: (className: string) => `Zurück zu ${className}`,
  deleteTitle: "Stat-Priorität löschen",
  deleteHint: "Weg ist weg: Die Gilde sieht diese Rangfolge danach nicht mehr.",
  deleteConfirm: "Diese Stat-Priorität löschen?",
  ofClass: "Stat-Prioritäten der Klasse",
} as const;

export const specBuilds = {
  title: "Build-Empfehlungen",
  hint: "Von den Officers pro Spezialisierung empfohlen, z. B. als Link zum Talentrechner.",
  ofCharacter: "Build-Empfehlungen der Gilde",
  empty: "Noch keine Build-Empfehlung.",
  emptyMember: "Für diese Klasse gibt es noch keine Build-Empfehlungen.",
  noneForSpec: "Noch kein Build für diese Spezialisierung.",
  add: "Build-Empfehlung hinzufügen",
  addFor: (spec: string) => `Build für ${spec}`,
  yourSpec: "Deine Spec",
  spec: "Spezialisierung",
  buildTitle: "Titel",
  titleHint: "Zum Beispiel „Leveln“, „Dungeon“ oder „Raid“.",
  url: "Link",
  notes: "Notiz",
  open: "Build öffnen",
  menuFor: (title: string) => `Weitere Aktionen für ${title}`,
  deleteConfirm: "Diese Build-Empfehlung löschen?",
  offSpec: "Off-Spec",
} as const;
