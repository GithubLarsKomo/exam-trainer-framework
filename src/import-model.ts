import type { QuestionType } from './model';

export type ImportSourceKind = 'csv' | 'tsv' | 'apkg';
export type ImportWarningCode =
  | 'MISSING_HEADER'
  | 'ROW_LENGTH_MISMATCH'
  | 'EMPTY_NOTE'
  | 'UNSUPPORTED_ANKI_SCHEMA'
  | 'MODERN_MEDIA_MAP_UNRESOLVED'
  | 'UNMAPPED_MEDIA'
  | 'UNSAFE_TEMPLATE_IGNORED'
  | 'ARCHIVE_LIMIT'
  | 'MISSING_FIELD_MAPPING'
  | 'DUPLICATE_SOURCE_ID';

export interface ImportWarning {
  code: ImportWarningCode;
  message: string;
  sourceId?: string;
  blocking?: boolean;
}

export interface NormalizedImportField {
  name: string;
  value: string;
  ordinal: number;
}

export interface NormalizedImportCard {
  sourceCardId: string;
  deckId?: string;
  deckPath: string[];
  templateOrdinal?: number;
  templateName?: string;
  /** Untrusted source text. Never render as HTML or execute. */
  rawFrontTemplate?: string;
  /** Untrusted source text. Never render as HTML or execute. */
  rawBackTemplate?: string;
}

export interface NormalizedImportNote {
  sourceNoteId: string;
  noteTypeId?: string;
  noteTypeName?: string;
  fields: NormalizedImportField[];
  tags: string[];
  cards: NormalizedImportCard[];
  clozeDetected: boolean;
}

export interface NormalizedImportMedia {
  archiveName: string;
  fileName?: string;
  bytes: Uint8Array;
}

export interface NormalizedImportBundle {
  sourceKind: ImportSourceKind;
  sourceName?: string;
  notes: NormalizedImportNote[];
  media: NormalizedImportMedia[];
  warnings: ImportWarning[];
  metadata: {
    schedulingImported: false;
    collectionFile?: 'collection.anki2' | 'collection.anki21' | 'collection.anki21b';
    ankiSchemaVersion?: number;
    modernSchema?: boolean;
    delimiter?: ',' | '\t';
    headers?: string[];
  };
}

export interface ImportMapping {
  questionField: string;
  answerField: string;
  explanationField?: string;
  sourceField?: string;
  topicField?: string;
  topicFromDeck?: boolean;
  defaultTopic?: string;
  defaultSource?: string;
  tagsAsTags?: boolean;
}

export interface ImportCandidate {
  sourceNoteId: string;
  id: string;
  topicId: string;
  prompt: string;
  modelAnswer: string;
  explanation?: string;
  source: string;
  tags: string[];
  questionType: QuestionType;
  variants: Array<{
    sourceCardId?: string;
    deckPath: string[];
    templateName?: string;
  }>;
}

export interface ImportPreview {
  sourceKind: ImportSourceKind;
  sourceName?: string;
  totalNotes: number;
  candidates: ImportCandidate[];
  warnings: ImportWarning[];
  mapping: ImportMapping;
  canCommit: boolean;
}

export function emptyImportBundle(sourceKind: ImportSourceKind, sourceName?: string): NormalizedImportBundle {
  return {
    sourceKind,
    sourceName,
    notes: [],
    media: [],
    warnings: [],
    metadata: { schedulingImported: false },
  };
}
