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

  it('preserves catalogs, active catalog and readiness history during normalization', () => {
    const state: PersistedState = {
      schemaVersion: 3,
      progress: {},
      history: [],
      reviewEvents: [],
      fsrsShadow: {},
      readinessSnapshots: [{
        id: 'r1', catalogId: 'catalog', blueprintId: 'bp', calculatedAt: '2026-08-04T08:00:00.000Z',
        readiness: 50, mastery: 50, coverage: 100, coverageAdjustment: 100,
        topics: [{ topicId: 'A', weight: 100, itemCount: 1, coveredItems: 1, coverage: 100, mastery: 50 }],
        weakestTopicId: 'A',
      }],
      review: {},
      catalogs: [{
        catalogId: 'catalog', title: 'Catalog', version: '1.0.0', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z',
        cards: [],
      }],
      activeCatalogId: 'catalog',
      sessions: {},
      examAttempts: [],
      migrationLog: [],
      lastBackupAt: '2026-08-04T07:00:00.000Z',
    };

    const migrated = migrate(state);
    expect(migrated.catalogs?.[0].catalogId).toBe('catalog');
    expect(migrated.activeCatalogId).toBe('catalog');
    expect(migrated.readinessSnapshots?.[0].readiness).toBe(50);
    expect(migrated.lastBackupAt).toBe('2026-08-04T07:00:00.000Z');
  });

  it('preserves learner progress counters, due date and marks exactly', () => {
    const progress = {
      stage: 4,
      dueAt: '2026-08-10T12:00:00.000Z',
      correct: 12,
      partial: 3,
      incorrect: 2,
      skipped: 1,
      marked: true,
      cardVersion: 7,
    };
    const state: PersistedState = {
      schemaVersion: 2,
      progress: {'card-progress': progress},
      history: [],
      review: {},
      sessions: {},
      examAttempts: [],
      migrationLog: [],
    };
    const migrated = migrate(state);
    expect(migrated.progress['card-progress']).toEqual(progress);
  });
});
