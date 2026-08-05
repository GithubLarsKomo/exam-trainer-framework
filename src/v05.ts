import './navigation-accessibility.css';
import { loadState, saveState, type PersistedState } from './db';
import { activateFuegetechnikRuntimeCatalog, FUEGETECHNIK_RUNTIME_VERSION } from './fuegetechnik-catalog';
import type { Catalog } from './model';

const builtinCatalog = activateFuegetechnikRuntimeCatalog();

const fallback: PersistedState = {schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]};
const persisted = await loadState(fallback);
const extended = persisted as PersistedState & {catalogs?:Catalog[];activeCatalogId?:string};
if (Array.isArray(extended.catalogs)) {
  const index = extended.catalogs.findIndex(c => c.catalogId === builtinCatalog.catalogId);
  if (index >= 0 && extended.catalogs[index].version !== FUEGETECHNIK_RUNTIME_VERSION) {
    const previous = extended.catalogs[index];
    const localOnly = previous.cards.filter(card => !builtinCatalog.cards.some(base => base.id === card.id));
    extended.catalogs[index] = {...structuredClone(builtinCatalog), cards:[...structuredClone(builtinCatalog.cards), ...localOnly]};
    extended.migrationLog = [...(extended.migrationLog ?? []), {from:3,to:3,at:new Date().toISOString(),status:'success',message:`Fügetechnik-Katalog auf ${FUEGETECHNIK_RUNTIME_VERSION} ergänzt; lokale Zusatzkarten erhalten.`}];
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
const { installUxPolishFeature } = await import('./ux-polish-feature');
installUxPolishFeature();
const { installRecoverableSessionFeature } = await import('./recoverable-session-feature');
installRecoverableSessionFeature();
const { installRecoverableOrderingBridge } = await import('./recoverable-ordering-bridge');
installRecoverableOrderingBridge();
const { installExamDependencyRuntimeFeature } = await import('./exam-dependency-runtime-feature');
installExamDependencyRuntimeFeature();
const { installTouchGestureFeature } = await import('./touch-gesture-feature');
installTouchGestureFeature();
const { installFsrsShadowEvaluationFeature } = await import('./fsrs-shadow-evaluation-feature');
installFsrsShadowEvaluationFeature();
const { installMobileSecondaryNavigationFeature } = await import('./mobile-secondary-navigation-feature');
installMobileSecondaryNavigationFeature();
const { installCatalogLifecycleFeature } = await import('./catalog-lifecycle-feature');
installCatalogLifecycleFeature();
const { installPublicationFeature } = await import('./publication-feature');
installPublicationFeature();
const { installFullCardEditorFeature } = await import('./full-card-editor-feature');
installFullCardEditorFeature();
const { installExamDependencyEditorFeature } = await import('./exam-dependency-editor-feature');
installExamDependencyEditorFeature();
