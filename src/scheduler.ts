import { createEmptyCard, fsrs, Rating, State as FsrsState, type Card, type CardInput } from 'ts-fsrs';
import { applyOutcome, STAGE_INTERVAL_MS, type Outcome, type Stage } from './core';
import type { FsrsShadowState, ReviewSource } from './model';

export interface SchedulerContext {
  source: ReviewSource;
}

export interface SchedulerDecision<TState> {
  state: TState;
  dueAt: string;
  intervalMs: number;
  retry: boolean;
  retrievability?: number;
}

export interface Scheduler<TState> {
  readonly id: string;
  schedule(state: TState | undefined, outcome: Outcome, at: Date, context: SchedulerContext): SchedulerDecision<TState>;
}

export interface ClassicSchedulerState {
  stage: Stage;
}

export class ClassicStageScheduler implements Scheduler<ClassicSchedulerState> {
  readonly id = 'classic-five-stage';

  schedule(state: ClassicSchedulerState | undefined, outcome: Outcome, at: Date, context: SchedulerContext): SchedulerDecision<ClassicSchedulerState> {
    const currentStage = state?.stage ?? 1;
    const result = applyOutcome(currentStage, outcome, at.getTime());
    const examFailure = context.source === 'exam' && outcome === 'incorrect';
    const nextStage: Stage = examFailure ? 1 : result.stage;
    const dueAtMs = examFailure ? at.getTime() + STAGE_INTERVAL_MS[1] : result.dueAt;
    return {
      state: { stage: nextStage },
      dueAt: new Date(dueAtMs).toISOString(),
      intervalMs: dueAtMs - at.getTime(),
      retry: outcome !== 'correct',
    };
  }
}

const FSRS_SCHEDULER = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
});

function ratingFor(outcome: Outcome): Rating.Again | Rating.Hard | Rating.Good {
  if (outcome === 'incorrect') return Rating.Again;
  if (outcome === 'partial') return Rating.Hard;
  return Rating.Good;
}

function toFsrsCard(state: FsrsShadowState | undefined, at: Date): Card | CardInput {
  if (!state) return createEmptyCard(at);
  return {
    due: state.dueAt,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as FsrsState,
    last_review: state.lastReviewAt,
  };
}

function serializeFsrsCard(card: Card): FsrsShadowState {
  return {
    dueAt: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReviewAt: card.last_review?.toISOString(),
  };
}

export class FsrsShadowScheduler implements Scheduler<FsrsShadowState> {
  readonly id = 'fsrs-shadow';

  schedule(state: FsrsShadowState | undefined, outcome: Outcome, at: Date, _context: SchedulerContext): SchedulerDecision<FsrsShadowState> {
    const card = toFsrsCard(state, at);
    const result = FSRS_SCHEDULER.next(card, at, ratingFor(outcome));
    const next = serializeFsrsCard(result.card);
    const rawRetrievability = result.card.stability > 0
      ? FSRS_SCHEDULER.get_retrievability(result.card, at, false)
      : undefined;
    const retrievability = typeof rawRetrievability === 'number' && Number.isFinite(rawRetrievability)
      ? rawRetrievability
      : undefined;
    return {
      state: next,
      dueAt: next.dueAt,
      intervalMs: Math.max(0, new Date(next.dueAt).getTime() - at.getTime()),
      retry: outcome !== 'correct',
      retrievability,
    };
  }
}
