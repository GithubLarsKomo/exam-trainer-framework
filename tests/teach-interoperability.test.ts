import { describe, expect, it } from 'vitest';
import { catalogExport, parseCatalogExport } from '../src/catalog-repository';
import { cardVersionToKnowledgeItem, type CardVersion, type Catalog, type ReviewEvent } from '../src/model';
import {
  buildTeachCatalogBundle,
  exportTeachReviewEvidence,
  parseTeachCatalogBundle,
  serializeTeachCatalogBundle,
} from '../src/teach-interoperability';

function teachCard(): CardVersion {
  return {
    id: 'predicate-suitability',
    version: 1,
    status: 'released',
    topicId: '510k',
    examQuestion: 'teach-1',
    title: 'Predicate suitability',
    prompt: 'Evaluate the predicate candidate.',
    points: 3,
    difficulty: 3,
    tags: ['teach', 'application'],
    questionType: 'case_study',
    answer: {
      modelAnswer: 'Assess legal marketing status, intended use and technological characteristics.',
      caseStudyParts: [{ id: 'decision', prompt: 'Suitable?', modelAnswer: 'Explain the decision.' }],
    },
    source: 'skillz:fda-510k-predicate-strategy',
    sourcePage: 'predicate-selection',
    changedAt: '2026-08-20T18:00:00.000Z',
    learningObjective: 'Evaluate whether a candidate is suitable as a predicate.',
    competencyClass: 'application',
    origin: {
      type: 'skillz-teach',
      missionId: 'learn-510k',
      sourceSkill: 'fda-510k-predicate-strategy',
      sourceRefs: ['evidence-note:predicate-baseline'],
      sourceCommit: 'abc123',
    },
  };
}

function teachCatalog(): Catalog {
  const card = teachCard();
  return {
    catalogId: 'teach-510k',
    title: 'Teach 510(k)',
    version: '1.0.0',
    createdAt: '2026-08-20T18:00:00.000Z',
    updatedAt: '2026-08-20T18:00:00.000Z',
    cards: [card],
    knowledgeItems: [cardVersionToKnowledgeItem(card)],
    origin: {
      type: 'skillz-teach',
      missionId: 'learn-510k',
      sourceSkill: 'fda-510k-predicate-strategy',
      sourceRefs: ['learning-mission:learn-510k'],
    },
  };
}

function reviewEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    id: overrides.id ?? 'event-1',
    knowledgeItemId: overrides.knowledgeItemId ?? 'predicate-suitability',
    questionVariantId: overrides.questionVariantId ?? 'predicate-suitability:q1',
    source: overrides.source ?? 'learning',
    outcome: overrides.outcome ?? 'correct',
    answeredAt: overrides.answeredAt ?? '2026-08-20T18:10:00.000Z',
    responseTimeMs: overrides.responseTimeMs ?? 42000,
    confidence: overrides.confidence ?? 'sure',
    masteryBefore: overrides.masteryBefore ?? 2,
    masteryAfter: overrides.masteryAfter ?? 3,
    scheduler: overrides.scheduler ?? {
      classic: { stage: 3, dueAt: '2026-08-22T18:10:00.000Z' },
      fsrs: { dueAt: '2026-08-23T18:10:00.000Z', stability: 3.2, difficulty: 5, state: 2, retrievability: 0.91 },
    },
    migrationSource: overrides.migrationSource,
  };
}

describe('Teach catalog interoperability', () => {
  it('keeps Teach metadata optional and preserves it through legacy-card projection', () => {
    const card = teachCard();
    const item = cardVersionToKnowledgeItem(card);

    expect(item).toMatchObject({
      learningObjective: card.learningObjective,
      competencyClass: 'application',
      origin: card.origin,
    });
    expect(item.questionVariants[0]).toMatchObject({
      learningObjective: card.learningObjective,
      competencyClass: 'application',
      origin: card.origin,
    });

    item.origin!.sourceRefs!.push('changed');
    expect(card.origin!.sourceRefs).toEqual(['evidence-note:predicate-baseline']);
  });

  it('round-trips a Teach bundle and remains importable by the existing catalog parser', () => {
    const catalog = teachCatalog();
    const serialized = serializeTeachCatalogBundle(catalog);
    const parsed = parseTeachCatalogBundle(serialized);
    const importedByExistingParser = parseCatalogExport(serialized);

    expect(buildTeachCatalogBundle(catalog)).toMatchObject({ format: 'etf-teach-catalog', version: 1 });
    expect(parsed.catalog).toEqual(catalog);
    expect(importedByExistingParser).toEqual(catalog);
  });

  it('keeps existing catalog exports compatible when no Teach metadata exists', () => {
    const legacy: Catalog = {
      catalogId: 'legacy',
      title: 'Legacy',
      version: '0.5.0',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      cards: [],
    };

    expect(parseCatalogExport(catalogExport(legacy))).toEqual(legacy);
  });

  it('rejects an unrelated wrapper instead of guessing a Teach bundle', () => {
    expect(() => parseTeachCatalogBundle(JSON.stringify({ format: 'other', version: 1, catalog: teachCatalog() })))
      .toThrow('Ungültiges Teach-Katalogformat.');
  });
});

describe('Teach review evidence export', () => {
  it('exports only requested review evidence and strips scheduler/runtime state', () => {
    const events: ReviewEvent[] = [
      reviewEvent({ id: 'learning-1', source: 'learning', outcome: 'correct', answeredAt: '2026-08-20T18:10:00.000Z' }),
      reviewEvent({ id: 'exam-1', source: 'exam', outcome: 'partial', answeredAt: '2026-08-20T18:20:00.000Z' }),
      reviewEvent({ id: 'other-1', knowledgeItemId: 'unrelated', answeredAt: '2026-08-20T18:30:00.000Z' }),
    ];

    const exported = exportTeachReviewEvidence(
      { reviewEvents: events },
      { missionId: 'learn-510k', catalogId: 'teach-510k', knowledgeItemIds: ['predicate-suitability'] },
      new Date('2026-08-20T19:00:00.000Z'),
    );

    expect(exported.reviewEvents.map(event => event.id)).toEqual(['learning-1', 'exam-1']);
    expect(exported.reviewEvents.every(event => !('scheduler' in event))).toBe(true);
    expect(exported.summary).toEqual([{
      knowledgeItemId: 'predicate-suitability',
      reviewCount: 2,
      learningReviewCount: 1,
      examReviewCount: 1,
      correct: 1,
      partial: 1,
      incorrect: 0,
      latestAnsweredAt: '2026-08-20T18:20:00.000Z',
    }]);
    expect(JSON.stringify(exported)).not.toContain('sessions');
    expect(JSON.stringify(exported)).not.toContain('fsrsShadow');
    expect(JSON.stringify(exported)).not.toContain('scheduler');
  });

  it('supports variant and time-window filters without leaking unrelated events', () => {
    const events: ReviewEvent[] = [
      reviewEvent({ id: 'old', questionVariantId: 'predicate-suitability:q1', answeredAt: '2026-08-19T18:00:00.000Z' }),
      reviewEvent({ id: 'wanted', questionVariantId: 'predicate-suitability:q2', answeredAt: '2026-08-20T18:00:00.000Z' }),
      reviewEvent({ id: 'other-variant', questionVariantId: 'predicate-suitability:q1', answeredAt: '2026-08-20T18:05:00.000Z' }),
    ];

    const exported = exportTeachReviewEvidence(
      { reviewEvents: events },
      {
        missionId: 'learn-510k',
        catalogId: 'teach-510k',
        knowledgeItemIds: ['predicate-suitability'],
        questionVariantIds: ['predicate-suitability:q2'],
        since: '2026-08-20T00:00:00.000Z',
        until: '2026-08-20T23:59:59.999Z',
      },
    );

    expect(exported.reviewEvents.map(event => event.id)).toEqual(['wanted']);
    expect(exported.filters.questionVariantIds).toEqual(['predicate-suitability:q2']);
  });

  it('rejects empty scopes and inverted time windows', () => {
    expect(() => exportTeachReviewEvidence(
      { reviewEvents: [] },
      { missionId: 'm', catalogId: 'c', knowledgeItemIds: [] },
    )).toThrow('knowledgeItemIds darf nicht leer sein.');

    expect(() => exportTeachReviewEvidence(
      { reviewEvents: [] },
      {
        missionId: 'm',
        catalogId: 'c',
        knowledgeItemIds: ['k'],
        since: '2026-08-21T00:00:00.000Z',
        until: '2026-08-20T00:00:00.000Z',
      },
    )).toThrow('since darf nicht nach until liegen.');
  });
});
