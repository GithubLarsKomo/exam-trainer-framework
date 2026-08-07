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

  it('applies verified source metadata to grounded cards', () => {
    const catalog = createFuegetechnikRuntimeCatalog();

    expect(catalog.cards.find(card => card.id === 'ft0401')?.sourcePage).toContain('S. 19');
    expect(catalog.cards.find(card => card.id === 'ft1401')?.sourcePage).toContain('S. 79–80');
    expect(catalog.cards.find(card => card.id === 'ft1901')?.sourcePage).toContain('S. 72–73');
    expect(catalog.cards.find(card => card.id === 'ft1902')?.sourcePage).toContain('S. 72–73');
    expect(catalog.cards.find(card => card.id === 'ft2701')?.sourcePage).toContain('S. 73–76');
    expect(catalog.cards.find(card => card.id === 'ft3101')?.sourcePage).toContain('S. 102–103');
    expect(catalog.cards.find(card => card.id === 'ft3201')?.sourcePage).toContain('S. 101–102');
    expect(catalog.cards.find(card => card.id === 'ft3301')?.sourcePage).toContain('S. 100');
  });

  it('keeps all five MSG arc types from source table 10', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft1501');

    expect(card?.sourcePage).toContain('S. 97');
    expect(card?.answer.requiredTerms).toEqual([
      'Sprühlichtbogen',
      'Langlichtbogen',
      'Übergangslichtbogen',
      'Kurzlichtbogen',
      'Impulslichtbogen',
    ]);
  });

  it('aligns remembered Q16 with the source drawing in figure 92', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const drawing = catalog.cards.find(candidate => candidate.id === 'ft1601');
    const characteristic = catalog.cards.find(candidate => candidate.id === 'ft1602');

    expect(drawing?.sourcePage).toContain('S. 91');
    expect(characteristic?.sourcePage).toContain('S. 91');
    expect(drawing?.questionType).toBe('drawing');
    expect(drawing?.answer.criteria).toEqual(expect.arrayContaining([
      'Spannungsachse U',
      'Stromachse I',
      'steil fallende Maschinenkennlinie',
      'Kurzlichtbogen',
      'Langlichtbogen',
    ]));
  });

  it('uses the script-specific carbon-equivalent notation K', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft2601');

    expect(card?.sourcePage).toContain('S. 77');
    expect(card?.answer.requiredTerms).toEqual(['Kohlenstoffäquivalent', 'K']);
    expect(card?.answer.modelAnswer).toContain('K = C + Mn/6');
    expect(card?.answer.modelAnswer).not.toContain('CEV');
  });

  it('keeps Q27 within the approved carbon-content and cooling evidence', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft2701');

    expect(card?.sourcePage).toContain('S. 73–76');
    expect(card?.answer.requiredTerms).toEqual(['Kohlenstoffgehalt', 'Härtbarkeit', 'Martensit', 'Kaltrissgefahr']);
    expect(card?.answer.modelAnswer).toContain('schneller Abkühlung');
    expect(card?.answer.modelAnswer).not.toContain('Wasserstoff');
    expect(card?.answer.modelAnswer).not.toContain('Zugspannungen');
  });

  it('grounds Q32 in automated laser use and electron-beam vacuum overhead', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft3201');

    expect(card?.sourcePage).toContain('S. 101–102');
    expect(card?.answer.requiredTerms).toEqual(['Automatisierung', 'Hochvakuum', 'Vakuumkammer']);
    expect(card?.answer.modelAnswer).toContain('automatisierten Anlagen');
    expect(card?.answer.modelAnswer).toContain('Hochvakuum');
    expect(card?.answer.modelAnswer).toContain('Vakuumkammern');
  });

  it('grounds the CO2 laser wavelength from source table 11', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft3301');

    expect(card?.sourcePage).toContain('S. 100');
    expect(card?.questionType).toBe('numeric');
    expect(card?.answer.modelAnswer).toContain('10,6');
    expect(card?.answer.requiredTerms).toEqual(['10,6']);
  });

  it('keeps missing source-page evidence visible as a remaining catalog-completion warning', () => {
    const issues = validateCatalog(createFuegetechnikRuntimeCatalog());

    expect(issues.some(issue => issue.code === 'MISSING_SOURCE_PAGE')).toBe(true);
  });
});
