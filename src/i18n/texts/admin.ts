export const admin = {
  title: "Admin",
  sectionsLabel: "Bereiche",
  syncStatus: {
    success: "aktualisiert",
    skipped: "aktuell",
    error: "Fehler",
  } as Record<string, string>,
  olderAudit: (count: number) => `Ältere Einträge (${count})`,
  guild: "Gilde",
  guildName: "Gildenname",
  games: "Spiele",
  enabled: "aktiviert",
  disabled: "deaktiviert",
  enable: "Aktivieren",
  disable: "Deaktivieren",
  region: "Region",
  packVersion: "Pack-Version",
  packs: "Packs & Sync",
  packErrorBanner:
    "Pack-Fehler: Diese Packs wurden beim letzten Start übersprungen.",
  lastSync: "Letzter Sync",
  syncHistory: "Sync-Verlauf",
  todoEntries: "Ungeprüfte Einträge",
  noTodo: "Keine ungeprüften Einträge.",
  members: "Mitglieder",
  discordId: "Discord-ID",
  role: "Rolle",
  status: "Status",
  active: "aktiv",
  deactivate: "Deaktivieren",
  reactivate: "Reaktivieren",
  purge: "Daten löschen",
  purgeConfirm: "Zum endgültigen Löschen aller Daten den Namen eintippen:",
  readmittedWarning:
    "Achtung: Die ID steht noch in ALLOWED_DISCORD_IDS und wird beim nächsten Start wieder freigeschaltet.",
  allowlist: "Allowlist",
  allowlistAdd: "Discord-ID freischalten",
  allowlistPending: "Freigeschaltet, aber noch nie angemeldet",
  allowlistHint:
    "Discord: Einstellungen → Erweitert → Entwicklermodus, dann Rechtsklick auf die Person → Benutzer-ID kopieren.",
  audit: "Protokoll",
  backup: "Backup",
  backupDownload: "Datenbank herunterladen",
  backupHint:
    "Vollständige Kopie der Datenbank ohne Sessions und Tokens. Nach einem Restore daraus müssen sich alle neu anmelden.",
  noAudit: "Noch keine Einträge.",
  affectedCharacters: "betroffene Charaktere",
  packErrorBadge: "Pack-Fehler",
  syncUnchanged: "unverändert",
  syncNew: "neu",
  syncSummary: (counts: {
    added: number;
    changed: number;
    deprecated: number;
    removed: number;
  }) =>
    `${counts.added} neu, ${counts.changed} geändert, ${counts.deprecated} veraltet, ${counts.removed} entfernt`,
  syncMigration: (rewritten: number, merged: number) =>
    `${rewritten} umgeschrieben, ${merged} zusammengeführt`,
  unknownActor: "?",
} as const;

export const catalogKinds = {
  class: "Klasse",
  race: "Rasse",
  faction: "Fraktion",
  profession: "Beruf",
  boss: "Boss",
  server: "Server",
  reset_rule: "Reset-Regel",
} as Record<string, string>;

export const auditActions = {
  "allowlist.add": "hat freigeschaltet",
  "allowlist.remove": "hat Freischaltung entfernt",
  "member.disable": "hat deaktiviert",
  "member.reactivate": "hat reaktiviert",
  "member.role": "hat Rolle geändert",
  "member.purge": "hat Daten gelöscht",
  "guild.rename": "hat Gilde umbenannt",
  "game.enable": "hat Spiel aktiviert",
  "game.disable": "hat Spiel deaktiviert",
  "game.region": "hat Region gewählt",
  "backup.download": "hat Backup geladen",
  "guildTask.create": "hat Gildenaufgabe angelegt",
  "guildTask.update": "hat Gildenaufgabe geändert",
  "guildTask.delete": "hat Gildenaufgabe gelöscht",
  "craftRequest.delete": "hat fremden Antrag gelöscht",
  "statPriority.create": "hat Stat-Priorität angelegt",
  "statPriority.update": "hat Stat-Priorität geändert",
  "statPriority.delete": "hat Stat-Priorität gelöscht",
  "specBuild.create": "hat Build-Empfehlung angelegt",
  "specBuild.delete": "hat Build-Empfehlung gelöscht",
} as Record<string, string>;
