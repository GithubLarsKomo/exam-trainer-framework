import { createEqualWeightBlueprint, hasLearningEvidence, masteryScore, normalizedBlueprintSections, validateExamBlueprint } from './exam-intelligence';
import type {
  AdaptiveQueueCategory,
  CardVersion,
  ExamBlueprint,
  FsrsShadowState,
  Progress,
  QueueReasonCode,
  ReviewEvent,
} from './model';

export interface AdaptiveQueueSignals {
  classicDue: boolean;
  fsrsShadowDue: boolean;
  mastery: number;
  examWeight: number;
  coverageGap: boolean;
  examProximity: number;
  recentFailure: boolean;
}

export interface AdaptiveQueueItem {
  cardId: string;
  topicId: string;
  category: AdaptiveQueueCategory;
  score: number;
  reasons: QueueReasonCode[];
  signals: AdaptiveQueueSignals;
}

export interface AdaptiveQueueInput {
  catalogId: string;
  cards: CardVersion[];
  progress: Record<string, Progress>;
  reviewEvents: ReviewEvent[];
  fsrsShadow: Record<string, FsrsShadowState>;
  blueprint?: ExamBlueprint;
  now?: Date;
  options?: {
    fsrsInfluenceEnabled?: boolean;
    limit?: number;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function examProximity(blueprint: ExamBlueprint, now: Date): number {
  if (!blueprint.examDate) return 0;
  const examAt = new Date(blueprint.examDate).getTime();
  if (!Number.isFinite(examAt)) return 0;
  const days = (examAt - now.getTime()) / 86_400_000;
  if (days <= 7) return 1;
  if (days <= 30) return 0.75;
  if (days <= 90) return 0.4;
  return 0.15;
}

function recentFailureFor(cardId: string, events: ReviewEvent[], now: Date): boolean {
  const latest = events
    .filter(event => event.knowledgeItemId === cardId)
    .sort((a, b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt))[0];
  if (!latest || latest.outcome === 'correct') return false;
  const ageDays = (now.getTime() - Date.parse(latest.answeredAt)) / 86_400_000;
  return ageDays >= 0 && ageDays <= 14;
}

function categoryFor(progress: Progress | undefined, mastery: number, recentFailure: boolean): AdaptiveQueueCategory {
  if (!hasLearningEvidence(progress)) return 'new';
  if (recentFailure || mastery <= 0.25) return 'weakness';
  return 'review';
}

export function buildAdaptiveQueue(input: AdaptiveQueueInput): AdaptiveQueueItem[] {
  const now = input.now ?? new Date();
  const released = input.cards.filter(card => card.status === 'released');
  const blueprint = input.blueprint ?? createEqualWeightBlueprint(input.catalogId, released);
  const errors = validateExamBlueprint(blueprint, released);
  if (errors.length) throw new Error(errors.join(' '));
  const sections = normalizedBlueprintSections(blueprint);
  const weights = new Map(sections.map(section => [section.topicId, section.weight]));
  const maxWeight = Math.max(...sections.map(section => section.weight));
  const averageWeight = 1 / sections.length;
  const proximity = examProximity(blueprint, now);
  const fsrsInfluenceEnabled = input.options?.fsrsInfluenceEnabled ?? false;

  const items = released.map(card => {
    const progress = input.progress[card.id];
    const fsrs = input.fsrsShadow[card.id];
    const mastery = masteryScore(progress);
    const weight = weights.get(card.topicId) ?? 0;
    const normalizedWeight = maxWeight > 0 ? weight / maxWeight : 0;
    const classicDue = Boolean(progress && Date.parse(progress.dueAt) <= now.getTime());
    const fsrsShadowDue = Boolean(fsrs && Date.parse(fsrs.dueAt) <= now.getTime());
    const coverageGap = !hasLearningEvidence(progress);
    const recentFailure = recentFailureFor(card.id, input.reviewEvents, now);
    const reasons: QueueReasonCode[] = [];

    if (classicDue) reasons.push('CLASSIC_DUE');
    if (fsrsShadowDue) reasons.push('FSRS_SHADOW_DUE');
    if (mastery < 0.5) reasons.push('LOW_MASTERY');
    if (weight > averageWeight * 1.05) reasons.push('HIGH_EXAM_WEIGHT');
    if (coverageGap) reasons.push('COVERAGE_GAP');
    if (proximity >= 0.75) reasons.push('EXAM_SOON');
    if (recentFailure) reasons.push('RECENT_FAILURE');
    if (coverageGap) reasons.push('NEW_CONTENT');

    let score = 0;
    if (classicDue) score += 35;
    score += (1 - mastery) * 25;
    score += normalizedWeight * 20;
    if (coverageGap) score += 12;
    score += proximity * 8;
    if (recentFailure) score += 15;
    if (coverageGap) score += 5;
    if (fsrsInfluenceEnabled && fsrsShadowDue) score += 20;

    return {
      cardId: card.id,
      topicId: card.topicId,
      category: categoryFor(progress, mastery, recentFailure),
      score: Math.round(score * 100) / 100,
      reasons,
      signals: {
        classicDue,
        fsrsShadowDue,
        mastery: Math.round(clamp01(mastery) * 1000) / 1000,
        examWeight: Math.round(weight * 1000) / 1000,
        coverageGap,
        examProximity: proximity,
        recentFailure,
      },
    } satisfies AdaptiveQueueItem;
  });

  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDue = input.progress[a.cardId] ? Date.parse(input.progress[a.cardId].dueAt) : Number.POSITIVE_INFINITY;
    const bDue = input.progress[b.cardId] ? Date.parse(input.progress[b.cardId].dueAt) : Number.POSITIVE_INFINITY;
    return aDue - bDue || a.cardId.localeCompare(b.cardId);
  });

  const limit = input.options?.limit;
  return limit === undefined ? items : items.slice(0, Math.max(0, limit));
}
