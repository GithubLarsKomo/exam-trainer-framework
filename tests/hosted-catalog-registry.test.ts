import { describe, expect, it } from 'vitest';
import type { Catalog } from '../src/model';
import {
  downloadHostedCatalog,
  fetchHostedCatalogRegistry,
  installDownloadedCatalog,
  parseHostedCatalogRegistry,
  resolveHostedCatalogUrl,
  sha256ContentHash,
  type HostedCatalogRegistryEntryV1,
} from '../src/hosted-catalog-registry';

const at = '2026-08-20T00:00:00.000Z';

function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    catalogId: 'skillz-wayfinder',
    title: 'Wayfinder practice',
    version: '1.0.0',
    createdAt: at,
    updatedAt: at,
    cards: [
      {
        id: 'wf-1',
        version: 1,
        status: 'released',
        topicId: 'Wayfinder',
        examQuestion: '1',
        prompt: 'Separate fact and assumption.',
        points: 1,
        difficulty: 2,
        tags: ['wayfinder'],
        questionType: 'free_text',
        answer: { modelAnswer: 'Fact is observed; assumption is unverified.', requiredTerms: [] },
        source: 'Skillz fixture',
        changedAt: at,
      },
    ],
    ...overrides,
  };
}

async function entryFor(body: string, overrides: Partial<HostedCatalogRegistryEntryV1> = {}): Promise<HostedCatalogRegistryEntryV1> {
  const bytes = new TextEncoder().encode(body);
  return {
    id: 'skillz-wayfinder',
    version: '1.0.0',
    title: 'Wayfinder practice',
    catalogUrl: './skillz-wayfinder.json',
    contentHash: await sha256ContentHash(bytes),
    status: 'released',
    ...overrides,
  };
}

function responseFetch(routes: Record<string, Response>): typeof fetch {
  return (async input => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const response = routes[url];
    if (!response) return new Response('missing', { status: 404 });
    return response.clone();
  }) as typeof fetch;
}

describe('Hosted Catalog Registry', () => {
  it('parses a released v1 registry and rejects duplicate catalog identities', () => {
    const registry = parseHostedCatalogRegistry(JSON.stringify({
      schemaVersion: 1,
      catalogs: [{
        id: 'skillz-wayfinder', version: '1.0.0', title: 'Wayfinder',
        catalogUrl: './wayfinder.json', contentHash: `sha256:${'a'.repeat(64)}`, status: 'released',
      }],
    }));
    expect(registry.catalogs[0].id).toBe('skillz-wayfinder');

    expect(() => parseHostedCatalogRegistry(JSON.stringify({
      schemaVersion: 1,
      catalogs: [registry.catalogs[0], registry.catalogs[0]],
    }))).toThrow(/Doppelter Registry-Eintrag/);
  });

  it('rejects unsafe URL schemes and HTTPS-to-HTTP downgrade', () => {
    expect(() => resolveHostedCatalogUrl('javascript:alert(1)', 'https://exam.example/catalogs/registry.json')).toThrow(/HTTP\(S\)/);
    expect(() => resolveHostedCatalogUrl('http://exam.example/catalog.json', 'https://exam.example/catalogs/registry.json')).toThrow(/HTTP-Katalog/);
    expect(resolveHostedCatalogUrl('./catalog.json', 'https://exam.example/catalogs/registry.json').toString())
      .toBe('https://exam.example/catalogs/catalog.json');
  });

  it('loads a registry without cache reuse', async () => {
    const url = 'https://exam.example/catalogs/registry.json';
    const body = JSON.stringify({ schemaVersion: 1, catalogs: [] });
    let cacheMode: RequestCache | undefined;
    const fetchImpl = (async (_input, init) => {
      cacheMode = init?.cache;
      return new Response(body, { status: 200 });
    }) as typeof fetch;
    await expect(fetchHostedCatalogRegistry(url, fetchImpl)).resolves.toEqual({ schemaVersion: 1, catalogs: [] });
    expect(cacheMode).toBe('no-store');
  });

  it('downloads only byte-hash-verified released catalogs with matching identity', async () => {
    const bundle = JSON.stringify({ format: 'etf-catalog', version: 1, catalog: catalog() });
    const entry = await entryFor(bundle);
    const registryUrl = 'https://exam.example/catalogs/registry.json';
    const catalogUrl = 'https://exam.example/catalogs/skillz-wayfinder.json';
    const fetchImpl = responseFetch({ [catalogUrl]: new Response(bundle, { status: 200 }) });

    const downloaded = await downloadHostedCatalog(entry, registryUrl, fetchImpl);
    expect(downloaded.catalog.catalogId).toBe('skillz-wayfinder');
    expect(downloaded.verifiedContentHash).toBe(entry.contentHash);

    await expect(downloadHostedCatalog({ ...entry, contentHash: `sha256:${'0'.repeat(64)}` }, registryUrl, fetchImpl))
      .rejects.toThrow(/Hashprüfung/);

    const wrongId = JSON.stringify({ format: 'etf-catalog', version: 1, catalog: catalog({ catalogId: 'other' }) });
    const wrongIdEntry = await entryFor(wrongId);
    const wrongFetch = responseFetch({ [catalogUrl]: new Response(wrongId, { status: 200 }) });
    await expect(downloadHostedCatalog(wrongIdEntry, registryUrl, wrongFetch)).rejects.toThrow(/catalogId/);
  });

  it('rejects draft content and asset references in registry v1', async () => {
    const draftCatalog = catalog({ cards: [{ ...catalog().cards[0], status: 'draft' }] });
    const draftBody = JSON.stringify({ format: 'etf-catalog', version: 1, catalog: draftCatalog });
    const draftEntry = await entryFor(draftBody);
    const registryUrl = 'https://exam.example/catalogs/registry.json';
    const catalogUrl = 'https://exam.example/catalogs/skillz-wayfinder.json';
    await expect(downloadHostedCatalog(
      draftEntry,
      registryUrl,
      responseFetch({ [catalogUrl]: new Response(draftBody, { status: 200 }) }),
    )).rejects.toThrow(/nicht freigegebene/);

    const assetCatalog = catalog({ cards: [{ ...catalog().cards[0], assetRefs: [{ assetId: 'asset-1', role: 'prompt' }] }] });
    const assetBody = JSON.stringify({ format: 'etf-catalog', version: 1, catalog: assetCatalog });
    const assetEntry = await entryFor(assetBody);
    await expect(downloadHostedCatalog(
      assetEntry,
      registryUrl,
      responseFetch({ [catalogUrl]: new Response(assetBody, { status: 200 }) }),
    )).rejects.toThrow(/Asset-Bundles/);
  });

  it('requires explicit replacement when a hosted catalog id already exists locally', async () => {
    const hosted = catalog();
    const bundle = JSON.stringify({ format: 'etf-catalog', version: 1, catalog: hosted });
    const entry = await entryFor(bundle);
    const downloaded = {
      catalog: hosted,
      registryEntry: entry,
      resolvedCatalogUrl: 'https://exam.example/catalogs/skillz-wayfinder.json',
      verifiedContentHash: entry.contentHash,
    };

    expect(installDownloadedCatalog([], downloaded)).toHaveLength(1);
    expect(() => installDownloadedCatalog([catalog({ title: 'Local edit' })], downloaded)).toThrow(/bereits vorhanden/);
    expect(installDownloadedCatalog([catalog({ title: 'Local edit' })], downloaded, { replaceExisting: true })[0].title)
      .toBe('Wayfinder practice');
  });
});
