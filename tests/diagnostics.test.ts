import { describe, expect, it } from 'vitest';
import { analyzeLearningDiagnostics } from '../src/diagnostics';
import type { Progress, ReviewEvent } from '../src/model';

function event(id: string, outcome: ReviewEvent['outcome'], day: number, options: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    id: `${id}:${day}:${outcome}`,
    knowledgeItemId: id,
    questionVariantId: `${id}:q1`,
    source: 'learning',
    outcome,
    answeredAt: `2026-08-${String(day).padStart(2, '0')}T08:00:00.000Z`,
    ...options,
  };
}

function progress(stage: number): Progress {
  return { stage, dueAt: '2026-08-10T00:00:00.000Z', correct: 1, partial: 0, incorrect: 0, skipped: 0, marked: false, cardVersion: 1 };
}

describe('learning diagnostics', () => {
  it('detects repeated failures as a leech without inventing semantic causes', () => {
    const events = [
      event('a', 'correct', 1),
      event('a', 'incorrect', 2),
      event('a', 'incorrect', 3),
      event('a', 'incorrect', 4),
    ];
    const [diagnostic] = analyzeLearningDiagnostics(events, { a: progress(1) }, new Date('2026-08-05T00:00:00Z'));
    expect(diagnostic.leech).toBe(true);
    expect(diagnostic.codes).toContain('REPEATED_FAILURE');
    expect(diagnostic.codes).toContain('REGRESSION_AFTER_SUCCESS');
  });

  it('detects uncertainty and slow recall from observable review data', () => {
    const events = [
      event('b', 'partial', 1, { responseTimeMs: 70_000 }),
      event('b', 'partial', 2, { responseTimeMs: 80_000 }),
      event('b', 'partial', 3, { responseTimeMs: 90_000 }),
    ];
    const [diagnostic] = analyzeLearningDiagnostics(events, { b: progress(3) }, new Date('2026-08-05T00:00:00Z'));
    expect(diagnostic.codes).toContain('REPEATED_UNCERTAINTY');
    expect(diagnostic.codes).toContain('SLOW_RECALL');
    expect(diagnostic.medianResponseTimeMs).toBe(80_000);
  });

  it('elevates recent exam failures and low mastery after many reviews', () => {
    const events = [1,2,3,4,5,6].map(day => event('c', day === 6 ? 'incorrect' : 'correct', day, day === 6 ? { source: 'exam' } : {}));
    const [diagnostic] = analyzeLearningDiagnostics(events, { c: progress(2) }, new Date('2026-08-10T00:00:00Z'));
    expect(diagnostic.severity).toBe('high');
    expect(diagnostic.leech).toBe(true);
    expect(diagnostic.codes).toContain('EXAM_FAILURE');
    expect(diagnostic.codes).toContain('LOW_MASTERY_AFTER_REVIEWS');
  });
});
