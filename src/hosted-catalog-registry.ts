import { parseCatalogExport } from './catalog-repository';
import type { Catalog } from './model';

export const HOSTED_CATALOG_REGISTRY_VERSION = 1 as const;
export const HOSTED_CATALOG_HASH_ALGORITHM = 'sha256' as const;

export interface HostedCatalogRegistryEntryV1 {
  id: string;
  version: string;
  title: string;
  catalogUrl: string;
  contentHash: string;
  status: 'released';
  description?: string;
  tags?: string[];
}

export interface HostedCatalogRegistryV1 {
  schemaVersion: typeof HOSTED_CATALOG_REGISTRY_VERSION;
  catalogs: HostedCatalogRegistryEntryV1[];
}

export interface DownloadedHostedCatalog {
  catalog: Catalog;
  registryEntry: HostedCatalogRegistryEntryV1;
  resolvedCatalogUrl: string;
  verifiedContentHash: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} darf nicht leer sein.`);
  return value.trim();
}

function parseHash(value: unknown): string {
  const hash = nonEmptyString(value, 'contentHash').toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/.test(hash)) throw new Error('contentHash muss sha256:<64 hex> verwenden.');
  return hash;
}

function parseTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some(tag => typeof tag !== 'string' || !tag.trim())) {
    throw new Error('tags muss eine Liste nicht-leerer Strings sein.');
  }
  return [...new Set(value.map(tag => tag.trim()))];
}

function parseEntry(value: unknown): HostedCatalogRegistryEntryV1 {
  if (!isRecord(value)) throw new Error('Registry-Eintrag ist kein Objekt.');
  if (value.status !== 'released') throw new Error('Hosted Catalog Registry v1 akzeptiert nur status=released.');
  return {
    id: nonEmptyString(value.id, 'id'),
    version: nonEmptyString(value.version, 'version'),
    title: nonEmptyString(value.title, 'title'),
    catalogUrl: nonEmptyString(value.catalogUrl, 'catalogUrl'),
    contentHash: parseHash(value.contentHash),
    status: 'released',
    description: value.description === undefined ? undefined : nonEmptyString(value.description, 'description'),
    tags: parseTags(value.tags),
  };
}

export function parseHostedCatalogRegistry(text: string): HostedCatalogRegistryV1 {
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed) || parsed.schemaVersion !== HOSTED_CATALOG_REGISTRY_VERSION || !Array.isArray(parsed.catalogs)) {
    throw new Error('Ungültiges Hosted Catalog Registry v1 Format.');
  }
  const catalogs = parsed.catalogs.map(parseEntry);
  const identities = new Set<string>();
  for (const entry of catalogs) {
    const identity = `${entry.id}@${entry.version}`;
    if (identities.has(identity)) throw new Error(`Doppelter Registry-Eintrag: ${identity}`);
    identities.add(identity);
  }
  return { schemaVersion: HOSTED_CATALOG_REGISTRY_VERSION, catalogs };
}

export function resolveHostedCatalogUrl(catalogUrl: string, registryUrl: string): URL {
  const base = new URL(registryUrl);
  const resolved = new URL(catalogUrl, base);
  if (!['http:', 'https:'].includes(resolved.protocol)) throw new Error('Hosted Catalog URL muss HTTP(S) verwenden.');
  if (resolved.username || resolved.password) throw new Error('Hosted Catalog URL darf keine Zugangsdaten enthalten.');
  if (resolved.protocol === 'http:' && base.protocol === 'https:') throw new Error('HTTPS Registry darf keinen HTTP-Katalog referenzieren.');
  return resolved;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function sha256ContentHash(bytes: Uint8Array): Promise<string> {
  return `${HOSTED_CATALOG_HASH_ALGORITHM}:${await sha256(bytes)}`;
}

function hasAssetRefs(catalog: Catalog): boolean {
  if (catalog.cards.some(card => Boolean(card.assetRefs?.length))) return true;
  return (catalog.knowledgeItems ?? []).some(item =>
    item.questionVariants.some(variant => Boolean(variant.assetRefs?.length)),
  );
}

function assertReleasedCatalog(catalog: Catalog): void {
  const nonReleasedCards = catalog.cards.filter(card => card.status !== 'released');
  if (nonReleasedCards.length) throw new Error('Gehosteter Katalog enthält nicht freigegebene Legacy-Karten.');
  for (const item of catalog.knowledgeItems ?? []) {
    if (item.status !== 'released') throw new Error(`KnowledgeItem ${item.id} ist nicht released.`);
    if (!item.questionVariants.length) throw new Error(`KnowledgeItem ${item.id} enthält keine QuestionVariants.`);
    if (item.questionVariants.some(variant => variant.status !== 'released')) {
      throw new Error(`KnowledgeItem ${item.id} enthält nicht freigegebene QuestionVariants.`);
    }
  }
  if (hasAssetRefs(catalog)) {
    throw new Error('Hosted Catalog Registry v1 unterstützt noch keine binären Asset-Bundles.');
  }
}

export async function fetchHostedCatalogRegistry(
  registryUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HostedCatalogRegistryV1> {
  const url = new URL(registryUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Registry URL muss HTTP(S) verwenden.');
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Registry konnte nicht geladen werden (${response.status}).`);
  return parseHostedCatalogRegistry(await response.text());
}

export async function downloadHostedCatalog(
  entry: HostedCatalogRegistryEntryV1,
  registryUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DownloadedHostedCatalog> {
  const resolved = resolveHostedCatalogUrl(entry.catalogUrl, registryUrl);
  const response = await fetchImpl(resolved, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Katalog ${entry.id} konnte nicht geladen werden (${response.status}).`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  const verifiedContentHash = await sha256ContentHash(bytes);
  if (verifiedContentHash !== entry.contentHash.toLowerCase()) {
    throw new Error(`Hashprüfung für ${entry.id}@${entry.version} fehlgeschlagen.`);
  }

  const text = new TextDecoder().decode(bytes);
  const catalog = parseCatalogExport(text);
  if (catalog.catalogId !== entry.id) throw new Error('Registry-ID und catalogId stimmen nicht überein.');
  if (catalog.version !== entry.version) throw new Error('Registry-Version und Katalogversion stimmen nicht überein.');
  assertReleasedCatalog(catalog);

  return {
    catalog: structuredClone(catalog),
    registryEntry: structuredClone(entry),
    resolvedCatalogUrl: resolved.toString(),
    verifiedContentHash,
  };
}

export function installDownloadedCatalog(
  catalogs: Catalog[],
  downloaded: DownloadedHostedCatalog,
  options: { replaceExisting?: boolean } = {},
): Catalog[] {
  const next = catalogs.map(catalog => structuredClone(catalog));
  const index = next.findIndex(catalog => catalog.catalogId === downloaded.catalog.catalogId);
  if (index < 0) return [...next, structuredClone(downloaded.catalog)];
  if (!options.replaceExisting) {
    throw new Error(`Katalog ${downloaded.catalog.catalogId} ist lokal bereits vorhanden.`);
  }
  next[index] = structuredClone(downloaded.catalog);
  return next;
}
