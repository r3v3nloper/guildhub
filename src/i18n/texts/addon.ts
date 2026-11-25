export const addonImport = {
  title: "Aus dem Spiel übernehmen",
  link: "Aus dem Spiel übernehmen",
  back: "Meine Charaktere",
  intro:
    "Im Spiel /guildhub eingeben, den Export kopieren und hier einfügen. " +
    "Vor dem Übernehmen siehst du, was sich ändert.",
  text: "Export aus dem Addon",
  textHint: "Beginnt mit „GH1:“. Bitte komplett kopieren.",
  preview: "Vorschau",
  apply: "Übernehmen",
  applied: "Übernommen.",
  nothingToApply: "Nichts zu übernehmen.",
  again: "Anderen Export einfügen",
  status: {
    new: "neu",
    changed: "ändert sich",
    unchanged: "unverändert",
    foreign: "gehört einem anderen Mitglied",
  } as Record<string, string>,
  create: "Anlegen",
  foreignHint:
    "Ein Charakter mit diesem Namen gehört in GuildHub schon jemand anderem und wird nicht übernommen.",
  level: (from: number | null, to: number) =>
    from === null ? `Stufe ${to}` : `Stufe ${from} → ${to}`,
  field: (label: string, to: string) => `${label}: ${to}`,
  skill: (profession: string, from: number | null, to: number) =>
    from === null ? `${profession} ${to}` : `${profession} ${from} → ${to}`,
  newProfession: (profession: string, skill: number | null) =>
    skill === null
      ? `Neuer Beruf: ${profession}`
      : `Neuer Beruf: ${profession} ${skill}`,
  deaths: (count: number) => (count === 1 ? "+1 Tod" : `+${count} Tode`),
  realm: (realm: string) => `Realm „${realm}“ wird eingetragen`,
  newRecipes: (count: number) =>
    count === 1 ? "1 neues Rezept" : `${count} neue Rezepte`,
  missingProfession: (profession: string) =>
    `${profession} im Spiel nicht mehr vorhanden – entfernen (mit Rezepten)`,
  unknown: "Unbekannt im Pack, wird übersprungen:",
  unknownKinds: {
    faction: "Fraktion",
    race: "Rasse",
    class: "Klasse",
    profession: "Beruf",
    realm: "Realm",
  } as Record<string, string>,
  unknownValue: (kind: string, ref: string) => `${kind} „${ref}“`,
  unknownRecipes: (count: number) =>
    count === 1
      ? "1 Rezept ohne Eintrag im Pack"
      : `${count} Rezepte ohne Eintrag im Pack`,
  requestsTitle: "Anträge aus dem Spiel",
  requestAction: {
    accept: "Annehmen",
    done: "Erledigt",
    return: "Zurückgeben",
  } as Record<string, string>,
  requestGone: "Antrag gelöscht",
  requestResult: {
    applied: "wird übernommen",
    discarded: "verworfen",
  } as Record<string, string>,
  requestApplied: {
    applied: "übernommen",
    discarded: "verworfen",
  } as Record<string, string>,
  snapshotTitle: "Gilden-Stand fürs Addon",
  snapshotIntro:
    "Handwerker und offene Anträge der Gilde fürs Spiel: kopieren, im Spiel " +
    "/guildhub → „Gilden-Stand einfügen“. Ab und zu neu holen.",
  snapshotCopy: "Für das Addon kopieren",
  snapshotCopied: "Kopiert. Jetzt im Spiel einfügen.",
  snapshotManual:
    "Kopieren hat nicht geklappt. Bitte den Text markieren und selbst kopieren.",
  forMember: (name: string) => `für ${name}`,
  skippedTitle: "Nicht übernommene Accounts",
  skippedAccount: (characters: string, reason: string) =>
    `${characters}: ${reason}`,
  noCharacters: "ohne Charaktere",
  skipReason: {
    notOfficer: "Daten anderer Mitglieder übernehmen nur Officer",
    unknownCharacters: "keiner der Charaktere ist in GuildHub bekannt",
    severalMembers: "die Charaktere gehören verschiedenen Mitgliedern",
    inactiveMember: "das Mitglied ist nicht aktiv",
  } as Record<string, string>,
  outcome: {
    saved: "übernommen",
    skipped: "übersprungen",
    failed: "nicht übernommen",
  } as Record<string, string>,
} as const;
