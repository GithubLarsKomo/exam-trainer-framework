import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  enterpriseLeadershipCatalogIdentity,
  loadEnterpriseLeadershipCatalogSource,
} from './enterprise-catalog-source';

function outputArgument(): string | undefined {
  const index = process.argv.indexOf('--output');
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('--output requires a path.');
  }
  return value;
}

const verifyOnly = process.argv.includes('--verify-only');
const source = await loadEnterpriseLeadershipCatalogSource();

if (verifyOnly) {
  console.log(
    `Verified ${enterpriseLeadershipCatalogIdentity.id}@${enterpriseLeadershipCatalogIdentity.version} `
    + `(${source.jsonSha256}, fully released).`,
  );
  process.exit(0);
}

const output = resolve(
  outputArgument() ?? 'artifacts/enterprise-leadership-n1-v0.3.0.json',
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, source.sourceText, 'utf8');
console.log(
  `Exported canonical ${enterpriseLeadershipCatalogIdentity.id}@${enterpriseLeadershipCatalogIdentity.version} to ${output} `
  + `(sha256:${source.jsonSha256}).`,
);
