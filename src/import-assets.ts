import { storeAsset } from './asset-store';
import type { ImportPreview, NormalizedImportBundle } from './import-model';
import type { AssetManifestEntry, CardAssetRef, Catalog } from './model';

export interface ImportAssetCommitResult {
  storedAssets: number;
  linkedReferences: number;
  unresolvedReferences: number;
  unresolvedMedia: number;
}

function uniqueManifest(entries: AssetManifestEntry[]): AssetManifestEntry[] {
  const byId = new Map<string, AssetManifestEntry>();
  for (const entry of entries) if (!byId.has(entry.id)) byId.set(entry.id, entry);
  return [...byId.values()];
}

export async function persistImportAssets(
  catalog: Catalog,
  preview: ImportPreview,
  bundle: NormalizedImportBundle,
): Promise<ImportAssetCommitResult> {
  const byFileName = new Map<string, AssetManifestEntry>();
  const manifests: AssetManifestEntry[] = [];

  for (const media of bundle.media) {
    const entry = await storeAsset({
      bytes: media.bytes,
      catalogId: catalog.catalogId,
      fileName: media.fileName,
      source: 'anki',
    });
    manifests.push(entry);
    if (media.fileName && !byFileName.has(media.fileName)) byFileName.set(media.fileName, entry);
  }

  catalog.assets = uniqueManifest(manifests);
  let linkedReferences = 0;
  let unresolvedReferences = 0;

  for (const candidate of preview.candidates) {
    const card = catalog.cards.find(item => item.id === candidate.id);
    if (!card) continue;
    const refs: CardAssetRef[] = [];
    for (const importedRef of candidate.mediaRefs ?? []) {
      const entry = byFileName.get(importedRef.fileName);
      if (!entry) {
        unresolvedReferences++;
        continue;
      }
      const ref: CardAssetRef = {
        assetId: entry.id,
        role: importedRef.role,
        sourceFileName: importedRef.fileName,
      };
      if (!refs.some(existing => existing.assetId === ref.assetId && existing.role === ref.role)) {
        refs.push(ref);
        linkedReferences++;
      }
    }
    if (refs.length) card.assetRefs = refs;

    const item = catalog.knowledgeItems?.find(knowledge => knowledge.id === candidate.id);
    const variant = item?.questionVariants.find(question => question.legacyCardId === candidate.id || question.knowledgeItemId === candidate.id);
    if (variant && refs.length) variant.assetRefs = refs.map(ref => ({ ...ref }));
  }

  return {
    storedAssets: catalog.assets.length,
    linkedReferences,
    unresolvedReferences,
    unresolvedMedia: bundle.media.filter(media => !media.fileName).length,
  };
}
