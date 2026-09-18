import { effectiveKnowledgeItems, selectQuestionVariant } from './knowledge-learning-runtime';
import type { Catalog, LearningCompetencyClass, QuestionVariant, ReviewEvent } from './model';

export type LearningDeepLinkMode =
  | 'retrieval'
  | 'application'
  | 'practice'
  | 'transfer'
  | 'review'
  | 'repeat';

export interface LearningDeepLink {
  catalogId: string;
  focusId: string;
  mode: LearningDeepLinkMode;
}

const modes = new Set<LearningDeepLinkMode>([
  'retrieval',
  'application',
  'practice',
  'transfer',
  'review',
  'repeat',
]);

export function parseLearningDeepLink(search: string): LearningDeepLink | undefined {
  const params = new URLSearchParams(search);
  const catalogId = params.get('catalog')?.trim() ?? '';
  const focusId = params.get('focus')?.trim() ?? '';

  if (!catalogId && !focusId) return undefined;
  if (!catalogId || !focusId) {
    throw new Error('ETF-Lernlinks benötigen sowohl „catalog“ als auch „focus“.');
  }

  const rawMode = (params.get('mode')?.trim().toLowerCase() || 'practice') as LearningDeepLinkMode;
  if (!modes.has(rawMode)) {
    throw new Error(`Unbekannter ETF-Lernmodus „${rawMode}“.`);
  }

  return { catalogId, focusId, mode: rawMode };
}

export function deepLinkCompetencyClass(mode: LearningDeepLinkMode): LearningCompetencyClass | undefined {
  if (mode === 'retrieval') return 'knowledge';
  if (mode === 'application' || mode === 'practice') return 'application';
  if (mode === 'transfer') return 'transfer';
  return undefined;
}

export function resolveLearningDeepLinkVariant(
  catalog: Catalog,
  link: LearningDeepLink,
  reviewEvents: ReviewEvent[] = [],
): QuestionVariant {
  if (catalog.catalogId !== link.catalogId) {
    throw new Error(`Katalog „${link.catalogId}“ ist nicht der angegebene Katalog.`);
  }

  const item = effectiveKnowledgeItems(catalog).find(candidate => candidate.id === link.focusId);
  if (!item) {
    throw new Error(
      `Lernfokus „${link.focusId}“ ist in „${link.catalogId}“ nicht als freigegebenes KnowledgeItem verfügbar.`,
    );
  }

  const competencyClass = deepLinkCompetencyClass(link.mode);
  if (!competencyClass) return selectQuestionVariant(item, reviewEvents);

  const candidates = item.questionVariants
    .filter(variant => variant.status === 'released' && variant.competencyClass === competencyClass)
    .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));

  const selected = candidates[0];
  if (!selected) {
    throw new Error(
      `Lernfokus „${link.focusId}“ besitzt keine freigegebene Variante für „${competencyClass}“.`,
    );
  }
  return selected;
}

export function learningDeepLinkSignature(link: LearningDeepLink): string {
  return `${link.catalogId}\u0000${link.focusId}\u0000${link.mode}`;
}
