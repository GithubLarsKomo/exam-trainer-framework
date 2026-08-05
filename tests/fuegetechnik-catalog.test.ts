import { describe, expect, it } from 'vitest';
import { createFuegetechnikRuntimeCatalog, FUEGETECHNIK_RUNTIME_VERSION } from '../src/fuegetechnik-catalog';
import { validateCatalog } from '../src/publication-workflow';

describe('Fügetechnik runtime catalog', () => {
  it('composes the complete built-in catalog from the versioned seed and additions', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const ids = catalog.cards.map(card => card.id);

    expect(catalog.catalogId).toBe('fuegetechnik');
    expect(catalog.version).toBe(FUEGETECHNIK_RUNTIME_VERSION);
    expect(catalog.cards.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no blocking publication-validation errors', () => {
    const issues = validateCatalog(createFuegetechnikRuntimeCatalog());

    expect(issues.filter(issue => issue.severity === 'error')).toEqual([]);
  });

  it('keeps missing source-page evidence visible as a remaining catalog-completion warning', () => {
    const issues = validateCatalog(createFuegetechnikRuntimeCatalog());

    expect(issues.some(issue => issue.code === 'MISSING_SOURCE_PAGE')).toBe(true);
  });
});
