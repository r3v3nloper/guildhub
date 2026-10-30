export const roles = {
  tank: "Tank",
  heal: "Heiler",
  melee: "Nahkampf-DPS",
  ranged: "Fernkampf-DPS",
  dps: "DPS",
  support: "Support",
  unknown: "ohne Spec",
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

export const learnings = {
  title: "Als Nächstes lernen",
  atLevel: (level: number, isNow: boolean) =>
    isNow ? `Stufe ${level} · jetzt` : `Stufe ${level}`,
  rank: (rank: number) => `Rang ${rank}`,
  fromQuest: "Quest",
  noLevel: "Stufe eintragen, dann steht hier, was als Nächstes kommt.",
  allLearned: "Mehr hat der Lehrer nicht.",
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
  offSpec: "Off-Spec",
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
  addRecipe: "Rezept aus der Liste hinzufügen",
  recipeFromSkill: "ab",
  recipesHint:
    "Eins pro Zeile, optional mit Notiz: „Name – Notiz“. Aus der Liste oder frei eingetippt. Erscheint im Berufe-Verzeichnis.",
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
  backToList: "Meine Charaktere",
  sections: { general: "Allgemein", professions: "Berufe", builds: "Builds" },
  sectionsLabel: "Bereiche",
  basics: "Grunddaten",
  raceAndClass: "Rasse & Klasse",
  classAndRole: "Klasse & Rolle",
  isMainHint: "Steht im Roster bei dir an erster Stelle.",
  levelDown: "Stufe runter",
  levelUp: "Stufe hoch",
  notAvailableFor: (race: string) => `Ausgegraut: nicht für ${race} spielbar.`,
  chooseClassFirst: "Wähl zuerst die Klasse, dann die Spezialisierung.",
  noOffSpec: "Keine",
  onlyMainSpec: "nur Main-Spec",
  optional: "optional",
  unsaved: "Ungespeicherte Änderungen",
  discard: "Verwerfen",
  deleteTitle: "Charakter löschen",
  deleteText: (name: string) =>
    `Entfernt ${name} mit Berufen, Builds und Fortschritt. Das lässt sich nicht rückgängig machen.`,
  newTitle: "Neuer Charakter",
  stepWho: "Wer ist es?",
  stepClass: "Rasse, Klasse, Rolle",
  stepClassNoRace: "Klasse und Rolle",
  stepProfessions: "Berufe",
  stepProfessionsHint: "optional, auch später",
  professionsLater:
    "Fertigkeit und seltene Rezepte trägst du nach dem Anlegen unter „Berufe“ ein.",
  create: "Charakter anlegen",
  preview: "So sieht die Gilde ihn",
  noProfessionsYet: "Noch keine Berufe",
  namePlaceholder: "z. B. Brakka",
  isMainNew: "Das ist mein Main-Charakter",
  professionSummary: (specialization: string | null, recipes: number) =>
    [
      specialization,
      recipes > 0
        ? recipes === 1
          ? "1 seltenes Rezept"
          : `${recipes} seltene Rezepte`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Noch keine Details",
  gatheringSummary: "Sammelberuf",
  skillUnknown: "Fertigkeit offen",
  skillDown: "Fertigkeit runter",
  skillUp: "Fertigkeit hoch",
  specializationPlaceholder: "z. B. Stammesleder",
  professionNotePlaceholder: "z. B. Material selbst mitbringen",
  rareRecipes: "Seltene Rezepte",
  rareRecipesHint:
    "Nur Rezepte, die man nicht beim Lehrer lernt, z. B. Drops oder Ruf. Wer eins eingetragen hat, steht bei passenden Anträgen ganz oben.",
  rareRecipePick: "Rezept aus dem Pack suchen",
  rareRecipeFree: "Oder frei eintragen, z. B. „Name – Notiz“",
  removeRecipe: (name: string) => `${name} entfernen`,
  gatheringNoRecipes:
    "Sammelberuf: keine Rezepte. Anträge dafür sind freier Text.",
  addProfession: "Beruf hinzufügen",
  chooseProfession: "Beruf wählen",
  noMoreProfessions: "Alle Berufe sind schon eingetragen.",
  removeProfession: "Beruf entfernen",
  removeProfessionConfirm:
    "Diesen Beruf mit Fertigkeit und Rezepten entfernen?",
  noProfessions: "Noch keine Berufe eingetragen.",
  addBuildOpen: "Build hinzufügen",
  buildNoLink: "Kein Link",
  buildActions: (title: string) => `Aktionen für ${title}`,
  deleteBuildConfirm: "Diesen Build löschen?",
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
