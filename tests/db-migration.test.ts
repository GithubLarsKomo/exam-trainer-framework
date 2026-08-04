import { describe, expect, it } from 'vitest';
import { migrate, type PersistedState } from '../src/db';

describe('schema v3 migration', () => {
  it('projects legacy history into review events without inventing FSRS state', () => {
    const legacy: PersistedState = {
      schemaVersion: 2,
      progress: {},
      history: [
        { cardId: 'ft-demo', outcome: 'correct', at: '2026-08-01T08:00:00.000Z' },
        { cardId: 'ft-demo#exam17', outcome: 'incorrect', at: '2026-08-02T08:00:00.000Z' },
      ],
      review: {},
      sessions: {},
      examAttempts: [],
      migrationLog: [],
    };

    const migrated = migrate(legacy);

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.fsrsShadow).toEqual({});
    expect(migrated.reviewEvents).toHaveLength(2);
    expect(migrated.reviewEvents?.[0]).toMatchObject({
      knowledgeItemId: 'ft-demo',
      questionVariantId: 'ft-demo:q1',
      source: 'learning',
      outcome: 'correct',
      migrationSource: 'legacy-history',
    });
    expect(migrated.reviewEvents?.[1]).toMatchObject({
      knowledgeItemId: 'ft-demo',
      questionVariantId: 'ft-demo:q1',
      source: 'exam',
      outcome: 'incorrect',
      migrationSource: 'legacy-history',
    });
  });
});
