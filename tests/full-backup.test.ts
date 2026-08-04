import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { unzipSync, zipSync } from 'fflate';
import { createFullBackup, parseFullBackup, restoreFullBackup } from '../src/backup';
import { listStoredAssets, sha256Hex, storeAsset } from '../src/asset-store';
import { loadState, replaceStateAndAssetsAtomically, saveState, type PersistedAssetRecord, type PersistedState } from '../src/db';
import type { Catalog } from '../src/model';

function freshIndexedDb(): void {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true });
}

function fallback(): PersistedState {
  return { schemaVersion:3, progress:{}, history:[], review:{}, sessions:{}, examAttempts:[], migrationLog:[] };
}

function stateWithAsset(asset: Awaited<ReturnType<typeof storeAsset>>, title = 'Backup Katalog'): PersistedState {
  const catalog: Catalog = {
    catalogId:'backup-catalog', title, version:'1.0.0', createdAt:'2026-08-04T08:00:00Z', updatedAt:'2026-08-04T08:00:00Z',
    assets:[asset],
    cards:[{
      id:'card-1', version:1, status:'released', topicId:'Demo', examQuestion:'', prompt:'Bildfrage', points:1, difficulty:2,
      tags:[], questionType:'free_text', answer:{modelAnswer:'Antwort'}, assetRefs:[{assetId:asset.id,role:'prompt',sourceFileName:asset.fileName}], source:'Test', changedAt:'2026-08-04T08:00:00Z',
    }],
  };
  return { ...fallback(), catalogs:[catalog], activeCatalogId:catalog.catalogId };
}

async function record(bytes: Uint8Array, idSuffix: string): Promise<PersistedAssetRecord> {
  const hash = await sha256Hex(bytes);
  return {
    id:`asset:${idSuffix}`,
    sha256:hash,
    mediaType:'image/png',
    kind:'image',
    byteLength:bytes.byteLength,
    fileNames:[`${idSuffix}.png`],
    catalogIds:['catalog'],
    source:'local',
    createdAt:'2026-08-04T08:00:00Z',
    bytes,
  };
}

describe('full backup', () => {
  beforeEach(() => freshIndexedDb());

  it('round-trips learner state and binary assets', async () => {
    const asset = await storeAsset({ bytes:new Uint8Array([1,2,3,4]), catalogId:'backup-catalog', fileName:'diagram.png', source:'local', now:new Date('2026-08-04T08:00:00Z') });
    const state = stateWithAsset(asset);
    await saveState(state);

    const archive = await createFullBackup(state, new Date('2026-08-04T09:00:00Z'));
    const parsed = await parseFullBackup(archive);

    expect(parsed.manifest).toMatchObject({ format:'etf-full-backup', version:1, createdAt:'2026-08-04T09:00:00.000Z' });
    expect(parsed.state.catalogs?.[0].title).toBe('Backup Katalog');
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0].bytes).toEqual(new Uint8Array([1,2,3,4]));
  });

  it('rejects tampered asset bytes by SHA-256 before restore', async () => {
    const asset = await storeAsset({ bytes:new Uint8Array([5,6,7]), catalogId:'backup-catalog', fileName:'image.png', source:'local' });
    const archive = await createFullBackup(stateWithAsset(asset));
    const entries = unzipSync(archive);
    entries['assets/0'] = new Uint8Array([9,9,9]);
    const tampered = zipSync(entries, { level:0 });
    await expect(parseFullBackup(tampered)).rejects.toThrow(/SHA-256/);
  });

  it('restores a full backup over a different local state and asset set', async () => {
    const originalAsset = await storeAsset({ bytes:new Uint8Array([10,11]), catalogId:'backup-catalog', fileName:'original.png', source:'local' });
    const originalState = stateWithAsset(originalAsset, 'Original');
    await saveState(originalState);
    const archive = await createFullBackup(originalState);

    const replacement = await record(new Uint8Array([99]), 'replacement');
    await replaceStateAndAssetsAtomically({ ...fallback(), catalogs:[], activeCatalogId:'none' }, [replacement]);
    await restoreFullBackup(archive);

    const restoredState = await loadState(fallback());
    const restoredAssets = await listStoredAssets();
    expect(restoredState.catalogs?.[0].title).toBe('Original');
    expect(restoredAssets).toHaveLength(1);
    expect(restoredAssets[0].bytes).toEqual(new Uint8Array([10,11]));
  });

  it('rolls back both state and assets when the combined IndexedDB transaction fails', async () => {
    const oldAsset = await storeAsset({ bytes:new Uint8Array([1]), catalogId:'backup-catalog', fileName:'old.png', source:'local' });
    const oldState = stateWithAsset(oldAsset, 'Old State');
    await saveState(oldState);

    const bytes = new Uint8Array([2]);
    const hash = await sha256Hex(bytes);
    const duplicateShaRecords: PersistedAssetRecord[] = [
      { id:`asset:${hash}`, sha256:hash, mediaType:'image/png', kind:'image', byteLength:1, fileNames:['a.png'], catalogIds:['new'], source:'local', createdAt:'2026-08-04T09:00:00Z', bytes },
      { id:'asset:duplicate-id', sha256:hash, mediaType:'image/png', kind:'image', byteLength:1, fileNames:['b.png'], catalogIds:['new'], source:'local', createdAt:'2026-08-04T09:00:00Z', bytes },
    ];
    const newState: PersistedState = { ...fallback(), catalogs:[], activeCatalogId:'new' };

    await expect(replaceStateAndAssetsAtomically(newState, duplicateShaRecords)).rejects.toBeTruthy();
    expect((await loadState(fallback())).catalogs?.[0].title).toBe('Old State');
    const assets = await listStoredAssets();
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe(oldAsset.id);
  });

  it('refuses to create a full backup when catalog references point to missing assets', async () => {
    const missing = {
      id:`asset:${'a'.repeat(64)}`, fileName:'missing.png', mediaType:'image/png', kind:'image' as const, byteLength:1,
      sha256:'a'.repeat(64), source:'local' as const, createdAt:'2026-08-04T08:00:00Z',
    };
    await expect(createFullBackup(stateWithAsset(missing))).rejects.toThrow(/fehlen lokal/);
  });
});
