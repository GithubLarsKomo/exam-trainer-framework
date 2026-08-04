import type { Outcome, Stage } from './core';
import { ClassicStageScheduler, FsrsShadowScheduler } from './scheduler';
import { legacyQuestionVariantId, type FsrsShadowState, type Progress, type ReviewEvent, type ReviewSource } from './model';

export interface ReviewEngineState {
  progress: Record<string, Progress>;
  history: Array<{ cardId: string; outcome: Outcome; at: string }>;
  reviewEvents: ReviewEvent[];
  fsrsShadow: Record<string, FsrsShadowState>;
}

export interface ReviewTarget {
  knowledgeItemId: string;
  questionVariantId?: string;
  cardVersion: number;
}

export interface ReviewEngineOptions {
  fsrsShadowEnabled?: boolean;
  eventIdFactory?: () => string;
}

const classicScheduler = new ClassicStageScheduler();
const fsrsScheduler = new FsrsShadowScheduler();

function asStage(value: number): Stage {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as Stage;
}

function blankProgress(cardVersion: number): Progress {
  return {
    stage: 1,
    dueAt: new Date(0).toISOString(),
    correct: 0,
    partial: 0,
    incorrect: 0,
    skipped: 0,
    marked: false,
    cardVersion,
  };
}

function incrementOutcome(progress: Progress, outcome: Outcome): Progress {
  const next = { ...progress };
  if (outcome === 'correct') next.correct += 1;
  if (outcome === 'partial') next.partial += 1;
  if (outcome === 'incorrect') next.incorrect += 1;
  return next;
}

export function applyReview(
  state: ReviewEngineState,
  target: ReviewTarget,
  outcome: Outcome,
  source: ReviewSource,
  answeredAt: Date,
  responseTimeMs?: number,
  options: ReviewEngineOptions = {},
): ReviewEvent {
  const previous = state.progress[target.knowledgeItemId] ?? blankProgress(target.cardVersion);
  const masteryBefore = asStage(previous.stage);
  const classic = classicScheduler.schedule({ stage: masteryBefore }, outcome, answeredAt, { source });
  const nextProgress = incrementOutcome(previous, outcome);
  nextProgress.stage = classic.state.stage;
  nextProgress.dueAt = classic.dueAt;
  nextProgress.cardVersion = target.cardVersion;
  state.progress[target.knowledgeItemId] = nextProgress;

  const useFsrsShadow = options.fsrsShadowEnabled ?? true;
  const fsrs = useFsrsShadow
    ? fsrsScheduler.schedule(state.fsrsShadow[target.knowledgeItemId], outcome, answeredAt, { source })
    : undefined;
  if (fsrs) state.fsrsShadow[target.knowledgeItemId] = fsrs.state;

  const event: ReviewEvent = {
    id: options.eventIdFactory?.() ?? globalThis.crypto.randomUUID(),
    knowledgeItemId: target.knowledgeItemId,
    questionVariantId: target.questionVariantId ?? legacyQuestionVariantId(target.knowledgeItemId),
    source,
    outcome,
    answeredAt: answeredAt.toISOString(),
    responseTimeMs,
    masteryBefore,
    masteryAfter: classic.state.stage,
    scheduler: {
      classic: { stage: classic.state.stage, dueAt: classic.dueAt },
      ...(fsrs ? {
        fsrs: {
          dueAt: fsrs.dueAt,
          stability: fsrs.state.stability,
          difficulty: fsrs.state.difficulty,
          state: fsrs.state.state,
          retrievability: fsrs.retrievability,
        },
      } : {}),
    },
  };

  state.reviewEvents.push(event);
  state.history.push({ cardId: target.knowledgeItemId, outcome, at: event.answeredAt });
  return event;
}
