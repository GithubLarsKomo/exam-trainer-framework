export type Outcome = 'correct' | 'partial' | 'incorrect';
export type Stage = 1 | 2 | 3 | 4 | 5;

export const STAGE_INTERVAL_MS: Record<Stage, number> = {
  1: 10 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 3 * 24 * 60 * 60 * 1000,
  4: 7 * 24 * 60 * 60 * 1000,
  5: 21 * 24 * 60 * 60 * 1000,
};

export function applyOutcome(stage: Stage, outcome: Outcome, now = 0): {stage: Stage; dueAt: number; retry: boolean} {
  let next = stage;
  if (outcome === 'correct') next = Math.min(5, stage + 1) as Stage;
  if (outcome === 'incorrect') next = Math.max(1, stage - 1) as Stage;
  const interval = outcome === 'partial' ? STAGE_INTERVAL_MS[next] / 2 : STAGE_INTERVAL_MS[next];
  return {stage: next, dueAt: now + interval, retry: outcome !== 'correct'};
}

export function numericMatches(actual: number, expected: number, tolerance: {type:'absolute'|'relative';value:number}): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || tolerance.value < 0) return false;
  if (tolerance.type === 'absolute') return Math.abs(actual - expected) <= tolerance.value;
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / Math.abs(expected) <= tolerance.value;
}

export function allocatePoints(itemCount: number, totalPoints: number): number[] {
  if (!Number.isInteger(itemCount) || itemCount < 1 || !Number.isInteger(totalPoints) || totalPoints < itemCount) throw new Error('Invalid exam totals');
  const base = Math.floor(totalPoints / itemCount);
  const remainder = totalPoints - base * itemCount;
  return Array.from({length:itemCount}, (_,i) => base + (i < remainder ? 1 : 0));
}
