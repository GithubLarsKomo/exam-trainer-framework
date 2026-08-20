import { describe, expect, it } from 'vitest';
import {
  applyRuntimeReview,
  buildRuntimeLearningPlan,
  effectiveKnowledgeItems,
  runtimeQuestionsForCatalog,
  selectQuestionVariant,
  type LearningRuntimeState,
} from '../src/knowledge-learning-runtime';
import type { CardVersion, Catalog, KnowledgeItem, QuestionVariant, ReviewEvent } from '../src/model';

const at = '2026-08-20T10:00:00.000Z';

function legacyCard(overrides: Partial<CardVersion> = {}): CardVersion {
  return {
    id: 'legacy-1',
    version: 1,
    status: 'released',
    topicId: 'Basics',
    examQuestion: '1',
    prompt: 'Legacy prompt?',
    points: 1,
    difficulty: 1,
    tags: ['legacy'],
    questionType: 'free_text',
    answer: { modelAnswer: 'Legacy answer' },
    source: 'legacy.pdf',
    changedAt: at,
    ...overrides,
  };
}

function variant(id: string, difficulty: 1 | 2 | 3 | 4 | 5, overrides: Partial<QuestionVariant> = {}): QuestionVariant {
  return {
    id,
    knowledgeItemId: 'ki-1',
    version: 1,
    status: 'released',
    topicId: 'Teach',
    examQuestion: id,
    prompt: `Prompt ${id}`,
    points: 1,
    difficulty,
    tags: [id],
    questionType: 'free_text',
    answer: { modelAnswer: `Answer ${id}` },
    source: 'teach-evidence.md',
    changedAt: at,
    origin: { type: 'skillz-teach', missionId: 'mission-1' },
    ...overrides,
  };
}

function knowledgeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'ki-1',
    version: 2,
    status: 'released',
    topicId: 'Teach',
    title: 'Semantic concept',
    canonicalContent: 'One semantic learning object.',
    tags: ['concept'],
    source: 'teach-evidence.md',
    changedAt: at,
    learningObjective: 'Apply the concept correctly.',
    competencyClass: 'application',
    origin: { type: 'skillz-teach', missionId: 'mission-1', sourceSkill: 'large-work-wayfinder' },
    questionVariants: [variant('ki-1:q-recall', 1), variant('ki-1:q-apply', 3)],
    ...overrides,
  };
}

function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    catalogId: 'teach-catalog',
    title: 'Teach catalog',
    version: '1.0.0',
    createdAt: at,
    updatedAt: at,
    cards: [],
    knowledgeItems: [knowledgeItem()],
    origin: { type: 'skillz-teach', missionId: 'mission-1' },
    ...overrides,
  };
}

function reviewEvent(questionVariantId: string, answeredAt: string, outcome: 'correct' | 'partial' | 'incorrect' = 'correct'): ReviewEvent {
  return {
    id: `event-${questionVariantId}-${answeredAt}`,
    knowledgeItemId: 'ki-1',
    questionVariantId,
    source: 'learning',
    outcome,
    answeredAt,
  };
}

function runtimeState(): LearningRuntimeState {
  return { progress: {}, history: [], reviewEvents: [], fsrsShadow: {} };
}

describe('KnowledgeItem learning runtime', () => {
  it('keeps legacy catalogs behaviorally compatible', () => {
    const source = catalog({ cards: [legacyCard()], knowledgeItems: undefined, origin: undefined });
    const items = effectiveKnowledgeItems(source);
    const questions = runtimeQuestionsForCatalog(source);

    expect(items).toHaveLength(1);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      id: 'legacy-1',
      knowledgeItemId: 'legacy-1',
      questionVariantId: 'legacy-1:q1',
      variantCount: 1,
      prompt: 'Legacy prompt?',
    });
  });

  it('lets native KnowledgeItems replace matching legacy projections without duplicate progress identities', () => {
    const source = catalog({ cards: [legacyCard({ id: 'ki-1', prompt: 'Old legacy prompt' })] });
    const items = effectiveKnowledgeItems(source);

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('ki-1');
    expect(items[0].questionVariants).toHaveLength(2);
    expect(items[0].canonicalContent).toBe('One semantic learning object.');
  });

  it('rotates variants through unseen first and least-recently-seen thereafter', () => {
    const item = knowledgeItem();
    const first = selectQuestionVariant(item, []);
    expect(first.id).toBe('ki-1:q-recall');

    const afterRecall = [reviewEvent('ki-1:q-recall', '2026-08-20T11:00:00.000Z')];
    expect(selectQuestionVariant(item, afterRecall).id).toBe('ki-1:q-apply');

    const afterBoth = [
      ...afterRecall,
      reviewEvent('ki-1:q-apply', '2026-08-20T12:00:00.000Z'),
    ];
    expect(selectQuestionVariant(item, afterBoth).id).toBe('ki-1:q-recall');
  });

  it('builds one adaptive plan item per KnowledgeItem even when multiple variants exist', () => {
    const state = runtimeState();
    const result = buildRuntimeLearningPlan({
      catalog: catalog(),
      state,
      now: new Date('2026-08-20T13:00:00.000Z'),
      minimumItems: 30,
    });

    expect(result.plan.items).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      knowledgeItemId: 'ki-1',
      questionVariantId: 'ki-1:q-recall',
      category: 'new',
    });
    expect(result.items[0].question.variantCount).toBe(2);
  });

  it('records different QuestionVariants against one shared scheduler/progress identity', () => {
    const state = runtimeState();
    const source = catalog();

    const first = runtimeQuestionsForCatalog(source, state.reviewEvents)[0];
    applyRuntimeReview({
      state,
      question: first,
      outcome: 'correct',
      source: 'learning',
      answeredAt: new Date('2026-08-20T11:00:00.000Z'),
      options: { eventIdFactory: () => 'event-1', fsrsShadowEnabled: false },
    });

    const second = runtimeQuestionsForCatalog(source, state.reviewEvents)[0];
    expect(second.questionVariantId).toBe('ki-1:q-apply');
    applyRuntimeReview({
      state,
      question: second,
      outcome: 'partial',
      source: 'learning',
      answeredAt: new Date('2026-08-20T12:00:00.000Z'),
      options: { eventIdFactory: () => 'event-2', fsrsShadowEnabled: false },
    });

    expect(Object.keys(state.progress)).toEqual(['ki-1']);
    expect(state.progress['ki-1']).toMatchObject({ correct: 1, partial: 1, incorrect: 0 });
    expect(state.reviewEvents.map(event => event.questionVariantId)).toEqual(['ki-1:q-recall', 'ki-1:q-apply']);
    expect(state.reviewEvents.every(event => event.knowledgeItemId === 'ki-1')).toBe(true);
    expect(state.history.map(entry => entry.cardId)).toEqual(['ki-1', 'ki-1']);
  });

  it('rejects a released KnowledgeItem that has no released variant when selected directly', () => {
    const item = knowledgeItem({ questionVariants: [variant('ki-1:draft', 1, { status: 'draft' })] });
    expect(() => selectQuestionVariant(item, [])).toThrow(/no released QuestionVariant/);
  });
});
