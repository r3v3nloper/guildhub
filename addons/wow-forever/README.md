# GuildHub-Addon für WoW Forever

Sammelt Stufe, Berufe, Rezepte und Tode der eigenen Charaktere und gibt sie als Text
aus, den man in GuildHub unter **Meine Charaktere → Aus dem Spiel übernehmen** einfügt
(SPEC 7.3). Das Addon hat keinen Netzwerkzugriff und sendet nichts an andere Spieler.

## Installieren

Den Ordner `GuildHub` nach `World of Warcraft/<Client-Ordner>/Interface/AddOns/`
kopieren, sodass dort `AddOns/GuildHub/GuildHub.toc` liegt. Im Spiel in der
Addon-Liste „GuildHub“ aktivieren.

Die TOC nennt `16001` (WoW Forever 1.60.1) und `11507`. Lässt das Spiel das Addon als
„veraltet“ oder „inkompatibel“ nicht laden, passt keine Zahl hinter `## Interface:` in
`GuildHub.toc` zum Client, etwa nach einem Update von WoW Forever. Die richtige Zahl zeigt im Spiel
`/dump select(4, GetBuildInfo())`.

## Benutzen

1. Mit jedem Charakter einmal einloggen. Stufe, Klasse, Rasse und Berufe liest das
   Addon dabei von selbst.
2. Jedes Berufsfenster einmal öffnen. Rezepte gibt das Spiel nur heraus, solange das
   Fenster offen ist. Danach nur noch, wenn neue Rezepte dazukommen.
3. `/guildhub` eingeben. Oben steht, was das Addon je Charakter weiß, unten der Export.
   Er ist schon markiert: Strg+C, dann in GuildHub einfügen.

4. Für Handwerker und Anträge der Gilde im Spiel: in GuildHub auf derselben Seite
   „Für das Addon kopieren“, im Spiel `/guildhub` → „Gilden-Stand einfügen“, Strg+V,
   „Übernehmen“. Ab und zu neu holen; ab 7 Tagen weist das Fenster darauf hin.

Mit Gilden-Stand zeigt der Tooltip eines Items unten einen Block „GuildHub“: wer es
herstellen kann (online in Grün), bei Bauplänen und Rezepten, wer sie schon kennt, und bei
Reagenzien, wie viele Anträge sie brauchen. `/guildhub tooltip` schaltet ihn aus und
wieder an.

Der Reiter **Anträge** in `/guildhub` zeigt aus dem Gilden-Stand, was du erfüllen kannst,
was du angenommen hast (mit Reagenzien in Taschen und Bank des eingeloggten Charakters)
und deine eigenen Anträge. Annehmen, Erledigt und Zurückgeben wirken sofort im Addon und
gehen mit dem nächsten Export an GuildHub, das sie beim Übernehmen prüft. Reihenfolge
deshalb: erst exportieren und in GuildHub übernehmen, dann einen neuen Gilden-Stand
holen; ein neuerer Gilden-Stand ersetzt die gemerkten Aktionen. Kommt jemand online, mit
dem du einen angenommenen Antrag teilst, erscheint einmal pro Sitzung ein Hinweis im
Chat; `/guildhub hinweise` schaltet das aus und wieder an.

Die Daten liegen accountweit in `WTF/Account/<Account>/SavedVariables/GuildHub.lua`.
Ein Export enthält alle Charaktere des Accounts, die seit der Installation eingeloggt
waren.

## Für Entwickler

- `Data.lua` wird aus dem Pack erzeugt: `npm run addon:data`. Nach jeder Änderung an
  den Berufen oder deren `game_ref` im Pack neu erzeugen.
- Das Format des Exports und die Prüfsumme müssen zu `src/lib/addon/` passen
  (`export-payload.ts`, `adler32.ts`).

## Handtest im Live-Client

Abnahme von Phase 6 (SPEC 10). Noch nicht durchgeführt.

1. Addon laden; es erscheint keine Fehlermeldung.
2. `/guildhub` öffnet das Fenster; der eingeloggte Charakter steht mit Stufe und Berufen
   darin, die Berufe mit „Berufsfenster noch nicht geöffnet“.
3. Ein Berufsfenster öffnen (auch Verzauberkunst, das ein eigenes Fenster hat),
   `/guildhub` erneut: beim Beruf steht „Rezepte <Datum>“.
4. Der Export beginnt mit `GH1:wow-forever:export:`. In GuildHub einfügen, Vorschau: der
   Charakter mit Stufe, Berufen und Rezepten erscheint, nichts davon unter „Unbekannt“.
5. Übernehmen; in GuildHub stimmen Stufe, Fertigkeit und Rezepte.
6. Sterben, `/reload`, erneut exportieren und übernehmen: die Tode steigen um 1.
7. Jäger: Totstellen zählt nicht als Tod.
8. Mit einem zweiten Charakter einloggen: der Export enthält beide.
9. Im Fertigkeitenfenster die Berufe-Gruppe zuklappen, `/guildhub`: der Hinweis auf die
   zugeklappte Gruppe erscheint, die Berufe bleiben im Export.
10. In GuildHub „Für das Addon kopieren“, im Spiel einfügen und übernehmen: das Fenster
    zeigt „Gilden-Stand vom …“ mit Mitgliedern und Anträgen. Ein gekürzter Text wird mit
    „unvollständig“ abgelehnt. Dabei auch prüfen, ob das Einfügen bei einer großen Gilde
    flüssig bleibt (offener Punkt in SPEC 12).
11. Tooltip eines Items, das ein Gildenmitglied laut GuildHub herstellen kann (z. B. ein
    Trank aus dessen Rezepten): Block „GuildHub“ mit „Herstellbar von:“, eigene
    Charaktere zuerst mit „(du)“, Online-Charaktere grün. Ein beliebiges anderes Item
    zeigt keinen Block.
12. Tooltip eines Bauplans, den in der Gilde niemand kennt: „In der Gilde noch
    unbekannt“; einer, den jemand kennt: „Schon bekannt bei:“.
13. Ein Reagenz eines selbst angenommenen Antrags: „Du brauchst n für 1 angenommenen
    Antrag“. Auch per Chat-Link (Shift-Klick) geöffnete Items zeigen den Block.
14. `/guildhub tooltip` zweimal: Block verschwindet und kommt wieder.
15. Reiter „Anträge“: ein offener Antrag zu einem eigenen Beruf steht unter „Kann ich
    erfüllen“ (ausgegraut, wenn kein eigener Charakter das Rezept kennt). „Annehmen“
    verschiebt ihn nach „Von mir angenommen“ mit „(noch nicht übertragen)“.
16. Exportieren und in GuildHub einfügen: die Vorschau zeigt „Anträge aus dem Spiel –
    Annehmen: … wird übernommen“; nach dem Übernehmen ist der Antrag in GuildHub
    angenommen.
17. Hat jemand anderes den Antrag vorher in GuildHub angenommen, zeigt die Vorschau
    „verworfen“ mit Grund.
18. Neuen Gilden-Stand holen und einfügen: „(noch nicht übertragen)“ und der Hinweis auf
    offene Antrags-Aktionen verschwinden.
19. Mit zwei Accounts: Antragsteller loggt ein, während der Handwerker online ist: beim
    Handwerker erscheint der Chat-Hinweis mit anklickbarem Namen, einmal pro Sitzung.
