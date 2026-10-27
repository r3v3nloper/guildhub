export const de = {
  app: {
    name: "GuildHub",
    shortName: "GuildHub",
    description:
      "Gilden- und Spielplaner: Roster, Checklisten und Berufe an einem Ort.",
  },
  auth: {
    signIn: "Mit Discord anmelden",
    signOut: "Abmelden",
    noAccessTitle: "Kein Zugang",
    noAccessText:
      "Dein Discord-Konto ist für GuildHub nicht freigeschaltet. Frag einen Officer der Gilde, ob er dich hinzufügt.",
    errorTitle: "Anmeldung fehlgeschlagen",
    errorText:
      "Bei der Anmeldung ist etwas schiefgelaufen. Versuch es bitte noch einmal.",
    backToStart: "Zur Startseite",
  },
  home: {
    welcome: "Willkommen bei GuildHub",
    underConstruction: "Die App ist im Aufbau. Roster und Checklisten folgen.",
    signedInAs: "Angemeldet als",
  },
  pwa: {
    offline: "Offline: Du siehst den zuletzt geladenen Stand.",
    offlinePageTitle: "Keine Verbindung",
    offlinePageText:
      "Diese Seite wurde noch nicht geladen und ist offline nicht verfügbar. Sobald du wieder online bist, geht es weiter.",
    updateAvailable: "Neue Version verfügbar.",
    reload: "Neu laden",
  },
} as const;
