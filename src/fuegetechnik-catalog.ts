import { additionalFuegetechnikCards } from './builtin-v04-additions';
import { builtinCatalog as baseCatalog } from './builtin-v04';
import type { Catalog } from './model';

export const FUEGETECHNIK_RUNTIME_VERSION = '0.5.0';
export const FUEGETECHNIK_RUNTIME_UPDATED_AT = '2026-07-25T14:30:00.000Z';

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

  catalog.cards = [...catalog.cards, ...additions];
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
