import type { AppState, ReadinessSnapshot } from './model';

export interface ReadinessHistoryOptions {
  replaceWithinMs?: number;
  maxPerCatalog?: number;
}

function materiallyEqual(a: ReadinessSnapshot, b: ReadinessSnapshot): boolean {
  return a.blueprintId === b.blueprintId
    && a.readiness === b.readiness
    && a.mastery === b.mastery
    && a.coverage === b.coverage
    && a.coverageAdjustment === b.coverageAdjustment
    && a.weakestTopicId === b.weakestTopicId
    && JSON.stringify(a.topics) === JSON.stringify(b.topics);
}

export function recordReadinessSnapshot(
  state: Pick<AppState, 'readinessSnapshots'>,
  snapshot: ReadinessSnapshot,
  options: ReadinessHistoryOptions = {},
): ReadinessSnapshot[] {
  const replaceWithinMs = options.replaceWithinMs ?? 5 * 60 * 1000;
  const maxPerCatalog = Math.max(1, options.maxPerCatalog ?? 500);
  const all = [...(state.readinessSnapshots ?? [])];
  const sameCatalog = all
    .map((item, index) => ({ item, index }))
    .filter(entry => entry.item.catalogId === snapshot.catalogId)
    .sort((a, b) => Date.parse(a.item.calculatedAt) - Date.parse(b.item.calculatedAt));
  const latest = sameCatalog.at(-1);

  if (latest && materiallyEqual(latest.item, snapshot)) {
    return all;
  }

  if (latest) {
    const delta = Date.parse(snapshot.calculatedAt) - Date.parse(latest.item.calculatedAt);
    if (Number.isFinite(delta) && delta >= 0 && delta <= replaceWithinMs) {
      all[latest.index] = snapshot;
    } else {
      all.push(snapshot);
    }
  } else {
    all.push(snapshot);
  }

  const catalogSnapshots = all
    .filter(item => item.catalogId === snapshot.catalogId)
    .sort((a, b) => Date.parse(a.calculatedAt) - Date.parse(b.calculatedAt));
  const keepIds = new Set(catalogSnapshots.slice(-maxPerCatalog).map(item => item.id));
  state.readinessSnapshots = all.filter(item => item.catalogId !== snapshot.catalogId || keepIds.has(item.id));
  return state.readinessSnapshots;
}

export function readinessTrend(
  snapshots: ReadinessSnapshot[],
  catalogId: string,
): { latest?: ReadinessSnapshot; previous?: ReadinessSnapshot; delta?: number } {
  const ordered = snapshots
    .filter(item => item.catalogId === catalogId)
    .sort((a, b) => Date.parse(a.calculatedAt) - Date.parse(b.calculatedAt));
  const latest = ordered.at(-1);
  const previous = ordered.at(-2);
  return {
    latest,
    previous,
    delta: latest && previous ? Math.round((latest.readiness - previous.readiness) * 10) / 10 : undefined,
  };
}
