import { describe, expect, it } from 'vitest';
import { applyReview, type ReviewEngineState } from '../src/review-engine';
import type { Progress } from '../src/model';

function emptyState(progress: Record<string, Progress> = {}): ReviewEngineState {
  return { progress, history: [], reviewEvents: [], fsrsShadow: {} };
}

describe('review engine', () => {
  it('keeps the classic scheduler authoritative while recording FSRS shadow output', () => {
    const state = emptyState();
    const event = applyReview(
      state,
      { knowledgeItemId: 'ft-demo', questionVariantId: 'ft-demo:q1', cardVersion: 1 },
      'correct',
      'learning',
      new Date('2026-08-04T08:00:00.000Z'),
      4200,
      { eventIdFactory: () => 'review-1' },
    );

    expect(state.progress['ft-demo'].stage).toBe(2);
    expect(state.progress['ft-demo'].dueAt).toBe('2026-08-05T08:00:00.000Z');
    expect(state.fsrsShadow['ft-demo']).toBeDefined();
    expect(event).toMatchObject({
      id: 'review-1',
      knowledgeItemId: 'ft-demo',
      questionVariantId: 'ft-demo:q1',
      source: 'learning',
      outcome: 'correct',
      responseTimeMs: 4200,
      masteryBefore: 1,
      masteryAfter: 2,
    });
    expect(event.scheduler?.classic?.dueAt).toBe(state.progress['ft-demo'].dueAt);
    expect(event.scheduler?.fsrs?.dueAt).toBe(state.fsrsShadow['ft-demo'].dueAt);
    expect(state.history).toEqual([{ cardId: 'ft-demo', outcome: 'correct', at: '2026-08-04T08:00:00.000Z' }]);
  });

  it('resets an incorrect exam answer to mastery stage 1', () => {
    const state = emptyState({
      'ft-demo': {
        stage: 5,
        dueAt: '2026-09-01T00:00:00.000Z',
        correct: 8,
        partial: 0,
        incorrect: 0,
        skipped: 0,
        marked: false,
        cardVersion: 1,
      },
    });

    const event = applyReview(
      state,
      { knowledgeItemId: 'ft-demo', cardVersion: 1 },
      'incorrect',
      'exam',
      new Date('2026-08-04T08:00:00.000Z'),
      9000,
      { eventIdFactory: () => 'review-2' },
    );

    expect(state.progress['ft-demo'].stage).toBe(1);
    expect(state.progress['ft-demo'].dueAt).toBe('2026-08-04T08:10:00.000Z');
    expect(state.progress['ft-demo'].incorrect).toBe(1);
    expect(event.source).toBe('exam');
    expect(event.masteryAfter).toBe(1);
    expect(state.fsrsShadow['ft-demo']).toBeDefined();
  });
});
