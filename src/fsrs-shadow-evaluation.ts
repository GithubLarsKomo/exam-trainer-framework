import type { ReviewEvent } from './model';

const DAY_MS = 24 * 60 * 60 * 1000;

export const FSRS_ACTIVATION_POLICY = Object.freeze({
  shadow: {
    minReviews: 400,
    minDistinctItems: 40,
    minObservationDays: 30,
    minFsrsDueReviews: 150,
    minMatureIntervalSamples: 150,
    minObservedRecallAtDue: 0.88,
    maxProjectedReviewEffortRatio: 0.95,
  },
  controlledPilot: {
    minReviewsPerArm: 300,
    minDistinctItemsPerArm: 30,
    minObservationDays: 30,
    retentionNonInferiorityMargin: 0.02,
    maxReviewEffortRatio: 0.95,
  },
});

export type FsrsShadowStatus = 'insufficient-data' | 'hold' | 'pilot-candidate';

export interface FsrsShadowEvaluation {
  status: FsrsShadowStatus;
  reviewCount: number;
  distinctItems: number;
  observationDays: number;
  fsrsDueReviews: number;
  matureIntervalSamples: number;
  observedRecallAtFsrsDue?: number;
  projectedReviewEffortRatio?: number;
  evidenceComplete: boolean;
  qualityGatesPass: boolean;
  reasons: string[];
}

function time(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function schedulerEvent(event: ReviewEvent): boolean {
  return !event.migrationSource && Boolean(event.scheduler?.classic?.dueAt && event.scheduler?.fsrs?.dueAt);
}

export function evaluateFsrsShadow(
  events: ReviewEvent[],
  itemIds?: Iterable<string>,
): FsrsShadowEvaluation {
  const allowed = itemIds ? new Set(itemIds) : undefined;
  const usable = events
    .filter(event => schedulerEvent(event) && (!allowed || allowed.has(event.knowledgeItemId)))
    .filter(event => time(event.answeredAt) !== undefined)
    .sort((a,b)=>(time(a.answeredAt) ?? 0) - (time(b.answeredAt) ?? 0));

  const distinctItems = new Set(usable.map(event=>event.knowledgeItemId)).size;
  const firstAt = usable.length ? time(usable[0].answeredAt)! : undefined;
  const lastAt = usable.length ? time(usable[usable.length-1].answeredAt)! : undefined;
  const observationDays = firstAt === undefined || lastAt === undefined ? 0 : Math.max(0,(lastAt-firstAt)/DAY_MS);

  const byItem = new Map<string,ReviewEvent[]>();
  for (const event of usable) {
    const list=byItem.get(event.knowledgeItemId) ?? [];
    list.push(event);
    byItem.set(event.knowledgeItemId,list);
  }

  let fsrsDueReviews=0;
  let fsrsDueRemembered=0;
  for (const itemEvents of byItem.values()) {
    itemEvents.sort((a,b)=>(time(a.answeredAt) ?? 0) - (time(b.answeredAt) ?? 0));
    for (let index=1; index<itemEvents.length; index++) {
      const previous=itemEvents[index-1];
      const current=itemEvents[index];
      const dueAt=time(previous.scheduler?.fsrs?.dueAt);
      const answeredAt=time(current.answeredAt);
      if (dueAt === undefined || answeredAt === undefined || answeredAt < dueAt) continue;
      fsrsDueReviews += 1;
      if (current.outcome !== 'incorrect') fsrsDueRemembered += 1;
    }
  }
  const observedRecallAtFsrsDue = fsrsDueReviews ? fsrsDueRemembered/fsrsDueReviews : undefined;

  let matureIntervalSamples=0;
  let classicRate=0;
  let fsrsRate=0;
  for (const event of usable) {
    if (event.outcome !== 'correct') continue;
    const answeredAt=time(event.answeredAt);
    const classicDue=time(event.scheduler?.classic?.dueAt);
    const fsrsDue=time(event.scheduler?.fsrs?.dueAt);
    if (answeredAt === undefined || classicDue === undefined || fsrsDue === undefined) continue;
    const classicDays=(classicDue-answeredAt)/DAY_MS;
    const fsrsDays=(fsrsDue-answeredAt)/DAY_MS;
    if (classicDays < 1 || fsrsDays < 1) continue;
    matureIntervalSamples += 1;
    classicRate += 1/classicDays;
    fsrsRate += 1/fsrsDays;
  }
  const projectedReviewEffortRatio = matureIntervalSamples && classicRate > 0 ? fsrsRate/classicRate : undefined;

  const p=FSRS_ACTIVATION_POLICY.shadow;
  const evidenceChecks = [
    {pass:usable.length>=p.minReviews,reason:`mindestens ${p.minReviews} Shadow-Reviews`},
    {pass:distinctItems>=p.minDistinctItems,reason:`mindestens ${p.minDistinctItems} verschiedene Wissenseinheiten`},
    {pass:observationDays>=p.minObservationDays,reason:`mindestens ${p.minObservationDays} Beobachtungstage`},
    {pass:fsrsDueReviews>=p.minFsrsDueReviews,reason:`mindestens ${p.minFsrsDueReviews} Reviews zum/nach FSRS-Fälligkeitszeitpunkt`},
    {pass:matureIntervalSamples>=p.minMatureIntervalSamples,reason:`mindestens ${p.minMatureIntervalSamples} vergleichbare Intervallprognosen`},
  ];
  const evidenceComplete=evidenceChecks.every(check=>check.pass);

  const qualityChecks = [
    {pass:observedRecallAtFsrsDue !== undefined && observedRecallAtFsrsDue>=p.minObservedRecallAtDue,reason:`beobachtete Retention bei FSRS-Fälligkeit mindestens ${Math.round(p.minObservedRecallAtDue*100)} %`},
    {pass:projectedReviewEffortRatio !== undefined && projectedReviewEffortRatio<=p.maxProjectedReviewEffortRatio,reason:`projizierter Review-Aufwand höchstens ${Math.round(p.maxProjectedReviewEffortRatio*100)} % des klassischen Schedulers`},
  ];
  const qualityGatesPass=qualityChecks.every(check=>check.pass);
  const reasons=[...evidenceChecks,...(evidenceComplete?qualityChecks:[])].filter(check=>!check.pass).map(check=>check.reason);
  const status:FsrsShadowStatus=!evidenceComplete?'insufficient-data':qualityGatesPass?'pilot-candidate':'hold';

  return {
    status,
    reviewCount:usable.length,
    distinctItems,
    observationDays,
    fsrsDueReviews,
    matureIntervalSamples,
    observedRecallAtFsrsDue,
    projectedReviewEffortRatio,
    evidenceComplete,
    qualityGatesPass,
    reasons,
  };
}
