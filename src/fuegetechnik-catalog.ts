import { additionalFuegetechnikCards } from './builtin-v04-additions';
import { builtinCatalog as baseCatalog } from './builtin-v04';
import type { CardVersion, Catalog } from './model';

export const FUEGETECHNIK_RUNTIME_VERSION = '0.5.1';
export const FUEGETECHNIK_RUNTIME_UPDATED_AT = '2026-08-05T20:30:00.000Z';

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
  ft1801: 'S. 97 · 5.6.1.3 Schutzgasschweißen',
  ft1802: 'S. 97 · 5.6.1.3 Schutzgasschweißen',
  ft1803: 'S. 97–98 · 5.6.1.3 Schutzgasschweißen',
  ft2101: 'S. 113 · 5.7.1 Mechanisch-technologische Verfahren',
  ft2501: 'S. 76–77 · 5.4.1.1 Schweißeignung unlegierter und niedriglegierter Stähle',
  ft2601: 'S. 77 · 5.4.1.1 Schweißeignung unlegierter und niedriglegierter Stähle',
  ft3101: 'S. 102–103 · Elektronenstrahlschweißen',
  ft3102: 'S. 102–103 · Elektronenstrahlschweißen',
};

function applyVerifiedSourceGrounding(card: CardVersion): CardVersion {
  const grounded = structuredClone(card);
  grounded.sourcePage = verifiedSourcePages[grounded.id] ?? grounded.sourcePage;

  if (grounded.id === 'ft1501') {
    grounded.answer.modelAnswer = 'Sprühlichtbogen, Langlichtbogen, Übergangslichtbogen, Kurzlichtbogen und Impulslichtbogen.';
    grounded.answer.requiredTerms = ['Sprühlichtbogen', 'Langlichtbogen', 'Übergangslichtbogen', 'Kurzlichtbogen', 'Impulslichtbogen'];
    grounded.changeReason = 'Quellenabgleich: Tabelle 10 auf S. 97 führt fünf MSG-Lichtbogenarten einschließlich Langlichtbogen auf.';
  }

  if (grounded.id === 'ft2601') {
    grounded.answer.modelAnswer = 'Durch das Kohlenstoffäquivalent K. Das Skript verwendet beispielsweise K = C + Mn/6 + Cr/5 + Ni/15 + Mo/4 + Cu/13 + P/2.';
    grounded.answer.requiredTerms = ['Kohlenstoffäquivalent', 'K'];
    grounded.changeReason = 'Quellenabgleich: Das Skript bezeichnet den verwendeten Kennwert ausdrücklich als Kohlenstoffäquivalent K.';
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
