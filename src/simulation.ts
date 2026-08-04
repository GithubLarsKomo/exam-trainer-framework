import type { Outcome } from './core';
import type { FsrsShadowState } from './model';
import { ClassicStageScheduler, FsrsShadowScheduler, type ClassicSchedulerState } from './scheduler';

export interface SimulationReview {
  atOffsetMs: number;
  outcome: Outcome;
}

export interface SimulationTraceEntry {
  at: string;
  outcome: Outcome;
  classic: { stage: number; dueAt: string };
  fsrs: { dueAt: string; stability: number; difficulty: number; state: number };
}

const classicScheduler = new ClassicStageScheduler();
const fsrsScheduler = new FsrsShadowScheduler();

export function simulateLearningTrajectory(reviews: SimulationReview[], startAt = new Date('2026-01-01T00:00:00.000Z')): SimulationTraceEntry[] {
  let classic: ClassicSchedulerState | undefined;
  let fsrs: FsrsShadowState | undefined;
  return reviews.map((review) => {
    const at = new Date(startAt.getTime() + review.atOffsetMs);
    const classicDecision = classicScheduler.schedule(classic, review.outcome, at, { source: 'learning' });
    const fsrsDecision = fsrsScheduler.schedule(fsrs, review.outcome, at, { source: 'learning' });
    classic = classicDecision.state;
    fsrs = fsrsDecision.state;
    return {
      at: at.toISOString(),
      outcome: review.outcome,
      classic: { stage: classicDecision.state.stage, dueAt: classicDecision.dueAt },
      fsrs: {
        dueAt: fsrsDecision.dueAt,
        stability: fsrsDecision.state.stability,
        difficulty: fsrsDecision.state.difficulty,
        state: fsrsDecision.state.state,
      },
    };
  });
}

export function simulatePopulation(itemCount: number, reviews: SimulationReview[], startAt?: Date): SimulationTraceEntry[][] {
  if (!Number.isInteger(itemCount) || itemCount < 1) throw new Error('itemCount must be a positive integer');
  return Array.from({ length: itemCount }, () => simulateLearningTrajectory(reviews, startAt));
}
