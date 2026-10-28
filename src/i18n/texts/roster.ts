export const roles = {
  tank: "Tank",
  dps: "DPS",
  heal: "Heiler",
  support: "Support",
} as Record<string, string>;

export const memberRoles = {
  owner: "Owner",
  officer: "Officer",
  member: "Mitglied",
} as Record<string, string>;

export const professionKinds = {
  primary: "Hauptberuf",
  secondary: "Nebenberuf",
  gathering: "Sammelberuf",
} as Record<string, string>;

export const badges = {
  todo: "ungeprüft",
  deprecated: "veraltet",
  removed: "nicht mehr im Pack",
  main: "Main",
  former: "ehemalig",
} as const;

export const characters = {
  title: "Meine Charaktere",
  empty: "Du hast noch keine Charaktere angelegt.",
  newIn: "Neu in",
  editTitle: "bearbeiten",
  name: "Name",
  server: "Server",
  faction: "Fraktion",
  race: "Rasse",
  class: "Klasse",
  spec: "Spezialisierung",
  level: "Stufe",
  isMain: "Main-Charakter",
  notes: "Notizen",
  professions: "Berufe",
  professionDetails: "Berufe im Detail",
  professionDetailsHint:
    "Fertigkeit, Spezialisierung und eine Notiz, z. B. was du herstellen kannst.",
  skillLevel: "Fertigkeit",
  specialization: "Spezialisierung",
  professionNotes: "Notiz",
  recipes: "Rezepte",
  recipesHint:
    "Eins pro Zeile, optional mit Notiz: „Name – Notiz“. Erscheint im Berufe-Verzeichnis.",
  editBuild: "Bearbeiten",
  saveBuild: "Build speichern",
  deleteConfirm: "Diesen Charakter mit allen Builds wirklich löschen?",
  builds: "Builds",
  noBuilds: "Noch keine Builds.",
  buildTitle: "Titel",
  buildUrl: "Link",
  buildStatus: "Status",
  buildCurrent: "Aktuell",
  buildPlanned: "Geplant",
  buildTargetClass: "Nächste Klasse",
  buildNotes: "Notiz",
  addBuild: "Build hinzufügen",
} as const;

export const roster = {
  title: "Roster",
  empty: "Keine Charaktere für diese Auswahl.",
  noCharacters: "Noch keine Charaktere.",
  showFormer: "Ehemalige anzeigen",
  classDistribution: "Klassen",
  roleDistribution: "Rollen",
  outdated: "Veraltet",
  currentBuild: "Build",
  plannedClass: "Geplant",
  pickGameForFilters:
    "Für Klassen-, Berufs- und Fraktionsfilter oben ein Spiel wählen.",
  roleFilter: "Rolle",
  professionFilter: "Beruf",
  levelShort: "Lvl",
} as const;
