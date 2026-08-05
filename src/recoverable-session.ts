import type { CardVersion, ExamBlueprint, Outcome, QueueReasonCode } from './model';
import { selectExamCardIdsWithDependencies } from './exam-dependencies';

export const ACTIVE_SESSION_KEY = 'activeSession:v1';

export type RecoverableSessionKind = 'learning' | 'exam';
export type RecoverableSessionMode = 'today' | 'due' | 'new' | 'errors' | 'all' | 'dynamic' | 'fixed';

export interface PersistedResponseState {
  text?: string;
  choices?: string[];
  cloze?: Record<string,string>;
  matching?: Record<string,string>;
  orderingText?: string[];
  caseStudy?: Record<string,string>;
  imageLabels?: Record<string,string>;
}

export interface RecoverableSessionState {
  version: 1;
  id: string;
  catalogId: string;
  kind: RecoverableSessionKind;
  mode: RecoverableSessionMode;
  createdAt: string;
  updatedAt: string;
  itemIds: string[];
  currentIndex: number;
  completedCount: number;
  revealed: Record<string,boolean>;
  outcomes: Record<string,Outcome>;
  responses: Record<string,PersistedResponseState>;
  queueReasons?: Record<string,QueueReasonCode[]>;
  timeSpentMs: Record<string,number>;
  currentStartedAtMs: number;
}

export interface ExamQuestionStatus {
  cardId: string;
  index: number;
  current: boolean;
  revealed: boolean;
  outcome?: Outcome;
}

function stamp(session: RecoverableSessionState, nowMs: number): RecoverableSessionState {
  session.updatedAt = new Date(nowMs).toISOString();
  return session;
}

export function createRecoverableSession(input: {
  catalogId: string;
  kind: RecoverableSessionKind;
  mode: RecoverableSessionMode;
  itemIds: string[];
  queueReasons?: Record<string,QueueReasonCode[]>;
  nowMs?: number;
  id?: string;
}): RecoverableSessionState {
  if (!input.itemIds.length) throw new Error('Eine Sitzung benötigt mindestens eine Karte.');
  const nowMs = input.nowMs ?? Date.now();
  return {
    version: 1,
    id: input.id ?? `session-${crypto.randomUUID()}`,
    catalogId: input.catalogId,
    kind: input.kind,
    mode: input.mode,
    createdAt: new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
    itemIds: [...input.itemIds],
    currentIndex: 0,
    completedCount: 0,
    revealed: {},
    outcomes: {},
    responses: {},
    queueReasons: input.queueReasons ? structuredClone(input.queueReasons) : undefined,
    timeSpentMs: {},
    currentStartedAtMs: nowMs,
  };
}

export function currentSessionCardId(session: RecoverableSessionState): string | undefined {
  return session.itemIds[session.currentIndex];
}

export function accrueCurrentTime(session: RecoverableSessionState, nowMs = Date.now()): RecoverableSessionState {
  const cardId = currentSessionCardId(session);
  if (cardId) session.timeSpentMs[cardId] = (session.timeSpentMs[cardId] ?? 0) + Math.max(0, nowMs - session.currentStartedAtMs);
  session.currentStartedAtMs = nowMs;
  return stamp(session, nowMs);
}

export function setSessionResponse(session: RecoverableSessionState, cardId: string, response: PersistedResponseState, nowMs = Date.now()): RecoverableSessionState {
  session.responses[cardId] = structuredClone(response);
  return stamp(session, nowMs);
}

export function revealSessionCard(session: RecoverableSessionState, cardId: string, nowMs = Date.now()): RecoverableSessionState {
  accrueCurrentTime(session, nowMs);
  session.revealed[cardId] = true;
  return stamp(session, nowMs);
}

export function gradeLearningCard(session: RecoverableSessionState, outcome: Outcome, nowMs = Date.now()): RecoverableSessionState {
  if (session.kind !== 'learning') throw new Error('Lernbewertung ist nur in einer Lernsitzung zulässig.');
  const cardId = currentSessionCardId(session);
  if (!cardId) return session;
  accrueCurrentTime(session, nowMs);
  session.outcomes[cardId] = outcome;
  session.completedCount += 1;
  session.currentIndex += 1;
  session.currentStartedAtMs = nowMs;
  return stamp(session, nowMs);
}

export function skipLearningCard(session: RecoverableSessionState, nowMs = Date.now()): RecoverableSessionState {
  if (session.kind !== 'learning') throw new Error('Überspringen ist nur in einer Lernsitzung zulässig.');
  const cardId = currentSessionCardId(session);
  if (!cardId) return session;
  accrueCurrentTime(session, nowMs);
  session.itemIds.splice(session.currentIndex, 1);
  session.itemIds.push(cardId);
  session.revealed[cardId] = false;
  session.currentStartedAtMs = nowMs;
  return stamp(session, nowMs);
}

export function navigateExam(session: RecoverableSessionState, index: number, nowMs = Date.now()): RecoverableSessionState {
  if (session.kind !== 'exam') throw new Error('Direkte Navigation ist nur in einer Prüfung zulässig.');
  if (!Number.isInteger(index) || index < 0 || index >= session.itemIds.length) throw new Error('Ungültige Prüfungsposition.');
  accrueCurrentTime(session, nowMs);
  session.currentIndex = index;
  session.currentStartedAtMs = nowMs;
  return stamp(session, nowMs);
}

export function gradeExamCard(session: RecoverableSessionState, outcome: Outcome, nowMs = Date.now()): RecoverableSessionState {
  if (session.kind !== 'exam') throw new Error('Prüfungsbewertung ist nur in einer Prüfung zulässig.');
  const cardId = currentSessionCardId(session);
  if (!cardId) return session;
  accrueCurrentTime(session, nowMs);
  session.outcomes[cardId] = outcome;
  session.completedCount = Object.keys(session.outcomes).length;
  const next = nextUngradedExamIndex(session, session.currentIndex + 1);
  if (next !== undefined) session.currentIndex = next;
  session.currentStartedAtMs = nowMs;
  return stamp(session, nowMs);
}

export function nextUngradedExamIndex(session: RecoverableSessionState, start = 0): number | undefined {
  for (let offset = 0; offset < session.itemIds.length; offset++) {
    const index = (start + offset) % session.itemIds.length;
    if (!session.outcomes[session.itemIds[index]]) return index;
  }
  return undefined;
}

export function examQuestionStatuses(session: RecoverableSessionState): ExamQuestionStatus[] {
  return session.itemIds.map((cardId,index)=>({
    cardId,
    index,
    current:index===session.currentIndex,
    revealed:Boolean(session.revealed[cardId]),
    outcome:session.outcomes[cardId],
  }));
}

export function sessionComplete(session: RecoverableSessionState): boolean {
  return session.kind === 'learning'
    ? session.currentIndex >= session.itemIds.length
    : Object.keys(session.outcomes).length >= session.itemIds.length;
}

export function calculateExamScore(cards: CardVersion[], outcomes: Record<string,Outcome>): {points:number;maxPoints:number;percentage:number;items:number} {
  const byId = new Map(cards.map(card=>[card.id,card]));
  let points = 0;
  let maxPoints = 0;
  for (const [cardId,outcome] of Object.entries(outcomes)) {
    const card = byId.get(cardId);
    if (!card) continue;
    maxPoints += card.points;
    if (outcome === 'correct') points += card.points;
    else if (outcome === 'partial') points += card.points * 0.5;
  }
  const roundedPoints = Math.round(points * 100) / 100;
  const percentage = maxPoints > 0 ? Math.round((roundedPoints / maxPoints) * 1000) / 10 : 0;
  return {points:roundedPoints,maxPoints:Math.round(maxPoints*100)/100,percentage,items:Object.keys(outcomes).length};
}

export function shuffleIds(ids: string[], random: () => number = Math.random): string[] {
  const result = [...ids];
  for (let i=result.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function selectExamCardIds(cards: CardVersion[], blueprint: ExamBlueprint | undefined, mode: 'dynamic'|'fixed', random: () => number = Math.random): string[] {
  return selectExamCardIdsWithDependencies(cards,blueprint,mode,random);
}
