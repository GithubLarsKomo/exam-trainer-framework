import type { Progress, ReviewEvent } from './model';

export type LearningDiagnosticCode =
  | 'REPEATED_FAILURE'
  | 'REPEATED_UNCERTAINTY'
  | 'SLOW_RECALL'
  | 'EXAM_FAILURE'
  | 'LOW_MASTERY_AFTER_REVIEWS'
  | 'REGRESSION_AFTER_SUCCESS';

export type LearningInterventionCode =
  | 'REVIEW_EXPLANATION'
  | 'TRY_ALTERNATE_VARIANT'
  | 'SHORT_RECALL_DRILL'
  | 'RETEST_UNDER_EXAM_CONDITIONS'
  | 'BREAK_DOWN_KNOWLEDGE_ITEM'
  | 'COMPARE_WITH_PRIOR_SUCCESS';

export interface LearningDiagnostic {
  knowledgeItemId: string;
  leech: boolean;
  severity: 'medium' | 'high';
  codes: LearningDiagnosticCode[];
  interventions: LearningInterventionCode[];
  reviewCount: number;
  recentIncorrect: number;
  recentPartial: number;
  medianResponseTimeMs?: number;
  lastReviewedAt: string;
}

export interface LearningDiagnosticOptions {
  recentWindow?: number;
  repeatedFailureThreshold?: number;
  repeatedUncertaintyThreshold?: number;
  nonCorrectLeechThreshold?: number;
  slowRecallThresholdMs?: number;
  examFailureLookbackDays?: number;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function interventionsFor(codes: LearningDiagnosticCode[]): LearningInterventionCode[] {
  const interventions = new Set<LearningInterventionCode>();
  if (codes.includes('REPEATED_FAILURE')) {
    interventions.add('REVIEW_EXPLANATION');
    interventions.add('TRY_ALTERNATE_VARIANT');
  }
  if (codes.includes('REPEATED_UNCERTAINTY')) interventions.add('REVIEW_EXPLANATION');
  if (codes.includes('SLOW_RECALL')) interventions.add('SHORT_RECALL_DRILL');
  if (codes.includes('EXAM_FAILURE')) interventions.add('RETEST_UNDER_EXAM_CONDITIONS');
  if (codes.includes('LOW_MASTERY_AFTER_REVIEWS')) interventions.add('BREAK_DOWN_KNOWLEDGE_ITEM');
  if (codes.includes('REGRESSION_AFTER_SUCCESS')) interventions.add('COMPARE_WITH_PRIOR_SUCCESS');
  return [...interventions];
}

export function analyzeLearningDiagnostics(
  events: ReviewEvent[],
  progress: Record<string, Progress>,
  now = new Date(),
  options: LearningDiagnosticOptions = {},
): LearningDiagnostic[] {
  const recentWindow = Math.max(1, options.recentWindow ?? 8);
  const repeatedFailureThreshold = Math.max(1, options.repeatedFailureThreshold ?? 3);
  const repeatedUncertaintyThreshold = Math.max(1, options.repeatedUncertaintyThreshold ?? 3);
  const nonCorrectLeechThreshold = Math.max(1, options.nonCorrectLeechThreshold ?? 4);
  const slowRecallThresholdMs = Math.max(1, options.slowRecallThresholdMs ?? 60_000);
  const examFailureLookbackDays = Math.max(1, options.examFailureLookbackDays ?? 30);
  const examFailureCutoff = now.getTime() - examFailureLookbackDays * 86_400_000;

  const grouped = new Map<string, ReviewEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.knowledgeItemId) ?? [];
    list.push(event);
    grouped.set(event.knowledgeItemId, list);
  }

  const diagnostics: LearningDiagnostic[] = [];
  for (const [knowledgeItemId, itemEvents] of grouped) {
    const ordered = [...itemEvents].sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt));
    const recent = ordered.slice(-recentWindow);
    const recentIncorrect = recent.filter(event => event.outcome === 'incorrect').length;
    const recentPartial = recent.filter(event => event.outcome === 'partial').length;
    const nonCorrect = recentIncorrect + recentPartial;
    const responseTimes = recent
      .map(event => event.responseTimeMs)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
    const medianResponseTimeMs = responseTimes.length >= 3 ? median(responseTimes) : undefined;
    const codes: LearningDiagnosticCode[] = [];

    if (recentIncorrect >= repeatedFailureThreshold) codes.push('REPEATED_FAILURE');
    if (recentPartial >= repeatedUncertaintyThreshold) codes.push('REPEATED_UNCERTAINTY');
    if (medianResponseTimeMs !== undefined && medianResponseTimeMs >= slowRecallThresholdMs) codes.push('SLOW_RECALL');
    if (recent.some(event => event.source === 'exam' && event.outcome === 'incorrect' && Date.parse(event.answeredAt) >= examFailureCutoff)) codes.push('EXAM_FAILURE');
    if (ordered.length >= 5 && (progress[knowledgeItemId]?.stage ?? 1) <= 2) codes.push('LOW_MASTERY_AFTER_REVIEWS');

    const lastIncorrectIndex = ordered.map(event => event.outcome).lastIndexOf('incorrect');
    if (lastIncorrectIndex > 0 && ordered.slice(0, lastIncorrectIndex).some(event => event.outcome === 'correct')) {
      codes.push('REGRESSION_AFTER_SUCCESS');
    }

    if (!codes.length) continue;
    const leech = recentIncorrect >= repeatedFailureThreshold
      || nonCorrect >= nonCorrectLeechThreshold
      || (ordered.length >= 6 && (progress[knowledgeItemId]?.stage ?? 1) <= 2);
    const severity: LearningDiagnostic['severity'] = leech || codes.includes('EXAM_FAILURE') ? 'high' : 'medium';
    diagnostics.push({
      knowledgeItemId,
      leech,
      severity,
      codes,
      interventions: interventionsFor(codes),
      reviewCount: ordered.length,
      recentIncorrect,
      recentPartial,
      medianResponseTimeMs,
      lastReviewedAt: ordered.at(-1)!.answeredAt,
    });
  }

  return diagnostics.sort((a, b) => {
    if (a.leech !== b.leech) return a.leech ? -1 : 1;
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    if (b.recentIncorrect !== a.recentIncorrect) return b.recentIncorrect - a.recentIncorrect;
    return Date.parse(b.lastReviewedAt) - Date.parse(a.lastReviewedAt) || a.knowledgeItemId.localeCompare(b.knowledgeItemId);
  });
}
