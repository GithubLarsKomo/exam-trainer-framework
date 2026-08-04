import { describe, expect, it } from 'vitest';
import { readinessTrend, recordReadinessSnapshot } from '../src/readiness-history';
import type { ReadinessSnapshot } from '../src/model';

function snapshot(id: string, at: string, readiness: number): ReadinessSnapshot {
  return {
    id,
    catalogId: 'catalog',
    blueprintId: 'bp',
    calculatedAt: at,
    readiness,
    mastery: readiness,
    coverage: 100,
    coverageAdjustment: 100,
    topics: [{ topicId: 'A', weight: 100, itemCount: 1, coveredItems: 1, coverage: 100, mastery: readiness }],
    weakestTopicId: 'A',
  };
}

describe('readiness history', () => {
  it('replaces rapid successive snapshots instead of flooding history', () => {
    const state: { readinessSnapshots?: ReadinessSnapshot[] } = {};
    recordReadinessSnapshot(state, snapshot('a', '2026-08-04T08:00:00.000Z', 40));
    recordReadinessSnapshot(state, snapshot('b', '2026-08-04T08:02:00.000Z', 45));
    expect(state.readinessSnapshots).toHaveLength(1);
    expect(state.readinessSnapshots?.[0].readiness).toBe(45);
  });

  it('skips materially identical snapshots and reports trend', () => {
    const state: { readinessSnapshots?: ReadinessSnapshot[] } = {};
    recordReadinessSnapshot(state, snapshot('a', '2026-08-04T08:00:00.000Z', 40));
    recordReadinessSnapshot(state, snapshot('same', '2026-08-05T08:00:00.000Z', 40));
    recordReadinessSnapshot(state, snapshot('b', '2026-08-06T08:00:00.000Z', 55));
    expect(state.readinessSnapshots).toHaveLength(2);
    expect(readinessTrend(state.readinessSnapshots ?? [], 'catalog').delta).toBe(15);
  });

  it('caps history independently per catalog', () => {
    const state: { readinessSnapshots?: ReadinessSnapshot[] } = {};
    for (let i = 0; i < 5; i++) {
      recordReadinessSnapshot(state, snapshot(`s${i}`, `2026-08-0${i + 1}T08:00:00.000Z`, 10 + i), { maxPerCatalog: 3, replaceWithinMs: 0 });
    }
    expect(state.readinessSnapshots).toHaveLength(3);
    expect(state.readinessSnapshots?.map(item => item.id)).toEqual(['s2', 's3', 's4']);
  });
});
