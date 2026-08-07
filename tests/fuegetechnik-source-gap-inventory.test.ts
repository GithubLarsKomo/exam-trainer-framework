import { describe, expect, it } from 'vitest';
import { createFuegetechnikRuntimeCatalog } from '../src/fuegetechnik-catalog';
import { validateCatalog } from '../src/publication-workflow';

const expectedMissingSourcePages = [
  'ft01d1',
  'ft0901',
  'ft0902',
  'ft0903',
  'ft1001',
  'ft1002',
  'ft2401',
  'ft3001',
  'ft3401',
  'ft3502',
  'ft4101',
  'ft4301',
  'ft4302',
  'ft4501',
].sort();

describe('Fügetechnik remaining source-page debt', () => {
  it('keeps the remaining MISSING_SOURCE_PAGE set explicit and reviewable', () => {
    const actual = validateCatalog(createFuegetechnikRuntimeCatalog())
      .filter(issue => issue.code === 'MISSING_SOURCE_PAGE')
      .map(issue => issue.cardId)
      .filter((id): id is string => Boolean(id))
      .sort();

    expect(actual).toEqual(expectedMissingSourcePages);
  });
});
