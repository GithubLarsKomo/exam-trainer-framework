import { cardVersionToKnowledgeItem, type CardStatus, type CardVersion, type Catalog, type KnowledgeItem } from './model';
import type { ImportCandidate, ImportPreview } from './import-model';

export interface ImportCommitOptions {
  catalogId: string;
  title: string;
  status?: Extract<CardStatus, 'draft' | 'released'>;
  now?: Date;
}

function ensureNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} darf nicht leer sein.`);
  return trimmed;
}

function candidateToCard(candidate: ImportCandidate, preview: ImportPreview, status: Extract<CardStatus, 'draft' | 'released'>, changedAt: string): CardVersion {
  const prompt = ensureNonEmpty(candidate.prompt, 'Frage');
  const modelAnswer = ensureNonEmpty(candidate.modelAnswer, 'Musterantwort');
  const source = ensureNonEmpty(candidate.source, 'Quelle');
  return {
    id: candidate.id,
    version: 1,
    status,
    topicId: ensureNonEmpty(candidate.topicId, 'Thema'),
    examQuestion: '',
    title: undefined,
    prompt,
    points: 1,
    difficulty: 2,
    tags: [...new Set(candidate.tags)],
    questionType: candidate.questionType,
    answer: { modelAnswer },
    source,
    changedAt,
    changeReason: `Import aus ${preview.sourceKind.toUpperCase()}${preview.sourceName ? ` (${preview.sourceName})` : ''}; sourceNoteId=${candidate.sourceNoteId}`,
  };
}

export function createCatalogFromImportPreview(preview: ImportPreview, options: ImportCommitOptions): Catalog {
  if (!preview.canCommit) throw new Error('Der Import kann wegen blockierender Preview-Warnungen nicht übernommen werden.');
  if (!preview.candidates.length) throw new Error('Die Preview enthält keine importierbaren Wissenseinheiten.');
  const catalogId = ensureNonEmpty(options.catalogId, 'Katalog-ID');
  const title = ensureNonEmpty(options.title, 'Katalogtitel');
  const changedAt = (options.now ?? new Date()).toISOString();
  const status = options.status ?? 'draft';
  const cards = preview.candidates.map(candidate => candidateToCard(candidate, preview, status, changedAt));
  const knowledgeItems: KnowledgeItem[] = cards.map((card, index) => {
    const item = cardVersionToKnowledgeItem(card);
    const candidate = preview.candidates[index];
    return {
      ...item,
      canonicalContent: candidate.modelAnswer,
      explanation: candidate.explanation,
    };
  });
  return {
    catalogId,
    title,
    version: '0.1.0',
    description: `Importierter ${preview.sourceKind.toUpperCase()}-Katalog mit ${cards.length} Wissenseinheiten. Scheduling-Historie wurde nicht übernommen.`,
    createdAt: changedAt,
    updatedAt: changedAt,
    cards,
    knowledgeItems,
  };
}
