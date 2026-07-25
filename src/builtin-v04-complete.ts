import { builtinCatalog as baseCatalog } from './builtin-v04';
import { additionalFuegetechnikCards } from './builtin-v04-additions';
import type { Catalog } from './model';

export const builtinCatalog: Catalog = {
  ...baseCatalog,
  version: '0.5.0',
  description: 'Vervollständigter Fügetechnik-Prüfungskatalog auf Basis des Skripts und des Gedächtnisprotokolls; bildabhängige Aufgaben sind noch ausgenommen.',
  updatedAt: '2026-07-25T14:30:00.000Z',
  cards: [...baseCatalog.cards, ...additionalFuegetechnikCards],
};
