# GuildHub

Gilden- und Spielplaner für eine Spielergruppe: Roster, persönliche Checklisten mit
automatischem Reset, Gildenübersicht und Berufe-Verzeichnis. Self-hosted als PWA.

Die vollständige Spezifikation steht in [docs/SPEC.md](docs/SPEC.md).

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
cp .env.example .env.local
```

In `.env.local` für die lokale Entwicklung anpassen:

```
AUTH_URL=http://localhost:3000
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
AUTH_DISCORD_ID=<Client-ID der Discord-App>
AUTH_DISCORD_SECRET=<Client-Secret der Discord-App>
OWNER_DISCORD_ID=<deine Discord-User-ID>
DATABASE_PATH=./data/guildhub.db
```

In der Discord-App muss zusätzlich die Redirect-URL
`http://localhost:3000/api/auth/callback/discord` eingetragen sein.

```bash
npm run dev
```

Die App läuft dann auf http://localhost:3000. Migrationen laufen beim Start automatisch,
die SQLite-Datei liegt unter `./data/`.

### Befehle

| Befehl                   | Zweck                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `npm run dev`            | Entwicklungsserver                                                    |
| `npm test`               | Unit-Tests (Vitest)                                                   |
| `npm run lint`           | ESLint                                                                |
| `npm run typecheck`      | TypeScript inkl. generierter Routentypen                              |
| `npm run format`         | Prettier über alle Dateien                                            |
| `npm run build`          | Produktions-Build (`.next/standalone`)                                |
| `npm run db:generate`    | Migration aus `src/lib/db/schema.ts` erzeugen (nach Schemaänderungen) |
| `npm run packs:validate` | Alle Packs prüfen, inkl. `packs/_examples/`; Exit-Code 1 bei Fehlern  |

Der Service Worker ist im Entwicklungsmodus abgeschaltet. Zum Testen der PWA
`npm run build && npm start` verwenden.

### Erste Schritte nach dem Login

1. Mit der Discord-ID aus `OWNER_DISCORD_ID` anmelden; dieses Konto wird automatisch Owner.
2. Unter **Admin → Spiele** die gewünschten Spiele aktivieren. Neue Spiele sind zunächst
   deaktiviert.
3. Unter **Admin → Allowlist** weitere Discord-IDs freischalten (oder in
   `ALLOWED_DISCORD_IDS` eintragen; die werden bei jedem Start ergänzt, aber nie entfernt).

## Game Packs

Spiele werden über `packs/<id>/pack.json` beschrieben (Schema: `src/lib/packs/schema.ts`,
Details: SPEC Abschnitt 6). Ordner, die mit `_` beginnen (z. B. `packs/_examples/`), werden
nur validiert, aber nicht geladen.

- `npm run packs:validate` vor jedem Commit. Der Docker-Build führt die Prüfung ebenfalls aus
  und bricht bei Fehlern ab; der laufende Container bleibt dann unverändert.
- Beim Start werden die Packs in die DB synchronisiert. Ein ungültiges Pack wird übersprungen,
  der letzte gültige Stand bleibt aktiv; `/api/health` meldet dann `degraded`.
- Einträge, die noch nicht im Spiel geprüft sind, mit `"todo": true` markieren. Der
  Admin-Bereich listet sie.

**Regeln für Pack-Autoren:**

- **IDs sind stabil und werden nie wiederverwendet.** Umbenennen heißt `name` ändern, nicht `id`.
- Statt zu löschen: `"deprecated": true`. Der Eintrag bleibt gültig, ist aber für neue
  Charaktere nicht mehr wählbar.
- Echte Umbenennung oder Zusammenlegung: neue ID mit `"replaces": ["alte-id"]`. Beim Sync werden
  alle Verweise umgeschrieben.
- Fehlt ein Eintrag einfach, wird er als „nicht mehr im Pack“ markiert; betroffene Charaktere
  behalten ihn und bekommen einen Hinweis.
- Semantische Änderung einer Aufgabe (z. B. anderes `kind`) = neue Aufgaben-ID.
- `version` bei jeder Änderung erhöhen (SemVer).

## Deployment auf dem vServer

Die App läuft als ein Container hinter dem vorhandenen SWAG (nginx + Let's Encrypt).
Sie veröffentlicht keinen Port nach außen, SWAG erreicht sie über das gemeinsame
Docker-Netzwerk unter dem Containernamen `guildhub`.

### Einmalig einrichten

1. **DNS:** Die Subdomain (z. B. `guildhub.example.de`) auf den vServer zeigen lassen.
2. **Zertifikat:** Die Subdomain muss vom SWAG-Zertifikat abgedeckt sein. Entweder in der
   SWAG-Variable `SUBDOMAINS` ergänzen und den SWAG-Container neu erstellen, damit das
   Zertifikat erweitert wird, oder ein Wildcard-Zertifikat (DNS-Validierung) nutzen.
3. **Discord-App** unter https://discord.com/developers/applications anlegen,
   Redirect-URL `https://<subdomain>/api/auth/callback/discord` eintragen,
   Client-ID und Secret notieren.
4. **Repo klonen und konfigurieren:**

   ```bash
   git clone https://github.com/r3v3nloper/guildhub.git
   cd guildhub
   cp .env.example .env
   ```

   In `.env` mindestens `AUTH_URL`, `AUTH_SECRET` (`openssl rand -base64 32`),
   `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `OWNER_DISCORD_ID`, `ALLOWED_DISCORD_IDS`
   und `SWAG_NETWORK` setzen. Den Netzwerknamen zeigt
   `docker inspect swag --format '{{json .NetworkSettings.Networks}}'`.

5. **Backup-Ordner** für den Container-User (UID 1000) beschreibbar machen:

   ```bash
   mkdir -p backups && sudo chown 1000:1000 backups
   ```

6. **Starten:**

   ```bash
   docker compose up -d --build
   ```

7. **SWAG-Konfiguration** kopieren und SWAG neu starten:

   ```bash
   cp deploy/swag/guildhub.subdomain.conf <swag-config>/nginx/proxy-confs/
   docker restart swag
   ```

   Die Conf enthält bewusst **kein** Authelia/Authentik-Include, die App hat ihren eigenen Login.

### Prüfen

- `https://<subdomain>/api/health` liefert `{"status":"ok","db":"ok"}` mit HTTP 200.
- Der Discord-Login landet nach dem Callback wieder auf der App.
- Auf dem Handy lässt sich die Seite über „Zum Startbildschirm hinzufügen“ als App installieren.
- `docker compose ps` zeigt den Container als `healthy`.

### Update

```bash
git pull && docker compose up -d --build
```

Migrationen laufen beim Containerstart automatisch. Die Datenbank liegt im benannten
Volume `guildhub-data` und bleibt bei Updates und Neustarts erhalten.

### Restore

1. `docker compose stop guildhub`
2. Die Backup-Datei ins Volume kopieren, z. B.:

   ```bash
   docker run --rm -v guildhub_guildhub-data:/data -v "$PWD/backups":/backups alpine \
     sh -c 'cp /backups/guildhub-YYYY-MM-DD.db /data/guildhub.db && rm -f /data/guildhub.db-wal /data/guildhub.db-shm && chown 1000:1000 /data/guildhub.db'
   ```

3. `docker compose start guildhub`

Das Backup-Script (`scripts/backup.mjs`, SPEC 11.4) folgt in einer späteren Phase.
