import type { AssetManifestEntry, AssetRole, CardAssetRef, Catalog } from './model';

export type AssetValidationCode = 'ORPHAN_ASSET' | 'MISSING_BINARY' | 'MISSING_MANIFEST' | 'UNMANIFESTED_BINARY' | 'DUPLICATE_REF';
export interface AssetValidationIssue {
  code: AssetValidationCode;
  assetId: string;
  cardId?: string;
  message: string;
}

export interface AssetUsageAnalysis {
  usageCounts: Map<string, number>;
  issues: AssetValidationIssue[];
  orphanAssetIds: string[];
  missingBinaryIds: string[];
  unmanifestedBinaryIds: string[];
}

export function upsertCatalogAsset(catalog: Catalog, entry: AssetManifestEntry): AssetManifestEntry {
  const assets = catalog.assets ?? (catalog.assets = []);
  const existing = assets.find(asset => asset.id === entry.id);
  if (existing) {
    if (entry.fileName) existing.fileName = entry.fileName;
    existing.mediaType = entry.mediaType;
    existing.kind = entry.kind;
    existing.byteLength = entry.byteLength;
    existing.sha256 = entry.sha256;
    existing.source = entry.source;
    return existing;
  }
  const copy = { ...entry };
  assets.push(copy);
  return copy;
}

export function updateCatalogAssetMetadata(catalog: Catalog, assetId: string, metadata: { altText?: string; rights?: string }): void {
  const asset = catalog.assets?.find(entry => entry.id === assetId);
  if (!asset) throw new Error('Asset ist nicht im Katalogmanifest vorhanden.');
  asset.altText = metadata.altText?.trim() || undefined;
  asset.rights = metadata.rights?.trim() || undefined;
  for (const card of catalog.cards) {
    for (const ref of card.assetRefs ?? []) if (ref.assetId === assetId) ref.altText = asset.altText;
  }
  for (const item of catalog.knowledgeItems ?? []) {
    for (const variant of item.questionVariants) {
      for (const ref of variant.assetRefs ?? []) if (ref.assetId === assetId) ref.altText = asset.altText;
    }
  }
  catalog.updatedAt = new Date().toISOString();
}

function mirrorCardRefs(catalog: Catalog, cardId: string, refs: CardAssetRef[]): void {
  const item = catalog.knowledgeItems?.find(knowledge => knowledge.id === cardId);
  if (!item) return;
  const variant = item.questionVariants.find(question => question.legacyCardId === cardId || question.knowledgeItemId === cardId);
  if (variant) variant.assetRefs = refs.length ? refs.map(ref => ({ ...ref })) : undefined;
}

export function linkAssetToCard(catalog: Catalog, assetId: string, cardId: string, role: AssetRole): void {
  const asset = catalog.assets?.find(entry => entry.id === assetId);
  if (!asset) throw new Error('Asset ist nicht im Katalogmanifest vorhanden.');
  const card = catalog.cards.find(entry => entry.id === cardId);
  if (!card) throw new Error('Zielkarte wurde nicht gefunden.');
  const refs = card.assetRefs ? [...card.assetRefs] : [];
  if (!refs.some(ref => ref.assetId === assetId && ref.role === role)) {
    refs.push({ assetId, role, sourceFileName:asset.fileName, altText:asset.altText });
  }
  card.assetRefs = refs;
  card.changedAt = new Date().toISOString();
  mirrorCardRefs(catalog, card.id, refs);
  catalog.updatedAt = new Date().toISOString();
}

export function unlinkAssetFromCard(catalog: Catalog, assetId: string, cardId: string, role?: AssetRole): void {
  const card = catalog.cards.find(entry => entry.id === cardId);
  if (!card) throw new Error('Zielkarte wurde nicht gefunden.');
  const refs = (card.assetRefs ?? []).filter(ref => ref.assetId !== assetId || (role !== undefined && ref.role !== role));
  card.assetRefs = refs.length ? refs : undefined;
  card.changedAt = new Date().toISOString();
  mirrorCardRefs(catalog, card.id, refs);
  catalog.updatedAt = new Date().toISOString();
}

export function removeAssetFromCatalog(catalog: Catalog, assetId: string): void {
  const referenced = catalog.cards.some(card => (card.assetRefs ?? []).some(ref => ref.assetId === assetId));
  if (referenced) throw new Error('Asset ist noch mit mindestens einer Karte verknüpft.');
  catalog.assets = (catalog.assets ?? []).filter(asset => asset.id !== assetId);
  catalog.updatedAt = new Date().toISOString();
}

export function analyzeCatalogAssets(catalog: Catalog, storedAssetIds: Iterable<string>): AssetUsageAnalysis {
  const stored = new Set(storedAssetIds);
  const manifest = new Map((catalog.assets ?? []).map(asset => [asset.id, asset]));
  const usageCounts = new Map<string, number>();
  const issues: AssetValidationIssue[] = [];

  for (const card of catalog.cards) {
    const seen = new Set<string>();
    for (const ref of card.assetRefs ?? []) {
      usageCounts.set(ref.assetId, (usageCounts.get(ref.assetId) ?? 0) + 1);
      const key = `${ref.assetId}|${ref.role}`;
      if (seen.has(key)) issues.push({ code:'DUPLICATE_REF', assetId:ref.assetId, cardId:card.id, message:`Karte ${card.id} enthält dieselbe Asset-Rolle mehrfach.` });
      seen.add(key);
      if (!manifest.has(ref.assetId)) issues.push({ code:'MISSING_MANIFEST', assetId:ref.assetId, cardId:card.id, message:`Karte ${card.id} verweist auf ein Asset ohne Manifest.` });
    }
  }

  for (const asset of manifest.values()) {
    if (!stored.has(asset.id)) issues.push({ code:'MISSING_BINARY', assetId:asset.id, message:`Binärdaten für ${asset.fileName ?? asset.id} fehlen lokal.` });
    if ((usageCounts.get(asset.id) ?? 0) === 0) issues.push({ code:'ORPHAN_ASSET', assetId:asset.id, message:`${asset.fileName ?? asset.id} wird von keiner Karte verwendet.` });
  }
  for (const assetId of stored) {
    if (!manifest.has(assetId) && (usageCounts.get(assetId) ?? 0) === 0) issues.push({ code:'UNMANIFESTED_BINARY', assetId, message:`Unreferenzierte lokale Binärdaten ${assetId} fehlen im Katalogmanifest.` });
  }

  return {
    usageCounts,
    issues,
    orphanAssetIds: issues.filter(issue => issue.code === 'ORPHAN_ASSET').map(issue => issue.assetId),
    missingBinaryIds: issues.filter(issue => issue.code === 'MISSING_BINARY').map(issue => issue.assetId),
    unmanifestedBinaryIds: issues.filter(issue => issue.code === 'UNMANIFESTED_BINARY').map(issue => issue.assetId),
  };
}
