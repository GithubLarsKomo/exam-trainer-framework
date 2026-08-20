import { buildTodayPlan, type TodayPlan } from './today-plan';
import { applyReview, type ReviewEngineOptions, type ReviewEngineState } from './review-engine';
import {
  cardVersionToKnowledgeItem,
  type CardVersion,
  type Catalog,
  type ExamBlueprint,
  type FsrsShadowState,
  type KnowledgeItem,
  type Outcome,
  type Progress,
  type QuestionVariant,
  type ReviewEvent,
  type ReviewSource,
} from './model';

export interface RuntimeQuestion extends CardVersion {
  knowledgeItemId: string;
  questionVariantId: string;
  variantCount: number;
}

export interface LearningRuntimeState extends ReviewEngineState {
  progress: Record<string, Progress>;
  reviewEvents: ReviewEvent[];
  fsrsShadow: Record<string, FsrsShadowState>;
}

export interface RuntimePlanItem {
  knowledgeItemId: string;
  questionVariantId: string;
  question: RuntimeQuestion;
  reasons: ReturnType<typeof buildTodayPlan>['items'][number]['reasons'];
  category: ReturnType<typeof buildTodayPlan>['items'][number]['category'];
  score: number;
}

export interface RuntimeLearningPlan {
  plan: TodayPlan;
  items: RuntimePlanItem[];
}

function releasedVariants(item: KnowledgeItem): QuestionVariant[] {
  return item.questionVariants.filter(variant => variant.status === 'released');
}

/**
 * Build the effective semantic KnowledgeItem set for runtime learning.
 *
 * Legacy released cards are projected first. Native KnowledgeItems then replace
 * matching legacy projections so a mixed catalog never creates two progress
 * identities for the same semantic item.
 */
export function effectiveKnowledgeItems(catalog: Catalog): KnowledgeItem[] {
  const byId = new Map<string, KnowledgeItem>();

  for (const card of catalog.cards) {
    if (card.status !== 'released') continue;
    byId.set(card.id, cardVersionToKnowledgeItem(card));
  }

  for (const item of catalog.knowledgeItems ?? []) {
    if (item.status !== 'released') continue;
    if (!releasedVariants(item).length) continue;
    byId.set(item.id, structuredClone(item));
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function lastSeenAt(
  knowledgeItemId: string,
  questionVariantId: string,
  reviewEvents: ReviewEvent[],
): number | undefined {
  let latest: number | undefined;
  for (const event of reviewEvents) {
    if (event.knowledgeItemId !== knowledgeItemId || event.questionVariantId !== questionVariantId) continue;
    const at = Date.parse(event.answeredAt);
    if (!Number.isFinite(at)) continue;
    latest = latest === undefined ? at : Math.max(latest, at);
  }
  return latest;
}

/**
 * Prefer an unseen released variant. Once every variant has been seen, use the
 * least-recently-seen variant. Ties are deterministic and bias toward lower
 * difficulty before lexical id order.
 */
export function selectQuestionVariant(item: KnowledgeItem, reviewEvents: ReviewEvent[]): QuestionVariant {
  const variants = releasedVariants(item);
  if (!variants.length) throw new Error(`KnowledgeItem ${item.id} has no released QuestionVariant.`);

  return [...variants].sort((a, b) => {
    const aSeen = lastSeenAt(item.id, a.id, reviewEvents);
    const bSeen = lastSeenAt(item.id, b.id, reviewEvents);
    if (aSeen === undefined && bSeen !== undefined) return -1;
    if (aSeen !== undefined && bSeen === undefined) return 1;
    if (aSeen !== undefined && bSeen !== undefined && aSeen !== bSeen) return aSeen - bSeen;
    return a.difficulty - b.difficulty || a.id.localeCompare(b.id);
  })[0];
}

function runtimeQuestion(item: KnowledgeItem, variant: QuestionVariant): RuntimeQuestion {
  return {
    // Runtime ranking and all learner state use the semantic KnowledgeItem id.
    id: item.id,
    knowledgeItemId: item.id,
    questionVariantId: variant.id,
    variantCount: releasedVariants(item).length,
    version: item.version,
    status: 'released',
    topicId: variant.topicId || item.topicId,
    examQuestion: variant.examQuestion,
    examGroupId: variant.examGroupId,
    examGroupOrder: variant.examGroupOrder,
    title: variant.title ?? item.title,
    prompt: variant.prompt,
    points: variant.points,
    difficulty: variant.difficulty,
    tags: [...new Set([...item.tags, ...variant.tags])],
    questionType: variant.questionType,
    answer: structuredClone(variant.answer),
    assetRefs: variant.assetRefs?.map(ref => ({ ...ref })),
    source: variant.source || item.source,
    sourcePage: variant.sourcePage ?? item.sourcePage,
    changedAt: variant.changedAt,
    changeReason: variant.changeReason ?? item.changeReason,
    learningObjective: variant.learningObjective ?? item.learningObjective,
    competencyClass: variant.competencyClass ?? item.competencyClass,
    origin: structuredClone(variant.origin ?? item.origin),
  };
}

/**
 * Return exactly one renderable question per effective KnowledgeItem.
 * Multiple QuestionVariants therefore enrich retrieval surfaces without
 * multiplying scheduler/progress identities.
 */
export function runtimeQuestionsForCatalog(catalog: Catalog, reviewEvents: ReviewEvent[] = []): RuntimeQuestion[] {
  return effectiveKnowledgeItems(catalog).map(item => runtimeQuestion(item, selectQuestionVariant(item, reviewEvents)));
}

/** Reconstruct one exact released QuestionVariant for a semantic KnowledgeItem. */
export function runtimeQuestionForVariant(
  catalog: Catalog,
  knowledgeItemId: string,
  questionVariantId: string,
): RuntimeQuestion | undefined {
  const item = effectiveKnowledgeItems(catalog).find(candidate => candidate.id === knowledgeItemId);
  if (!item) return undefined;
  const variant = releasedVariants(item).find(candidate => candidate.id === questionVariantId);
  return variant ? runtimeQuestion(item, variant) : undefined;
}

export interface BuildRuntimeLearningPlanInput {
  catalog: Catalog;
  state: Pick<LearningRuntimeState, 'progress' | 'reviewEvents' | 'fsrsShadow'>;
  blueprint?: ExamBlueprint;
  now?: Date;
  minimumItems?: number;
}

/**
 * Compose the existing adaptive ETF planner with semantic KnowledgeItem
 * identity and selected QuestionVariants.
 */
export function buildRuntimeLearningPlan(input: BuildRuntimeLearningPlanInput): RuntimeLearningPlan {
  const questions = runtimeQuestionsForCatalog(input.catalog, input.state.reviewEvents);
  const plan = buildTodayPlan(
    {
      catalogId: input.catalog.catalogId,
      cards: questions,
      progress: input.state.progress,
      reviewEvents: input.state.reviewEvents,
      fsrsShadow: input.state.fsrsShadow,
      blueprint: input.blueprint ?? input.catalog.examBlueprint,
      now: input.now,
    },
    { minimumItems: input.minimumItems },
  );
  const byKnowledgeItem = new Map(questions.map(question => [question.knowledgeItemId, question]));

  return {
    plan,
    items: plan.items.map(item => {
      const question = byKnowledgeItem.get(item.cardId);
      if (!question) throw new Error(`Runtime question missing for KnowledgeItem ${item.cardId}.`);
      return {
        knowledgeItemId: question.knowledgeItemId,
        questionVariantId: question.questionVariantId,
        question,
        reasons: item.reasons,
        category: item.category,
        score: item.score,
      };
    }),
  };
}

export interface ApplyRuntimeReviewInput {
  state: LearningRuntimeState;
  question: RuntimeQuestion;
  outcome: Outcome;
  source: ReviewSource;
  answeredAt: Date;
  responseTimeMs?: number;
  options?: ReviewEngineOptions;
}

/**
 * Record a concrete QuestionVariant interaction while updating scheduler,
 * diagnostics and progress only under the semantic KnowledgeItem id.
 */
export function applyRuntimeReview(input: ApplyRuntimeReviewInput): ReviewEvent {
  return applyReview(
    input.state,
    {
      knowledgeItemId: input.question.knowledgeItemId,
      questionVariantId: input.question.questionVariantId,
      cardVersion: input.question.version,
    },
    input.outcome,
    input.source,
    input.answeredAt,
    input.responseTimeMs,
    input.options,
  );
}
