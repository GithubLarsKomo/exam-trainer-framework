import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { catalogExport } from '../src/catalog-repository';
import { activateFuegetechnikRuntimeCatalog } from '../src/fuegetechnik-catalog';
import type { Catalog } from '../src/model';

interface ReleasePlanEntry {
  id: string;
  version: string;
  title: string;
  description?: string;
  tags?: string[];
  source: string;
  status: 'released';
  approved: true;
}

interface ReleasePlan {
  schemaVersion: 1;
  releases: ReleasePlanEntry[];
}

interface RegistryEntry {
  id: string;
  version: string;
  title: string;
  catalogUrl: string;
  contentHash: string;
  status: 'released';
  description?: string;
  tags?: string[];
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..');
const defaultPlanPath = join(repoRoot, 'catalogs', 'hosted-release-plan.json');
const defaultOutputRoot = join(repoRoot, 'public', 'catalogs');

const sourceFactories: Record<string, () => Catalog> = {
  'fuegetechnik-runtime': activateFuegetechnikRuntimeCatalog,
};

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function parsePlan(text: string): ReleasePlan {
  const value = JSON.parse(text) as Partial<ReleasePlan>;
  if (value.schemaVersion !== 1 || !Array.isArray(value.releases)) {
    throw new Error('Hosted release plan must use schemaVersion 1 with a releases array.');
  }
  const seen = new Set<string>();
  const releases = value.releases.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Release ${index} is not an object.`);
    const entry = raw as Partial<ReleasePlanEntry>;
    if (entry.status !== 'released') throw new Error(`Release ${index} must have status=released.`);
    if (entry.approved !== true) throw new Error(`Release ${index} requires explicit approved=true.`);
    const parsed: ReleasePlanEntry = {
      id: nonEmpty(entry.id, `releases[${index}].id`),
      version: nonEmpty(entry.version, `releases[${index}].version`),
      title: nonEmpty(entry.title, `releases[${index}].title`),
      source: nonEmpty(entry.source, `releases[${index}].source`),
      status: 'released',
      approved: true,
      description: entry.description === undefined ? undefined : nonEmpty(entry.description, `releases[${index}].description`),
      tags: entry.tags === undefined ? undefined : [...new Set(entry.tags.map((tag, tagIndex) => nonEmpty(tag, `releases[${index}].tags[${tagIndex}]`)))],
    };
    const identity = `${parsed.id}@${parsed.version}`;
    if (seen.has(identity)) throw new Error(`Duplicate hosted release ${identity}.`);
    seen.add(identity);
    return parsed;
  });
  return { schemaVersion: 1, releases };
}

function hasAssetRefs(catalog: Catalog): boolean {
  if (catalog.cards.some(card => Boolean(card.assetRefs?.length))) return true;
  return (catalog.knowledgeItems ?? []).some(item => item.questionVariants.some(variant => Boolean(variant.assetRefs?.length)));
}

function assertReleaseableCatalog(catalog: Catalog, release: ReleasePlanEntry): void {
  if (catalog.catalogId !== release.id) throw new Error(`${release.source}: catalogId ${catalog.catalogId} does not match release id ${release.id}.`);
  if (catalog.version !== release.version) throw new Error(`${release.id}: runtime version ${catalog.version} does not match approved release ${release.version}.`);
  if (catalog.archived) throw new Error(`${release.id}@${release.version} is archived and cannot be hosted.`);
  if (catalog.cards.some(card => card.status !== 'released')) throw new Error(`${release.id}@${release.version} contains non-released legacy cards.`);
  for (const item of catalog.knowledgeItems ?? []) {
    if (item.status !== 'released') throw new Error(`${release.id}@${release.version}: KnowledgeItem ${item.id} is not released.`);
    if (!item.questionVariants.length) throw new Error(`${release.id}@${release.version}: KnowledgeItem ${item.id} has no QuestionVariants.`);
    if (item.questionVariants.some(variant => variant.status !== 'released')) {
      throw new Error(`${release.id}@${release.version}: KnowledgeItem ${item.id} contains non-released QuestionVariants.`);
    }
  }
  if (hasAssetRefs(catalog)) throw new Error(`${release.id}@${release.version} uses assetRefs; Registry v1 has no verified asset-bundle protocol.`);
}

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex')}`;
}

export async function generateHostedCatalogs({
  planPath = defaultPlanPath,
  outputRoot = defaultOutputRoot,
}: { planPath?: string; outputRoot?: string } = {}): Promise<void> {
  const plan = parsePlan(await readFile(planPath, 'utf8'));
  const registryEntries: RegistryEntry[] = [];

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const releases = [...plan.releases].sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version));
  for (const release of releases) {
    const factory = sourceFactories[release.source];
    if (!factory) throw new Error(`Unknown hosted catalog source: ${release.source}`);
    const catalog = structuredClone(factory());
    assertReleaseableCatalog(catalog, release);

    const exported = catalogExport(catalog);
    const relativePath = `${release.id}/${release.version}.json`;
    const targetPath = join(outputRoot, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, exported, 'utf8');

    registryEntries.push({
      id: release.id,
      version: release.version,
      title: release.title,
      catalogUrl: `./${relativePath}`,
      contentHash: sha256(exported),
      status: 'released',
      description: release.description,
      tags: release.tags,
    });
  }

  const registry = JSON.stringify({ schemaVersion: 1, catalogs: registryEntries }, null, 2) + '\n';
  await writeFile(join(outputRoot, 'registry.json'), registry, 'utf8');
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  await generateHostedCatalogs();
}
