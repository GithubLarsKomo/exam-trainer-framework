import { builtinCatalog } from './builtin-v04';
import { additionalFuegetechnikCards } from './builtin-v04-additions';
import { loadState, saveState, type PersistedState } from './db';
import type { Catalog } from './model';

const existingIds = new Set(builtinCatalog.cards.map(card => card.id));
for (const card of additionalFuegetechnikCards) {
  if (!existingIds.has(card.id)) builtinCatalog.cards.push(card);
}
builtinCatalog.version = '0.5.0';
builtinCatalog.description = 'Vervollständigter Fügetechnik-Prüfungskatalog; bildabhängige Aufgaben sind noch ausgenommen.';
builtinCatalog.updatedAt = '2026-07-25T14:30:00.000Z';

const fallback: PersistedState = {schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]};
const persisted = await loadState(fallback);
const extended = persisted as PersistedState & {catalogs?:Catalog[];activeCatalogId?:string};
if (Array.isArray(extended.catalogs)) {
  const index = extended.catalogs.findIndex(c => c.catalogId === builtinCatalog.catalogId);
  if (index >= 0 && extended.catalogs[index].version !== '0.5.0') {
    const previous = extended.catalogs[index];
    const localOnly = previous.cards.filter(card => !builtinCatalog.cards.some(base => base.id === card.id));
    extended.catalogs[index] = {...structuredClone(builtinCatalog), cards:[...structuredClone(builtinCatalog.cards), ...localOnly]};
    extended.migrationLog = [...(extended.migrationLog ?? []), {from:3,to:3,at:new Date().toISOString(),status:'success',message:'Fügetechnik-Katalog auf 0.5.0 ergänzt; lokale Zusatzkarten erhalten.'}];
    await saveState(extended);
  }
}

await import('./v04');
const { installImportFeature } = await import('./import-feature');
installImportFeature();
const { installAssetFeature } = await import('./asset-feature');
installAssetFeature();
const { installBackupFeature } = await import('./backup-feature');
installBackupFeature();
const { installImageLabelFeature } = await import('./image-label-feature');
installImageLabelFeature();
const { installStructuredQuestionFeature } = await import('./structured-question-feature');
installStructuredQuestionFeature();
