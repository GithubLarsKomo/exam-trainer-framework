export type Outcome = 'correct' | 'partial' | 'incorrect';
export type CardStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'released' | 'retired';
export type QuestionType = 'free_text' | 'numeric' | 'single_choice' | 'multiple_choice' | 'cloze' | 'matching' | 'ordering' | 'image_labels' | 'drawing' | 'case_study';
export type ReviewSource = 'learning' | 'exam';

export interface Choice { id: string; text: string; correct?: boolean }
export interface CardAnswer {
  modelAnswer: string;
  requiredTerms?: string[];
  synonyms?: Record<string, string[]>;
  value?: number;
  tolerance?: { type: 'absolute' | 'relative'; value: number };
  criteria?: string[];
  choices?: Choice[];
}
export interface CardVersion {
  id: string;
  version: number;
  status: CardStatus;
  topicId: string;
  examQuestion: string;
  title?: string;
  prompt: string;
  points: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  questionType: QuestionType;
  answer: CardAnswer;
  source: string;
  sourcePage?: string;
  changeReason?: string;
  changedAt: string;
  parentId?: string;
}

export interface QuestionVariant {
  id: string;
  knowledgeItemId: string;
  legacyCardId?: string;
  version: number;
  status: CardStatus;
  topicId: string;
  examQuestion: string;
  title?: string;
  prompt: string;
  points: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  questionType: QuestionType;
  answer: CardAnswer;
  source: string;
  sourcePage?: string;
  changedAt: string;
  changeReason?: string;
}

export interface KnowledgeItem {
  id: string;
  version: number;
  status: CardStatus;
  topicId: string;
  title?: string;
  canonicalContent?: string;
  explanation?: string;
  tags: string[];
  source: string;
  sourcePage?: string;
  changedAt: string;
  changeReason?: string;
  questionVariants: QuestionVariant[];
}

export function legacyQuestionVariantId(cardId: string): string {
  return `${cardId}:q1`;
}

export function cardVersionToKnowledgeItem(card: CardVersion): KnowledgeItem {
  const variant: QuestionVariant = {
    id: legacyQuestionVariantId(card.id),
    knowledgeItemId: card.id,
    legacyCardId: card.id,
    version: card.version,
    status: card.status,
    topicId: card.topicId,
    examQuestion: card.examQuestion,
    title: card.title,
    prompt: card.prompt,
    points: card.points,
    difficulty: card.difficulty,
    tags: [...card.tags],
    questionType: card.questionType,
    answer: structuredClone(card.answer),
    source: card.source,
    sourcePage: card.sourcePage,
    changedAt: card.changedAt,
    changeReason: card.changeReason,
  };
  return {
    id: card.id,
    version: card.version,
    status: card.status,
    topicId: card.topicId,
    title: card.title,
    tags: [...card.tags],
    source: card.source,
    sourcePage: card.sourcePage,
    changedAt: card.changedAt,
    changeReason: card.changeReason,
    questionVariants: [variant],
  };
}

export interface Catalog {
  catalogId: string;
  title: string;
  version: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  cards: CardVersion[];
  knowledgeItems?: KnowledgeItem[];
}
export interface Progress {
  stage: number;
  dueAt: string;
  correct: number;
  partial: number;
  incorrect: number;
  skipped: number;
  marked: boolean;
  cardVersion: number;
}

export interface FsrsShadowState {
  dueAt: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReviewAt?: string;
}

export interface ReviewEvent {
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
  scheduler?: {
    classic?: { stage: number; dueAt: string };
    fsrs?: {
      dueAt: string;
      stability: number;
      difficulty: number;
      state: number;
      retrievability?: number;
    };
  };
  migrationSource?: 'legacy-history';
}

export interface ExamAttempt { id: string; at: string; points: number; maxPoints: number; percentage: number; items: number }
export interface AppState {
  schemaVersion: number;
  progress: Record<string, Progress>;
  history: Array<{ cardId: string; outcome: Outcome; at: string }>;
  reviewEvents: ReviewEvent[];
  fsrsShadow: Record<string, FsrsShadowState>;
  review: Record<string, string>;
  sessions: Record<string, unknown>;
  examAttempts: ExamAttempt[];
  migrationLog: Array<{ from: number; to: number; at: string; status: string; message?: string }>;
  catalogs: Catalog[];
  activeCatalogId: string;
  lastBackupAt?: string;
  activeCatalog?: unknown;
}
