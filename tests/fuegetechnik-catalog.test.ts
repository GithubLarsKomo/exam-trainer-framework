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

    expect(catalog.cards.find(card => card.id === 'ft0201')?.sourcePage).toContain('S. 16');
    expect(catalog.cards.find(card => card.id === 'ft0301')?.sourcePage).toContain('S. 16');
    expect(catalog.cards.find(card => card.id === 'ft0405')?.sourcePage).toContain('S. 19');
    expect(catalog.cards.find(card => card.id === 'ft0503')?.sourcePage).toContain('S. 19');
    expect(catalog.cards.find(card => card.id === 'ft0706')?.sourcePage).toContain('S. 58');
    expect(catalog.cards.find(card => card.id === 'ft1401')?.sourcePage).toContain('S. 79–80');
    expect(catalog.cards.find(card => card.id === 'ft1901')?.sourcePage).toContain('S. 72–73');
    expect(catalog.cards.find(card => card.id === 'ft1902')?.sourcePage).toContain('S. 72–73');
    expect(catalog.cards.find(card => card.id === 'ft2201')?.sourcePage).toContain('S. 74');
    expect(catalog.cards.find(card => card.id === 'ft2301')?.sourcePage).toContain('S. 73–74');
    expect(catalog.cards.find(card => card.id === 'ft2701')?.sourcePage).toContain('S. 73–76');
    expect(catalog.cards.find(card => card.id === 'ft2801')?.sourcePage).toContain('S. 104');
    expect(catalog.cards.find(card => card.id === 'ft3101')?.sourcePage).toContain('S. 102–103');
    expect(catalog.cards.find(card => card.id === 'ft3201')?.sourcePage).toContain('S. 101–102');
    expect(catalog.cards.find(card => card.id === 'ft3301')?.sourcePage).toContain('S. 100');
    expect(catalog.cards.find(card => card.id === 'ft3501')?.sourcePage).toContain('S. 154');
    expect(catalog.cards.find(card => card.id === 'ft3701')?.sourcePage).toContain('S. 155–156');
    expect(catalog.cards.find(card => card.id === 'ft3801')?.sourcePage).toContain('S. 160–163');
    expect(catalog.cards.find(card => card.id === 'ft3901')?.sourcePage).toContain('S. 157–158');
    expect(catalog.cards.find(card => card.id === 'ft4201')?.sourcePage).toContain('S. 69–70');
    expect(catalog.cards.find(card => card.id === 'ft4401')?.sourcePage).toContain('S. 133');
    expect(catalog.cards.find(card => card.id === 'ft4402')?.sourcePage).toContain('S. 150');
  });

  it('grounds early screw sizing, preload and forming questions in their approved sources', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const idsWithSource = (ids: string[]) => ids.map(id => catalog.cards.find(card => card.id === id)?.sourcePage);

    expect(idsWithSource(['ft0201', 'ft0202', 'ft0203'])).toEqual([
      expect.stringContaining('S. 16'),
      expect.stringContaining('S. 16'),
      expect.stringContaining('S. 16'),
    ]);
    expect(idsWithSource(['ft0301', 'ft0302', 'ft0303']).every(source => source?.includes('Gedächtnisprotokoll Q3'))).toBe(true);
    expect(catalog.cards.find(card => card.id === 'ft0301')?.answer.modelAnswer).toContain('28,8');
    expect(catalog.cards.find(card => card.id === 'ft0302')?.answer.value).toBe(14);

    expect(idsWithSource(['ft0401', 'ft0402', 'ft0403', 'ft0404', 'ft0405']).every(source => source?.includes('S. 19'))).toBe(true);
    expect(catalog.cards.find(card => card.id === 'ft0402')?.answer.requiredTerms).toEqual(['FMmin', 'FKerf', 'FZ', 'FPA']);

    expect(idsWithSource(['ft0501', 'ft0502', 'ft0503']).every(source => source?.includes('3.4.1'))).toBe(true);
    expect(catalog.cards.find(card => card.id === 'ft0502')?.answer.requiredTerms).toEqual(['Zugfeder', 'Druckfeder']);

    expect(idsWithSource(['ft0701', 'ft0702', 'ft0703', 'ft0704', 'ft0705', 'ft0706']).every(source => source?.includes('S. 58'))).toBe(true);
    expect(catalog.cards.find(card => card.id === 'ft0706')?.answer.requiredTerms).toEqual(['Materialeinsatz', 'thermische Beeinflussung', 'Kaltverfestigung']);
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

  it('grounds Q22 in the source t8/5 definition and ZTU cooling behavior', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const definition = catalog.cards.find(candidate => candidate.id === 'ft2201');
    const shortCooling = catalog.cards.find(candidate => candidate.id === 'ft2202');
    const longCooling = catalog.cards.find(candidate => candidate.id === 'ft2203');

    expect(definition?.sourcePage).toContain('S. 74');
    expect(definition?.answer.requiredTerms).toEqual(expect.arrayContaining(['800', '500', 'Abkühlzeit']));
    expect(shortCooling?.answer.requiredTerms).toEqual(['kurze t8/5', 'schnelle Abkühlung', 'Martensit', 'Härte']);
    expect(shortCooling?.answer.modelAnswer).toContain('Härterissgefahr');
    expect(longCooling?.answer.requiredTerms).toEqual(['lange t8/5', 'langsame Abkühlung', 'Ferrit', 'Perlit']);
    expect(longCooling?.answer.modelAnswer).toContain('Zwischenstufengefüge');
    expect(longCooling?.answer.modelAnswer).not.toContain('Kornwachstum');
  });

  it('grounds Q23 in the F/P/Zw/M regions of source figure 81', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const sequence = catalog.cards.find(candidate => candidate.id === 'ft2301');
    const hardness = catalog.cards.find(candidate => candidate.id === 'ft2302');
    const cracking = catalog.cards.find(candidate => candidate.id === 'ft2303');

    expect(sequence?.sourcePage).toContain('S. 73–74');
    expect(sequence?.answer.requiredTerms).toEqual(['Ferrit', 'Perlit', 'Zwischenstufengefüge', 'Martensit']);
    expect(sequence?.answer.modelAnswer).toContain('Zwischenstufengefüge');
    expect(hardness?.answer.requiredTerms).toEqual(['Härte', 'Abkühlungsdauer', 'Martensit']);
    expect(cracking?.answer.requiredTerms).toEqual(['hohe Abkühlgeschwindigkeit', 'Martensit', 'Härteriss']);
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

  it('grounds Q28 in the press-welding definition below the melting limit', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft2801');

    expect(card?.sourcePage).toContain('S. 104');
    expect(card?.answer.requiredTerms).toEqual(['unterhalb der Schmelzgrenze', 'teilweise Erwärmung', 'Fügekräfte']);
    expect(card?.answer.modelAnswer).toContain('nicht bis zur Schmelzgrenze');
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

  it('grounds the script-defined Klebstoff concept without claiming Q35 Kleber evidence', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const adhesive = catalog.cards.find(candidate => candidate.id === 'ft3501');
    const curedTerm = catalog.cards.find(candidate => candidate.id === 'ft3502');

    expect(adhesive?.sourcePage).toContain('S. 154');
    expect(adhesive?.answer.requiredTerms).toEqual(expect.arrayContaining(['nichtmetallisch', 'Adhäsion', 'Kohäsion']));
    expect(curedTerm?.sourcePage).toBeUndefined();
  });

  it('grounds Young equation and the three adhesive reaction classes', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const young = catalog.cards.find(candidate => candidate.id === 'ft3701');
    const classes = catalog.cards.find(candidate => candidate.id === 'ft3801');

    expect(young?.sourcePage).toContain('S. 155–156');
    expect(young?.answer.requiredTerms).toEqual(expect.arrayContaining(['γ_SV', 'γ_SL', 'γ_LV', 'cos']));
    expect(classes?.sourcePage).toContain('S. 160–163');
    expect(classes?.answer.requiredTerms).toEqual(['Polymerisation', 'Polyaddition', 'Polykondensation']);
  });

  it('uses only script-listed examples for adhesive reaction classes', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft3802');

    expect(card?.sourcePage).toContain('S. 160–163');
    expect(card?.answer.requiredTerms).toEqual(['Cyanacrylat', 'Epoxidharz', 'Silikon']);
    expect(card?.answer.modelAnswer).toContain('Cyanacrylatklebstoff');
    expect(card?.answer.modelAnswer).toContain('Epoxidharzklebstoff');
    expect(card?.answer.modelAnswer).toContain('Silikon');
    expect(card?.answer.modelAnswer).not.toContain('Phenolharz');
  });

  it('keeps Q39 adhesive disadvantages within the verified script scope', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft3902');

    expect(card?.sourcePage).toContain('S. 158–159');
    expect(card?.answer.requiredTerms).toEqual(['Oberflächenvorbereitung', 'Temperatur', 'Schälbelastung']);
    expect(card?.answer.modelAnswer).not.toContain('Biege');
    expect(card?.answer.modelAnswer).not.toContain('Schlag');
  });

  it('keeps Q41 and Q43 open where the approved source is only partial', () => {
    const catalog = createFuegetechnikRuntimeCatalog();

    expect(catalog.cards.find(card => card.id === 'ft4101')?.sourcePage).toBeUndefined();
    expect(catalog.cards.find(card => card.id === 'ft4301')?.sourcePage).toBeUndefined();
    expect(catalog.cards.find(card => card.id === 'ft4302')?.sourcePage).toBeUndefined();
  });

  it('grounds Q42 in the source definitions of welding and soldering', () => {
    const card = createFuegetechnikRuntimeCatalog().cards.find(candidate => candidate.id === 'ft4201');

    expect(card?.sourcePage).toContain('S. 69–70');
    expect(card?.answer.requiredTerms).toEqual(['Lot', 'Grundwerkstoff nicht geschmolzen', 'Wärme und/oder Kraft']);
    expect(card?.answer.modelAnswer).toContain('benetzt, aber nicht geschmolzen');
    expect(card?.answer.modelAnswer).not.toContain('plastifiziert');
  });

  it('grounds Q44 in oxide removal, flux action and flux-residue cleanup', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const oxideRemoval = catalog.cards.find(candidate => candidate.id === 'ft4401');
    const residue = catalog.cards.find(candidate => candidate.id === 'ft4402');

    expect(oxideRemoval?.sourcePage).toContain('S. 149–150');
    expect(oxideRemoval?.answer.requiredTerms).toEqual(['Reinigung', 'Flussmittel', 'Oxide', 'Benetzung']);
    expect(oxideRemoval?.answer.modelAnswer).not.toContain('Schutzgas');
    expect(oxideRemoval?.answer.modelAnswer).not.toContain('Vakuum');
    expect(residue?.sourcePage).toContain('S. 150');
    expect(residue?.answer.requiredTerms).toEqual(expect.arrayContaining(['Flussmittelreste', 'Korrosion', 'entfernen']));
  });

  it('keeps missing source-page evidence visible as a remaining catalog-completion warning', () => {
    const issues = validateCatalog(createFuegetechnikRuntimeCatalog());

    expect(issues.some(issue => issue.code === 'MISSING_SOURCE_PAGE')).toBe(true);
  });
});
