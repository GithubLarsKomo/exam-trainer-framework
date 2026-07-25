import { builtinCatalog } from './builtin-v04';
import { additionalFuegetechnikCards } from './builtin-v04-additions';

const existingIds = new Set(builtinCatalog.cards.map(card => card.id));
for (const card of additionalFuegetechnikCards) {
  if (!existingIds.has(card.id)) builtinCatalog.cards.push(card);
}
builtinCatalog.version = '0.5.0';
builtinCatalog.description = 'Vervollständigter Fügetechnik-Prüfungskatalog; bildabhängige Aufgaben sind noch ausgenommen.';
builtinCatalog.updatedAt = '2026-07-25T14:30:00.000Z';

await import('./v04');
