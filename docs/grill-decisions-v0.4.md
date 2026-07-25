# ETF 0.4 – UX/UI- und Katalogeditor-Entscheidungen

## Ziel

Version 0.4 entwickelt das technische MVP zu einer mobil gut nutzbaren Lernanwendung mit vollständiger lokaler Edition des aktiven Fragenkatalogs weiter. Die Anwendung bleibt ohne Anmeldung, ohne Rollenmodell, ohne Synchronisation und ohne externen Backend-Zwang vollständig lokal nutzbar.

## Verbindliche Entscheidungen aus Grilling-Runde 4

### Nutzer und Zugriff

- Genau ein lokaler Nutzer, keine Anmeldung.
- Jeder Nutzer darf Kataloge bearbeiten.
- Der redaktionelle Bereich ist nicht verborgen und nicht durch PIN oder Rollen geschützt.

### Kataloge

- Mehrere Kataloge dürfen gleichzeitig installiert und für das Lernen ausgewählt werden.
- Eine einzelne Lernsitzung mischt keine Kataloge.
- Kataloge besitzen keine zusätzliche Modulhierarchie; Themen und Unterthemen reichen aus.
- Vollständige Katalogedition muss auch auf dem iPhone möglich sein.

### Fragetypen

Version 0.4 unterstützt alle vorgesehenen Typen:

1. Freitext
2. Zahl
3. Single Choice
4. Multiple Choice
5. Lückentext
6. Zuordnung
7. Reihenfolge
8. Bildbeschriftung
9. Zeichnung
10. Fallaufgabe

### Bewertung

- Keine automatische Teilpunkteberechnung für Freitext- oder komplexe Aufgaben.
- Pflichtbegriffe und Synonyme dienen nur als unverbindliche Bewertungshilfe.
- Synonyme werden ausschließlich pro Karte gepflegt.
- Tippfehlertoleranz verwendet zunächst eine feste Levenshtein-Toleranz.
- Automatische Prüfungsbewertung erfolgt ausschließlich für Zahlen- und Auswahlfragen.
- Manuelle Selbstbewertung bleibt für Freitext, Bildbeschriftung, Zeichnung und Fallaufgaben maßgeblich.

### Redaktioneller Workflow

- Ein-Personen-Freigabe: Der Autor darf selbst veröffentlichen.
- Veröffentlichte Karten werden nicht direkt überschrieben.
- Jede Änderung einer veröffentlichten Karte erzeugt eine neue Entwurfsversion.
- Änderungsgründe sind optional.
- Zielstatusmodell:
  - `draft`
  - `in_review`
  - `changes_requested`
  - `approved`
  - `released`
  - `retired`

### Prüfung

- Sowohl feste historische Prüfungsprofile als auch dynamische Prüfungen nach Themengewichtung werden unterstützt.
- Abhängige Aufgaben sind erlaubt, beispielsweise Teilaufgabe 3b auf Basis des Ergebnisses aus 3a.
- Automatische Bewertung nur für Zahlen- und Auswahlfragen.

### Speicherung und Synchronisation

- Keine Synchronisation zwischen Geräten.
- Keine GitHub-Anbindung aus der Anwendung.
- Keine Konfliktbehandlung erforderlich; lokale letzte Änderung gewinnt.
- Datensicherheit erfolgt über IndexedDB, Snapshots sowie manuellen JSON-Export und -Import.

## Verbindlicher Funktionsumfang 0.4

### 1. Neue Informationsarchitektur

Hauptnavigation:

- Start
- Lernen
- Prüfung
- Fortschritt
- Kataloge
- Einstellungen

Darstellung:

- iPhone: feste untere Tab-Leiste mit maximal fünf primären Zielen; Einstellungen über Mehr-Menü oder Katalogbereich erreichbar.
- Desktop und Tablet quer: linke Navigation oder kompakte obere Navigation.
- Redaktionelle Funktionen befinden sich vollständig unter `Kataloge`.

### 2. Überarbeiteter Startbildschirm

- Primäre Aktion `Jetzt lernen`.
- Anzahl fälliger und neuer Karten.
- Geschätzte Sitzungsdauer.
- Letzte Prüfung und Themenfortschritt.
- Offline-Status.
- Hinweis auf letztes Backup.
- Auswahl des aktiven Lernkatalogs.

### 3. Verbesserte Lernansicht

- Fokus auf genau eine Aufgabe.
- Sitzungsfortschritt und geschätzte Restdauer.
- Große, iPhone-taugliche Bewertungsflächen.
- `Später beantworten` statt technischem Überspringen.
- Eigene Antwort bleibt nach dem Aufdecken sichtbar.
- Klare Trennung von eigener Antwort, Musterlösung, Bewertungshilfe und Selbsteinstufung.
- Tastatursteuerung auf Desktop.
- Swipe-Gesten auf Touch-Geräten optional, aber nicht als einzige Bedienmöglichkeit.
- Autosave der laufenden Sitzung.

### 4. Mehrere lokale Kataloge

- Katalogliste mit Metadaten, Kartenanzahl und Statuszählung.
- Genau ein Katalog pro Lernsitzung.
- Auswahl des aktiven Lernkatalogs.
- Katalog anlegen, duplizieren, importieren, exportieren, archivieren und löschen.
- Der integrierte Fügetechnik-Katalog wird beim ersten Start als lokaler Katalog angelegt.

### 5. Vollständiger Karteneditor

Pflichtfelder und Funktionen:

- ID
- Titel
- Thema
- Unterthema
- Aufgabenstellung
- Fragetyp
- Punkte
- Schwierigkeit
- Tags
- Musterlösung
- Pflichtbegriffe
- Synonyme pro Karte
- Tippfehlertoleranz
- Alternativantworten
- Bewertungskriterien
- Quellenangaben
- Status und Version
- Live-Vorschau
- Duplizieren
- Archivieren

### 6. Suche, Filter und Tabellenansicht

- Volltextsuche.
- Filter nach Thema, Unterthema, Status, Fragetyp, Schwierigkeit und Tags.
- Sortierung nach ID, Titel, Änderung, Punkten und Status.
- Mehrfachauswahl.
- Massenänderung für Status, Thema, Tags und Punkte.

### 7. Versionierung und Freigabe

- Veröffentlichte Versionen sind unveränderlich.
- Bearbeitung erzeugt eine neue `draft`-Version.
- Versionshistorie je Karte.
- Vergleich der aktuellen Entwurfsversion mit der veröffentlichten Version.
- Wiederherstellung einer früheren Version als neuer Entwurf.
- Statuswechsel werden mit Zeitpunkt protokolliert.

### 8. Asset-Verwaltung

- Bilder lokal in IndexedDB speichern.
- Metadaten: ID, Dateiname, MIME-Type, Größe, Prüfsumme, Quelle, Rechtehinweis, Alternativtext und Verwendungen.
- Bild-Upload auf dem iPhone über Dateiauswahl oder Fotomediathek.
- Vorschau, Ersetzen und Löschen nur bei fehlenden Verwendungen.
- Bildbeschriftung mit benannten Hotspots.

### 9. Live-Vorschau

Editor-Tabs:

- Bearbeiten
- Vorschau
- JSON

Die Vorschau verwendet denselben Renderer wie Lernen und Prüfung.

### 10. Validierungsbericht vor Veröffentlichung

Validierung umfasst mindestens:

- doppelte IDs
- fehlende Pflichtfelder
- fehlende oder ungültige Musterlösung
- ungültige Punktzahl
- ungültige Fragetypdaten
- nicht vorhandene Assets
- leere Auswahloptionen
- keine oder mehrere richtige Antworten bei Single Choice
- ungültige Abhängigkeiten
- zyklische Aufgabenabhängigkeiten
- fehlende Quelle als Warnung
- verwaiste Assets als Warnung
- ungültige Prüfungsprofile

Kritische Fehler blockieren `released`; Warnungen erlauben die Veröffentlichung nach Bestätigung.

## Nicht Bestandteil von 0.4

- Benutzerkonten
- Rollen und Berechtigungen
- PIN-Schutz
- Mehrbenutzersystem
- Geräteübergreifende Synchronisation
- WebDAV, iCloud oder eigener Server
- GitHub-Synchronisation
- LLM-Bewertung
- Automatische Teilpunkte für komplexe Antworten
- Katalogmodule oberhalb von Thema und Unterthema

## Technische Leitplanken

- TypeScript `strict` bleibt aktiviert.
- IndexedDB bleibt primärer Speicher.
- Bestehende Lernstände werden migriert.
- Katalog-, Karten- und Assetdaten werden getrennt vom Lernfortschritt gespeichert.
- Jeder destruktive Vorgang erzeugt zuvor einen Snapshot.
- Importdaten werden vor Übernahme vollständig validiert.
- Alle Kernfunktionen müssen auf iPhone Safari ohne Hover und ohne Hardwaretastatur bedienbar sein.
- Touch-Ziele mindestens 44 × 44 CSS-Pixel.
- Keine Telemetrie und keine externen Laufzeitabhängigkeiten.

## Abnahmekriterien

Version 0.4 ist abgenommen, wenn:

1. mindestens zwei Kataloge parallel installiert werden können;
2. eine Lernsitzung gezielt aus genau einem Katalog gestartet wird;
3. alle zehn Fragetypen angelegt, bearbeitet, gespeichert und dargestellt werden können;
4. eine veröffentlichte Karte nicht direkt überschrieben werden kann;
5. eine neue Version als Entwurf aus einer veröffentlichten Karte erzeugt wird;
6. Suche, Filter, Sortierung und Massenänderung funktionieren;
7. Bilder lokal importiert und in Karten verwendet werden können;
8. der Validierungsbericht kritische Fehler zuverlässig blockiert;
9. Kataloge vollständig exportiert und wieder importiert werden können;
10. die Kernabläufe auf iPhone Safari ohne horizontales Scrollen bedienbar sind;
11. bestehender Lernfortschritt nach Migration erhalten bleibt;
12. automatisierte Tests und Produktionsbuild erfolgreich durchlaufen.
