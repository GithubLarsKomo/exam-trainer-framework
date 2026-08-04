import { describe, expect, it } from 'vitest';
import { buildTodayPlan } from '../src/today-plan';
import type { CardVersion, Progress, ReviewEvent } from '../src/model';

function card(id: string): CardVersion {
  return {
    id,
    version: 1,
    status: 'released',
    topicId: 'A',
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

function progress(stage: number, dueAt: string): Progress {
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

function event(id: string, responseTimeMs: number): ReviewEvent {
  return {
    id: `event:${id}`,
    knowledgeItemId: id,
    questionVariantId: `${id}:q1`,
    source: 'learning',
    outcome: 'correct',
    answeredAt: '2026-08-03T00:00:00.000Z',
    responseTimeMs,
  };
}

describe('today learning plan', () => {
  it('never drops classic-due items when the adaptive minimum is smaller', () => {
    const cards = Array.from({ length: 12 }, (_, i) => card(`c${String(i).padStart(2, '0')}`));
    const states: Record<string, Progress> = Object.fromEntries(cards.slice(0, 8).map(c => [c.id, progress(5, '2026-08-01T00:00:00.000Z')]));
    const plan = buildTodayPlan({
      catalogId: 'catalog', cards, progress: states, reviewEvents: [], fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
    }, { minimumItems: 5 });
    expect(plan.items).toHaveLength(8);
    expect(plan.due).toBe(8);
  });

  it('fills the plan with adaptive items up to the minimum', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`c${String(i).padStart(2, '0')}`));
    const plan = buildTodayPlan({
      catalogId: 'catalog', cards, progress: {}, reviewEvents: [], fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
    }, { minimumItems: 6 });
    expect(plan.items).toHaveLength(6);
    expect(plan.newContent).toBe(6);
  });

  it('estimates duration from recent response times', () => {
    const cards = Array.from({ length: 4 }, (_, i) => card(`c${i}`));
    const reviewEvents = cards.map(c => event(c.id, 30_000));
    const plan = buildTodayPlan({
      catalogId: 'catalog', cards, progress: {}, reviewEvents, fsrsShadow: {},
      now: new Date('2026-08-04T00:00:00.000Z'),
    }, { minimumItems: 4 });
    expect(plan.estimatedMinutes).toBe(2);
  });
});
