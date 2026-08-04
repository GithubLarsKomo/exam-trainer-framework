import { describe, expect, it } from 'vitest';
import { buildAdaptiveQueue } from '../src/adaptive-queue';
import type { CardVersion, ExamBlueprint, FsrsShadowState, Outcome, Progress, ReviewEvent } from '../src/model';

function card(id: string, topicId: string): CardVersion {
  return {
    id,
    version: 1,
    status: 'released',
    topicId,
    examQuestion: id,
    prompt: id,
    points: 1,
    difficulty: 2,
    tags: [],
    questionType: 'free_text',
    answer: { modelAnswer: id },
    source: 'test',
    changedAt: '2026-08-04T00:00:00.000Z',
  };
}

function progress(stage: number, dueAt = '2026-08-10T00:00:00.000Z'): Progress {
  return {
    stage,
    dueAt,
    correct: 1,
    partial: 0,
    incorrect: 0,
    skipped: 0,
    marked: false,
    cardVersion: 1,
  };
}

function review(cardId: string, outcome: Outcome, answeredAt: string, suffix = answeredAt): ReviewEvent {
  return {
    id: `${cardId}:${outcome}:${suffix}`,
    knowledgeItemId: cardId,
    questionVariantId: `${cardId}:q1`,
    source: 'learning',
    outcome,
    answeredAt,
  };
}

function failure(cardId: string): ReviewEvent {
  return review(cardId, 'incorrect', '2026-08-03T00:00:00.000Z');
}

function leechHistory(cardId: string): ReviewEvent[] {
  return [
    review(cardId, 'incorrect', '2026-07-30T00:00:00.000Z', '1'),
    review(cardId, 'incorrect', '2026-07-31T00:00:00.000Z', '2'),
    review(cardId, 'incorrect', '2026-08-01T00:00:00.000Z', '3'),
    review(cardId, 'correct', '2026-08-03T00:00:00.000Z', '4'),
  ];
}

function shadow(dueAt: string): FsrsShadowState {
  return {
    dueAt,
    stability: 2,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 2,
    learningSteps: 0,
    reps: 2,
    lapses: 0,
    state: 2,
    lastReviewAt: '2026-08-02T00:00:00.000Z',
  };
}

const blueprint: ExamBlueprint = {
  id: 'exam',
  catalogId: 'catalog',
  version: 1,
  examDate: '2026-08-20T00:00:00.000Z',
  sections: [
    { topicId: 'A', weight: 30 },
    { topicId: 'B', weight: 70 },
  ],
};

describe('adaptive study queue', () => {
  it('can prioritize an exam-relevant weakness over a mastered due item', () => {
    const cards = [card('mastered-due', 'A'), card('weak', 'B')];
    const queue = buildAdaptiveQueue({
      catalogId: 'catalog',
      cards,
      blueprint,
      progress: {
        'mastered-due': progress(5, '2026-08-01T00:00:00.000Z'),
        weak: progress(2),
      },
      reviewEvents: [failure('weak')],
      fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
    });
    expect(queue[0].cardId).toBe('weak');
    expect(queue[0].category).toBe('weakness');
    expect(queue[0].reasons).toContain('HIGH_EXAM_WEIGHT');
    expect(queue[0].reasons).toContain('RECENT_FAILURE');
    expect(queue[0].reasons).toContain('EXAM_SOON');
    expect(queue[1].reasons).toContain('CLASSIC_DUE');
  });

  it('adds a bounded leech diagnostic boost even after the latest answer was correct', () => {
    const cards = [card('leech', 'A'), card('control', 'A')];
    const queue = buildAdaptiveQueue({
      catalogId: 'catalog',
      cards,
      progress: { leech: progress(4), control: progress(4) },
      reviewEvents: [
        ...leechHistory('leech'),
        review('control', 'correct', '2026-07-30T00:00:00.000Z', '1'),
        review('control', 'correct', '2026-07-31T00:00:00.000Z', '2'),
        review('control', 'correct', '2026-08-01T00:00:00.000Z', '3'),
        review('control', 'correct', '2026-08-03T00:00:00.000Z', '4'),
      ],
      fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
    });
    const leech = queue.find(item => item.cardId === 'leech')!;
    const control = queue.find(item => item.cardId === 'control')!;
    expect(leech.signals.recentFailure).toBe(false);
    expect(leech.signals.leech).toBe(true);
    expect(leech.diagnosticReasons).toEqual(['LEECH']);
    expect(leech.category).toBe('weakness');
    expect(control.signals.leech).toBe(false);
    expect(control.diagnosticReasons).toEqual([]);
    expect(leech.score - control.score).toBe(8);
  });

  it('keeps the leech boost subordinate to a materially higher exam weight', () => {
    const cards = [card('leech-low-weight', 'A'), card('exam-heavy', 'B')];
    const queue = buildAdaptiveQueue({
      catalogId: 'catalog',
      cards,
      blueprint,
      progress: { 'leech-low-weight': progress(4), 'exam-heavy': progress(4) },
      reviewEvents: leechHistory('leech-low-weight'),
      fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
    });
    expect(queue.find(item => item.cardId === 'leech-low-weight')?.diagnosticReasons).toContain('LEECH');
    expect(queue[0].cardId).toBe('exam-heavy');
    expect(queue[0].reasons).toContain('HIGH_EXAM_WEIGHT');
  });

  it('surfaces FSRS shadow due without letting it change priority by default', () => {
    const cards = [card('a', 'A'), card('b', 'A')];
    const states = { a: progress(3), b: progress(3) };
    const fsrsShadow = { b: shadow('2026-08-01T00:00:00.000Z') };
    const defaultQueue = buildAdaptiveQueue({
      catalogId: 'catalog', cards, progress: states, reviewEvents: [], fsrsShadow,
      now: new Date('2026-08-04T00:00:00.000Z'),
    });
    expect(defaultQueue.find(item => item.cardId === 'b')?.reasons).toContain('FSRS_SHADOW_DUE');
    expect(defaultQueue.find(item => item.cardId === 'a')?.score).toBe(defaultQueue.find(item => item.cardId === 'b')?.score);

    const enabledQueue = buildAdaptiveQueue({
      catalogId: 'catalog', cards, progress: states, reviewEvents: [], fsrsShadow,
      now: new Date('2026-08-04T00:00:00.000Z'),
      options: { fsrsInfluenceEnabled: true },
    });
    expect(enabledQueue[0].cardId).toBe('b');
    expect(enabledQueue[0].score).toBeGreaterThan(enabledQueue[1].score);
  });

  it('labels unseen content and supports deterministic limits', () => {
    const cards = [card('c', 'A'), card('a', 'A'), card('b', 'A')];
    const queue = buildAdaptiveQueue({
      catalogId: 'catalog', cards, progress: {}, reviewEvents: [], fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
      options: { limit: 2 },
    });
    expect(queue.map(item => item.cardId)).toEqual(['a', 'b']);
    expect(queue[0].category).toBe('new');
    expect(queue[0].reasons).toContain('COVERAGE_GAP');
    expect(queue[0].reasons).toContain('NEW_CONTENT');
  });
});
