# Exam Trainer Framework (ETF)

ETF ist eine lokale, offlinefähige Progressive Web App für prüfungsnahes Lernen, fünfstufige Wiederholungsplanung und Prüfungssimulationen.

Der erste Referenzkatalog ist **Fügetechnik**.

## MVP-Status

Version `0.2.0` enthält eine ausführbare MVP-Anwendung mit:

- responsiver Oberfläche für iPhone, iPad und Desktop;
- Offline-Service-Worker und PWA-Manifest;
- 41 freigegebenen Fügetechnik-Pilotkarten;
- 10 bewusst als `needs_review` ausgewiesenen Karten, weil Prüfungsbilder oder eindeutige Skriptbelege fehlen;
- Lernmodi für fällige, neue, fehlerhafte und alle Karten;
- fünf Stufen mit 10 Minuten, 1 Tag, 3 Tagen, 7 Tagen und 21 Tagen;
- den Bewertungen richtig, teilweise richtig und falsch;
- Wiederholung fehlerhafter Karten am Sitzungsende;
- Themenfilter, Markierungen und Sitzungsstatistik;
- zufälliger Prüfungssimulation mit bis zu 57 Aufgaben;
- lokalem Lernstand sowie JSON-Backup, Restore und Reset;
- lokaler oder Netlify-Bereitstellung.

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

## Netlify

Das Repository enthält `netlify.toml`.

- Build command: `npm run build`
- Publish directory: `dist`

## Pilotinhalt

Der eingebaute Pilot orientiert sich an den Fragen 1–11 des Gedächtnisprotokolls und an den belegten Inhalten des Fügetechnikskripts. Inhalte, deren Prüfungsbilder fehlen oder deren exakte Vorlesungsantwort aus den verfügbaren Quellen nicht eindeutig hervorgeht, sind nicht stillschweigend vervollständigt, sondern im Reviewbereich gekennzeichnet.

## Dokumentation

- [SPEC.md](SPEC.md)
- [ROADMAP.md](ROADMAP.md)
- [Katalogerstellung](docs/catalog-authoring.md)
- [Deployment](docs/deployment.md)
- [Fügetechnik-Katalog](catalogs/fuegetechnik/README.md)

## Datenschutz und Inhalte

ETF übermittelt keine Lern- oder Telemetriedaten. Lernstand wird im Browser gespeichert.

Das Fügetechnikskript ist urheberrechtlich geschützt und darf nur im zulässigen persönlichen Studienkontext verwendet werden. Das Repository darf deshalb keine nicht freigegebenen Skriptseiten oder Bildausschnitte öffentlich verteilen.
