import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { listStoredAssets, sha256Hex, type StoredAssetRecord } from './asset-store';
import { migrate, replaceStateAndAssetsAtomically, type PersistedAssetRecord, type PersistedState } from './db';

const MIB = 1024 * 1024;
export const FULL_BACKUP_LIMITS = {
  maxArchiveBytes: 1024 * MIB,
  maxManifestBytes: 32 * MIB,
  maxAssetBytes: 256 * MIB,
  maxTotalAssetBytes: 1536 * MIB,
  maxAssets: 50_000,
};

interface BackupAssetManifest {
  archiveName: string;
  id: string;
  sha256: string;
  mediaType: string;
  kind: StoredAssetRecord['kind'];
  byteLength: number;
  fileNames: string[];
  catalogIds: string[];
  source: StoredAssetRecord['source'];
  createdAt: string;
}

export interface FullBackupManifest {
  format: 'etf-full-backup';
  version: 1;
  createdAt: string;
  state: PersistedState;
  assets: BackupAssetManifest[];
}

export interface ParsedFullBackup {
  manifest: FullBackupManifest;
  state: PersistedState;
  assets: PersistedAssetRecord[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} ist ungültig.`);
  return [...new Set(value as string[])];
}

function requiredAssetIds(state: PersistedState): Set<string> {
  const ids = new Set<string>();
  for (const catalog of state.catalogs ?? []) {
    for (const asset of catalog.assets ?? []) ids.add(asset.id);
    for (const card of catalog.cards ?? []) for (const ref of card.assetRefs ?? []) ids.add(ref.assetId);
    for (const item of catalog.knowledgeItems ?? []) {
      for (const variant of item.questionVariants ?? []) for (const ref of variant.assetRefs ?? []) ids.add(ref.assetId);
    }
  }
  return ids;
}

function assertCompleteAssetSet(state: PersistedState, assets: Array<Pick<StoredAssetRecord, 'id'>>): void {
  const present = new Set(assets.map(asset => asset.id));
  const missing = [...requiredAssetIds(state)].filter(id => !present.has(id));
  if (missing.length) throw new Error(`Vollbackup abgebrochen: ${missing.length} referenzierte Assets fehlen lokal.`);
}

function assetManifest(record: StoredAssetRecord, index: number): BackupAssetManifest {
  return {
    archiveName: `assets/${index}`,
    id: record.id,
    sha256: record.sha256,
    mediaType: record.mediaType,
    kind: record.kind,
    byteLength: record.byteLength,
    fileNames: [...record.fileNames],
    catalogIds: [...record.catalogIds],
    source: record.source,
    createdAt: record.createdAt,
  };
}

export async function createFullBackup(state: PersistedState, createdAt = new Date()): Promise<Uint8Array> {
  const assets = await listStoredAssets();
  if (assets.length > FULL_BACKUP_LIMITS.maxAssets) throw new Error('Zu viele Assets für ein Browser-Vollbackup.');
  assertCompleteAssetSet(state, assets);

  let totalBytes = 0;
  for (const asset of assets) {
    if (asset.byteLength !== asset.bytes.byteLength) throw new Error(`Asset ${asset.id} hat inkonsistente Größenmetadaten.`);
    if (asset.byteLength > FULL_BACKUP_LIMITS.maxAssetBytes) throw new Error(`Asset ${asset.id} überschreitet das Vollbackup-Einzeldateilimit.`);
    totalBytes += asset.byteLength;
  }
  if (totalBytes > FULL_BACKUP_LIMITS.maxTotalAssetBytes) throw new Error('Assetbestand überschreitet das Vollbackup-Gesamtlimit.');

  const manifest: FullBackupManifest = {
    format: 'etf-full-backup',
    version: 1,
    createdAt: createdAt.toISOString(),
    state: structuredClone(state),
    assets: assets.map(assetManifest),
  };
  const manifestBytes = strToU8(JSON.stringify(manifest));
  if (manifestBytes.byteLength > FULL_BACKUP_LIMITS.maxManifestBytes) throw new Error('Backup-Manifest ist zu groß.');

  const entries: Record<string, Uint8Array> = { 'manifest.json': manifestBytes };
  assets.forEach((asset, index) => { entries[`assets/${index}`] = new Uint8Array(asset.bytes); });
  const archive = zipSync(entries, { level: 0 });
  if (archive.byteLength > FULL_BACKUP_LIMITS.maxArchiveBytes) throw new Error('Erzeugtes Vollbackup überschreitet das Archivlimit.');
  return archive;
}

function parseManifest(bytes: Uint8Array): FullBackupManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error('Backup-Manifest ist kein gültiges JSON.');
  }
  if (!isObject(raw) || raw.format !== 'etf-full-backup' || raw.version !== 1) throw new Error('Nicht unterstütztes ETF-Vollbackupformat.');
  if (typeof raw.createdAt !== 'string' || !isObject(raw.state) || !Array.isArray(raw.assets)) throw new Error('Backup-Manifest ist unvollständig.');
  if (raw.assets.length > FULL_BACKUP_LIMITS.maxAssets) throw new Error('Backup enthält zu viele Assets.');
  return raw as unknown as FullBackupManifest;
}

function validateAssetMetadata(value: unknown): BackupAssetManifest {
  if (!isObject(value)) throw new Error('Asset-Metadaten sind ungültig.');
  const archiveName = value.archiveName;
  const id = value.id;
  const sha256 = value.sha256;
  const mediaType = value.mediaType;
  const kind = value.kind;
  const byteLength = value.byteLength;
  const source = value.source;
  const createdAt = value.createdAt;
  if (typeof archiveName !== 'string' || !/^assets\/\d+$/.test(archiveName)) throw new Error('Ungültiger Asset-Archivpfad.');
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`Ungültiger SHA-256 für ${archiveName}.`);
  if (id !== `asset:${sha256}`) throw new Error(`Asset-ID und SHA-256 stimmen für ${archiveName} nicht überein.`);
  if (typeof mediaType !== 'string' || !mediaType.trim()) throw new Error(`MIME-Typ fehlt für ${archiveName}.`);
  if (!['image','audio','other'].includes(String(kind))) throw new Error(`Asset-Art ist ungültig für ${archiveName}.`);
  if (!Number.isSafeInteger(byteLength) || Number(byteLength) < 0 || Number(byteLength) > FULL_BACKUP_LIMITS.maxAssetBytes) throw new Error(`Asset-Größe ist ungültig für ${archiveName}.`);
  if (!['anki','local'].includes(String(source)) || typeof createdAt !== 'string') throw new Error(`Asset-Herkunft ist ungültig für ${archiveName}.`);
  return {
    archiveName,
    id: id as string,
    sha256,
    mediaType,
    kind: kind as BackupAssetManifest['kind'],
    byteLength: Number(byteLength),
    fileNames: stringArray(value.fileNames, `Dateinamen für ${archiveName}`),
    catalogIds: stringArray(value.catalogIds, `Katalogzuordnung für ${archiveName}`),
    source: source as BackupAssetManifest['source'],
    createdAt,
  };
}

export async function parseFullBackup(bytes: Uint8Array): Promise<ParsedFullBackup> {
  if (bytes.byteLength > FULL_BACKUP_LIMITS.maxArchiveBytes) throw new Error('Vollbackup überschreitet das Archivlimit.');

  let oversizedManifest = false;
  const manifestEntries = unzipSync(bytes, {
    filter: file => {
      if (file.name !== 'manifest.json') return false;
      if (file.originalSize > FULL_BACKUP_LIMITS.maxManifestBytes) {
        oversizedManifest = true;
        return false;
      }
      return true;
    },
  });
  if (oversizedManifest) throw new Error('Backup-Manifest überschreitet das Größenlimit.');
  const manifestBytes = manifestEntries['manifest.json'];
  if (!manifestBytes) throw new Error('Backup enthält kein manifest.json.');
  const rawManifest = parseManifest(manifestBytes);
  const assetMetadata = rawManifest.assets.map(validateAssetMetadata);
  const archiveNames = new Set<string>();
  const ids = new Set<string>();
  const hashes = new Set<string>();
  let declaredBytes = 0;
  for (const asset of assetMetadata) {
    if (archiveNames.has(asset.archiveName) || ids.has(asset.id) || hashes.has(asset.sha256)) throw new Error('Backup enthält doppelte Asset-Metadaten.');
    archiveNames.add(asset.archiveName);
    ids.add(asset.id);
    hashes.add(asset.sha256);
    declaredBytes += asset.byteLength;
  }
  if (declaredBytes > FULL_BACKUP_LIMITS.maxTotalAssetBytes) throw new Error('Backup überschreitet das Asset-Gesamtlimit.');

  let unexpectedAssetEntry = false;
  let acceptedBytes = 0;
  const allowed = new Set(assetMetadata.map(asset => asset.archiveName));
  const assetEntries = unzipSync(bytes, {
    filter: file => {
      if (!file.name.startsWith('assets/')) return false;
      if (!allowed.has(file.name)) {
        unexpectedAssetEntry = true;
        return false;
      }
      if (file.originalSize > FULL_BACKUP_LIMITS.maxAssetBytes || acceptedBytes + file.originalSize > FULL_BACKUP_LIMITS.maxTotalAssetBytes) return false;
      acceptedBytes += file.originalSize;
      return true;
    },
  });
  if (unexpectedAssetEntry) throw new Error('Backup enthält nicht deklarierte Asset-Dateien.');

  const assets: PersistedAssetRecord[] = [];
  for (const metadata of assetMetadata) {
    const assetBytes = assetEntries[metadata.archiveName];
    if (!assetBytes) throw new Error(`Backup-Asset ${metadata.archiveName} fehlt.`);
    if (assetBytes.byteLength !== metadata.byteLength) throw new Error(`Backup-Asset ${metadata.archiveName} hat eine falsche Größe.`);
    const hash = await sha256Hex(assetBytes);
    if (hash !== metadata.sha256) throw new Error(`SHA-256-Prüfung für ${metadata.archiveName} ist fehlgeschlagen.`);
    assets.push({
      id: metadata.id,
      sha256: metadata.sha256,
      mediaType: metadata.mediaType,
      kind: metadata.kind,
      byteLength: metadata.byteLength,
      fileNames: metadata.fileNames,
      catalogIds: metadata.catalogIds,
      source: metadata.source,
      createdAt: metadata.createdAt,
      bytes: new Uint8Array(assetBytes),
    });
  }

  const state = migrate(rawManifest.state);
  assertCompleteAssetSet(state, assets);
  const manifest: FullBackupManifest = { ...rawManifest, state, assets: assetMetadata };
  return { manifest, state, assets };
}

export async function restoreFullBackup(bytes: Uint8Array): Promise<ParsedFullBackup> {
  const parsed = await parseFullBackup(bytes);
  await replaceStateAndAssetsAtomically(parsed.state, parsed.assets);
  return parsed;
}
