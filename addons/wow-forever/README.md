# GuildHub-Addon für WoW Forever

Sammelt Stufe, Berufe, Rezepte und Tode der eigenen Charaktere und gibt sie als Text
aus, den man in GuildHub unter **Meine Charaktere → Aus dem Spiel übernehmen** einfügt
(SPEC 7.3). Das Addon hat keinen Netzwerkzugriff und sendet nichts an andere Spieler.

## Installieren

Den Ordner `GuildHub` nach `World of Warcraft/<Client-Ordner>/Interface/AddOns/`
kopieren, sodass dort `AddOns/GuildHub/GuildHub.toc` liegt. Im Spiel in der
Addon-Liste „GuildHub“ aktivieren.

Der Client von WoW Forever basiert auf Retail 12.x; das Addon nutzt dessen
Schnittstellen. Die TOC nennt `16001` (WoW Forever 1.60.1) und `16000`. Lässt das Spiel das Addon als
„veraltet“ oder „inkompatibel“ nicht laden, passt keine Zahl hinter `## Interface:` in
`GuildHub.toc` zum Client, etwa nach einem Update von WoW Forever. Die richtige Zahl zeigt im Spiel
`/dump select(4, GetBuildInfo())`.

## Benutzen

1. Mit jedem Charakter einmal einloggen. Stufe, Klasse, Rasse und Berufe liest das
   Addon dabei von selbst. Der Name geht mit Nachnamen an GuildHub („Relitia Relikt“);
   so sollte er dort auch eingetragen sein. Ein Charakter, den GuildHub nur unter dem
   Vornamen kennt, bekommt beim Import den Nachnamen ergänzt.
   Einen Realm nennt WoW Forever Addons nicht; GuildHub ordnet über den Namen zu und
   lässt den eingetragenen Server stehen. Einträge älterer Addon-Versionen (nur Vorname,
   oder ohne Realm aus 0.4.0) führt das Addon beim nächsten Einloggen des Charakters
   zusammen.
2. Jedes Berufsfenster einmal öffnen. Rezepte gibt das Spiel nur heraus, solange das
   Fenster offen ist. Danach nur noch, wenn neue Rezepte dazukommen.
3. `/guildhub` eingeben. Oben steht, was das Addon je Charakter weiß, unten der Export.
   Er ist schon markiert: Strg+C, dann in GuildHub einfügen.

4. Für Handwerker und Anträge der Gilde im Spiel: in GuildHub auf derselben Seite
   „Für das Addon kopieren“, im Spiel `/guildhub` → „Gilden-Stand einfügen“, Strg+V,
   „Übernehmen“. Ab und zu neu holen; ab 7 Tagen weist das Fenster darauf hin.

### Abgleich über die Gilde

Schritt 3 und 4 muss nicht jeder selbst machen. Die Addons reichen ihre Daten im Spiel
untereinander weiter, über den unsichtbaren Addon-Kanal der Gilde, sobald zwei Mitglieder
gleichzeitig online sind. Dazu ist nichts einzustellen.

- Ein **Officer** kopiert ab und zu seinen Export nach GuildHub. Er enthält die Daten
  aller Accounts, die sein Addon gesammelt hat; GuildHub ordnet sie den Mitgliedern über
  ihre schon bekannten Charaktere zu. Ein neuer Charakter muss nicht vorher angelegt
  werden, wenn ein anderer Charakter desselben Accounts GuildHub schon bekannt ist.
- Den **Gilden-Stand** fügt einer ein, die anderen bekommen ihn über die Gilde.
- Gesendet wird langsam, etwa eine Nachricht pro Sekunde, in Instanzen gar nicht. Das
  Fenster zeigt, ob noch etwas zu senden ist.
- Ein Mitglied, das selbst exportiert, überträgt nur seine eigenen Charaktere.

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
3. Ein Berufsfenster öffnen, `/guildhub` erneut: beim Beruf steht „Rezepte <Datum>“.
   Ein per Chat-Link geöffnetes fremdes Berufsfenster ändert nichts.
4. Der Export beginnt mit `GH1:wow-forever:export:`. In GuildHub einfügen, Vorschau: der
   Charakter mit Stufe, Berufen und Rezepten erscheint, nichts davon unter „Unbekannt“.
5. Übernehmen; in GuildHub stimmen Stufe, Fertigkeit und Rezepte.
6. Sterben, `/reload`, erneut exportieren und übernehmen: die Tode steigen um 1.
7. Jäger: Totstellen zählt nicht als Tod.
8. Mit einem zweiten Charakter einloggen: der Export enthält beide.
9. Einen Beruf verlernen, `/guildhub`: er fehlt; die GuildHub-Vorschau bietet an, ihn zu
   entfernen.
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
20. Gilden-Abgleich mit zwei Accounts A (Officer) und B (Mitglied), beide in der Gilde
    online, B hat in GuildHub schon einen Charakter: nach spätestens einer Minute zeigt
    `/guildhub` bei A „Daten von 1 weiteren Account im Export“.
21. A exportiert und fügt in GuildHub ein: B's Charaktere stehen mit „für <B>“ in der
    Vorschau; ein neuer Charakter von B lässt sich per Haken für B anlegen.
22. A fügt einen Gilden-Stand ein: kurz darauf meldet B „Gilden-Stand vom …“, und B's
    Antragsfenster zeigt B's eigene Anträge unter „Meine Anträge“.
23. B exportiert selbst und fügt ein: nur B's Charaktere werden übernommen, A's Account
    steht unter „Nicht übernommene Accounts“.
24. In einer Instanz sendet das Addon nichts; nach dem Verlassen geht es weiter.
