# Exam Trainer Framework — Benutzerhandbuch

## 1. Zweck und Grundprinzip

Exam Trainer Framework (ETF) ist eine lokale, offlinefähige Lern- und Prüfungssimulations-App. Der Schwerpunkt liegt nicht nur auf Wiederholung, sondern auf der Frage: **Was sollte ich heute lernen, um eine konkrete Prüfung zu bestehen?**

Die App kombiniert dafür:

- einen klassischen fünfstufigen Wiederholungsplan;
- einen prüfungsbezogenen Themen-/Blueprint-Kontext;
- einen adaptiven Tagesplan (`Heute lernen`);
- Prüfungssimulationen;
- Readiness- und Lernverlaufsdiagnostik;
- lokale Kataloge und vollständige lokale Datensicherung.

Der klassische Fünf-Stufen-Scheduler ist derzeit weiterhin maßgeblich. FSRS läuft ausschließlich als Shadow-System und verändert keine Fälligkeiten.

## 2. Datenschutz und lokale Speicherung

ETF benötigt kein Benutzerkonto und übermittelt keine Lern- oder Telemetriedaten an einen ETF-Server. Lernstand, Kataloge und lokale Medien werden im Browser in IndexedDB gespeichert.

Wichtig:

- Browserdaten können durch Browser-/Gerätebereinigung verloren gehen.
- Für Gerätewechsel und vollständige Wiederherstellung regelmäßig ein `.etfb`-Vollbackup anlegen.
- Das ältere JSON-Backup enthält **keine Medien** und ist nur für Kompatibilität gedacht.

## 3. Installation und Start

Für die Entwicklung bzw. lokale Nutzung:

```bash
npm install
npm run dev
```

Produktionsbuild:

```bash
npm run build
npm run preview
```

ETF muss über HTTP/HTTPS laufen. Direktes Öffnen per `file://` unterstützt die PWA-/Offline-Funktionen nicht.

Bei einer bereitgestellten HTTPS-Version kann die App je nach Browser als PWA zum Home-Bildschirm bzw. als App installiert werden.

## 4. Navigation

Die Hauptbereiche sind:

- **Start** — Tagesplan und Schnellzugriffe;
- **Lernen** — eigene Lernsitzung konfigurieren;
- **Prüfung** — Prüfungsprofil und Simulation;
- **Fortschritt** — Readiness, Verlauf und Lernprobleme;
- **Kataloge** — Lerninhalte und Redaktion;
- **Einstellungen** — Sicherung, Import und optionale Bedienfunktionen.

Auf kleinen Displays wird eine mobile Navigation verwendet; auf größeren Displays passt sich die Darstellung an.

## 5. „Heute lernen“

`Heute lernen` ist der empfohlene Einstieg für den normalen Lernbetrieb.

Der Tagesplan priorisiert nachvollziehbar unter anderem:

- klassisch fällige Karten;
- niedrige Lernstufen;
- hohe Prüfungsgewichtung eines Themas;
- noch nicht abgedeckte Inhalte;
- zeitliche Nähe zur Prüfung;
- kürzlich falsche/unsichere Antworten;
- neue Inhalte;
- bestätigte persistente Problemfälle (`Leeches`) mit begrenztem Zusatzgewicht.

FSRS kann als **Shadow-Hinweis** erscheinen, beeinflusst die Standardpriorität aber nicht autoritativ.

Unter `Warum diese Frage?` kann die App die wesentlichen Auswahlgründe anzeigen.

## 6. Eigene Lernsitzung

Unter **Lernen** stehen weiterhin klassische Filter zur Verfügung:

- fällige Karten;
- neue Karten;
- Fehlerkarten;
- alle Karten;
- optional nach Thema.

Eine Sitzung gehört immer zu genau einem aktiven Katalog.

### Während einer Aufgabe

1. Antwort eingeben bzw. die strukturierten Controls bedienen.
2. `Lösung zeigen` wählen.
3. Eigene Antwort und Musterlösung vergleichen.
4. Selbstbewertung wählen:
   - **Gewusst**;
   - **Unsicher**;
   - **Nicht gewusst**.

Bei komplexen Aufgaben bleibt die Selbstbewertung maßgeblich. Automatische/strukturierte Vergleiche sind nur Bewertungshilfe und ändern nicht heimlich den Scheduler.

`Später` verschiebt eine noch nicht bewertete Lernkarte innerhalb der Sitzung.

## 7. Wiederaufnehmbare Sitzungen

Aktive Lern- und Prüfungssitzungen werden in IndexedDB gespeichert. Dazu gehören insbesondere:

- genaue Reihenfolge der Aufgaben;
- aktuelle Position;
- Aufdeckstatus;
- bisherige Antwortdaten;
- Antwortzeiten;
- bei Prüfungen die noch nicht final übergebenen Bewertungen.

Nach einem Browser-Neustart bzw. Reload kann eine unterbrochene Sitzung über den angebotenen **Fortsetzen**-Dialog wieder aufgenommen oder verworfen werden.

Bei Prüfungen werden Review-Ereignisse erst beim finalen Abgeben in den Lernfortschritt übernommen. Nichtlineares Navigieren erzeugt daher keine mehrfachen Reviews.

## 8. Optionale Touch-Gesten

Unter **Einstellungen → Bedienung → Touch-Gesten** können Swipe-Gesten aktiviert werden. Sie sind standardmäßig aus.

Wenn aktiviert:

- Prüfung: Swipe nach links = nächste Frage;
- Prüfung: Swipe nach rechts = vorherige Frage;
- Lernen, vor dem Aufdecken: Swipe nach links = `Später`.

Bewusst **nicht** per Geste ausgelöst werden:

- Lösung aufdecken;
- Gewusst/Unsicher/Nicht gewusst;
- Veröffentlichung oder sonstige redaktionelle Aktionen.

Gesten starten nicht auf Eingabefeldern, Auswahlcontrols oder anderen interaktiven Antwortflächen. Alle Buttons bleiben als vollständiger Bedienweg erhalten.

## 9. Prüfungssimulation

Unter **Prüfung** kann ein Prüfungsprofil verwendet bzw. gepflegt werden. Ein Blueprint kann enthalten:

- Prüfungstermin;
- Bestehensgrenze;
- Gesamtzahl der Aufgaben;
- Gesamtpunktzahl;
- Zeitlimit;
- relative Themengewichte.

Ohne gepflegtes Blueprint verwendet ETF eine gleichmäßige Themengewichtung als Fallback.

### Feste und dynamische Prüfung

- **Fixed**: feste Zielgröße, zufällige Auswahl unter Beachtung atomarer Aufgabenblöcke.
- **Dynamic**: Auswahl nach den hinterlegten Themengewichten.

### Abhängige Teilaufgaben

Zusammengehörige Teilaufgaben können als Prüfungsgruppe modelliert werden. Eine solche Gruppe wird nicht auseinandergerissen. Spätere Teile bleiben gesperrt, bis der jeweilige Vorgänger bewertet wurde.

Die Prüfungsübersicht erlaubt ansonsten nichtlineares Navigieren zwischen den Aufgaben.

## 10. Fortschritt und Readiness

Readiness ist eine transparente, deterministische Kennzahl aus Lernstand und Abdeckung der Prüfungsinhalte. Sie ist **keine garantierte Bestehenswahrscheinlichkeit**.

Die Auswertung kann unter anderem zeigen:

- aktuellen Readiness-Wert;
- Coverage;
- schwächstes Thema;
- zeitlichen Readiness-Trend;
- beobachtbare Lernmuster.

Diagnostik beschreibt nur tatsächlich beobachtete Muster, z. B.:

- wiederholte Fehler;
- wiederholte Unsicherheit;
- langsamen Abruf;
- Fehler in Prüfungssimulationen;
- niedrige Lernstufe trotz vieler Reviews;
- Rückfall nach früherem Erfolg.

Daraus kann ETF konkrete, aber nicht automatisch ausgeführte Lerninterventionen vorschlagen.

## 11. FSRS Shadow

Unter **Einstellungen** zeigt ETF den Stand der FSRS-Shadow-Evaluation.

Mögliche Zustände:

- **Datenerhebung läuft**;
- **Noch nicht pilotfähig**;
- **Kandidat für kontrollierten Pilot**.

Auch `Kandidat für kontrollierten Pilot` aktiviert FSRS **nicht**. Die App hat absichtlich keinen Schalter, mit dem Shadow-Daten unmittelbar den klassischen Scheduler ersetzen könnten.

Die aktuell gültigen Schwellen und die spätere Pilot-Governance stehen in [fsrs-activation-policy.md](fsrs-activation-policy.md).

## 12. Kataloge

Unter **Kataloge** kann der aktive lokale Katalog gewechselt und verwaltet werden.

Mögliche Aktionen:

- neuen Katalog anlegen;
- duplizieren;
- aktiven Katalog exportieren;
- Katalog importieren;
- archivieren;
- archivierten Katalog wiederherstellen;
- archivierten Katalog endgültig löschen.

Vor destruktiven Archivierungs-/Löschaktionen erzeugt ETF einen lokalen Snapshot. Der letzte verfügbare Katalog kann nicht einfach entfernt werden.

Die redaktionellen Funktionen werden im [Autorenhandbuch](catalog-authoring.md) beschrieben.

## 13. Inhalte aus CSV, TSV und Anki importieren

ETF unterstützt den Import von:

- CSV;
- TSV;
- Anki `.apkg` (Legacy und moderne relevante Schemata).

Import erfolgt immer kontrolliert:

**Datei → Feldzuordnung → Preview → explizites Commit**.

Wichtige Sicherheitsregeln:

- importiertes HTML/JavaScript wird nicht als Anki-Template ausgeführt;
- Scheduling-/Review-Historie von Anki wird nicht übernommen;
- importierte Inhalte gelten als untrusted input;
- Medien werden nur über die sichere lokale Asset-Pipeline übernommen;
- unbekannte/ungültige Strukturen werden nicht stillschweigend geraten.

Importierte Inhalte werden in einen neuen ETF-Katalog übernommen und überschreiben keinen bestehenden Lernstand.

## 14. Backup und Wiederherstellung

### Empfohlen: `.etfb`-Vollbackup

Unter **Einstellungen**:

- `Vollbackup exportieren (.etfb)`;
- `Vollbackup importieren (.etfb)`.

Das Vollbackup enthält:

- Lernstand;
- Kataloge;
- lokale Binärassets.

Vor der Wiederherstellung werden Archivstruktur, Größenlimits und Asset-Hashes geprüft. State und Assets werden anschließend atomar ersetzt.

### Legacy: JSON-State

Die JSON-Funktionen bleiben kompatibel, enthalten aber keine Medien. Für Gerätewechsel oder vollständige Sicherung daher `.etfb` verwenden.

## 15. Offline- und Update-Verhalten

ETF besitzt Service Worker und Web-App-Manifest. Bereits geladene App-Ressourcen können offline bereitstehen.

Bei einer neuen App-Version erfolgt kein stiller Service-Worker-Takeover. Stattdessen erscheint ein Update-Hinweis; erst nach expliziter Auswahl von **Jetzt aktualisieren** übernimmt die neue Version und die Seite wird neu geladen.

Lokale Lern- und Katalogdaten liegen unabhängig davon in IndexedDB.

## 16. Bekannte Grenzen vor 1.0

Noch nicht als vollständig abgenommen gelten insbesondere:

- reale iPhone-Safari-Abnahme;
- Tablet-/Desktop-Handabnahme;
- vollständige redaktionelle Prüfung des Fügetechnik-Katalogs einschließlich fehlender Prüfungsassets und Quellenstellen;
- ausreichende reale FSRS-Shadow-Daten und ein späterer kontrollierter Classic-vs-FSRS-Pilot;
- optionale KI-gestützte Ursachenhypothesen (bewusst nicht Teil der kritischen Lernlogik).

Diese offenen Punkte sind in [ROADMAP.md](../ROADMAP.md) nachgeführt.
