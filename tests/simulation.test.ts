import { describe, expect, it } from 'vitest';
import { simulateLearningTrajectory, simulatePopulation, type SimulationReview } from '../src/simulation';

const DAY = 24 * 60 * 60 * 1000;
const reviews: SimulationReview[] = [
  { atOffsetMs: 0, outcome: 'correct' },
  { atOffsetMs: DAY, outcome: 'correct' },
  { atOffsetMs: 4 * DAY, outcome: 'partial' },
  { atOffsetMs: 8 * DAY, outcome: 'incorrect' },
  { atOffsetMs: 9 * DAY, outcome: 'correct' },
];

describe('scheduler simulation harness', () => {
  it('produces deterministic parallel classic and FSRS traces', () => {
    const first = simulateLearningTrajectory(reviews);
    const second = simulateLearningTrajectory(reviews);

    expect(first).toEqual(second);
    expect(first).toHaveLength(reviews.length);
    expect(first.map((entry) => entry.classic.stage)).toEqual([2, 3, 3, 2, 3]);
    for (const entry of first) {
      expect(Number.isNaN(new Date(entry.classic.dueAt).getTime())).toBe(false);
      expect(Number.isNaN(new Date(entry.fsrs.dueAt).getTime())).toBe(false);
      expect(entry.fsrs.stability).toBeGreaterThanOrEqual(0);
      expect(entry.fsrs.difficulty).toBeGreaterThanOrEqual(0);
    }
  });

  it('can simulate a deterministic 500-item population', () => {
    const population = simulatePopulation(500, reviews);
    expect(population).toHaveLength(500);
    expect(population.every((trace) => trace.length === reviews.length)).toBe(true);
    expect(population[0]).toEqual(population[499]);
  });
});
