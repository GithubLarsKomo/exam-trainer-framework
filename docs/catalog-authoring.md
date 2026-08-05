# Exam Trainer Framework — Autorenhandbuch

## 1. Ziel und Redaktionsprinzip

ETF behandelt Lerninhalte als versionierte, lokal gepflegte Prüfungsinhalte. Ziel ist nicht, möglichst viele Karten zu erzeugen, sondern **prüfungsrelevante, belegte und nachvollziehbar freigegebene Wissenseinheiten** bereitzustellen.

Grundregeln:

1. stabile logische Karten-IDs verwenden;
2. Prüfungsstruktur und Quellenbezug erhalten;
3. Unsicherheit nicht „wegformulieren“, sondern als offenen Reviewbedarf behandeln;
4. veröffentlichte Inhalte niemals in-place verändern;
5. kritische Validierungsfehler vor `released` beheben;
6. lokale Bilder/Medien nur mit geklärtem Nutzungsrahmen übernehmen;
7. Lernfortschritt und Inhaltsredaktion getrennt halten.

## 2. Kataloge

Ein Katalog enthält unter anderem:

- Karten;
- optional KnowledgeItem-/QuestionVariant-Projektionen;
- lokale Asset-Manifeste;
- optional ein ExamBlueprint;
- Versions-/Workflowinformationen.

Eine Lernsitzung arbeitet immer mit genau einem aktiven Katalog.

### Katalog-Lifecycle

Unter **Kataloge → Katalog-Lifecycle** stehen zur Verfügung:

- aktiven Katalog exportieren;
- Katalog importieren;
- aktiven Katalog archivieren;
- archivierte Kataloge wiederherstellen;
- archivierte Kataloge endgültig löschen.

Archivieren und endgültiges Löschen erzeugen vorher einen lokalen Snapshot. Der letzte verfügbare Katalog wird geschützt.

## 3. Kartenmodell

Eine Karte besitzt mindestens:

- ID;
- Version und Workflowstatus;
- Thema;
- Prüfungsreferenz (`examQuestion`);
- Aufgabenstellung;
- Punkte;
- Schwierigkeit;
- Tags;
- Fragetyp;
- Musterlösung;
- Quelle;
- Änderungszeitpunkt.

Zusätzlich können u. a. gepflegt werden:

- Titel/Unterthema-Kontext;
- Pflichtbegriffe;
- Synonyme;
- Tippfehlertoleranz;
- strukturierte Antwortdaten;
- Quellenstelle;
- Asset-Referenzen;
- abhängige Prüfungsgruppe und Reihenfolge;
- Änderungsgrund.

Neue Karten starten immer als `draft`.

## 4. Unterstützte Fragetypen

ETF unterstützt zehn Fragetypen:

1. Freitext (`free_text`)
2. Zahl (`numeric`)
3. Single Choice (`single_choice`)
4. Multiple Choice (`multiple_choice`)
5. Lückentext (`cloze`)
6. Zuordnung (`matching`)
7. Reihenfolge (`ordering`)
8. Bildbeschriftung (`image_labels`)
9. Zeichnung (`drawing`)
10. Fallaufgabe (`case_study`)

### Freitext

Musterlösung und optional Pflichtbegriffe/Synonyme pflegen. Pflichtbegriffe dienen als Bewertungshilfe; die Selbsteinstufung bleibt maßgeblich.

### Zahl

Numerischen Zielwert und Toleranz pflegen. Die App kann den eingegebenen Wert gegen die Toleranz vergleichen.

### Single Choice

Mindestens zwei Optionen; **genau eine** richtige Option.

Kompakte Authoring-Syntax: eine Option pro Zeile, die richtige Option mit `*` markieren.

### Multiple Choice

Mindestens zwei Optionen; mindestens eine richtige Option.

Syntax: eine Option pro Zeile, jede richtige Option mit `*` markieren.

### Lückentext

Lücken mit `{{Antwort}}` schreiben. Anki-artige Schreibweise `{{c1::Antwort}}` wird ebenfalls unterstützt.

### Zuordnung

Eine Paarung pro Zeile:

```text
links => rechts
```

Mindestens zwei Paare anlegen.

### Reihenfolge

Ein Element pro Zeile in der **korrekten** Reihenfolge eingeben. Die Lernansicht mischt die Darstellung deterministisch, damit die gespeicherte Reihenfolge nicht verraten wird.

### Bildbeschriftung

Ein sicheres lokales Rasterbild als Prompt-Asset zuordnen und im Hotspot-Editor normalisierte Positionen mit Labels anlegen. Die Koordinaten werden relativ zum Bild gespeichert und skalieren responsiv.

### Zeichnung

Musterlösung und Kriterienliste pflegen. Die eigentliche Zeichnung wird außerhalb des automatischen Antwortvergleichs angefertigt; die Selbstbewertung bleibt maßgeblich.

### Fallaufgabe

Eine Teilfrage pro Zeile in der Form:

```text
Teilfrage => Musterantwort
```

Die Kartenfrage bleibt der übergeordnete Fallstamm.

## 5. Abhängige Prüfungsaufgaben

Für Prüfungsaufgaben wie `3a`, `3b`, `3c`, bei denen spätere Teile logisch vom Vorgänger abhängen, stehen zwei Metadaten zur Verfügung:

- **Prüfungsgruppe** (`examGroupId`)
- **Reihenfolge in Gruppe** (`examGroupOrder`, positive Ganzzahl)

Regeln:

- gleiche Gruppe = atomare Auswahleinheit in einer Prüfung;
- die definierte Reihenfolge bleibt erhalten;
- spätere Teilaufgaben bleiben gesperrt, bis der Vorgänger bewertet wurde;
- eine Gruppe muss innerhalb **eines Themas** bleiben, damit Blueprint-Gewichte eindeutig sind;
- eine Reihenfolge darf innerhalb derselben Gruppe nicht doppelt vergeben werden;
- Gruppe ohne Reihenfolge bzw. Reihenfolge ohne Gruppe ist ein Validierungsfehler;
- Einzelmitglied-Gruppen erzeugen eine Warnung.

## 6. ExamBlueprint

Ein Katalog kann ein Prüfungs-Blueprint besitzen mit:

- Prüfungstermin;
- relativen Themengewichten;
- Gesamtaufgabenzahl;
- Gesamtpunkten;
- Bestehensgrenze;
- Zeitlimit.

Themengewichte sind relativ. `30 / 20 / 50` ist ebenso gültig wie `3 / 2 / 5`.

Wenn kein echtes Blueprint bekannt ist, darf ETF als technischen Fallback gleiche Themengewichte verwenden. Dieser Fallback ist **kein Ersatz für belegte historische Prüfungsverteilung**.

Bei abhängigen Aufgaben bleiben Gruppen trotz Zielgröße unteilbar. Ein Überschreiten der Zielzahl ist nur zulässig, wenn die kleinste auswählbare atomare Gruppe selbst größer als die Zielzahl ist.

## 7. Quellen und redaktionelle Evidenz

So konkret wie verfügbar dokumentieren:

- Dateiname/Publikation;
- Kapitel/Abschnitt;
- PDF-Seite bzw. gedruckte Seite;
- historische Prüfungsfrage;
- ggf. Quellenart und Zugriffsdatum.

Für veröffentlichte Karten ist eine Quelle erforderlich. Eine fehlende genaue Seiten-/Abschnittsangabe kann als Warnung erscheinen.

Bei unsicheren Gedächtnisprotokollen, fehlenden Bildern oder nicht eindeutig belegbaren Antworten keine scheinexakte Musterlösung erfinden. Solche Inhalte bleiben im Reviewbedarf, bis ein belastbarer Beleg vorliegt.

## 8. Assets

Binärassets liegen getrennt von den Katalogdaten in IndexedDB und werden per SHA-256 dedupliziert.

Asset-Metadaten umfassen u. a.:

- Dateiname;
- MIME-Type;
- Größe;
- Hash;
- Quelle;
- Alternativtext;
- Rechtehinweis;
- Verwendungen.

### Zulässige Runtime-Darstellung

Die Runtime rendert nur ausdrücklich erlaubte Rasterbild-/Audioformate. SVG, HTML, PDF oder unbekannte Inhalte werden nicht als aktiver Inhalt ausgeführt.

### Kartenreferenzen

Assets können Rollen erhalten, z. B.:

- `prompt`;
- `answer`;
- `reference`;
- `attachment`.

Prompt-/Attachment-Medien können vor Reveal sichtbar sein; Antwort-/Referenzmedien erst nach dem Aufdecken.

Nicht mehr verwendete Assets nur löschen, wenn keine Karten-/Katalogreferenz mehr besteht. Die Asset-Validierung prüft u. a. fehlende Binärdaten, ungenutzte Manifeste und verwaiste Storage-Einträge.

## 9. Import aus CSV, TSV und Anki

Importierte Dateien sind **untrusted input**.

Der verbindliche Ablauf ist:

1. lokale Datei wählen;
2. Parser/Normalisierung;
3. Felder zuordnen;
4. Preview prüfen;
5. explizit als `draft` oder bewusst als `released` committen.

### Sicherheitsgrenzen

- importierte Templates werden nicht ausgeführt;
- HTML wird nicht als Anki-Runtime übernommen;
- Anki-Review-/Scheduling-Historie wird nicht importiert;
- Archive und entpackte Inhalte unterliegen Größenlimits;
- moderne Anki-Medien werden über zstd/protobuf-Metadaten dekodiert und auf Größe/Hash geprüft;
- unbekannte Schemas werden nicht geraten.

Der Import legt einen neuen Katalog an und überschreibt vorhandene Kataloge/Lernstände nicht.

## 10. Redaktionsworkflow und Versionierung

Statusmodell:

```text
draft
  ↓
in_review
  ├─→ changes_requested → draft
  └─→ approved
         ↓
      released
         ↓
      retired
```

Die konkret erlaubten Übergänge werden von der Anwendung angeboten; der normale Status-Select und Bulk-Statuswechsel sind gesperrt.

### Bearbeiten einer veröffentlichten Karte

Eine `released`-Karte wird niemals direkt überschrieben.

Beim Bearbeiten:

1. ETF erzeugt einen neuen Draft-Nachfolger;
2. die veröffentlichte Version bleibt unverändert;
3. die logische Karten-ID bleibt für den Lernfortschritt stabil;
4. Änderungen werden im Versions-/Workflowkontext geführt.

### Veröffentlichung

Nur eine `approved`-Version kann veröffentlicht werden.

Vor Veröffentlichung:

- **Fehler** blockieren;
- **Warnungen** verlangen eine explizite Bestätigung.

Bei erfolgreichem Release wird die bisherige Veröffentlichung in der Versionshistorie erhalten und die neue Version unter der stabilen logischen ID aktiv.

### Historie

Im Editor stehen zur Verfügung:

- Versionshistorie;
- Feldvergleich einer historischen mit der aktuellen Version;
- Wiederherstellung einer früheren Version als **neuer Draft**;
- Workflow-Protokoll mit Zeit und Hinweis.

## 11. Katalogvalidierung

Der Katalogbericht prüft u. a.:

- doppelte IDs;
- fehlende Frage/Musterlösung;
- fehlende Quelle beim Release;
- fehlende Quellenstelle als Warnung;
- fehlende Tags als Warnung;
- doppelte/ähnliche Fragen als Warnung;
- ungültige Single-/Multiple-Choice-Strukturen;
- ungültige Cloze-, Matching-, Ordering-, Case-Study- und Image-Label-Daten;
- inkonsistente Prüfungsgruppen;
- doppelte Gruppenreihenfolge;
- themenübergreifende Gruppen;
- Einzelmitglied-Gruppen als Warnung.

Asset- und weitere spezialisierte Validierungen ergänzen diesen Bericht.

## 12. Lernfortschritt bei Inhaltsänderungen

Die logische Kartenidentität ist wichtig. Änderungen einer veröffentlichten Karte werden versioniert, statt neue unabhängige Lernobjekte zu erzeugen.

Für echte inhaltliche Änderungen an Frage/Musterlösung/zentralen Bewertungskriterien muss redaktionell geprüft werden, ob bestehender Lernfortschritt fachlich noch vergleichbar ist. Nicht durch ID-Wechsel „lösen“, weil dadurch Historie und Diagnostik künstlich getrennt würden.

## 13. Backup vor Redaktionsarbeit

Vor größeren Katalogumbauten oder Gerätewechseln ein `.etfb`-Vollbackup erstellen. Es enthält Kataloge, Lernstand und Binärassets.

Katalogexport ist sinnvoll zum Transport eines einzelnen Katalogs; ein Vollbackup ist dagegen die vollständige Wiederherstellungsstrategie des lokalen Systems.

## 14. FSRS, Diagnostik und Autorenverantwortung

FSRS ist kein Autorenparameter. Autoren verändern keine FSRS-Zustände und legen keine Fälligkeiten fest.

Lerndiagnostik beschreibt beobachtbare Muster; sie darf nicht als Beweis für eine fachliche Ursache missverstanden werden. Wenn ein Inhalt wiederholt Probleme erzeugt, sind mögliche redaktionelle Maßnahmen beispielsweise:

- Erklärung verbessern;
- alternative Fragevariante ergänzen;
- Wissenseinheit kleiner schneiden;
- Quelle/Musterlösung prüfen;
- Prüfungsrelevanz bzw. Blueprint-Zuordnung prüfen.

Optionale KI-gestützte Ursachenhypothesen sind derzeit bewusst nicht Teil der kritischen Redaktions-/Schedulinglogik.

## 15. Release-Checkliste für Autoren

Vor Veröffentlichung einer Karte bzw. eines Katalogstands:

- [ ] Frage fachlich eindeutig und prüfungsnah
- [ ] Musterlösung durch Quelle belegt
- [ ] Quellenstelle soweit verfügbar dokumentiert
- [ ] Punkte/Fragetyp plausibel
- [ ] strukturierte Antwortdaten valide
- [ ] Abhängigkeiten korrekt modelliert
- [ ] Assets vorhanden, Rechte/Alt-Text geprüft
- [ ] keine blockierenden Katalogfehler
- [ ] Warnungen bewusst geprüft
- [ ] Versionsvergleich bei geändertem Release durchgeführt
- [ ] Änderungsgrund bei materieller Änderung dokumentiert
- [ ] vor größeren Eingriffen Vollbackup erstellt

## 16. Fügetechnik-spezifische Restarbeit

Für den mitgelieferten Referenzkatalog sind vor 1.0 weiterhin redaktionelle Inputs offen, insbesondere:

- freigegebene lokale Prüfungsbilder;
- vollständige Seiten-/Abschnittsangaben;
- verbleibende Reviewfälle;
- belastbare Validierung der historischen Aufgaben-/Punkteverteilung gegen die Originalquellen.

Diese Punkte dürfen nicht durch Annahmen oder künstlich vervollständigte Daten geschlossen werden.
