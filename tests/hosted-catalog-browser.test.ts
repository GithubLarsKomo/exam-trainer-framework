import { describe, expect, it } from 'vitest';
import type { Catalog } from '../src/model';
import type { HostedCatalogRegistryEntryV1 } from '../src/hosted-catalog-registry';
import { hostedCatalogActionLabel, hostedCatalogLocalState } from '../src/hosted-catalog-browser-feature';

const entry: HostedCatalogRegistryEntryV1 = {
  id: 'skillz-wayfinder',
  version: '2.0.0',
  title: 'Wayfinder practice',
  catalogUrl: './skillz-wayfinder.json',
  contentHash: `sha256:${'a'.repeat(64)}`,
  status: 'released',
};

function catalog(version: string): Catalog {
  return {
    catalogId: entry.id,
    title: entry.title,
    version,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    cards: [],
  };
}

describe('Hosted Catalog Browser presentation state', () => {
  it('distinguishes missing, matching and outdated local copies', () => {
    expect(hostedCatalogLocalState(entry, [])).toBe('missing');
    expect(hostedCatalogLocalState(entry, [catalog('2.0.0')])).toBe('same-version');
    expect(hostedCatalogLocalState(entry, [catalog('1.0.0')])).toBe('different-version');
  });

  it('makes replacement semantics explicit in the action label', () => {
    expect(hostedCatalogActionLabel(entry, [])).toBe('Lokal importieren');
    expect(hostedCatalogActionLabel(entry, [catalog('2.0.0')])).toBe('Lokale Kopie ersetzen');
    expect(hostedCatalogActionLabel(entry, [catalog('1.0.0')])).toBe('Auf 2.0.0 aktualisieren');
  });
});
