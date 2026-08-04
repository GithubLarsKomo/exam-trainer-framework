import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { getStoredAsset, listStoredAssets, storeAsset } from '../src/asset-store';
import { DB_NAME, STATE_STORE } from '../src/db';

function freshIndexedDb(): void {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true });
}

function createLegacyV1(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STATE_STORE);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { req.result.close(); resolve(); };
  });
}

describe('asset store', () => {
  beforeEach(() => freshIndexedDb());

  it('upgrades an existing v1 database and stores binary assets', async () => {
    await createLegacyV1();
    const entry = await storeAsset({
      bytes: new Uint8Array([1,2,3,4]),
      catalogId: 'catalog-a',
      fileName: 'diagram.png',
      source: 'anki',
      now: new Date('2026-08-04T08:00:00Z'),
    });
    const stored = await getStoredAsset(entry.id);
    expect(entry).toMatchObject({ fileName:'diagram.png', mediaType:'image/png', kind:'image', byteLength:4 });
    expect(stored?.bytes).toEqual(new Uint8Array([1,2,3,4]));
    expect(stored?.catalogIds).toEqual(['catalog-a']);
  });

  it('deduplicates equal bytes while preserving catalog and filename associations', async () => {
    const bytes = new Uint8Array([9,8,7]);
    const first = await storeAsset({ bytes, catalogId:'catalog-a', fileName:'a.jpg', source:'anki' });
    const second = await storeAsset({ bytes, catalogId:'catalog-b', fileName:'copy.jpg', source:'anki' });
    expect(second.id).toBe(first.id);
    const stored = await getStoredAsset(first.id);
    expect(stored?.catalogIds.sort()).toEqual(['catalog-a','catalog-b']);
    expect(stored?.fileNames.sort()).toEqual(['a.jpg','copy.jpg']);
    expect(await listStoredAssets('catalog-a')).toHaveLength(1);
    expect(await listStoredAssets()).toHaveLength(1);
  });
});
