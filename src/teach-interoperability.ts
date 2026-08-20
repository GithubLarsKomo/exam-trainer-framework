import { parseCatalogExport } from './catalog-repository';
import type { Catalog, Outcome, ReviewEvent, ReviewSource } from './model';

export const TEACH_CATALOG_FORMAT = 'etf-teach-catalog' as const;
export const TEACH_EVIDENCE_FORMAT = 'etf-teach-review-evidence' as const;

export interface TeachCatalogBundleV1 {
  format: typeof TEACH_CATALOG_FORMAT;
  version: 1;
  catalog: Catalog;
}

export interface TeachEvidenceExportRequest {
  missionId: string;
  catalogId: string;
  knowledgeItemIds: string[];
  questionVariantIds?: string[];
  since?: string;
  until?: string;
}

export interface TeachReviewEvidenceEvent {
  id: string;
  knowledgeItemId: string;
  questionVariantId: string;
  source: ReviewSource;
  outcome: Outcome;
  answeredAt: string;
  responseTimeMs?: number;
  confidence?: 'sure' | 'uncertain';
  masteryBefore?: number;
  masteryAfter?: number;
}

export interface TeachKnowledgeItemAssessmentSummary {
  knowledgeItemId: string;
  reviewCount: number;
  learningReviewCount: number;
  examReviewCount: number;
  correct: number;
  partial: number;
  incorrect: number;
  latestAnsweredAt?: string;
}

export interface TeachReviewEvidenceBundleV1 {
  format: typeof TEACH_EVIDENCE_FORMAT;
  version: 1;
  missionId: string;
  catalogId: string;
  generatedAt: string;
  filters: {
    knowledgeItemIds: string[];
    questionVariantIds?: string[];
    since?: string;
    until?: string;
  };
  reviewEvents: TeachReviewEvidenceEvent[];
  summary: TeachKnowledgeItemAssessmentSummary[];
}

function uniqueNonEmpty(values: string[], label: string): string[] {
  const result = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  if (!result.length) throw new Error(`${label} darf nicht leer sein.`);
  return result;
}

function optionalUniqueNonEmpty(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const result = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  return result.length ? result : undefined;
}

function validateIsoBoundary(value: string | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} ist kein gültiger Zeitstempel.`);
  return timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function buildTeachCatalogBundle(catalog: Catalog): TeachCatalogBundleV1 {
  return {
    format: TEACH_CATALOG_FORMAT,
    version: 1,
    catalog: structuredClone(catalog),
  };
}

export function serializeTeachCatalogBundle(catalog: Catalog): string {
  return JSON.stringify(buildTeachCatalogBundle(catalog), null, 2);
}

export function parseTeachCatalogBundle(text: string): TeachCatalogBundleV1 {
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed) || parsed.format !== TEACH_CATALOG_FORMAT || parsed.version !== 1 || !('catalog' in parsed)) {
    throw new Error('Ungültiges Teach-Katalogformat.');
  }
  const catalog = parseCatalogExport(JSON.stringify({ catalog: parsed.catalog }));
  return { format: TEACH_CATALOG_FORMAT, version: 1, catalog };
}

function publicReviewEvent(event: ReviewEvent): TeachReviewEvidenceEvent {
  return {
    id: event.id,
    knowledgeItemId: event.knowledgeItemId,
    questionVariantId: event.questionVariantId,
    source: event.source,
    outcome: event.outcome,
    answeredAt: event.answeredAt,
    responseTimeMs: event.responseTimeMs,
    confidence: event.confidence,
    masteryBefore: event.masteryBefore,
    masteryAfter: event.masteryAfter,
  };
}

function summarize(knowledgeItemIds: string[], events: TeachReviewEvidenceEvent[]): TeachKnowledgeItemAssessmentSummary[] {
  return knowledgeItemIds.map(knowledgeItemId => {
    const itemEvents = events.filter(event => event.knowledgeItemId === knowledgeItemId);
    const latestAnsweredAt = itemEvents.length
      ? itemEvents.reduce((latest, event) => event.answeredAt > latest ? event.answeredAt : latest, itemEvents[0].answeredAt)
      : undefined;
    return {
      knowledgeItemId,
      reviewCount: itemEvents.length,
      learningReviewCount: itemEvents.filter(event => event.source === 'learning').length,
      examReviewCount: itemEvents.filter(event => event.source === 'exam').length,
      correct: itemEvents.filter(event => event.outcome === 'correct').length,
      partial: itemEvents.filter(event => event.outcome === 'partial').length,
      incorrect: itemEvents.filter(event => event.outcome === 'incorrect').length,
      latestAnsweredAt,
    };
  });
}

export function exportTeachReviewEvidence(
  state: Pick<{ reviewEvents: ReviewEvent[] }, 'reviewEvents'>,
  request: TeachEvidenceExportRequest,
  now = new Date(),
): TeachReviewEvidenceBundleV1 {
  const missionId = request.missionId.trim();
  const catalogId = request.catalogId.trim();
  if (!missionId) throw new Error('missionId darf nicht leer sein.');
  if (!catalogId) throw new Error('catalogId darf nicht leer sein.');

  const knowledgeItemIds = uniqueNonEmpty(request.knowledgeItemIds, 'knowledgeItemIds');
  const questionVariantIds = optionalUniqueNonEmpty(request.questionVariantIds);
  const since = validateIsoBoundary(request.since, 'since');
  const until = validateIsoBoundary(request.until, 'until');
  if (since !== undefined && until !== undefined && since > until) throw new Error('since darf nicht nach until liegen.');

  const knowledgeSet = new Set(knowledgeItemIds);
  const variantSet = questionVariantIds ? new Set(questionVariantIds) : undefined;
  const reviewEvents = state.reviewEvents
    .filter(event => knowledgeSet.has(event.knowledgeItemId))
    .filter(event => !variantSet || variantSet.has(event.questionVariantId))
    .filter(event => {
      const timestamp = Date.parse(event.answeredAt);
      if (!Number.isFinite(timestamp)) return false;
      if (since !== undefined && timestamp < since) return false;
      if (until !== undefined && timestamp > until) return false;
      return true;
    })
    .map(publicReviewEvent)
    .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt) || a.id.localeCompare(b.id));

  return {
    format: TEACH_EVIDENCE_FORMAT,
    version: 1,
    missionId,
    catalogId,
    generatedAt: now.toISOString(),
    filters: {
      knowledgeItemIds,
      questionVariantIds,
      since: request.since,
      until: request.until,
    },
    reviewEvents,
    summary: summarize(knowledgeItemIds, reviewEvents),
  };
}
