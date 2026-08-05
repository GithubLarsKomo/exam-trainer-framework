# Exam Trainer Framework (ETF)

ETF ist eine lokale, offlinefähige Progressive Web App für **prüfungsnahes Lernen, adaptive Tagesplanung und Prüfungssimulationen**. Der erste Referenzkatalog ist **Fügetechnik**.

Das Produkt bleibt bewusst lokal und kontofrei: Lernstand, Kataloge und Medien werden im Browser gespeichert; es gibt keine ETF-Telemetrie und keinen externen Backend-Zwang.

## Aktueller Funktionsstand

Der aktuelle Entwicklungsstand umfasst unter anderem:

- responsive PWA für iPhone-/Tablet-/Desktop-Layouts;
- klassischen fünfstufigen Scheduler als autoritatives Wiederholungssystem;
- FSRS 5.4.1 im nicht-autoritativen Shadow-Modus mit expliziter Aktivierungspolicy;
- `Heute lernen` mit erklärbarer Adaptive Queue aus Fälligkeit, Lernstand, Prüfungsgewichtung, Coverage, Prüfungsnähe und Lernproblemen;
- Readiness, Verlauf und evidenzbasierte Lerndiagnostik;
- wiederaufnehmbare Lern- und Prüfungssitzungen mit exakter Queue-/Antwort-Wiederherstellung;
- feste und blueprint-gewichtete Prüfungssimulationen mit nichtlinearer Navigation;
- abhängige/atomare Prüfungsteilaufgaben;
- optionale Touch-Gesten mit vollständigem Button-Fallback;
- alle zehn vorgesehenen Fragetypen;
- mehrere lokale Kataloge mit Suche, Editor, Validierung, Workflow und Versionshistorie;
- lokale Asset-Bibliothek mit Bilder-/Audio-Import, SHA-256-Deduplizierung und Offline-Rendering;
- sicheren CSV-/TSV-/Anki-`.apkg`-Import über Preview → Commit;
- vollständige `.etfb`-Backups von Lernstand, Katalogen und Binärassets;
- automatisierte Browser-Acceptance in Chromium, Desktop-WebKit und Mobile-WebKit.

Der klassische Scheduler bleibt solange maßgeblich, bis genügend reale Shadow-Daten vorliegen und ein separater kontrollierter Classic-vs-FSRS-Pilot die festgelegten Retentions-/Aufwandskriterien erfüllt.

## Starten

```bash
npm install
npm run dev
```

Produktionsbuild:

```bash
npm run build
npm run preview
```

Direktes Öffnen über `file://` wird nicht unterstützt. Für PWA- und Offline-Funktionen ist ein lokaler HTTP-Server oder HTTPS erforderlich.

## Tests

Unit-/Build-Checks:

```bash
npm run test
npm run build
```

Browser-Acceptance:

```bash
npm run test:e2e
```

GitHub Actions führt zusätzlich getrennte Browser-Gates für Chromium, Desktop-WebKit und Mobile-WebKit aus.

## Netlify

Das Repository enthält `netlify.toml`.

- Build command: `npm run build`
- Publish directory: `dist`

## Dokumentation

Für die Bedienung und Redaktion sind die Handbücher der primäre Einstieg:

- [Benutzerhandbuch](docs/user-guide.md)
- [Autorenhandbuch / Katalogerstellung](docs/catalog-authoring.md)
- [FSRS-Aktivierungspolicy](docs/fsrs-activation-policy.md)
- [v0.5 Acceptance Matrix](docs/acceptance-v0.5.md)
- [v0.5 Release Notes](docs/release-notes-v0.5.md)
- [Deployment](docs/deployment.md)
- [Spezifikation](SPEC.md)
- [Roadmap](ROADMAP.md)
- [Fügetechnik-Katalog](catalogs/fuegetechnik/README.md)

## Fügetechnik-Referenzkatalog

Der eingebaute Katalog orientiert sich an verfügbaren Gedächtnisprotokoll- und Skriptinformationen. Fehlende Prüfungsbilder, nicht vollständig belegte Quellenstellen oder historisch noch nicht belastbar validierte Verteilungen werden bewusst **nicht durch Annahmen geschlossen**.

Die offenen redaktionellen Punkte sind in der Roadmap ausgewiesen und blockieren den vollständigen 1.0-Katalogstatus.

## Datenschutz, Sicherung und Inhalte

ETF übermittelt keine Lern- oder Telemetriedaten. Browserdaten können jedoch lokal gelöscht werden. Für vollständige Sicherung und Gerätewechsel daher regelmäßig das `.etfb`-Vollbackup verwenden; das ältere JSON-Backup enthält keine Binärmedien.

Das Fügetechnikskript und Prüfungsabbildungen können urheberrechtlich geschützt sein. Nicht freigegebene Skriptseiten oder Bildausschnitte dürfen deshalb nicht allein zur Vervollständigung des Katalogs öffentlich ins Repository aufgenommen werden.

## Noch offen vor 1.0

Insbesondere noch offen sind:

- reale iPhone-Safari- sowie Tablet-/Desktop-Handabnahme;
- vollständige Fügetechnik-Quellen-/Asset-Redaktion und historische Prüfungsverteilung;
- genügend reale FSRS-Shadow-Daten und ggf. ein kontrollierter Pilot;
- vollständige 1.0-Abnahme und Tagging.

Siehe [ROADMAP.md](ROADMAP.md) für den verbindlichen Status.
