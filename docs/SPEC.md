# Projekt: GuildHub, Gilden- & Spielplaner

> **Für Claude Code:** Lies diese Datei vollständig, bevor du Code schreibst.
> Arbeite die Phasen in Abschnitt 10 der Reihe nach ab. Am Ende jeder Phase
> müssen Tests und Akzeptanzkriterien erfüllt sein, bevor die nächste beginnt.
> Bei Unklarheiten oder wenn du vom Stack abweichen willst: **erst fragen**.
> Offene Punkte stehen in Abschnitt 12.

---

## 1. Ziel & Kontext

Eine zentrale Web-App für **eine Gilde** (dieselbe Spielergruppe), die mehrere
Spiele gemeinsam spielt. Statt vieler Webseiten, Excel-Listen und Discord-Nachfragen
soll es **einen Ort** geben für:

1. **Gilden-Roster:** Wer spielt welche Klasse, welche Berufe, welchen Build?
   Pro Spiel, pro Charakter, inkl. Twinks und geplanter nächster Klasse.
2. **Persönliche Checkliste:** Dailies/Weeklies/Lockouts abhaken, mit
   automatischem Reset, über alle Spiele hinweg („Was ist heute noch offen?“).
3. **Gildenübersicht:** Wer hat welche Weekly/ID schon erledigt?
4. **Berufe-Verzeichnis:** Wer kann was herstellen?

Startspiele:
- **AION 2** (globaler Release 05.10.2026)
- **WoW: Forever** (Classic-Plus, Level-Cap 60, Release 04.11.2026)

Später sollen **weitere Spiele** dazukommen, **auch Singleplayer-Spiele**
(siehe Abschnitt 6). Erweiterbarkeit ist eine Kernanforderung.

**Kein kommerzielles Produkt.** Zielgruppe ist nur die eigene Gilde mit
**bis zu 10 Personen** (aktuell 6, Reserve eingeplant). Einfachheit und Wartbarkeit gehen vor Skalierung.

**Betrieb:** Self-hosted auf einem vorhandenen **vServer mit Docker**, auf dem
bereits andere Container und PWAs laufen. Keine Cloud-Dienste (kein Supabase,
kein Vercel). Die App wird als **installierbare PWA** ausgeliefert.

---

## 2. Leitprinzipien

1. **Datengetrieben statt hartcodiert.** Spielspezifisches (Klassen, Berufe,
   Aufgaben, Reset-Zeiten) steht in **Game Packs** (JSON-Dateien), nicht im Code.
   Ein neues Spiel = ein neues Pack, kein neuer Code.
2. **Fähigkeiten statt Spiel-Sonderfälle.** Jedes Pack deklariert, welche Module
   es nutzt (`capabilities`). Die UI blendet Module ein oder aus. Kein
   `if (game === "wow")` im UI- oder Domain-Code.
3. **Kein Scraping.** Builds werden als **Links** gespeichert (Talentrechner,
   MetaBot usw.). Das Auslesen von Link-Parametern ist optional und darf nur
   aus der URL selbst erfolgen, nie durch Abrufen fremder Seiten.
4. **Resets werden berechnet, nicht per Cron ausgelöst.** Ob eine Aufgabe erledigt
   ist, ergibt sich aus „Erledigung gehört zur aktuellen Periode“ (siehe Abschnitt 5).
5. **Schnell abhaken.** Ein Klick bzw. Tap pro Aufgabe. Mobile-first als PWA
   (auf dem Homescreen installierbar), denn viele schauen nebenbei aufs Handy.
6. **Ein Container, eine Datei-Datenbank.** Für bis zu 10 Nutzer keine verteilte
   Infrastruktur. Backup = eine Datei sichern.
7. **Deutsch als UI-Sprache**, Code/Identifier auf Englisch. i18n vorbereiten
   (Strings zentral), aber nicht ausbauen.

---

## 3. Tech-Stack (festgelegt)

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | Next.js (App Router, `output: "standalone"`) + TypeScript (strict) | Ein Repo/Container für UI + API |
| Styling | Tailwind CSS (Layout, Abstände) | schnell, mobile-first |
| UI-Komponenten | **PrimeReact 10** + PrimeIcons 7, Lara-Theme (Indigo) hell/dunkel nach Systemeinstellung, als CSS-Layer unter Tailwind | vertraute Komponenten wie bei PrimeNG; Version 10 und PrimeIcons 7 sind die letzten MIT-lizenzierten Versionen (ab PrimeReact 11 bzw. PrimeIcons 8 eigene PrimeUI-Lizenz mit Registrierung) |
| Datenbank | **SQLite** (WAL-Modus) über **Drizzle ORM** + `better-sqlite3` | max. 10 Nutzer, eine Datei, triviales Backup |
| Migrationen | drizzle-kit erzeugt sie (Dev); beim Serverstart wendet der programmatische Migrator von `drizzle-orm` sie in `src/instrumentation.ts` an, bevor Requests angenommen werden | kein manueller Schritt beim Update; drizzle-kit ist im Standalone-Build nicht enthalten |
| Login | **Auth.js (NextAuth v5)** mit Discord-Provider, DB-Sessions in SQLite über `@auth/drizzle-adapter` | Gilde ist ohnehin auf Discord |
| Zugang | Allowlist von Discord-User-IDs (ENV) + Admin-UI | max. 10 bekannte Personen, keine offene Registrierung |
| PWA | Web-App-Manifest + Service Worker über `@serwist/turbopack` (+ `serwist`, `esbuild`), ausgeliefert unter `/serwist/sw.js` | Homescreen-Installation, App-Shell-Cache; `@serwist/next` setzt Webpack voraus, Next 16 baut mit Turbopack |
| Validierung | Zod (auch für Game-Pack-Schema) | ein Schema für Laufzeit + Typen |
| Zeit/Zeitzonen | **Luxon**, **immer IANA-Zeitzonen** | behandelt DST-Lücke und doppelte Stunde von sich aus wie in 5.2 gefordert |
| Skripte | `tsx` für `packs:validate`, Pack-Sync und Seed in TypeScript | Skripte nutzen denselben Code wie die App |
| Tests | Vitest (Unit), Playwright (optional, später E2E) | |
| Betrieb | Docker + docker-compose auf eigenem vServer | siehe Abschnitt 11 |

**Migrationspfad:** Drizzle so nutzen, dass ein späterer Wechsel auf PostgreSQL
nur Treiber und Dialekt betrifft (keine SQLite-spezifischen SQL-Tricks in der
Domain-Logik). Ein Wechsel ist bei max. 10 Nutzern aber nicht geplant.

Keine weiteren Abhängigkeiten ohne Rückfrage.

**Konventionen & Arbeitsweise:**
- Code-Stil nach Next.js-Standard: Prettier mit Default-Einstellungen (K&R-Klammern),
  ESLint mit `next/core-web-vitals` und `next/typescript`. Abweichende globale
  Stilregeln (Allman-Klammern, explizite `public`-Modifier) gelten hier **nicht**.
- Privates Projekt ohne Jira-/Branch-Ablauf und ohne OpenSpec. **Diese Datei ist die
  einzige Spezifikation**; Entscheidungen werden hier nachgetragen.

---

## 4. Domänenmodell

### 4.1 Entitäten

```
User            id, discord_id, display_name, avatar_url,
                timezone (Default "Europe/Berlin", nur für die Anzeige)
Guild           id, name, discord_guild_id?, default_timezone
                -- genau eine Zeile; wird beim ersten Start angelegt (GUILD_NAME,
                -- DEFAULT_TIMEZONE aus der ENV), danach im Admin-Bereich umbenennbar
GuildMember     guild_id, user_id, role: owner | officer | member,
                status: active | disabled, disabled_at?
AllowlistEntry  discord_id, added_by?, added_at, source: env | admin
                -- Quelle der Wahrheit für den Zugang ist die DB (siehe 7.2)
Game            id (slug, z. B. "aion2"), pack_version, last_sync_at, last_sync_error?
GuildGame       guild_id, game_id, enabled (bool, Default false), region_id
                -- gilt pro Gilde und Spiel: aktiviert? welche Region? (siehe 4.4)
GameCatalogEntry  game_id, kind: class | race | profession | faction | reset_rule | boss,
                id, name (LocalizedString), data (JSON: role, color, faction, allowed_classes …),
                status: active | deprecated | removed, last_seen_pack_version, todo (bool)
                -- DB-Kopie der Pack-Kataloge, wird beim Sync gepflegt, nie gelöscht
Character       id, user_id, game_id, name, server?, faction_id?, race_id?, class_id?,
                spec?, level?, is_main (bool), notes?
                -- *_id sind Fremdschlüssel auf GameCatalogEntry, nicht direkt aufs Pack.
                -- So bleibt die DB konsistent, auch wenn ein Pack-Update etwas entfernt (6.5)
                -- server: Katalog-ID, falls das Pack `servers` listet, sonst normalisierter
                -- Freitext (siehe 4.6). Pflichtfelder: siehe 4.7
CharacterProfession  character_id, profession_id, skill_level?, specialization?, notes?
Build           id, character_id, title, url?, source? (auto aus Domain erkannt),
                status: current | planned, target_class_id?, notes?
                -- "planned" + target_class_id deckt "nächste Klasse planen" ab
ResetRule       Pack-Regeln liegen als GameCatalogEntry (kind reset_rule) vor;
                eigene Regeln für Custom-Aufgaben in CustomResetRule (gleiches Schema, 4.3)
TaskDefinition  siehe 4.2
TaskProgress    id, task_id, scope_key, period_key, value (int), data (JSON?),
                completed_at?, updated_at, updated_by
                -- UNIQUE (task_id, scope_key, period_key)
                -- für recurring, counter, lockout, one_time (period_key "once")
ResourceState   id, task_id, scope_key, value (int), value_at (Zeitpunkt), updated_by
                -- UNIQUE (task_id, scope_key); für regen und stacking (siehe 5.3)
RecipeEntry     character_profession_id, name, notes?  -- optional, Phase 3
SyncLog         id, game_id, started_at, finished_at,
                status: success | skipped | error,
                from_version?, to_version?,
                summary (JSON: added, changed, deprecated, removed,
                         migrations: [{kind, from, to, rows_rewritten, rows_merged}],
                         affected_characters: [{character_id, field, old_id}]),
                error?
                -- Verlauf aller Syncs. Game.last_sync_at/last_sync_error bleiben als
                -- schneller Status für Banner und Health-Check. Kein Aufräumen nötig.
AuditLog        id, actor_user_id, action, target, details (JSON), at
                -- Admin-Aktionen: Allowlist-Änderungen, Rollenwechsel, Deaktivieren,
                -- endgültiges Löschen, Backup-Downloads, Gilde umbenennen
```

**`scope_key`** bestimmt, wem ein Fortschritt gehört. Er wird aus dem `scope`
der Aufgabe gebildet und ist ein String, damit der UNIQUE-Index einfach bleibt:

| scope | scope_key | Bedeutung |
|---|---|---|
| `character` | `c:<character_id>` | gilt für genau einen Charakter |
| `server` | `s:<user_id>:<game_id>:<server>` | gilt für alle Charaktere eines Nutzers auf demselben Server (z. B. Duty-Missionen in AION 2, die nur einmal pro Server zählen) |
| `account` | `a:<user_id>:<game_id>` | gilt für alle Charaktere eines Nutzers in diesem Spiel |
| `user` | `u:<user_id>` | nur für spielübergreifende eigene Aufgaben (`game_id` leer) |

Hat ein Charakter bei einer `server`-Aufgabe keinen Server eingetragen, gilt
der Charakter als eigener Server (`s:<user_id>:<game_id>:c<character_id>`),
und der Editor weist auf das fehlende Feld hin.

### 4.2 Aufgabentypen (`TaskDefinition.kind`)

| kind | Bedeutung | Gespeichert in | Beispiel |
|---|---|---|---|
| `recurring` | einmal pro Periode abhaken | TaskProgress | Weekly-Quest |
| `counter` | Zähler pro Periode bis `cap`; ohne Reset-Regel = dauerhafter Fortschrittszähler | TaskProgress | „5 Duty-Missionen pro Tag“, „7/12 optionale Bosse“ |
| `lockout` | `recurring` mit optionaler Boss-Liste: Fortschritt innerhalb einer Raid-ID | TaskProgress (`data.killed`: Boss-IDs, `data.note`: freie Notiz, z. B. Instanz-Nr.) | Raid-ID 6/10 |
| `regen` | Ressource, die sich über Zeit auffüllt | ResourceState | „+15 Energie alle 3 h“ |
| `stacking` | Einträge kommen pro Periode dazu, bis zu einem Gesamt-Cap | ResourceState | „+2 Einträge/Tag, max. 14“ |
| `one_time` | einmalig, ohne Reset | TaskProgress (`period_key: "once"`) | Zugangsquest, Story-Kapitel |

**`lockout` vs. `recurring`:** Fachlich ist ein Lockout eine wiederkehrende
Aufgabe mit eigenem Rhythmus (z. B. 7 oder 3 Tage) **plus** Teilfortschritt.
Für die Raidplanung ist „frei / angefangen (6/10) / voll“ die entscheidende
Information, nicht nur erledigt ja/nein. Die Boss-Liste kommt aus dem Pack
(`bosses` an der Aufgabe). Ohne Boss-Liste verhält sich ein Lockout wie
`recurring`. Eine Instanz-ID wird nicht als eigenes Feld modelliert, sondern
höchstens als freie Notiz.

Felder von `TaskDefinition`:

```
id, game_id? (leer = spielübergreifend, nur für eigene Aufgaben),
source: pack | guild | private, owner_id?, title (LocalizedString), description?,
kind, category? (z. B. "PvE", "PvP", "Beruf"),
scope: character | server | account | user,
reset_rule_id?     -- Pack-Regel oder CustomResetRule; leer bei one_time und dauerhaftem counter
cap?, regen_amount?, regen_interval_minutes?, regen_alignment?: fixed | relative,
timezone?          -- nur regen: überschreibt die Region-TZ für die Takte (z. B. "UTC")
per_period_gain?, alert_at? (Default = cap), bosses? (Liste von Boss-IDs, nur lockout),
priority: high | medium | low, order, tags[], link? (Guide-URL), active (bool), todo (bool)
```

### 4.3 Reset-Regeln

```jsonc
{
  "id": "daily",
  "type": "daily",            // daily | weekly | every_n_days | monthly
  "time": "05:00",            // lokale Uhrzeit
  "timezone": null,           // optional; leer = Zeitzone der Region (4.4)
  "weekday": null,            // 1=Mo … 7=So, nur bei weekly
  "day_of_month": null,       // 1–28, nur bei monthly
  "n_days": null,             // nur bei every_n_days
  "anchor": null              // ISO-Datum des ersten Periodenbeginns, nur bei every_n_days
}
```

**Eigene Aufgaben** dürfen eine Pack-Regel des gewählten Spiels verwenden
**oder** eine eigene Regel mit demselben Schema anlegen (`CustomResetRule`,
gehört zur Aufgabe). Der Editor bietet Vorlagen („täglich“, „wöchentlich am …
um …“, „alle n Tage“). Spielübergreifende eigene Aufgaben (z. B. „Raid-Termin
eintragen“) haben kein Spiel, Scope `user` und immer eine eigene Regel in der
Zeitzone der Gilde (`Guild.default_timezone`).

### 4.4 Regionen

- Ein Pack definiert `regions` mit je einer IANA-Zeitzone.
- **Eine Region pro Gilde und Spiel** (`GuildGame.region_id`, Default: erste Region
  im Pack). Charaktere haben keine eigene Region; bei 10 Leuten auf einer
  Region ist mehr nicht nötig.
- Effektive Zeitzone einer Reset-Regel: `rule.timezone ?? region.timezone`.
  Damit lassen sich Spiele mit weltweit einheitlichem UTC-Reset (Regel-TZ gesetzt)
  und Spiele mit regionalem Reset (Regel-TZ leer) gleich abbilden.

### 4.5 Rassen & Fraktionsbeschränkungen

- Optional, über `capabilities.races` und `capabilities.factions`.
- Pack-Kataloge können Beschränkungen ausdrücken:
  - `classes[].factions`: erlaubte Fraktions-IDs (leer/fehlend = alle)
  - `races[].faction`: Fraktion der Rasse
  - `races[].allowed_classes`: erlaubte Klassen-IDs (leer/fehlend = alle)
- Der Charakter-Editor filtert die Auswahl entsprechend (Fraktion → Rasse → Klasse),
  und der Server prüft beim **Anlegen und Bearbeiten** dieselben Regeln.
- Beschränkungen werden **nie rückwirkend** erzwungen: Passt ein bestehender
  Charakter nach einem Pack-Update nicht mehr (z. B. Forever lockert oder ändert
  eine Kombination), bleibt er unverändert und bekommt einen Hinweis, wie in 6.5 (B).
- Für WoW Forever werden die Vanilla-Beschränkungen als Annahme mit `todo: true`
  eingetragen (Paladin nur Allianz, Schamane nur Horde), die neue Rasse ebenfalls
  als `todo`.

### 4.6 Server / Realms

Beide Startspiele kennen Server (in WoW „Realm“). Der Server steckt im `scope_key`
von `server`-Aufgaben, Schreibvarianten dürfen ihn also nicht aufspalten.

- Das Pack **kann** einen Katalog `servers: [{ id, name }]` mitbringen. Dann ist der
  Server im Editor ein Dropdown, gespeichert wird die Katalog-ID (Sync-Regeln wie
  bei allen Katalogen, 6.5).
- Ohne Katalog (Normalfall, solange die Serverlisten nicht feststehen) ist der
  Server **Freitext**, wird aber normalisiert gespeichert (getrimmt, Leerraum
  zusammengefasst, kleingeschrieben) und in der Originalschreibweise der ersten
  Eingabe angezeigt. Der Editor schlägt die in der Gilde für dieses Spiel bereits
  verwendeten Server vor.
- Die Bezeichnung in der UI kommt aus `server_label` im Pack (Default „Server“,
  für WoW Forever „Realm“).

### 4.7 Pflichtfelder am Charakter

Abhängig von den Capabilities des Spiels, geprüft **nur in der App-Validierung**
(Anlegen und Bearbeiten), nicht in der DB:

| Capability | Pflicht |
|---|---|
| `classes` | Klasse |
| `races` | Rasse; die Fraktion wird aus der Rasse abgeleitet und automatisch gesetzt |
| `factions` ohne `races` | Fraktion |
| `servers` | nichts; Server bleibt optional, mit Hinweis aus 7.7 |

Die Spalten bleiben nullable, weil sich die Capabilities je Spiel unterscheiden und
ein Pack-Update eine Capability später einschalten kann. Bestehende Charaktere
werden dadurch nicht ungültig, sondern bekommen wie in 6.5 (B) nur einen Hinweis
(„Klasse wählen“), ohne Blockieren.

---

## 5. Reset-Engine (Herzstück, zuerst und gut getestet bauen)

Reine Funktionen ohne DB-Zugriff in `src/lib/reset/`. Alle Berechnungen
erfolgen in der **effektiven Zeitzone der Regel** (4.4); die Anzeige rechnet
danach in die Zeitzone des Nutzers um.

### 5.1 Perioden

- `getPeriodStart(rule, tz, now): DateTime`: Beginn der aktuellen Periode
- `getNextReset(rule, tz, now): DateTime`
- `getPeriodKey(rule, tz, now): string`: **`<type>:<lokales Datum des Periodenbeginns>`**,
  z. B. `daily:2026-10-27`, `weekly:2026-10-28` (Weekly-Reset Mittwoch),
  `monthly:2026-10-01`, `every_n_days:2026-10-25`.
  **Keine ISO-Wochen**, da sie montags beginnen und bei anderen Reset-Tagen
  falsche Perioden ergeben.
- `isCompleted(task, progress, now)`: erledigt genau dann, wenn ein Eintrag mit
  `period_key === getPeriodKey(…)` existiert und
  - `recurring`/`one_time`: `completed_at` gesetzt
  - `counter`: `value >= cap`
  - `lockout`: abgehakt **oder** alle Bosse aus `bosses` in `data.killed`
- Eine Änderung der Reset-Regel (z. B. Uhrzeit) wirkt ab der nächsten berechneten
  Periode. Dass eine laufende Periode einmalig kürzer oder länger ist, wird akzeptiert.

### 5.2 Zeitumstellung

- **Lücke** (lokale Uhrzeit existiert nicht, z. B. 02:30 am letzten Sonntag im März
  in Europe/Berlin): Der Reset findet zum **ersten gültigen Zeitpunkt nach der
  Lücke** statt (03:00).
- **Doppelte Stunde** (z. B. 02:30 am letzten Sonntag im Oktober): Es gilt das
  **erste Auftreten**.
- `packs:validate` gibt eine **Warnung** (kein Fehler) aus, wenn eine Reset-Zeit
  in einer der Zeitzonen des Packs in eine Umstellungsstunde fallen kann.

### 5.3 Ressourcen (`regen`, `stacking`)

Das Spiel selbst kennt den echten Stand; die App kann ihn nur **hochrechnen**.
Deshalb wird nicht „verbraucht seit …“ gespeichert, sondern ein **Schnappschuss**:
`ResourceState.value` zum Zeitpunkt `value_at`.

- `projectRegen(task, tz, snapshot, now): number`
  - `regen_alignment: "fixed"` (Default): Auffüllung zu festen Takten, ausgerichtet
    an Mitternacht in der effektiven Zeitzone (`task.timezone ?? region.timezone`),
    also 00:00, 03:00, 06:00 … bei 180 min.
    - Die Takte zählen nach **lokaler Uhrzeit**, auch am Umstellungstag, nicht nach
      verstrichener Zeit. Das deckt sich mit dem, was Spieler auf der Uhr sehen.
    - Ein Takt in der **Lücke** findet zum ersten gültigen Zeitpunkt danach statt,
      ein Takt in der **doppelten Stunde** zählt nur einmal (erstes Auftreten), wie in 5.2.
    - Gezählt werden die Takte im Intervall **(`value_at`, `now`]**: Ein Takt genau bei
      `value_at` zählt nicht, einer genau bei `now` schon.
    - Taktet ein Spiel in UTC, setzt die Aufgabe im Pack `"timezone": "UTC"`.
  - `"relative"`: Auffüllung alle `regen_interval_minutes` ab `value_at`.
  - Ergebnis = `min(cap, value + Takte × regen_amount)`, nie negativ.
- `projectStacking(task, rule, tz, snapshot, now): number`
  - Ergebnis = `min(cap, value + Anzahl Periodenbeginne zwischen value_at und now × per_period_gain)`.
- Ohne Schnappschuss ist der Stand **unbekannt**. Es wird nichts geraten,
  auch nicht ab Anlage des Charakters.

**Bedienung:**
- **Stacking:** Ein Tap = **1 verbraucht** (neuer Schnappschuss: hochgerechneter
  Wert − 1, `value_at = now`). Langes Drücken bzw. Stift-Symbol = **exakten Wert
  eintragen** (Abgleich mit dem Spiel).
- **Regen:** Ein Tap öffnet ein Zahlenfeld „aktueller Stand“, vorausgefüllt mit
  dem hochgerechneten Wert. Verbräuche sind bei Energie-Systemen meist
  unterschiedlich groß, deshalb ist das Eintragen des Standes schneller als Minus-Schritte.
- Unbekannter Stand: Karte zeigt „Stand eintragen“.

**Dashboard-Status:** Ressourcen sind **nie „erledigt“**. Sie zählen nur dann als
**offen**, wenn der hochgerechnete Wert `>= alert_at` ist (Default `cap`), mit dem
Hinweis „läuft voll, verbrauchen!“ und der Zeit bis zum Cap. Darunter erscheinen sie
als Info-Zeile ohne Einfluss auf den Offen-Zähler. Unbekannte Stände erscheinen
als Info „Stand eintragen“.

### 5.4 Pflicht-Testfälle (Vitest)

- Reset genau um 05:00:00 und 04:59:59 (Grenzen)
- Zeitumstellung Sommer→Winter (25.10.2026) und Winter→Sommer (29.03.2026) mit Reset 05:00
- Reset-Zeit in der Lücke (02:30 am 29.03.2026 → 03:00) und in der doppelten Stunde (02:30 am 25.10.2026 → erstes Auftreten)
- Weekly-Reset am Mittwoch: Montag/Dienstag gehören zur Vorwoche (Key = Datum des vorherigen Mittwochs)
- Jahreswechsel: Weekly-Reset Mittwoch 30.12.2026 05:00 → 01.01.2027 hat Key `weekly:2026-12-30`
- `every_n_days` mit Anker in der Vergangenheit und in der Zukunft (Fehler)
- `monthly` am Monatsanfang und am 28.
- Effektive Zeitzone: Regel-TZ gesetzt vs. Region-TZ
- Nutzer in anderer Zeitzone als die Region (Anzeige lokal, Berechnung in Regel-TZ)
- Regen `fixed` und `relative`: Takte zählen, Deckelung am Cap, kein negativer Wert, Takt genau bei `value_at` (zählt nicht) und genau bei `now` (zählt)
- Regen `fixed` über die Zeitumstellung (Europe/Berlin, `regen_amount` 15, Intervall 120 min, cap 1000, Startwert 0):

  | Fall | `value_at` | `now` | Takte | Erwartet |
  |---|---|---|---|---|
  | Normaler Tag | 26.10.2026 23:00 | 27.10.2026 05:00 | 00:00, 02:00, 04:00 | 45 |
  | Herbst (doppelte Stunde) | 24.10.2026 23:00 | 25.10.2026 05:00 | 00:00, 02:00 (einmal), 04:00 | 45 (nach verstrichener Zeit wären es 60) |
  | Frühling (Lücke) | 28.03.2026 23:00 | 29.03.2026 05:00 | 00:00, 02:00 → 03:00, 04:00 | 45 |
- Stacking: mehrere Perioden übersprungen, Deckelung am Cap
- Scope-Keys: zwei Charaktere desselben Nutzers auf demselben Server teilen eine `server`-Aufgabe, auf verschiedenen Servern nicht

---

## 6. Game Packs & Erweiterbarkeit

### 6.1 Ort, Laden & Sprache

- `packs/<game-id>/pack.json`, validiert per Zod-Schema in `src/lib/packs/schema.ts`.
  Der Ordnername muss der `id` im Pack entsprechen.
- Der Loader lädt alle `packs/*/pack.json`, **außer Ordnern, die mit `_` beginnen**
  (z. B. `packs/_examples/`). Diese werden trotzdem von `packs:validate` geprüft.
  Der Pack-Ordner ist über `PACKS_DIR` konfigurierbar (für Tests).
- Packs werden **im Docker-Build validiert** und **beim Containerstart
  synchronisiert** (Details und Fehlerverhalten: 6.5).
- Neu hinzugekommene Spiele sind in der Gilde zunächst **deaktiviert**
  (`GuildGame.enabled = false`), bis ein Officer sie einschaltet.
- Packs sind Quelle der Wahrheit für Kataloge (Klassen, Rassen, Berufe,
  Fraktionen, Reset-Regeln, Bosse) und für `source: pack`-Aufgaben.
- `version` (SemVer). Bei Änderungen bleiben bestehende Progress-Einträge
  erhalten; entfernte Aufgaben werden `active: false`, nicht gelöscht.
- **Sprache:** Alle anzeigbaren Texte im Pack sind ein `LocalizedString`:
  entweder ein einfacher String (gilt als Deutsch) oder ein Objekt
  `{ "de": "Templer", "en": "Templar" }`. Die UI zeigt `de`, sonst `en`, sonst
  den ersten vorhandenen Wert. Englische Namen sind **optional, aber erwünscht**,
  weil die meisten Guides und Build-Seiten Englisch sind. Die Suche im Roster
  und im Berufe-Verzeichnis berücksichtigt alle Sprachen.

### 6.2 Schema

Pflichtfelder sind markiert, alle anderen sind optional mit dem genannten Default.

```jsonc
{
  "id": "aion2",                      // PFLICHT, slug, = Ordnername
  "name": "AION 2",                   // PFLICHT, LocalizedString
  "version": "0.1.0",                 // PFLICHT, SemVer
  "type": "mmo",                      // mmo | singleplayer | other; Default "mmo"
  "character_label": { "de": "Charakter", "en": "Character" },  // Default "Charakter"
  "server_label": "Server",           // Default "Server"; WoW Forever: "Realm" (4.6)
  "capabilities": {                   // jeder Schalter Default false, außer characters (true)
    "characters": true, "classes": true, "races": false, "professions": true,
    "builds": true, "resets": true, "lockouts": false, "factions": true,
    "servers": true, "guild_overview": true, "progress_tracking": true
  },
  "regions": [ { "id": "eu", "name": "Europa", "timezone": "Europe/Berlin" } ],
                                      // PFLICHT, wenn capabilities.resets = true
  "factions": [ { "id": "elyos", "name": "Elyos" }, { "id": "asmodian", "name": { "de": "Asmodier", "en": "Asmodian" } } ],
  "races": [ { "id": "...", "name": "...", "faction": "elyos", "allowed_classes": ["..."] } ],
  "classes": [ {
      "id": "gladiator", "name": "Gladiator",
      "role": "tank",                 // tank | heal | melee | ranged | dps | support; entfällt bei specs
      "color": "#c79c6e",
      "factions": [],                 // leer = alle Fraktionen
      "deprecated": false,            // noch gültig, aber nicht mehr auswählbar
      "replaces": []                  // alte IDs, die auf diese ID migriert werden
  } ],
  "specs": [ { "id": "paladin-heilig", "name": "Heilig", "class": "paladin", "role": "heal" } ],
                                      // optional; gibt es Specs, bestimmt die Spec die Rolle, nicht die Klasse
  "professions": [ { "id": "...", "name": "...", "kind": "primary", "requests": "recipes" } ],
                                      // kind: primary | secondary | gathering; requests: recipes | free (Crafting-Anträge)
  "recipes": [ { "id": "alchemy-2330", "name": { "de": "...", "en": "..." }, "profession": "alchemy",
                 "skill": 1, "reagents": [ { "name": "...", "count": 1 } ], "link": "https://..." } ],
                                      // optional; Charaktere wählen Rezepte daraus, Freitext bleibt möglich
  "instances": [ { "id": "deadmines", "name": "Deadmines", "kind": "dungeon", "players": 5, "level_min": 17, "level_max": 26,
                   "bosses": [ "..." ], "loot": [ { "name": "...", "reason": "..." } ] } ],
                                      // optional; Vorlage für neue Dungeon-Seiten (Name, Bosse, wichtige Beute)
  "credits": [ { "label": "Data from ForeverDB.net", "url": "https://foreverdb.net" } ],
                                      // Quellenangabe, wird überall angezeigt, wo diese Daten erscheinen
  "bosses": [ { "id": "...", "name": "..." } ],   // für lockout-Aufgaben
  "servers": [ { "id": "...", "name": "..." } ],  // optional, sonst Freitext (4.6)
  "build_sources": [ { "domain": "metabot.gg", "label": "MetaBot" } ],
  "reset_rules": [ /* siehe 4.3 */ ],
  "tasks": [ /* TaskDefinition ohne DB-Felder, siehe 4.2 */ ]
}
```

Gemeinsame optionale Felder **aller** Katalogeinträge, Reset-Regeln und Aufgaben:
`deprecated` (Default false), `replaces` (Default []), `todo` (Default false).
`todo: true` bedeutet „Annahme, noch nicht im Spiel geprüft“. Die UI zeigt
dafür ein kleines Badge „ungeprüft“, und der Admin-Bereich listet alle offenen
`todo`-Einträge je Pack.

### 6.3 Startdaten (⚠ alle Werte nach Launch im Spiel prüfen)

**AION 2** (`packs/aion2/pack.json`)
- Klassen (8): Gladiator, Templer, Assassine, Jäger, Zauberer, Beschwörer,
  Kleriker, Kantor, mit `en`-Namen; diese als `todo` markieren, bis sie gegen die
  globale Version geprüft sind.
- Bekannte Aufgaben (laut Guides, Stand Okt. 2026):
  - Duty-Missionen: `counter`, cap 5, daily, scope `server`
  - Odyle-Energie: `regen`, +15 alle 180 min, `regen_alignment: fixed` (`todo`), scope `character`
  - Nightmare: `stacking`, +2/Tag, cap 14, scope `character`
  - Daily Dungeons, Ascension Trial, Weekly-Quests PvE/PvP: `recurring`
- **Keine Berufe:** AION 2 hat keine klassischen Herstellungsberufe, daher `capabilities.professions: false` (ab Pack-Version 0.2.0).
- Reset-Uhrzeit: als `todo` anlegen und im Spiel prüfen.

**WoW: Forever** (`packs/wow-forever/pack.json`)
- `capabilities.races: true`, `factions: true`, `lockouts: true`, `servers: true`
  mit `server_label: "Realm"` (Realm-Liste als Katalog, sobald bekannt; bis dahin Freitext, 4.6).
- Annahme Vanilla-Basis: Krieger, Paladin, Jäger, Schurke, Priester,
  Schamane, Magier, Hexenmeister, Druide, dazu die Vanilla-Rassen mit
  Fraktion und erlaubten Klassen sowie die neue Forever-Rasse **Himmelsgeborene**
  (ID `himmelsgeborene`; Fraktion und erlaubte Klassen noch offen, daher vorerst ohne
  Einschränkung). Alles als `todo`, bis es ab Launch geprüft ist (siehe 4.5).
- Berufe (Annahme Vanilla): Alchemie, Schmiedekunst, Verzauberkunst,
  Ingenieurskunst, Kräuterkunde, Lederverarbeitung, Bergbau, Kürschnerei,
  Schneiderei; sekundär: Kochkunst, Erste Hilfe, Angeln.
- Raids als `lockout`-Aufgaben mit Boss-Listen und Reset-Rhythmen: **TODO ab Launch (04.11.)**
- `build_sources`: Talentrechner-Domains (z. B. Wowhead), sobald es
  Forever-Rechner gibt.

### 6.4 Singleplayer-Spiele

Gleiche Struktur, andere `capabilities`. Das Beispiel liegt unter
`packs/_examples/beispiel-rpg/pack.json` und wird daher in Produktion nicht geladen:

```jsonc
{
  "id": "beispiel-rpg",
  "name": "Beispiel-RPG",
  "version": "0.1.0",
  "type": "singleplayer",
  "character_label": { "de": "Durchlauf", "en": "Playthrough" },
  "capabilities": {
    "characters": true, "classes": true, "builds": true,
    "guild_overview": true,          // "Wer spielt das gerade, wie weit ist wer?"
    "progress_tracking": true
  },
  "classes": [ { "id": "krieger", "name": "Krieger", "role": "dps" } ],
  "tasks": [
    { "id": "act1", "kind": "one_time", "title": "Akt 1 abgeschlossen", "category": "Story", "scope": "character" },
    { "id": "optional-bosses", "kind": "counter", "cap": 12, "title": "Optionale Bosse", "category": "Sammeln", "scope": "character" }
  ]
}
```

Anforderungen dafür:
- `counter` **ohne** `reset_rule_id` = dauerhafter Fortschrittszähler (`period_key: "once"`).
- Ein „Charakter“ kann bei Singleplayer ein **Spielstand/Durchlauf** sein
  (`character_label`).
- Gildenansicht zeigt dann Fortschritt statt Erledigt-Status.

**Akzeptanztest für Erweiterbarkeit:** Ein Test lädt Packs aus
`test/fixtures/packs/` (über `PACKS_DIR`), die eine Kopie des Beispiel-Packs als
normales Pack enthalten. Das Spiel lässt sich aktivieren, Charaktere anlegen und
Fortschritt tracken, **ohne eine Zeile außerhalb von `packs/` bzw. der Fixtures
zu ändern**.

### 6.5 Validierung, Sync & Pack-Updates

Es gibt zwei verschiedene Fehlerarten, die unterschiedlich behandelt werden:
**(A) ein Pack ist in sich ungültig** und **(B) ein gültiges Pack passt nicht
mehr zu Daten, die schon in der DB stehen.**

**Grundsatz:** Ein fehlerhaftes Pack darf **nie die ganze App offline nehmen**
und **nie Nutzerdaten löschen oder verändern**, außer durch eine ausdrücklich
deklarierte Migration (`replaces`).

#### (A) Ungültiges Pack

Prüfungen in `src/lib/packs/validate.ts` (wird von CLI, Build und Sync gemeinsam genutzt):
- Zod-Schema (Pflichtfelder, Typen, erlaubte Enum-Werte)
- Eindeutige IDs je Katalog und bei Aufgaben
- Interne Verweise: `tasks[].reset_rule_id` → `reset_rules`, `tasks[].bosses` → `bosses`, `races[].faction` und `classes[].factions` → `factions`, `races[].allowed_classes` → `classes`; `replaces` zeigt nicht auf eine aktive ID im selben Pack
- Capabilities-Konsistenz:
  - Kataloge nur bei aktiver Capability: `races`, `professions`, `factions`, `servers`, `bosses` (an `lockouts` gekoppelt)
  - `regions` ist Pflicht, sobald eine Zeitzone gebraucht wird: bei `resets: true` oder wenn es eine `regen`-Aufgabe mit `fixed` gibt
  - `scope: server` nur bei `capabilities.servers`, `kind: lockout` nur bei `capabilities.lockouts`
  - Pack-Aufgaben haben nie `scope: user`
- Typ-Konsistenz:
  - `recurring`, `lockout` und `stacking` brauchen eine `reset_rule_id` (ohne wäre es `one_time`); `one_time` hat keine
  - `counter` braucht `cap`; `stacking` braucht `cap` und `per_period_gain`; `regen` braucht `cap`, `regen_amount` und `regen_interval_minutes`
  - `alert_at <= cap`
  - Typspezifische Felder nur beim passenden Typ: `bosses` nur bei `lockout`, `regen_*` und `timezone` nur bei `regen`, `per_period_gain` nur bei `stacking`
- `replaces` bei Aufgaben: alte und neue Aufgabe haben dasselbe `kind` und denselben `scope` (sonst neue ID ohne `replaces`, siehe (B))
- Gültige IANA-Zeitzonen und Uhrzeiten; Warnung (kein Fehler) bei Reset-Zeiten in Umstellungsstunden (5.2)
- Ordnername = `id`

Wo geprüft wird und was passiert:

| Stelle | Verhalten bei Fehler |
|---|---|
| `npm run packs:validate` (lokal / vor Commit) | Fehlerliste mit Datei, JSON-Pfad, Grund; Exit-Code 1 |
| `docker compose build` (eigener Schritt im Dockerfile) | **Build schlägt fehl.** Das neue Image entsteht nicht, der laufende Container bleibt unverändert online. Das ist die Hauptsicherung. |
| Sync beim Containerstart | **Nur dieses Pack überspringen.** Der zuletzt erfolgreich synchronisierte Stand in der DB bleibt aktiv (keine Teiländerungen, Sync läuft pro Pack in **einer** Transaktion). Fehler ins Log, Banner im Admin-Bereich, `/api/health` meldet `{"status":"degraded","packs":{"aion2":"error"}}` mit **HTTP 200** (nur der Pack-Name; die Fehlerdetails stehen im Log und im Admin-Bereich, da der Endpunkt öffentlich ist), damit Docker den Container nicht in eine Neustart-Schleife schickt. Die App startet auch dann, wenn alle Packs fehlschlagen. |

Ein Pack, das noch nie erfolgreich synchronisiert wurde und ungültig ist,
erscheint einfach nicht als Spiel (Hinweis im Admin-Banner).

#### (B) Pack-Update passt nicht zu bestehenden Daten

Fall: Ein gültiges Pack entfernt oder ändert etwas, auf das Nutzerdaten verweisen
(Klasse eines Charakters, Beruf, Fraktion, Aufgabe mit Fortschritt).

Regeln für Pack-Autoren (in die README):
- **IDs sind stabil und werden nie wiederverwendet.** Umbenennen = `name` ändern, nicht `id`.
- Statt löschen: `"deprecated": true`. Der Eintrag bleibt gültig, ist aber bei neuen Charakteren nicht mehr auswählbar.
- Echte Umbenennung oder Zusammenlegung: neue ID mit `"replaces": ["alte-id"]`.
- Semantische Änderung einer Aufgabe (z. B. `kind` von `recurring` zu `counter`) = neue Aufgaben-ID, die alte wird entfernt.

Verhalten des Syncs:

| Änderung im Pack | Ergebnis in der DB |
|---|---|
| Eintrag neu | `GameCatalogEntry` mit `status: active` |
| Name/Farbe/Rolle geändert | wird aktualisiert, Verweise bleiben |
| `deprecated: true` | `status: deprecated`, bestehende Charaktere unverändert, im Editor nicht mehr wählbar |
| `replaces: ["alt"]` | alle Verweise auf `alt` werden in derselben Transaktion auf die neue ID umgeschrieben, `alt` wird `removed`; Eintrag im `SyncLog` |
| Eintrag fehlt einfach | `status: removed`, **Verweise bleiben bestehen**. UI zeigt den letzten bekannten Namen mit Badge „nicht mehr im Pack“; Roster-Filter fasst solche Einträge unter „Veraltet“ zusammen; der Besitzer sieht im Charakter-Editor einen Hinweis, eine neue Klasse zu wählen |
| Aufgabe fehlt | `active: false`, Fortschritt bleibt erhalten, Aufgabe verschwindet aus Dashboard und Matrix |
| Aufgabe mit `replaces: ["alt"]` | `TaskProgress.task_id` und `ResourceState.task_id` werden in derselben Transaktion von `alt` auf die neue ID umgeschrieben, `alt` wird `active: false`. Kollisionen (beide IDs haben einen Eintrag mit gleichem `scope_key` und `period_key`) werden **zusammengeführt**: bei `TaskProgress` `completed_at` = frühester gesetzter Wert, `value` = Maximum, `data.killed` = Vereinigung; bei `ResourceState` gewinnt der Schnappschuss mit dem neueren `value_at`. Anzahl umgeschriebener und zusammengeführter Einträge im `SyncLog` |
| `kind` einer bestehenden Aufgaben-ID geändert | gilt als Fehler (A) für **dieses Pack**: Sync wird übersprungen, alter Stand bleibt, Fehlermeldung nennt die Aufgabe |
| Reset-Regel geändert (z. B. Uhrzeit) | wirkt ab der nächsten berechneten Periode; dass eine laufende Periode einmalig kürzer oder länger ist, wird akzeptiert |

Nach jedem Sync zeigt der Admin-Bereich eine Zusammenfassung aus dem `SyncLog`: Pack-Version
alt → neu, Anzahl neuer, geänderter, veralteter und entfernter Einträge sowie
**betroffene Charaktere** (z. B. „2 Charaktere nutzen eine entfernte Klasse“).

**Tests (Vitest):** Validierung je Fehlerfall aus (A); Sync-Szenarien aus der
Tabelle (B) gegen eine In-Memory-SQLite, inkl. Aufgaben-`replaces` mit Kollision
(Zusammenführen von `TaskProgress` und `ResourceState`); Transaktions-Rollback bei
Fehler mitten im Sync.

---

## 7. Ansichten / Features

1. **Login** über Discord, nur für freigeschaltete Personen (Details 7.2).
   Nicht zugelassene Logins sehen eine freundliche „Kein Zugang“-Seite.
2. **Spiel-Umschalter** global (Header). Zeigt nur aktivierte Spiele
   (`GuildGame.enabled`). Alle Ansichten filtern danach; „Alle Spiele“ ist für
   Dashboard und Roster möglich.
3. **Dashboard „Heute“** (persönlich): offene Aufgaben aller eigenen Charaktere,
   gruppiert nach Spiel → Charakter, Countdown bis zum nächsten Reset,
   erledigte Aufgaben einklappbar.
   - `recurring`/`one_time`: Tap = erledigt (nochmal Tap = rückgängig)
   - `counter`: Tap = +1, langes Drücken = −1
   - `lockout`: Tap öffnet Boss-Liste zum Abhaken; ohne Boss-Liste wie `recurring`
   - `regen`/`stacking`: wie in 5.3 beschrieben
   - `server`- und `account`-Aufgaben erscheinen **einmal** pro Server bzw. Spiel
     (oberhalb der Charaktere dieser Gruppe), nicht bei jedem Charakter
   - Spielübergreifende eigene Aufgaben erscheinen immer oben im Block „Allgemein“,
     unabhängig vom Spiel-Filter
4. **Roster** (Gilde): Tabelle bzw. Karten pro Mitglied mit Charakteren, Klasse
   (farbig), Rasse/Fraktion (falls im Pack), Rolle, Berufen, aktuellem Build (Link)
   und geplanter nächster Klasse. Filter: Spiel, Klasse, Rolle, Beruf, Fraktion.
   Zusätzlich eine Zusammenfassung der Klassen- und Rollenverteilung (wichtig für
   die Raidplanung). Deaktivierte Mitglieder sind standardmäßig ausgeblendet
   (Schalter „Ehemalige anzeigen“).
5. **Gilden-Matrix:** Zeilen = Aufgaben (Kategorien filterbar), Spalten je nach Modus:
   - **Pro Mitglied** (Standard, passt auch aufs Handy): `character`-Aufgaben als
     Zusammenfassung „2/3 Charaktere“, aufklappbar; `server`-/`account`-Aufgaben
     direkt (bei mehreren Servern eines Mitglieds ebenfalls als „x/y“).
   - **Pro Charakter:** jede Spalte ein Charakter; `server`-/`account`-Aufgaben
     zeigen den gemeinsamen Wert mit Verknüpfungs-Symbol.
   - Ressourcen (`regen`/`stacking`) erscheinen nur, wenn ein Stand bekannt ist,
     als hochgerechneter Wert. `lockout` zeigt „frei / 6/10 / voll“.
   - Private Aufgaben anderer Mitglieder erscheinen nie.
   - Auf dem Handy horizontal scrollbar mit fixierter Aufgaben-Spalte.
6. **Berufe-Verzeichnis:** „Wer kann X?“ mit Suche nach Beruf und (ab Phase 3)
   Rezeptnotizen.
7. **Charakter-Editor:** Fraktion → Rasse → Klasse als abhängige Dropdowns (4.5),
   Pflichtfelder nach 4.7, Berufe aus dem Pack, Server als Dropdown oder Freitext mit
   Vorschlägen (4.6; Hinweis, wenn er fehlt und das Spiel `server`-Aufgaben hat),
   Builds als Links mit automatisch erkannter Quelle, Status current/planned.
   Veraltete oder entfernte Einträge werden mit Hinweis angezeigt (6.5).
8. **Eigene Aufgaben:** privat oder (Officer) gildenweit, alle Typen aus 4.2,
   mit Pack-Reset-Regel oder eigener Regel (4.3), optional spielübergreifend.
9. **Admin:** siehe 7.2 und 8 (Mitglieder, Rollen, Allowlist), außerdem Gilde
   umbenennen, Spiele aktivieren und Region wählen, Pack-Version und Sync-Verlauf
   (`SyncLog`), offene `todo`-Einträge je Pack, Audit-Log der Admin-Aktionen
   (`AuditLog`, für officer/owner lesbar), Datenbank-Backup herunterladen (11.4).

### 7.1 PWA-Anforderungen

- Manifest mit Name, Icons (192/512 + maskable), `display: standalone`,
  Theme-Farbe; installierbar auf Android und iOS (Homescreen).
- Service Worker cacht die **App-Shell** und statische Assets. Daten werden
  immer frisch geladen (network-first) und zeigen bei fehlender Verbindung
  den zuletzt bekannten Stand mit Hinweis „offline“.
- Abhaken ist **optimistisch** (UI sofort aktualisieren, bei Fehler
  zurückrollen und Hinweis zeigen). Keine Offline-Schreibwarteschlange in v1.
- Bei neuem Deployment: Hinweis „Neue Version verfügbar, neu laden“ statt
  stillem Austausch.
- HTTPS ist Voraussetzung (PWA und Discord-OAuth), das liefert der
  vorhandene Reverse Proxy.
- **Push-Benachrichtigungen** (Reset-Erinnerungen) erst in Phase 5, per Web Push
  mit VAPID. Hinweis für die Doku: Auf iOS funktioniert Web Push nur, wenn die
  PWA auf dem Homescreen installiert ist.

### 7.2 Zugang & Allowlist

- **Quelle der Wahrheit ist die DB** (`AllowlistEntry`). Die ENV-Variablen sind nur
  ein Startwert und eine Notfall-Sicherung:
  - Bei **jedem Start** werden alle IDs aus `ALLOWED_DISCORD_IDS` **hinzugefügt**,
    falls noch nicht vorhanden (`source: env`). Entfernen über ENV passiert **nie**;
    eine ID aus der ENV zu löschen ändert also nichts.
  - `OWNER_DISCORD_ID` wird bei jedem Start sichergestellt: in der Allowlist,
    Status `active`, Rolle `owner`. Das ist der Rettungsweg, falls sich alle Owner
    ausgesperrt haben.
- **Entfernen einer Person** (Admin-UI): Allowlist-Eintrag löschen,
  `GuildMember.status = disabled`, **alle Sessions der Person sofort löschen**
  (Auth.js mit DB-Sessions, daher wirksam beim nächsten Request).
  Steht die ID noch in `ALLOWED_DISCORD_IDS`, warnt die UI, dass sie beim nächsten
  Start wieder hinzugefügt wird.
- **Daten bleiben erhalten:** Charaktere, Builds und Fortschritt einer deaktivierten
  Person bleiben gespeichert, werden aber im Roster und in der Matrix standardmäßig
  ausgeblendet. Wird die Person wieder freigeschaltet, ist alles wieder da.
- **Endgültig löschen:** Nur ein Owner kann die Daten einer deaktivierten Person
  komplett löschen (mit Bestätigung durch Eingabe des Namens).

---

## 8. Berechtigungen (serverseitig im App-Code)

Ohne Datenbank-RLS müssen **alle** Schreib- und Lesezugriffe über eine zentrale
Autorisierungsschicht laufen (`src/lib/auth/guards.ts`), nie direkt aus
Komponenten. Server Actions und API-Routen prüfen immer Session + Berechtigung.

**Rollen (owner > officer > member), mehrere Owner sind erlaubt:**

| Aktion | member | officer | owner |
|---|---|---|---|
| Gildendaten sehen (Roster, Matrix, Berufe) | ✓ | ✓ | ✓ |
| Eigene Charaktere, Builds, Fortschritt, private Aufgaben | ✓ | ✓ | ✓ |
| Gildenweite Aufgaben anlegen/ändern | | ✓ | ✓ |
| Spiele aktivieren, Region wählen | | ✓ | ✓ |
| Mitglieder freischalten (Allowlist hinzufügen) | | ✓ | ✓ |
| **member** deaktivieren | | ✓ | ✓ |
| Officer/Owner deaktivieren | | | ✓ |
| Rollen ändern (inkl. Owner ernennen/entziehen) | | | ✓ |
| Backup herunterladen, Daten endgültig löschen | | | ✓ |

- Ein Officer kann **keine** Rollen vergeben und niemanden mit gleicher oder höherer
  Rolle deaktivieren.
- Der **letzte aktive Owner** kann weder herabgestuft noch deaktiviert werden
  (auch nicht durch sich selbst).
- Fremde Charaktere, Builds und Fortschritt kann niemand bearbeiten, auch kein Owner.
- Private Custom-Aufgaben sieht nur der Ersteller.
- Tests für die Guards (mindestens: fremden Progress ändern schlägt fehl,
  Nicht-Officer kann keine gildenweite Aufgabe anlegen, Officer kann keine Rollen
  ändern, letzter Owner kann nicht herabgestuft werden, Nutzer außerhalb der
  Allowlist bekommt keine Session, Entfernen löscht bestehende Sessions sofort).

---

## 9. Nicht-Ziele (bewusst weggelassen)

- Eigene Talent- oder Skillrechner, Item-Datenbanken, interaktive Karten
- Scraping fremder Seiten
- Automatisches Auslesen des Spielstands (Ausnahme: späterer optionaler
  API-Adapter, siehe Phase 5)
- Monetarisierung, öffentliche Registrierung, mehrere Gilden-Features über das Datenmodell hinaus

---

## 10. Phasen & Akzeptanzkriterien

### Phase 0: Setup & Deployment-Grundgerüst
- Next.js + TS strict + Tailwind + Drizzle/SQLite + Auth.js + Vitest + ESLint/Prettier
- Dockerfile + docker-compose.yml (Abschnitt 11), `.env.example`, README mit
  lokalem Start **und** Deployment auf den vServer
- PWA-Grundgerüst: Manifest, Icons (Platzhalter), Service Worker
- `/api/health` liefert 200 inkl. DB-Check
- ✅ `npm run dev`, `npm test`, `npm run lint` laufen ohne Fehler
- ✅ `docker compose up -d --build` startet die App, Migrationen laufen automatisch, Daten überleben einen Neustart des Containers
- ✅ Über HTTPS (Reverse Proxy) als PWA auf dem Handy installierbar

### Phase 1: Roster (Ziel: vor dem WoW-Forever-Launch am 04.11.)
- Discord-Login mit Allowlist (7.2), Owner-Bootstrap, Rollen und Rechte (8)
- `GuildGame`: Spiele aktivieren, Region wählen
- Pack-Loader + Zod-Schema + beide Start-Packs (Klassen, Berufe; Tasks dürfen leer sein)
- Charakter-Editor, Builds (Links, current/planned), Roster-Ansicht mit Filtern + Rollenverteilung
- ✅ Zwei Testnutzer legen Charaktere in beiden Spielen an und sehen sich gegenseitig im Roster
- ✅ `npm run packs:validate` meldet ungültige Packs mit Datei, JSON-Pfad und Grund und
  endet mit Exit-Code ≠ 0. Testfälle: Schemaverstoß, doppelte IDs, Aufgabe mit
  unbekannter `reset_rule_id`, `counter` ohne `cap`. Ein solches Pack lässt den
  Docker-Build scheitern, der laufende Container bleibt unverändert online.
- ✅ Ist zur Laufzeit trotzdem ein Pack ungültig, wird nur dieses Pack übersprungen:
  Der letzte gültige Stand bleibt aktiv, der Fehler steht im Log und als Banner im
  Admin-Bereich, `/api/health` meldet `degraded` (weiterhin HTTP 200).
- ✅ Ein Pack-Update entfernt eine Klasse, die ein Charakter nutzt: Der Charakter
  behält sie, sie wird als „nicht mehr im Pack“ markiert, es gehen keine Daten
  verloren. Mit `replaces` wird der Charakter automatisch auf die neue ID migriert.

### Phase 2: Reset-Engine & persönliche Checkliste
- `src/lib/reset/` mit allen Pflicht-Testfällen aus Abschnitt 5
- Alle Aufgabentypen aus 4.2 inkl. Ressourcen-Hochrechnung (5.3) und Scope-Keys (4.1)
- Dashboard „Heute“, eigene Aufgaben mit eigenen Reset-Regeln und spielübergreifend
- Checklisten für Dungeon-Runs
- Farmspots für Berufe, mit Karte, wenn möglich. Mitglieder pflegen sie in der App,
  nicht im Game Pack
- To-do-Listen: einmalige Aufgaben ohne Reset, privat oder für die Gilde
- ✅ Alle Reset-Tests grün; Abhaken ist mobil mit einem Tap möglich; nach einem simulierten Reset ist die Aufgabe wieder offen

### Phase 3: Gildenfunktionen
- Gilden-Matrix, Berufe-Verzeichnis mit Rezeptnotizen, gildenweite Custom-Aufgaben
- Anträge für Berufs- und Crafting-Items: Jedes Mitglied kann einen Antrag stellen,
  annehmen kann ihn nur, wer den Beruf hat. Status: offen → angenommen → erledigt
- Je Klasse anzeigen, welche Stats in welcher Rangfolge wichtig sind. Officers pflegen
  sie in der App, nicht im Game Pack
- ✅ Officer legt eine gildenweite Aufgabe an, alle Mitglieder sehen sie in Dashboard + Matrix (gemeinsam abgehakt, siehe Umsetzungsnotizen Phase 3)

### Phase 4: Erweiterbarkeit beweisen
- Beispiel-Singleplayer-Pack aus 6.4 unter `packs/_examples/` und als Kopie in `test/fixtures/packs/`
- ✅ Akzeptanztest aus 6.4 grün, ohne Codeänderungen außerhalb von `packs/` bzw. Fixtures (sonst: Code generalisieren, bis das gilt) (erfüllt, siehe Umsetzungsnotizen Phase 4)

### Phase 5: Optional / später
- Web-Push-Benachrichtigungen: Reset-Erinnerungen, „Raid heute Abend“ (pro Nutzer abschaltbar)
- Discord-Bot (eigener Container im selben compose): Reset-Erinnerungen, `/done <aufgabe>`, Wochenübersicht im Gildenkanal
- Raidplanung: Termine, Anmeldungen, Rollen-Check gegen Roster
- API-Adapter-Interface (`src/lib/adapters/`) für offizielle APIs, falls verfügbar
  (z. B. Battle.net). Nur offizielle APIs, nur mit Zustimmung des Nutzers.

---

## 11. Deployment auf dem vServer

### 11.1 Container

- **Ein** Service `guildhub` (Next.js standalone). Basis-Image: aktuelle Node-LTS als
  **Debian `-slim`-Variante, Version gepinnt**, kein Alpine (`better-sqlite3` ist ein
  natives Modul und macht unter musl Probleme).
- Multi-Stage-Dockerfile: deps → build → runtime. Läuft als Non-Root-User `node`
  (UID/GID 1000).
- Im Build: `packs:validate` als eigener Schritt (bricht den Build bei Fehlern ab).
- Beim Start: Migrationen ausführen, Packs synchronisieren (Fehler pro Pack nicht fatal, siehe 6.5), dann Server starten.
- SQLite-Datei in einem **benannten Volume** (`/data/guildhub.db`), niemals im Image.
- `HEALTHCHECK` auf `/api/health` per `node -e "fetch(…)"`, da das `-slim`-Image kein `curl` enthält.
- Kein eigener Reverse Proxy und keine eigene TLS-Konfiguration: TLS und
  Routing übernimmt das vorhandene **SWAG** (siehe 11.2). Port 3000 nur im
  Docker-Netzwerk, **kein** `ports:`-Mapping nach außen.
- Fester `container_name: guildhub`, weil SWAG den Upstream über den
  Containernamen per Docker-DNS auflöst.

```yaml
# docker-compose.yml
services:
  guildhub:
    build: .
    container_name: guildhub
    restart: unless-stopped
    env_file: .env
    volumes:
      - guildhub-data:/data
      - ./backups:/backups
    networks: [proxy]
volumes:
  guildhub-data:
networks:
  proxy:
    external: true
    name: ${SWAG_NETWORK:-swag}  # Netzwerk, in dem der SWAG-Container hängt (aus .env)
```

### 11.2 SWAG (nginx) einbinden

SWAG-Proxy-Konfiguration im Repo unter `deploy/swag/guildhub.subdomain.conf`
mitliefern. Sie wird auf dem Server nach
`<swag-config>/nginx/proxy-confs/guildhub.subdomain.conf` kopiert, danach
`docker restart swag`. Aufbau analog zu den mitgelieferten
`*.subdomain.conf.sample`-Dateien von SWAG:

```nginx
## guildhub.subdomain.conf
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name guildhub.*;             # Subdomain guildhub, ggf. anpassen

    include /config/nginx/ssl.conf;

    client_max_body_size 10m;

    location / {
        include /config/nginx/proxy.conf;     # setzt u. a. X-Forwarded-Proto/-Host, WebSocket-Header
        include /config/nginx/resolver.conf;  # Docker-DNS, damit $upstream_app aufgelöst wird
        set $upstream_app guildhub;
        set $upstream_port 3000;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }

    # Service Worker und Manifest nie lange cachen, sonst kommen PWA-Updates nicht an
    location ~ ^/(serwist/sw\.js|manifest\.webmanifest)$ {
        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app guildhub;
        set $upstream_port 3000;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
        proxy_hide_header Cache-Control;   # Next liefert sw.js mit langer s-maxage aus
        add_header Cache-Control "no-cache" always;
    }
}
```

Checkliste für die README:
- Subdomain muss vom SWAG-Zertifikat abgedeckt sein: entweder in der
  SWAG-Variable `SUBDOMAINS` ergänzen (dann SWAG neu erstellen, damit das
  Zertifikat erweitert wird) oder per Wildcard-Zertifikat (DNS-Validierung)
  bereits abgedeckt. DNS-Eintrag der Subdomain auf den vServer zeigen lassen.
- **Kein** Authelia/Authentik-Include in dieser Conf, die App hat ihren eigenen Login.
- Auth.js hinter Proxy: `AUTH_TRUST_HOST=true` setzen, damit die Callback-URL
  aus den Forwarded-Headern korrekt gebaut wird.
- Test nach Einrichtung: `https://<subdomain>/api/health` liefert 200, und
  Discord-Login landet nach dem Callback wieder auf der App.

### 11.3 Umgebungsvariablen (`.env.example`)

```
AUTH_URL=https://guildhub.example.de      # öffentliche URL; von Auth.js gelesen und
                                        # auch von der App für absolute URLs genutzt (kein APP_URL)
AUTH_SECRET=                            # openssl rand -base64 32
AUTH_TRUST_HOST=true                    # nötig hinter SWAG
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
OWNER_DISCORD_ID=
ALLOWED_DISCORD_IDS=                    # kommagetrennt
DATABASE_PATH=/data/guildhub.db
GUILD_NAME=                             # nur beim ersten Start genutzt, danach im Admin-Bereich änderbar
DEFAULT_TIMEZONE=Europe/Berlin          # Guild.default_timezone beim ersten Start
SWAG_NETWORK=                           # nur docker-compose: Netzwerk des SWAG-Containers
# Phase 5:
# VAPID_PUBLIC_KEY= / VAPID_PRIVATE_KEY= / VAPID_SUBJECT=mailto:...
```

### 11.4 Backups & Updates

- **Server-Backup (vollständig):** `scripts/backup.mjs` nutzt die Online-Backup-API
  von `better-sqlite3` (`db.backup()`), nicht einfaches Kopieren, während die App
  schreibt. Aufruf per Host-Cron:
  `docker compose exec -T guildhub node scripts/backup.mjs`.
  Ziel: `/backups/guildhub-YYYY-MM-DD.db` (Host: `./backups`), die letzten 14 behalten.
  Kein Shell-Script.
- `./backups` muss für UID 1000 beschreibbar sein. README:
  `mkdir -p backups && sudo chown 1000:1000 backups`. Das Script prüft die
  Schreibrechte und bricht mit klarer Meldung ab.
- **Download im Admin-Bereich (nur Owner):** Erst Online-Backup in eine temporäre
  Datei, dann darin **Sessions und Verifikations-Tokens löschen**, danach `VACUUM`
  und ausliefern. Discord-OAuth-Tokens werden grundsätzlich **nicht gespeichert**
  (Auth.js-Account-Felder `access_token`, `refresh_token`, `id_token` beim
  Verknüpfen leeren), da nur die Discord-Identität gebraucht wird. Ein Restore aus
  dem Download meldet alle ab; das ist gewollt.
- Restore-Anleitung in der README (Container stoppen, Datei ersetzen, starten).
- Update-Ablauf in der README: `git pull && docker compose up -d --build`.

### 11.5 Projektstruktur (Vorschlag)

```
packs/
  aion2/pack.json
  wow-forever/pack.json
  _examples/beispiel-rpg/pack.json   # nicht geladen, aber validiert
test/fixtures/packs/   # Packs für den Erweiterbarkeits-Test (6.4)
src/
  app/                 # Routen: /, /roster, /matrix, /berufe, /charaktere, /admin
  components/
  lib/
    reset/             # reine Funktionen + Tests
    packs/             # Schema, Loader, Sync
    build-links/       # Domain → Quelle, optionales URL-Parsing
    auth/              # Auth.js-Config, Allowlist, Guards
    db/                # Drizzle-Schema, Client
  i18n/de.ts
public/                # Manifest, Icons
drizzle/               # Migrationen
scripts/               # backup.mjs, pack-sync, seed
deploy/swag/           # guildhub.subdomain.conf
Dockerfile
docker-compose.yml
```

---

## 12. Offene Punkte (vor bzw. während Phase 1 klären)

- [x] Gildengröße: **bis zu 10 Personen** (aktuell 6). Matrix ohne Paginierung, auf dem Handy horizontal scrollbar mit fixierter Aufgaben-Spalte; Allowlist nicht hart auf 10 begrenzen
- [x] Reverse Proxy: **SWAG (linuxserver.io, nginx + Let’s Encrypt)**, siehe 11.2
- [x] Stack und Zusatzpakete (Luxon, Serwist, Drizzle-Adapter, tsx), Code-Stil nach Next.js-Standard, kein OpenSpec (§3)
- [x] Server/Realms: optionaler Pack-Katalog, sonst normalisierter Freitext (4.6)
- [x] Pflichtfelder am Charakter (4.7), Gilde beim ersten Start anlegen (4.1)
- [x] Aufgaben-`replaces` mit Zusammenführen, erweiterte Validierung (6.5)
- [x] Regen-Takte nach lokaler Uhrzeit über die Zeitumstellung (5.3)
- [x] `SyncLog` und `AuditLog` (4.1)
- [x] Name des Docker-Netzwerks, in dem SWAG hängt: **`ltr-net`**
- [x] Domain/Subdomain für die App: **`guildhub.licktherainbow.de`**
- [x] Discord-App für OAuth angelegt (Client-ID `1564751806851194893`; Secret nur in `.env`), Redirect-URL: `AUTH_URL/api/auth/callback/discord`
- [ ] Discord-IDs der aktuell 6 Mitglieder für die Allowlist (Owner `418171274456727564` steht, die übrigen folgen)
- [x] AION 2: Reset-Uhrzeit EU und Klassennamen/Rollen im Spiel bestätigt
- [x] AION 2: Aufgaben aus dem Spiel übernommen (Pack 0.4.0): Pflichten 5/Tag pro Server, Shugofesta 12/Tag, Daily Login, Albtraum-Dungeon +2/Tag bis 14, Tägliche Dungeons 14/Woche, Wochenquests PvE 12 und PvP 20 pro Woche, Aszensusritus 3/Woche
- [x] AION 2: Odyle-Energie (+15 alle 3 Std., max. 200) und Reset-Zeiten (täglich 05:00, wöchentlich Mi 05:00) im Spiel bestätigt
- [x] AION 2: keine Berufe, Capability `professions` aus (6.3)
- [x] WoW Forever: Klassen-/Rassen-Kombinationen bestätigt (Pack 0.3.0); Paladin und Schamane auf beiden Seiten
- [x] WoW Forever: Berufe gegen ForeverDB-API geprüft (IDs, Art, englische Namen; Build 1.60.1)
- [ ] WoW Forever: Raid-IDs und Reset-Tage (ab 04.11.)
- [ ] Gewünschte Akzentfarbe/Logo der Gilde (optional)
- [x] WoW Forever: neue Rasse **Himmelsgeborene** im Pack (`todo`)
- [x] WoW Forever: Himmelsgeborene je Fraktion getrennt – „Hoher Orden“ (Allianz) und „Windformer“ (Horde) mit eigenen Klassen; englischer Name noch offen

### Umsetzungsnotizen Phase 1

Entscheidungen, die beim Bauen getroffen wurden und das Modell aus 4.1 ergänzen:

- `Game` speichert zusätzlich `name`, `meta` (Typ, Capabilities, Labels, Regionen, Build-Quellen) und `pack_hash`. Ein Pack mit unverändertem Inhalt wird beim Start nur als `skipped` protokolliert.
- `GameCatalogEntry` hat einen numerischen Ersatzschlüssel; `Character`, `CharacterProfession` und `Build` verweisen per Fremdschlüssel darauf. Der Pack-Schlüssel steht in `key`.
- `Character` speichert den Server als `server_key` (Katalog-ID bzw. normalisierter Freitext) und `server_name` (Schreibweise der ersten Eingabe im Spiel).
- Ein Spieler hat pro Spiel höchstens einen Main; das Setzen eines neuen Mains nimmt die Markierung beim alten weg.
- Aufgaben werden in Phase 1 validiert, aber noch nicht in die DB synchronisiert (`TaskDefinition` kommt mit Phase 2). Die Sync-Regeln für Aufgaben aus 6.5 (B) entstehen dann.
- Wieder auf die Allowlist gesetzt heißt wieder aktiv: Ein deaktiviertes Mitglied, das erneut freigeschaltet wird, ist beim nächsten Login automatisch reaktiviert.
- Discord-Login nur mit Scope `identify`, die E-Mail wird nicht abgefragt.
- Der Spiel-Umschalter (Abschnitt 7, Punkt 2) merkt sich die Auswahl pro Browser in einem Cookie.
- Klassen-, Berufs- und Fraktionsfilter im Roster gibt es nur, wenn ein einzelnes Spiel gewählt ist; der Rollenfilter gilt immer.
- Backups: Das Datum im Dateinamen richtet sich nach `DEFAULT_TIMEZONE`. Das Script schreibt erst in eine temporäre Datei und benennt sie danach um, damit ein abgebrochener Lauf kein halbes Backup hinterlässt. Der Admin-Download liegt unter `/admin/backup`; Nicht-Owner bekommen dort 404. Der Service Worker cacht ihn nie.
- **Spezialisierungen:** Listet ein Pack `specs`, wählt der Charakter-Editor Haupt-Spec und optionale Off-Spec aus den Specs seiner Klasse (statt Freitext). Die Rolle im Roster kommt dann aus der Haupt-Spec; ohne Spec ist sie „ohne Spec“ und der Editor weist darauf hin. Spiele ohne Specs (AION 2) behalten die Rolle der Klasse und das Freitextfeld. DPS ist bei WoW in Nahkampf- und Fernkampf-DPS geteilt.
- **Rezepte aus ForeverDB:** `npm run packs:foreverdb` holt alle Rezepte der Pack-Berufe von der ForeverDB-API (deutsche und englische Namen, Fertigkeit, Reagenzien) ins WoW-Pack; der Key (`FOREVERDB_API_KEY`) wird nur dafür lokal gebraucht, nie im Betrieb. Übersprungen werden Altkopien (Season of Discovery); IDs sind `<beruf>-<spellId>`, weil wenige Rezepte zu zwei Berufen gehören. Im Charakter fügt eine Auswahl Rezepte als Zeile hinzu; sie zeigt nur Rezepte bis zur eingetragenen Fertigkeit (ohne Fertigkeit alle) und rendert lange Listen virtuell; beim Speichern wird jede Zeile, die mit einem Rezeptnamen (beliebige Sprache) beginnt, verknüpft, auch wenn der Name selbst einen Bindestrich enthält. Alles andere bleibt Freitext. Wo Rezeptdaten erscheinen (Charakter, Berufe-Verzeichnis), steht die Quellenangabe aus `credits`, wie ForeverDB es verlangt.
- **Crafting-Anträge aus Rezepten:** Bei Berufen mit Pack-Rezepten wählt „Was“ ein Rezept aus der Liste (Server prüft das, der Antrag speichert Rezept und Namen); unter den Feldern stehen die benötigten Reagenzien, und die Seite trägt die ForeverDB-Quellenangabe. Freitext bleibt für Materialien: Sammelberufe von sich aus, sonst per `requests: "free"` am Beruf (WoW: Angeln), und für Berufe ohne Rezepte.
- **Charaktere auf der Übersicht:** Ganz oben stehen die eigenen Charaktere des gewählten Spiels (Main zuerst) mit Stufe und Berufsfertigkeit als −/+-Feld; Eintippen geht auch. Gespeichert wird 600 ms nach der letzten Änderung, mit denselben Grenzen wie im Editor. Der Block ist klappbar und merkt sich den Zustand im Browser.
- **Dungeons aus ForeverDB:** `npm run packs:foreverdb` holt außer den Rezepten die Dungeons und Raids von WoW Forever (ohne Season-of-Discovery-Inhalte und ohne Instanzen ohne Bosse; derzeit 30). Deutsche Instanznamen pflegen wir selbst im Pack (`name.de`), der Import behält sie und aktualisiert nur den englischen Namen; die neuen Forever-Instanzen haben noch keinen. Eine neue Dungeon-Seite kann eine Instanz als Vorlage wählen: Name und leere Punkte werden im Formular vorbefüllt, die Bosse beim Speichern angelegt. Die Seite merkt sich die Instanz und zeigt deren „Wichtige Beute“ (Name und Begründung, laut API nur englisch) mit Quellenangabe.
- Berufe: Fertigkeit (0 bis 10000), Spezialisierung und Notiz werden je Beruf im Charakter-Editor gepflegt und im Roster als „Alchemie 300 (Tränke)“ angezeigt.

### Umsetzungsnotizen Phase 2

- **Reset-Engine** in `src/lib/reset/`: reine Funktionen ohne DB, alle Pflicht-Testfälle aus 5.4 als Vitest. Lokale Uhrzeiten werden über die Offsets der Zone aufgelöst (Lücke → erster gültiger Zeitpunkt danach, doppelte Stunde → erstes Auftreten), Perioden-Keys sind das lokale Datum des Periodenbeginns.
- **Aufgaben-Sync:** `TaskDefinition` wird pro Pack in derselben Transaktion wie die Kataloge synchronisiert; `TaskProgress`/`ResourceState` werden bei `replaces` umgeschrieben bzw. zusammengeführt (6.5 B). Eine geänderte `kind` lässt den Sync des Packs scheitern. Ein internes Sync-Format im Hash sorgt dafür, dass nach einem App-Update auch unveränderte Packs einmal neu synchronisiert werden.
- **Fortschritt** ist über Scope-Keys an Charakter, Server, Account oder Nutzer gebunden, nicht per Fremdschlüssel. Beim Löschen eines Charakters bzw. beim endgültigen Löschen eines Mitglieds wird er deshalb ausdrücklich mitgelöscht. Den Scope-Key bildet immer der Server, nie der Client.
- **„Heute“ ist die Startseite** für angemeldete Mitglieder. Abhaken ist optimistisch; langes Drücken (−1 beim Zähler, exakter Wert bei Stacking) hat jeweils eine sichtbare Alternative (Minus- bzw. Stift-Button).
- **Eigene Aufgaben** sind in Phase 2 nur privat. Spiel, Typ und Geltungsbereich sind nach dem Anlegen fest, weil eine Änderung den gespeicherten Fortschritt umdeuten würde (wie die neue ID bei Packs). Eigene Regeln laufen in der Zeitzone der Region bzw. bei spielübergreifenden Aufgaben in der Zeitzone der Gilde. Eine eigene Raid-ID (`lockout`) hat keine Boss-Liste und verhält sich wie `recurring`.
- **To-do-Listen:** benannte Listen mit einmaligen Einträgen ohne Reset, privat oder für die Gilde (aus Phase 3 vorgezogen). Gilden-Listen sind gemeinsamer Stand: Alle Mitglieder legen Listen an, fügen Einträge hinzu und haken ab; ein abgehakter Eintrag ist für alle erledigt und zeigt, wer ihn abgehakt hat. Umbenennen, Löschen der Liste, Entfernen erledigter und fremder Einträge: Ersteller der Liste und Officer. Eigene Einträge darf jeder löschen.
- **Dungeon-Checklisten:** eine Vorlage pro Dungeon und Spiel, privat oder für die Gilde sichtbar. Jedes Mitglied hakt für seinen eigenen Run ab, „Neuer Run“ setzt nur die eigenen Haken zurück. Beim Bearbeiten der Punkte werden alle Haken dieser Liste zurückgesetzt. Bearbeiten und Löschen: Ersteller, bei Gilden-Listen auch Officer.
- **Farmspots:** Was, Zone, Koordinaten als Text, optional Beruf (aus dem Pack), Link zu einer externen Karte und Notiz; privat oder für die Gilde sichtbar. Keine eigene Karte (siehe 9). Bearbeiten wie bei den Checklisten.
- **AION-2-Startaufgaben** aus 6.3 stehen im Pack (0.3.0), alle als `todo`. Das Maximum der Odyle-Energie (200) ist eine Annahme.
- **Header auf dem Handy:** Unter 768 px stehen alle Seiten und „Abmelden“ im Menü-Button; im Header bleiben Logo, Menü, Spiel-Umschalter und Avatar.
- **Bewusst offen gelassen:** Uhrzeiten werden für alle in Europe/Berlin angezeigt; `User.timezone` bleibt ungenutzt, bis jemand außerhalb dieser Zone mitspielt (dann mit Einstellung im Nutzermenü). Der Abhak-Verlauf (`TaskProgress` aller Perioden) wird nicht aufgeräumt, er bleibt für spätere Auswertungen erhalten.

### Umsetzungsnotizen Phase 3

- **Gildenaufgaben werden gemeinsam abgehakt** (Entscheidung beim Start von Phase 3, abweichend von 7.5/7.8): Officers legen sie mit dem Geltungsbereich „Gilde“ an (`scope: guild`, `scope_key g:<guild_id>`). Einmal abgehakt gilt für alle; Dashboard und Matrix zeigen, wer abgehakt hat. Sie erscheinen in „Heute“ im Block „Gilde“ und in der Matrix als eigener Block, da sie keine Spalten pro Mitglied haben. Typen: abhaken, Zähler, Raid-ID, einmalig; Ressourcen bleiben persönlich. Gildenaufgaben gehören der Gilde und bleiben erhalten, wenn das Officer-Konto gelöscht wird. Bearbeiten und Löschen: Officer und Owner. Packs dürfen die Scopes `user` und `guild` nicht verwenden.
- **Gilden-Matrix** (`/matrix`): Zeilen = Pack-Aufgaben des Spiels, Spalten = aktive Mitglieder (Standard) oder deren Charaktere; Kategorie-Filter über die URL. Pro Mitglied werden Charakter-Aufgaben und Server-Aufgaben über mehrere Server als „x/y“ mit Namen im Tooltip gezeigt; im Charakter-Modus markiert ein Link-Symbol gemeinsame Server-/Account-Werte. Lockouts: „frei“, „k/n“, „voll“. Ressourcen nur mit bekanntem Stand.
- **Rezepte** werden im Charakter-Editor je Beruf als Text gepflegt: eins pro Zeile, optional „Name – Notiz“. Wer einen Beruf abwählt, verliert dessen Rezepte.
- **Berufe-Verzeichnis** (`/berufe`): Suche über Berufsnamen in allen Sprachen, Rezepte, Spezialisierung und Notizen; Berufsfilter bei gewähltem Spiel. Trifft die Suche Rezepte, werden nur diese gezeigt.
- **Crafting-Anträge** (`/antraege`): Was, Beruf, Anzahl (1–1000), Notiz. Annehmen kann, wer den Beruf auf einem eigenen Charakter hat. Der Annehmende meldet „erledigt“ oder gibt den Antrag zurück (wieder offen). Löschen: Antragsteller jederzeit, Officer zum Aufräumen. Erledigte Anträge: die letzten 20 werden angezeigt.
- **Stat-Prioritäten** (`/stat-prio`): je Klasse beliebig viele Varianten (z. B. „PvE“, „PvP“) mit geordneter Stat-Liste, Notiz und Quelle; nur Officer und Owner bearbeiten. Die Charakterseite zeigt die Varianten der eigenen Klasse.
- Das Menü „Mehr“ ist in die Gruppen „Gilde“, „Planer“ und „Verwaltung“ gegliedert.

### Umsetzungsnotizen Phase 4

- Das Beispiel-Pack liegt unter `packs/_examples/beispiel-rpg/` (wird nur validiert, nie geladen) und als Kopie unter `test/fixtures/packs/beispiel-rpg/`. Ein Test stellt sicher, dass beide Dateien inhaltlich gleich bleiben.
- Der Akzeptanztest (`src/lib/packs/extensibility.test.ts`) läuft über denselben Startweg wie die Produktion (`runStartup` mit `PACKS_DIR` auf den Fixtures): Das Spiel kommt deaktiviert an, ein Owner aktiviert es, ein Mitglied legt einen „Durchlauf“ an, hakt „Akt 1“ ab und zählt optionale Bosse. Der Fortschritt bleibt auch Wochen später bestehen (kein Reset), und die Gilden-Matrix zeigt „✓“ und „7/12“.
- Für Phase 4 war keine Codeänderung außerhalb von `packs/` und den Fixtures nötig.
