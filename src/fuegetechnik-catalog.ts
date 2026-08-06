import { additionalFuegetechnikCards } from './builtin-v04-additions';
import { builtinCatalog as baseCatalog } from './builtin-v04';
import type { CardVersion, Catalog } from './model';

export const FUEGETECHNIK_RUNTIME_VERSION = '0.5.7';
export const FUEGETECHNIK_RUNTIME_UPDATED_AT = '2026-08-06T21:25:00.000Z';

const verifiedSourcePages: Record<string, string> = {
  ft0201: 'S. 17 · 3.3.1 Festigkeitsklassen',
  ft0202: 'S. 17 · 3.3.1 Festigkeitsklassen',
  ft0203: 'S. 17 · 3.3.1 Festigkeitsklassen',
  ft0401: 'S. 19–20 · 3.4.1 Vorspannkraft',
  ft0501: 'S. 19 · 3.4.1 Vorspannkraft / Verspannungsdreieck',
  ft1101: 'S. 61 · 4.5.1 Fügegeometrien und Festigkeit',
  ft1102: 'S. 61 · 4.5.1 Fügegeometrien und Festigkeit',
  ft1103: 'S. 61 · 4.5.1 Fügegeometrien und Festigkeit',
  ft1201: 'S. 75 · 5.4 Das schweißtechnische Dreieck',
  ft1202: 'S. 75 · 5.4 Das schweißtechnische Dreieck',
  ft1301: 'S. 75–76 · 5.4 Das schweißtechnische Dreieck',
  ft1302: 'S. 75–76 · 5.4 Das schweißtechnische Dreieck',
  ft1401: 'S. 79–80 · 5.4.1.4 Schweißeignung hochlegierter Stähle',
  ft1402: 'S. 79–80 · 5.4.1.4 Schweißeignung hochlegierter Stähle',
  ft1501: 'S. 97 · 5.6.1.3 Schutzgasschweißen / Tabelle 10',
  ft1601: 'S. 91 · 5.6.1.2 Lichtbogenhandschweißen / Abbildung 92',
  ft1602: 'S. 91 · 5.6.1.2 Lichtbogenhandschweißen / Abbildung 92',
  ft1801: 'S. 97 · 5.6.1.3 Schutzgasschweißen',
  ft1802: 'S. 97 · 5.6.1.3 Schutzgasschweißen',
  ft1803: 'S. 97–98 · 5.6.1.3 Schutzgasschweißen',
  ft1901: 'S. 72–73 · 5.3 Grundlagen – Werkstoffkunde / Wärmeeinflusszone',
  ft1902: 'S. 72–73 · 5.3 Grundlagen – Werkstoffkunde / Wärmeeinflusszone',
  ft2101: 'S. 113 · 5.7.1 Mechanisch-technologische Verfahren',
  ft2201: 'S. 74 · 5.3 Grundlagen – ZTU / Abkühlzeit t8/5',
  ft2202: 'S. 73–76 · ZTU / t8/5 und 5.4.1.1 Schweißeignung der Stähle',
  ft2203: 'S. 73–74 · ZTU / Abkühlzeit t8/5',
  ft2301: 'S. 73–74 · Abbildung 81 ZTU-Diagramm',
  ft2302: 'S. 73–74 · Abbildung 81 ZTU-Diagramm',
  ft2303: 'S. 73–76 · ZTU und 5.4.1.1 Schweißeignung der Stähle',
  ft2501: 'S. 76–77 · 5.4.1.1 Schweißeignung unlegierter und niedriglegierter Stähle',
  ft2601: 'S. 77 · 5.4.1.1 Schweißeignung unlegierter und niedriglegierter Stähle',
  ft2701: 'S. 73–76 · ZTU/Abkühlverhalten und 5.4.1.1 Schweißeignung der Stähle',
  ft2801: 'S. 104 · 5.6.2 Pressschweißverfahren',
  ft3101: 'S. 102–103 · Elektronenstrahlschweißen',
  ft3102: 'S. 102–103 · Elektronenstrahlschweißen',
  ft3201: 'S. 101–102 · Laser- und Elektronenstrahlschweißen',
  ft3301: 'S. 100 · Tabelle 11 Lasertypen und technischer Anwendungsbereich',
  ft3501: 'S. 154 · 7.1 Einordnung / DIN-16920-Klebstoffdefinition',
  ft3701: 'S. 155–156 · 7.2.1 Benetzung / Youngsche Gleichung',
  ft3801: 'S. 160–163 · 7.4.1–7.4.3 Klebstoffe nach Abbindemechanismus',
  ft3802: 'S. 160–163 · 7.4.1–7.4.3 Klebstoffe nach Abbindemechanismus',
  ft3901: 'S. 157–158 · 7.3.1 Vorteile von Verklebungen',
  ft3902: 'S. 158–159 · 7.3.2 Nachteile von Verklebungen',
  ft4201: 'S. 69–70 · 5.2 Schweißen als Fertigungsverfahren / Definition Löten',
  ft4401: 'S. 133, 149–150 · Flussmittel / 6.5.3 Vor- und Nachbereitung der Lötverbindung',
  ft4402: 'S. 150 · 6.5.3 Vor- und Nachbereitung der Lötverbindung',
};

function applyVerifiedSourceGrounding(card: CardVersion): CardVersion {
  const grounded = structuredClone(card);
  grounded.sourcePage = verifiedSourcePages[grounded.id] ?? grounded.sourcePage;

  if (grounded.id === 'ft1501') {
    grounded.answer.modelAnswer = 'Sprühlichtbogen, Langlichtbogen, Übergangslichtbogen, Kurzlichtbogen und Impulslichtbogen.';
    grounded.answer.requiredTerms = ['Sprühlichtbogen', 'Langlichtbogen', 'Übergangslichtbogen', 'Kurzlichtbogen', 'Impulslichtbogen'];
    grounded.changeReason = 'Quellenabgleich: Tabelle 10 auf S. 97 führt fünf MSG-Lichtbogenarten einschließlich Langlichtbogen auf.';
  }

  if (grounded.id === 'ft1601') {
    grounded.prompt = 'Zeichne die Stromquellenkennlinie des Lichtbogenhandschweißens und trage die Kennlinien für kurzen und langen Lichtbogen ein.';
    grounded.questionType = 'drawing';
    grounded.answer = {
      modelAnswer: 'U-I-Diagramm mit steil fallender statischer Maschinenkennlinie sowie Lichtbogenkennlinien für kurzen und langen Lichtbogen.',
      criteria: ['Spannungsachse U', 'Stromachse I', 'steil fallende Maschinenkennlinie', 'Kurzlichtbogen', 'Langlichtbogen'],
    };
    grounded.changeReason = 'Quellenabgleich: Abbildung 92 auf S. 91 zeigt die fallende Konstantstromkennlinie sowie kurzen und langen Lichtbogen und entspricht damit der erinnerten Prüfungsaufgabe 16.';
  }

  if (grounded.id === 'ft2202') {
    grounded.answer.modelAnswer = 'Eine kurze t8/5-Zeit entspricht schneller Abkühlung. Das ZTU-Diagramm zeigt dabei eine Verschiebung in Richtung martensitischen Gefüges und höherer Härte; hohe Abkühlgeschwindigkeiten begünstigen außerdem die Härterissgefahr.';
    grounded.answer.requiredTerms = ['kurze t8/5', 'schnelle Abkühlung', 'Martensit', 'Härte'];
    grounded.changeReason = 'Quellenabgleich: S. 73–74 verknüpfen Abkühlungsdauer, Gefüge und Härte; S. 76 nennt steigende Abkühlgeschwindigkeit als Härterissfaktor.';
  }

  if (grounded.id === 'ft2203') {
    grounded.answer.modelAnswer = 'Eine lange t8/5-Zeit entspricht langsamerer Abkühlung. Im ZTU-Diagramm verschiebt sich die Gefügebildung weg vom Martensit in Richtung Zwischenstufengefüge sowie Ferrit/Perlit; die martensitische Aufhärtung nimmt damit ab.';
    grounded.answer.requiredTerms = ['lange t8/5', 'langsame Abkühlung', 'Ferrit', 'Perlit'];
    grounded.changeReason = 'Quellenabgleich: Abbildung 81 zeigt bei längeren Abkühlzeiten Zwischenstufen- sowie Ferrit/Perlit-Bereiche; die zuvor ergänzte Kornwachstumsbehauptung ist dafür nicht erforderlich.';
  }

  if (grounded.id === 'ft2301') {
    grounded.answer.modelAnswer = 'Mit zunehmender Abkühlgeschwindigkeit verschiebt sich das Gefüge im ZTU-Diagramm von Ferrit/Perlit über das Zwischenstufengefüge zum Martensit.';
    grounded.answer.requiredTerms = ['Ferrit', 'Perlit', 'Zwischenstufengefüge', 'Martensit'];
    grounded.changeReason = 'Quellenabgleich: Abbildung 81 zeigt die Bereiche F, P, Zw und M entlang zunehmend schneller Abkühlverläufe.';
  }

  if (grounded.id === 'ft2302') {
    grounded.answer.modelAnswer = 'Die resultierende Härte hängt von der Abkühlungsdauer und dem entstehenden Gefüge ab. Schnellere Abkühlung verschiebt die Gefügebildung in Richtung Martensit und damit zu stärkerer Aufhärtung.';
    grounded.answer.requiredTerms = ['Härte', 'Abkühlungsdauer', 'Martensit'];
    grounded.changeReason = 'Quellenabgleich: S. 73–74 beschreiben ZTU/STAZ ausdrücklich als Zusammenhang von Abkühlungsdauer, Gefügeanteilen und Härte.';
  }

  if (grounded.id === 'ft2303') {
    grounded.answer.modelAnswer = 'Bei hoher Abkühlgeschwindigkeit ist die Härteriss- beziehungsweise Kaltrissgefahr höher, weil schnelle Abkühlung martensitische Aufhärtung begünstigt.';
    grounded.answer.requiredTerms = ['hohe Abkühlgeschwindigkeit', 'Martensit', 'Härteriss'];
    grounded.changeReason = 'Quellenabgleich: ZTU beschreibt die Martensitbildung bei schneller Abkühlung; S. 76 nennt zunehmende Abkühlgeschwindigkeit ausdrücklich als Faktor der Härterissgefahr.';
  }

  if (grounded.id === 'ft2601') {
    grounded.answer.modelAnswer = 'Durch das Kohlenstoffäquivalent K. Das Skript verwendet beispielsweise K = C + Mn/6 + Cr/5 + Ni/15 + Mo/4 + Cu/13 + P/2.';
    grounded.answer.requiredTerms = ['Kohlenstoffäquivalent', 'K'];
    grounded.changeReason = 'Quellenabgleich: Das Skript bezeichnet den verwendeten Kennwert ausdrücklich als Kohlenstoffäquivalent K.';
  }

  if (grounded.id === 'ft2701') {
    grounded.answer.modelAnswer = 'Ein höherer Kohlenstoffgehalt erhöht die Härtbarkeit beziehungsweise Aufhärtungsneigung. Bei schneller Abkühlung wird dadurch die Bildung harten martensitischen Gefüges und damit die Härteriss- beziehungsweise Kaltrissgefahr begünstigt.';
    grounded.answer.requiredTerms = ['Kohlenstoffgehalt', 'Härtbarkeit', 'Martensit', 'Kaltrissgefahr'];
    grounded.changeReason = 'Quellenabgleich: S. 73–76 verknüpfen schnelle Abkühlung mit Martensitbildung und zunehmenden C-Gehalt mit erhöhter Härterissgefahr; unbelegte Zusatzbedingungen wurden entfernt.';
  }

  if (grounded.id === 'ft2801') {
    grounded.answer.modelAnswer = 'Beim Pressschweißen werden die Werkstoffe nicht bis zur Schmelzgrenze erhitzt. Die Verbindung entsteht durch teilweise Erwärmung und die Einleitung von Fügekräften.';
    grounded.answer.requiredTerms = ['unterhalb der Schmelzgrenze', 'teilweise Erwärmung', 'Fügekräfte'];
    grounded.changeReason = 'Quellenabgleich: S. 104 grenzt Pressschweißen ausdrücklich vom Schmelzschweißen ab und nennt teilweise Erwärmung plus Fügekräfte.';
  }

  if (grounded.id === 'ft3201') {
    grounded.answer.modelAnswer = 'Laserschweißen wird durchgehend in automatisierten Anlagen eingesetzt. Elektronenstrahlschweißen erfordert für die Strahlerzeugung Hochvakuum; Hochvakuumanlagen benötigen aufwändige Vakuumkammern sowie Schleus- oder Evakuierzyklen. Dadurch ist Laserschweißen in vielen Fertigungsanlagen einfacher zu integrieren.';
    grounded.answer.requiredTerms = ['Automatisierung', 'Hochvakuum', 'Vakuumkammer'];
    grounded.changeReason = 'Quellenabgleich: S. 101 beschreibt den durchgehend automatisierten Lasereinsatz; S. 102 dokumentiert den Hochvakuumbedarf und den Aufwand großer Vakuumkammern beim Elektronenstrahlschweißen.';
  }

  if (grounded.id === 'ft3802') {
    grounded.answer.modelAnswer = 'Polymerisation: Cyanacrylatklebstoff; Polyaddition: Epoxidharzklebstoff; Polykondensation: Silikon.';
    grounded.answer.requiredTerms = ['Cyanacrylat', 'Epoxidharz', 'Silikon'];
    grounded.changeReason = 'Quellenabgleich: Die Beispiele stammen direkt aus den Abschnitten 7.4.1 bis 7.4.3 auf S. 161–163.';
  }

  if (grounded.id === 'ft3902') {
    grounded.answer.modelAnswer = 'Hoher Aufwand für Reinigung und Oberflächenvorbereitung, eingeschränkte Temperaturbeständigkeit und begrenzte mechanische Belastbarkeit insbesondere bei Schäl- beziehungsweise linienförmiger Belastung.';
    grounded.answer.requiredTerms = ['Oberflächenvorbereitung', 'Temperatur', 'Schälbelastung'];
    grounded.changeReason = 'Quellenabgleich: S. 158–159 belegen Oberflächenvorbereitung, eingeschränkten Temperaturbereich und die ungünstige Schäl- beziehungsweise Linienbelastung.';
  }

  if (grounded.id === 'ft4201') {
    grounded.answer.modelAnswer = 'Beim Löten schmilzt ein Zusatzmetall, das Lot; die Grundwerkstoffe werden benetzt, aber nicht geschmolzen. Schweißen vereinigt Werkstoffe in der Schweißzone unter Anwendung von Wärme und/oder Kraft, mit oder ohne Schweißzusatz.';
    grounded.answer.requiredTerms = ['Lot', 'Grundwerkstoff nicht geschmolzen', 'Wärme und/oder Kraft'];
    grounded.changeReason = 'Quellenabgleich: S. 69–70 definieren Schweißen allgemein über Wärme und/oder Kraft und Löten über ein geschmolzenes Lot bei nicht geschmolzenem Grundwerkstoff.';
  }

  if (grounded.id === 'ft4401') {
    grounded.answer.modelAnswer = 'Oxid- und andere Oberflächenschichten werden vor dem Löten mechanisch beziehungsweise chemisch entfernt; ein geeignetes Flussmittel löst beziehungsweise reduziert verbleibende Oxide und unterstützt die Benetzung.';
    grounded.answer.requiredTerms = ['Reinigung', 'Flussmittel', 'Oxide', 'Benetzung'];
    grounded.changeReason = 'Quellenabgleich: Die Lötvorbereitung fordert mechanische/chemische Reinigung und vollständige Oxidentfernung; Flussmittel reduzieren verbleibende Oxide und unterstützen die Benetzung. Schutzgas/Vakuum werden nicht als Oxidentfernung gewertet.';
  }

  return grounded;
}

/**
 * Build the complete runtime catalog without mutating the historical v0.4 seed.
 *
 * The repository also contains an early JSON-format placeholder under
 * catalogs/fuegetechnik/. That placeholder is not loaded by the application;
 * this composed catalog is the authoritative built-in runtime content.
 */
export function createFuegetechnikRuntimeCatalog(): Catalog {
  const catalog = structuredClone(baseCatalog);
  const existingIds = new Set(catalog.cards.map(card => card.id));
  const additions = additionalFuegetechnikCards
    .filter(card => !existingIds.has(card.id))
    .map(card => structuredClone(card));

  catalog.cards = [...catalog.cards, ...additions].map(applyVerifiedSourceGrounding);
  catalog.version = FUEGETECHNIK_RUNTIME_VERSION;
  catalog.description = 'Vervollständigter Fügetechnik-Prüfungskatalog; bildabhängige Aufgaben sind noch ausgenommen.';
  catalog.updatedAt = FUEGETECHNIK_RUNTIME_UPDATED_AT;
  return catalog;
}

/**
 * v04 imports the original seed directly. v05 historically completed that
 * module singleton before importing v04, so retain that compatibility bridge
 * while keeping the composition rule in one testable place.
 */
export function activateFuegetechnikRuntimeCatalog(): Catalog {
  const complete = createFuegetechnikRuntimeCatalog();
  baseCatalog.version = complete.version;
  baseCatalog.description = complete.description;
  baseCatalog.updatedAt = complete.updatedAt;
  baseCatalog.cards = complete.cards;
  return baseCatalog;
}
