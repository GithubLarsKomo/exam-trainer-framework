import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { getStoredAsset } from '../src/asset-store';
import { persistImportAssets } from '../src/import-assets';
import { createCatalogFromImportPreview } from '../src/import-commit';
import { createImportPreview } from '../src/import-preview';
import type { NormalizedImportBundle } from '../src/import-model';

function freshIndexedDb(): void {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true });
}

describe('import asset commit', () => {
  beforeEach(() => freshIndexedDb());

  it('extracts and links only media with resolved filenames', async () => {
    const bundle: NormalizedImportBundle = {
      sourceKind:'apkg', sourceName:'media.apkg', warnings:[],
      metadata:{ schedulingImported:false, collectionFile:'collection.anki2', ankiSchemaVersion:11, modernSchema:false },
      media:[
        { archiveName:'0', fileName:'diagram.png', bytes:new Uint8Array([1,2,3]) },
        { archiveName:'1', bytes:new Uint8Array([4,5,6]) },
      ],
      notes:[{
        sourceNoteId:'1', noteTypeName:'Basic', tags:['media'], clozeDetected:false,
        fields:[
          { name:'Front', ordinal:0, value:'<img src="diagram.png"> Welche Struktur ist gezeigt?' },
          { name:'Back', ordinal:1, value:'Eine Schweißnaht.' },
        ],
        cards:[{ sourceCardId:'10', deckPath:['Demo'] }],
      }],
    };
    const preview = createImportPreview(bundle, { questionField:'Front', answerField:'Back', defaultTopic:'Demo', defaultSource:'Anki' });
    expect(preview.candidates[0].mediaRefs).toEqual([{ fileName:'diagram.png', role:'prompt' }]);

    const catalog = createCatalogFromImportPreview(preview, { catalogId:'import-media', title:'Media Import', status:'released', now:new Date('2026-08-04T08:00:00Z') });
    const result = await persistImportAssets(catalog, preview, bundle);

    expect(result).toMatchObject({ storedAssets:2, linkedReferences:1, unresolvedReferences:0, unresolvedMedia:1 });
    expect(catalog.assets).toHaveLength(2);
    expect(catalog.cards[0].assetRefs).toHaveLength(1);
    expect(catalog.cards[0].assetRefs?.[0]).toMatchObject({ role:'prompt', sourceFileName:'diagram.png' });
    expect(catalog.knowledgeItems?.[0].questionVariants[0].assetRefs).toEqual(catalog.cards[0].assetRefs);

    const assetId = catalog.cards[0].assetRefs![0].assetId;
    expect((await getStoredAsset(assetId))?.bytes).toEqual(new Uint8Array([1,2,3]));
  });

  it('does not guess a link when referenced media is absent from the resolved map', async () => {
    const bundle: NormalizedImportBundle = {
      sourceKind:'apkg', sourceName:'unresolved.apkg', warnings:[], metadata:{ schedulingImported:false },
      media:[{ archiveName:'0', bytes:new Uint8Array([7,7,7]) }],
      notes:[{
        sourceNoteId:'2', tags:[], clozeDetected:false,
        fields:[{ name:'Front', ordinal:0, value:'<img src="missing.png"> Frage' },{ name:'Back', ordinal:1, value:'Antwort' }], cards:[],
      }],
    };
    const preview = createImportPreview(bundle, { questionField:'Front', answerField:'Back', defaultTopic:'Demo', defaultSource:'Anki' });
    const catalog = createCatalogFromImportPreview(preview, { catalogId:'unresolved', title:'Unresolved' });
    const result = await persistImportAssets(catalog, preview, bundle);
    expect(result.unresolvedReferences).toBe(1);
    expect(result.unresolvedMedia).toBe(1);
    expect(catalog.cards[0].assetRefs).toBeUndefined();
  });
});
