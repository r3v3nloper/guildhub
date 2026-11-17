export const addonImport = {
  title: "Aus dem Spiel übernehmen",
  link: "Aus dem Spiel übernehmen",
  back: "Meine Charaktere",
  intro:
    "Im Spiel /guildhub eingeben, den Export kopieren und hier einfügen. Vor dem Übernehmen siehst du, was sich ändert.",
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
  snapshotTitle: "Gilden-Stand fürs Addon",
  snapshotIntro:
    "Handwerker und offene Anträge der Gilde fürs Spiel: kopieren, im Spiel /guildhub → Reiter „Import“ einfügen. Ab und zu neu holen.",
  snapshotCopy: "Für das Addon kopieren",
  snapshotCopied: "Kopiert. Jetzt im Spiel einfügen.",
  snapshotManual:
    "Kopieren hat nicht geklappt. Bitte den Text markieren und selbst kopieren.",
  outcome: {
    saved: "übernommen",
    skipped: "übersprungen",
    failed: "nicht übernommen",
  } as Record<string, string>,
} as const;
