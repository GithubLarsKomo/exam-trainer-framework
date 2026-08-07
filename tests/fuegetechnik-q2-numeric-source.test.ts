import { describe, expect, it } from 'vitest';
import { createFuegetechnikRuntimeCatalog } from '../src/fuegetechnik-catalog';

describe('Fügetechnik Q2 numeric source grounding', () => {
  it('maps all numeric strength-class examples to the verified S. 16 rule', () => {
    const catalog = createFuegetechnikRuntimeCatalog();
    const ids = ['ft0259rm', 'ft0259re', 'ft0289rm', 'ft0289re', 'ft02129rm', 'ft02129re'];

    for (const id of ids) {
      expect(catalog.cards.find(card => card.id === id)?.sourcePage).toContain('S. 16');
    }
  });
});
