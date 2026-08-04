import { describe, expect, it } from 'vitest';
import { calculateReadiness, createEqualWeightBlueprint, normalizedBlueprintSections, validateExamBlueprint } from '../src/exam-intelligence';
import type { CardVersion, ExamBlueprint, Progress } from '../src/model';

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

function progress(stage: number): Progress {
  return {
    stage,
    dueAt: '2026-08-05T00:00:00.000Z',
    correct: 1,
    partial: 0,
    incorrect: 0,
    skipped: 0,
    marked: false,
    cardVersion: 1,
  };
}

describe('exam blueprint', () => {
  it('creates equal topic weights independent of card counts', () => {
    const cards = [...Array.from({ length: 9 }, (_, i) => card(`a${i}`, 'A')), card('b1', 'B')];
    const blueprint = createEqualWeightBlueprint('catalog', cards);
    const normalized = normalizedBlueprintSections(blueprint);
    expect(normalized).toEqual([
      { topicId: 'A', weight: 0.5 },
      { topicId: 'B', weight: 0.5 },
    ]);
  });

  it('rejects duplicate topics and invalid weights', () => {
    const blueprint: ExamBlueprint = {
      id: 'bad', catalogId: 'catalog', version: 1,
      sections: [{ topicId: 'A', weight: 1 }, { topicId: 'A', weight: 0 }],
    };
    const errors = validateExamBlueprint(blueprint, [card('a', 'A')]);
    expect(errors.some(error => error.includes('Duplicate'))).toBe(true);
    expect(errors.some(error => error.includes('Invalid weight'))).toBe(true);
  });
});

describe('readiness v1', () => {
  it('uses blueprint weights rather than question counts', () => {
    const cards = [...Array.from({ length: 9 }, (_, i) => card(`a${i}`, 'A')), card('b1', 'B')];
    const states: Record<string, Progress> = Object.fromEntries(cards.map(c => [c.id, progress(c.topicId === 'A' ? 5 : 1)]));
    const result = calculateReadiness({ catalogId: 'catalog', cards, progress: states, calculatedAt: new Date('2026-08-04T00:00:00Z') });
    expect(result.mastery).toBe(50);
    expect(result.coverage).toBe(100);
    expect(result.readiness).toBe(50);
    expect(result.weakestTopicId).toBe('B');
  });

  it('penalizes incomplete coverage transparently', () => {
    const cards = [card('a', 'A'), card('b', 'B')];
    const result = calculateReadiness({
      catalogId: 'catalog',
      cards,
      progress: { a: progress(5) },
      calculatedAt: new Date('2026-08-04T00:00:00Z'),
    });
    expect(result.mastery).toBe(50);
    expect(result.coverage).toBe(50);
    expect(result.coverageAdjustment).toBe(75);
    expect(result.readiness).toBe(37.5);
    expect(result.weakestTopicId).toBe('B');
  });

  it('respects explicit blueprint weighting', () => {
    const cards = [card('a', 'A'), card('b', 'B')];
    const blueprint: ExamBlueprint = {
      id: 'weighted', catalogId: 'catalog', version: 1,
      sections: [{ topicId: 'A', weight: 25 }, { topicId: 'B', weight: 75 }],
    };
    const result = calculateReadiness({
      catalogId: 'catalog', cards, blueprint,
      progress: { a: progress(5), b: progress(1) },
      calculatedAt: new Date('2026-08-04T00:00:00Z'),
    });
    expect(result.mastery).toBe(25);
    expect(result.readiness).toBe(25);
  });
});
