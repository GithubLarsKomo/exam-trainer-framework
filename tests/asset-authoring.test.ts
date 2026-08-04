import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { analyzeCatalogAssets, linkAssetToCard, removeAssetFromCatalog, unlinkAssetFromCard, updateCatalogAssetMetadata } from '../src/asset-authoring';
import { detachAssetFromCatalog, getStoredAsset, storeAsset } from '../src/asset-store';
import { cardVersionToKnowledgeItem, type AssetManifestEntry, type CardVersion, type Catalog } from '../src/model';

function freshIndexedDb(): void {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true });
}

function fixture(asset: AssetManifestEntry): Catalog {
  const card: CardVersion = {
    id:'card-1', version:1, status:'released', topicId:'Demo', examQuestion:'', prompt:'Frage', points:1, difficulty:2,
    tags:[], questionType:'free_text', answer:{modelAnswer:'Antwort'}, source:'Test', changedAt:'2026-08-04T08:00:00Z',
  };
  return {
    catalogId:'catalog-a', title:'Assets', version:'1.0.0', createdAt:'2026-08-04T08:00:00Z', updatedAt:'2026-08-04T08:00:00Z',
    assets:[asset], cards:[card], knowledgeItems:[cardVersionToKnowledgeItem(card)],
  };
}

describe('asset authoring', () => {
  beforeEach(() => freshIndexedDb());

  it('links assets, mirrors refs to KnowledgeItem variants and propagates alt text', async () => {
    const asset = await storeAsset({ bytes:new Uint8Array([1,2,3]), catalogId:'catalog-a', fileName:'demo.png', source:'local' });
    const catalog = fixture(asset);
    linkAssetToCard(catalog, asset.id, 'card-1', 'prompt');
    expect(catalog.cards[0].assetRefs).toEqual([{ assetId:asset.id, role:'prompt', sourceFileName:'demo.png', altText:undefined }]);
    expect(catalog.knowledgeItems?.[0].questionVariants[0].assetRefs).toEqual(catalog.cards[0].assetRefs);

    updateCatalogAssetMetadata(catalog, asset.id, { altText:'Schematische Schweißnaht', rights:'Eigene Abbildung' });
    expect(catalog.assets?.[0]).toMatchObject({ altText:'Schematische Schweißnaht', rights:'Eigene Abbildung' });
    expect(catalog.cards[0].assetRefs?.[0].altText).toBe('Schematische Schweißnaht');
    expect(catalog.knowledgeItems?.[0].questionVariants[0].assetRefs?.[0].altText).toBe('Schematische Schweißnaht');

    unlinkAssetFromCard(catalog, asset.id, 'card-1', 'prompt');
    expect(catalog.cards[0].assetRefs).toBeUndefined();
    expect(catalog.knowledgeItems?.[0].questionVariants[0].assetRefs).toBeUndefined();
    expect(() => removeAssetFromCatalog(catalog, asset.id)).not.toThrow();
  });

  it('detects orphan, missing binary, missing manifest and safe unmanifested storage cases', async () => {
    const asset = await storeAsset({ bytes:new Uint8Array([4,5]), catalogId:'catalog-a', fileName:'stored.png', source:'local' });
    const catalog = fixture(asset);
    let analysis = analyzeCatalogAssets(catalog, [asset.id]);
    expect(analysis.orphanAssetIds).toEqual([asset.id]);

    analysis = analyzeCatalogAssets(catalog, []);
    expect(analysis.missingBinaryIds).toEqual([asset.id]);

    catalog.cards[0].assetRefs = [{ assetId:'asset:missing-manifest', role:'prompt' }];
    analysis = analyzeCatalogAssets(catalog, [asset.id, 'asset:missing-manifest', 'asset:unmanifested']);
    expect(analysis.issues).toContainEqual(expect.objectContaining({ code:'MISSING_MANIFEST', assetId:'asset:missing-manifest' }));
    expect(analysis.unmanifestedBinaryIds).toEqual(['asset:unmanifested']);
    expect(analysis.unmanifestedBinaryIds).not.toContain('asset:missing-manifest');
  });

  it('detaches a deduplicated binary only after its final catalog association is removed', async () => {
    const bytes = new Uint8Array([8,8,8]);
    const first = await storeAsset({ bytes, catalogId:'catalog-a', fileName:'a.png', source:'local' });
    const second = await storeAsset({ bytes, catalogId:'catalog-b', fileName:'b.png', source:'local' });
    expect(second.id).toBe(first.id);

    expect(await detachAssetFromCatalog(first.id, 'catalog-a')).toBe('retained');
    expect((await getStoredAsset(first.id))?.catalogIds).toEqual(['catalog-b']);
    expect(await detachAssetFromCatalog(first.id, 'catalog-b')).toBe('deleted');
    expect(await getStoredAsset(first.id)).toBeUndefined();
  });
});
