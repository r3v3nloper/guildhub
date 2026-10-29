export const app = {
  name: "GuildHub",
  shortName: "GuildHub",
  description:
    "Gilden- und Spielplaner: Roster, Checklisten und Berufe an einem Ort.",
} as const;

export const auth = {
  signIn: "Mit Discord anmelden",
  signOut: "Abmelden",
  noAccessTitle: "Kein Zugang",
  noAccessText:
    "Dein Discord-Konto ist für GuildHub nicht freigeschaltet. Frag einen Officer der Gilde, ob er dich hinzufügt.",
  errorTitle: "Anmeldung fehlgeschlagen",
  errorText:
    "Bei der Anmeldung ist etwas schiefgelaufen. Versuch es bitte noch einmal.",
  backToStart: "Zur Startseite",
} as const;

export const nav = {
  home: "Start",
  roster: "Roster",
  characters: "Meine Charaktere",
  charactersShort: "Charaktere",
  admin: "Admin",
  today: "Übersicht",
  more: "Mehr",
  mainGroup: "Übersicht",
  guildGroup: "Gilde",
  plannerGroup: "Planer",
  adminGroup: "Verwaltung",
  matrix: "Gilden-Matrix",
  directory: "Berufe",
  requests: "Crafting-Anträge",
  statPriorities: "Stat-Prioritäten",
  menu: "Menü",
  tasks: "Aufgaben",
  todos: "To-do-Listen",
  checklists: "Dungeon-Checklisten",
  farmSpots: "Farmspots",
  allGames: "Alle Spiele",
  gameSwitcher: "Spiel",
} as const;

export const home = {
  welcome: "Willkommen bei GuildHub",
  signInHint:
    "Melde dich mit Discord an, um das Roster und deine Charaktere zu sehen.",
  greeting: "Hallo",
  noGames:
    "Noch ist kein Spiel aktiviert. Ein Officer kann Spiele im Admin-Bereich einschalten.",
  signedInAs: "Angemeldet als",
  rosterCard: "Wer spielt was? Klassen, Rollen, Berufe und Builds der Gilde.",
  charactersCard: "Deine Charaktere, Berufe und Builds pflegen.",
} as const;

export const common = {
  loading: "Lädt …",
  save: "Speichern",
  cancel: "Abbrechen",
  delete: "Löschen",
  add: "Hinzufügen",
  saved: "Gespeichert.",
  none: "–",
  choose: "Bitte wählen",
  all: "Alle",
  filter: "Filtern",
  reset: "Zurücksetzen",
  back: "Zurück",
} as const;

export const errors = {
  title: "Da ist etwas schiefgelaufen",
  text: "Die Seite konnte nicht geladen werden. Versuch es bitte noch einmal.",
  retry: "Erneut versuchen",
  notFoundTitle: "Seite nicht gefunden",
  notFoundText:
    "Diese Seite gibt es nicht, oder du hast keinen Zugriff darauf.",
} as const;

export const pwa = {
  offline: "Offline: Du siehst den zuletzt geladenen Stand.",
  offlinePageTitle: "Keine Verbindung",
  offlinePageText:
    "Diese Seite wurde noch nicht geladen und ist offline nicht verfügbar. Sobald du wieder online bist, geht es weiter.",
  updateAvailable: "Neue Version verfügbar.",
  reload: "Neu laden",
} as const;

export const stepper = {
  decrease: (label: string) => `${label} um eins verringern`,
  increase: (label: string) => `${label} um eins erhöhen`,
} as const;
