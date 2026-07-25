export type Outcome = 'correct' | 'partial' | 'incorrect';
export type CardStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'released' | 'retired';
export type QuestionType = 'free_text' | 'numeric' | 'single_choice' | 'multiple_choice' | 'cloze' | 'matching' | 'ordering' | 'image_labels' | 'drawing' | 'case_study';

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
export interface Catalog {
  catalogId: string;
  title: string;
  version: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  cards: CardVersion[];
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
export interface ExamAttempt { id: string; at: string; points: number; maxPoints: number; percentage: number; items: number }
export interface AppState {
  schemaVersion: number;
  progress: Record<string, Progress>;
  history: Array<{ cardId: string; outcome: Outcome; at: string }>;
  review: Record<string, string>;
  sessions: Record<string, unknown>;
  examAttempts: ExamAttempt[];
  migrationLog: Array<{ from: number; to: number; at: string; status: string; message?: string }>;
  catalogs: Catalog[];
  activeCatalogId: string;
  lastBackupAt?: string;
  activeCatalog?: unknown;
}
