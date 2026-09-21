import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parseCatalogExport } from '../src/catalog-repository';

export const enterpriseLeadershipCatalogIdentity = {
  id: 'enterprise-leadership-n1',
  version: '0.3.0',
  sourcePath: 'catalogs/sources/enterprise-leadership-n1-v0.3.0.json.gz',
  sourceJsonSha256: 'a7b8a45f307be0024472b1fd85b62db9aea9b7fb363e029fbb3de24a0e9c26ee',
  sourceGzipSha256: '22aa8af7b180aa251c7f4abc4d3c8262369e0c4f3a3cd3b1d686628ba1a1c747',
} as const;

const repoRoot = resolve(import.meta.dirname, '..');

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function assertEnterpriseLeadershipCatalogReleased(
  catalog: ReturnType<typeof parseCatalogExport>,
): void {
  if (
    catalog.catalogId !== enterpriseLeadershipCatalogIdentity.id
    || catalog.version !== enterpriseLeadershipCatalogIdentity.version
  ) {
    throw new Error(
      `Enterprise catalog source identity mismatch: ${catalog.catalogId}@${catalog.version}.`,
    );
  }

  const knowledgeItems = catalog.knowledgeItems ?? [];
  const questionVariants = knowledgeItems.flatMap(item => item.questionVariants ?? []);
  const nonReleasedItems = knowledgeItems.filter(item => item.status !== 'released');
  const nonReleasedVariants = questionVariants.filter(variant => variant.status !== 'released');

  if (knowledgeItems.length !== 12 || questionVariants.length !== 36) {
    throw new Error(
      `Enterprise catalog structure mismatch: expected 12 KnowledgeItems/36 QuestionVariants, got ${knowledgeItems.length}/${questionVariants.length}.`,
    );
  }

  if (nonReleasedItems.length || nonReleasedVariants.length) {
    throw new Error(
      `Enterprise catalog is not fully released: ${nonReleasedItems.length} KnowledgeItems and ${nonReleasedVariants.length} QuestionVariants are not released.`,
    );
  }
}

export async function loadEnterpriseLeadershipCatalogSource() {
  const sourceFile = join(repoRoot, enterpriseLeadershipCatalogIdentity.sourcePath);
  const compressed = await readFile(sourceFile);
  const gzipSha256 = digest(compressed);
  if (gzipSha256 !== enterpriseLeadershipCatalogIdentity.sourceGzipSha256) {
    throw new Error(
      `Enterprise catalog gzip SHA-256 mismatch: expected ${enterpriseLeadershipCatalogIdentity.sourceGzipSha256}, got ${gzipSha256}.`,
    );
  }

  const sourceBytes = gunzipSync(compressed);
  const jsonSha256 = digest(sourceBytes);
  if (jsonSha256 !== enterpriseLeadershipCatalogIdentity.sourceJsonSha256) {
    throw new Error(
      `Enterprise catalog JSON SHA-256 mismatch: expected ${enterpriseLeadershipCatalogIdentity.sourceJsonSha256}, got ${jsonSha256}.`,
    );
  }

  const sourceText = sourceBytes.toString('utf8');
  const catalog = parseCatalogExport(sourceText);
  assertEnterpriseLeadershipCatalogReleased(catalog);

  return {
    catalog,
    sourceText,
    jsonSha256,
    gzipSha256,
  };
}
