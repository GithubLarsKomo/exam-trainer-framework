import { describe, expect, it } from 'vitest';
import {
  deepLinkCompetencyClass,
  learningDeepLinkSignature,
  parseLearningDeepLink,
  resolveLearningDeepLinkVariant,
} from '../src/learning-deep-link';
import type { Catalog, KnowledgeItem, QuestionVariant, ReviewEvent } from '../src/model';

const at = '2026-09-18T12:00:00.000Z';

function variant(
  id: string,
  competencyClass: 'knowledge' | 'application' | 'transfer',
  difficulty: 1 | 2 | 3 | 4 | 5,
  status: QuestionVariant['status'] = 'released',
): QuestionVariant {
  return {
    id,
    knowledgeItemId: 'decision-architecture-rights',
    version: 1,
    status,
    topicId: 'Organisation',
    examQuestion: id,
    prompt: `Prompt ${id}`,
    points: 1,
    difficulty,
    tags: [competencyClass],
    questionType: 'free_text',
    answer: { modelAnswer: `Answer ${id}` },
    source: 'Unternehmen mitführen',
    changedAt: at,
    competencyClass,
  };
}

function item(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'decision-architecture-rights',
    version: 1,
    status: 'released',
    topicId: 'Organisation',
    title: 'Entscheidungsarchitektur und Eskalation',
    tags: ['leadership'],
    source: 'Unternehmen mitführen',
    changedAt: at,
    questionVariants: [
      variant('decision-architecture-rights:retrieval', 'knowledge', 1),
      variant('decision-architecture-rights:application', 'application', 2),
      variant('decision-architecture-rights:transfer', 'transfer', 3),
    ],
    ...overrides,
  };
}

function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    catalogId: 'enterprise-leadership',
    title: 'Unternehmen mitführen',
    version: '0.2.0',
    createdAt: at,
    updatedAt: at,
    cards: [],
    knowledgeItems: [item()],
    ...overrides,
  };
}

function review(questionVariantId: string, answeredAt: string): ReviewEvent {
  return {
    id: `review-${questionVariantId}-${answeredAt}`,
    knowledgeItemId: 'decision-architecture-rights',
    questionVariantId,
    source: 'learning',
    outcome: 'correct',
    answeredAt,
  };
}

describe('learning deep links', () => {
  it('parses catalog, focus and explicit mode', () => {
    expect(parseLearningDeepLink(
      '?catalog=enterprise-leadership&focus=decision-architecture-rights&mode=transfer',
    )).toEqual({
      catalogId: 'enterprise-leadership',
      focusId: 'decision-architecture-rights',
      mode: 'transfer',
    });
  });

  it('defaults a focused link to practice/application and preserves the legacy practice alias', () => {
    const link = parseLearningDeepLink(
      '?catalog=enterprise-leadership&focus=decision-architecture-rights',
    );
    expect(link?.mode).toBe('practice');
    expect(deepLinkCompetencyClass('practice')).toBe('application');
    expect(deepLinkCompetencyClass('application')).toBe('application');
  });

  it('requires catalog and focus together and rejects unknown modes', () => {
    expect(() => parseLearningDeepLink('?focus=decision-architecture-rights')).toThrow(/catalog/);
    expect(() => parseLearningDeepLink(
      '?catalog=enterprise-leadership&focus=decision-architecture-rights&mode=magic',
    )).toThrow(/Unbekannter ETF-Lernmodus/);
  });

  it('maps retrieval, practice/application and transfer to released competency variants', () => {
    const source = catalog();
    expect(resolveLearningDeepLinkVariant(source, {
      catalogId: source.catalogId,
      focusId: 'decision-architecture-rights',
      mode: 'retrieval',
    }).id).toBe('decision-architecture-rights:retrieval');
    expect(resolveLearningDeepLinkVariant(source, {
      catalogId: source.catalogId,
      focusId: 'decision-architecture-rights',
      mode: 'practice',
    }).id).toBe('decision-architecture-rights:application');
    expect(resolveLearningDeepLinkVariant(source, {
      catalogId: source.catalogId,
      focusId: 'decision-architecture-rights',
      mode: 'transfer',
    }).id).toBe('decision-architecture-rights:transfer');
  });

  it('uses the existing adaptive variant rotation for review/repeat links', () => {
    const source = catalog();
    const events = [
      review('decision-architecture-rights:retrieval', '2026-09-18T12:10:00.000Z'),
      review('decision-architecture-rights:application', '2026-09-18T12:20:00.000Z'),
    ];
    expect(resolveLearningDeepLinkVariant(source, {
      catalogId: source.catalogId,
      focusId: 'decision-architecture-rights',
      mode: 'review',
    }, events).id).toBe('decision-architecture-rights:transfer');
  });

  it('never bypasses release status for a requested competency surface', () => {
    const source = catalog({
      knowledgeItems: [item({
        questionVariants: [
          variant('decision-architecture-rights:retrieval', 'knowledge', 1),
          variant('decision-architecture-rights:application', 'application', 2, 'draft'),
          variant('decision-architecture-rights:transfer', 'transfer', 3),
        ],
      })],
    });
    expect(() => resolveLearningDeepLinkVariant(source, {
      catalogId: source.catalogId,
      focusId: 'decision-architecture-rights',
      mode: 'practice',
    })).toThrow(/keine freigegebene Variante/);
  });

  it('uses a stable launch signature without weakening semantic ids', () => {
    expect(learningDeepLinkSignature({
      catalogId: 'enterprise-leadership',
      focusId: 'decision-architecture-rights',
      mode: 'practice',
    })).toBe('enterprise-leadership\u0000decision-architecture-rights\u0000practice');
  });
});
