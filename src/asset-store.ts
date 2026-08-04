import { ASSET_STORE, openExamTrainerDb } from './db';
import type { AssetKind, AssetManifestEntry } from './model';

export interface StoredAssetRecord {
  id: string;
  sha256: string;
  mediaType: string;
  kind: AssetKind;
  byteLength: number;
  fileNames: string[];
  catalogIds: string[];
  source: 'anki' | 'local';
  createdAt: string;
  bytes: Uint8Array;
}

export interface StoreAssetInput {
  bytes: Uint8Array;
  catalogId: string;
  fileName?: string;
  mediaType?: string;
  source: 'anki' | 'local';
  now?: Date;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB asset request failed'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB asset transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB asset transaction aborted'));
  });
}

function digestInput(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', digestInput(bytes));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

export function inferMediaType(fileName?: string): string {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml',
    mp3:'audio/mpeg', m4a:'audio/mp4', mp4:'video/mp4', ogg:'audio/ogg', opus:'audio/ogg', wav:'audio/wav', webm:'audio/webm',
    pdf:'application/pdf',
  };
  return extension ? types[extension] ?? 'application/octet-stream' : 'application/octet-stream';
}

export function assetKind(mediaType: string): AssetKind {
  if (mediaType.startsWith('image/')) return 'image';
  if (mediaType.startsWith('audio/')) return 'audio';
  return 'other';
}

function manifest(record: StoredAssetRecord, fileName?: string, source: 'anki' | 'local' = record.source): AssetManifestEntry {
  return {
    id: record.id,
    fileName,
    mediaType: record.mediaType,
    kind: record.kind,
    byteLength: record.byteLength,
    sha256: record.sha256,
    source,
    createdAt: record.createdAt,
  };
}

export async function storeAsset(input: StoreAssetInput): Promise<AssetManifestEntry> {
  const sha256 = await sha256Hex(input.bytes);
  const mediaType = input.mediaType?.trim() || inferMediaType(input.fileName);
  const db = await openExamTrainerDb();
  try {
    const readTx = db.transaction(ASSET_STORE, 'readonly');
    const existing = await request(readTx.objectStore(ASSET_STORE).index('sha256').get(sha256)) as StoredAssetRecord | undefined;
    if (existing) {
      const next: StoredAssetRecord = {
        ...existing,
        fileNames: [...new Set([...existing.fileNames, ...(input.fileName ? [input.fileName] : [])])],
        catalogIds: [...new Set([...existing.catalogIds, input.catalogId])],
      };
      const writeTx = db.transaction(ASSET_STORE, 'readwrite');
      const done = transactionDone(writeTx);
      writeTx.objectStore(ASSET_STORE).put(next);
      await done;
      return manifest(next, input.fileName, input.source);
    }

    const record: StoredAssetRecord = {
      id: `asset:${sha256}`,
      sha256,
      mediaType,
      kind: assetKind(mediaType),
      byteLength: input.bytes.byteLength,
      fileNames: input.fileName ? [input.fileName] : [],
      catalogIds: [input.catalogId],
      source: input.source,
      createdAt: (input.now ?? new Date()).toISOString(),
      bytes: new Uint8Array(input.bytes),
    };
    const writeTx = db.transaction(ASSET_STORE, 'readwrite');
    const done = transactionDone(writeTx);
    writeTx.objectStore(ASSET_STORE).add(record);
    await done;
    return manifest(record, input.fileName, input.source);
  } finally {
    db.close();
  }
}

export async function getStoredAsset(assetId: string): Promise<StoredAssetRecord | undefined> {
  const db = await openExamTrainerDb();
  try {
    const tx = db.transaction(ASSET_STORE, 'readonly');
    return await request(tx.objectStore(ASSET_STORE).get(assetId)) as StoredAssetRecord | undefined;
  } finally {
    db.close();
  }
}

export async function listStoredAssets(catalogId?: string): Promise<StoredAssetRecord[]> {
  const db = await openExamTrainerDb();
  try {
    const tx = db.transaction(ASSET_STORE, 'readonly');
    const records = await request(tx.objectStore(ASSET_STORE).getAll()) as StoredAssetRecord[];
    return catalogId ? records.filter(record => record.catalogIds.includes(catalogId)) : records;
  } finally {
    db.close();
  }
}

export async function detachAssetFromCatalog(assetId: string, catalogId: string): Promise<'deleted' | 'retained' | 'missing'> {
  const db = await openExamTrainerDb();
  try {
    const readTx = db.transaction(ASSET_STORE, 'readonly');
    const record = await request(readTx.objectStore(ASSET_STORE).get(assetId)) as StoredAssetRecord | undefined;
    if (!record) return 'missing';
    const catalogIds = record.catalogIds.filter(id => id !== catalogId);
    const writeTx = db.transaction(ASSET_STORE, 'readwrite');
    const done = transactionDone(writeTx);
    if (!catalogIds.length) writeTx.objectStore(ASSET_STORE).delete(assetId);
    else writeTx.objectStore(ASSET_STORE).put({ ...record, catalogIds });
    await done;
    return catalogIds.length ? 'retained' : 'deleted';
  } finally {
    db.close();
  }
}

export async function deleteAsset(assetId: string): Promise<void> {
  const db = await openExamTrainerDb();
  try {
    const tx = db.transaction(ASSET_STORE, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(ASSET_STORE).delete(assetId);
    await done;
  } finally {
    db.close();
  }
}

export async function createAssetObjectUrl(assetId: string): Promise<string | undefined> {
  const record = await getStoredAsset(assetId);
  if (!record) return undefined;
  return URL.createObjectURL(new Blob([digestInput(record.bytes)], { type: record.mediaType }));
}
