import type {
  CardVersion,
  ExamBlueprint,
  ExamBlueprintSection,
  Progress,
  ReadinessSnapshot,
  ReadinessTopicSnapshot,
} from './model';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function percent(value: number): number {
  return Math.round(clamp01(value) * 1000) / 10;
}

export function masteryScore(progress: Progress | undefined): number {
  if (!progress) return 0;
  const stage = Math.max(1, Math.min(5, progress.stage));
  return (stage - 1) / 4;
}

export function hasLearningEvidence(progress: Progress | undefined): boolean {
  if (!progress) return false;
  return progress.correct + progress.partial + progress.incorrect > 0;
}

export function validateExamBlueprint(blueprint: ExamBlueprint, cards: CardVersion[] = []): string[] {
  const errors: string[] = [];
  if (!blueprint.id.trim()) errors.push('Blueprint ID is required.');
  if (!blueprint.catalogId.trim()) errors.push('Blueprint catalogId is required.');
  if (!Number.isInteger(blueprint.version) || blueprint.version < 1) errors.push('Blueprint version must be a positive integer.');
  if (!blueprint.sections.length) errors.push('Blueprint requires at least one section.');

  const knownTopics = new Set(cards.map(card => card.topicId));
  const seen = new Set<string>();
  for (const section of blueprint.sections) {
    if (!section.topicId.trim()) errors.push('Blueprint section topicId is required.');
    if (seen.has(section.topicId)) errors.push(`Duplicate blueprint topic: ${section.topicId}`);
    seen.add(section.topicId);
    if (!Number.isFinite(section.weight) || section.weight <= 0) errors.push(`Invalid weight for topic ${section.topicId}.`);
    if (section.minItems !== undefined && (!Number.isInteger(section.minItems) || section.minItems < 0)) errors.push(`Invalid minItems for topic ${section.topicId}.`);
    if (section.maxItems !== undefined && (!Number.isInteger(section.maxItems) || section.maxItems < 0)) errors.push(`Invalid maxItems for topic ${section.topicId}.`);
    if (section.minItems !== undefined && section.maxItems !== undefined && section.minItems > section.maxItems) errors.push(`minItems exceeds maxItems for topic ${section.topicId}.`);
    if (cards.length && !knownTopics.has(section.topicId)) errors.push(`Blueprint topic has no cards: ${section.topicId}`);
  }

  const weightSum = blueprint.sections.reduce((sum, section) => sum + section.weight, 0);
  if (!(weightSum > 0)) errors.push('Blueprint weights must sum to a positive value.');
  if (blueprint.passThreshold !== undefined && (blueprint.passThreshold < 0 || blueprint.passThreshold > 1)) errors.push('passThreshold must be between 0 and 1.');
  if (blueprint.totalItems !== undefined && (!Number.isInteger(blueprint.totalItems) || blueprint.totalItems < 1)) errors.push('totalItems must be a positive integer.');
  if (blueprint.totalPoints !== undefined && (!Number.isFinite(blueprint.totalPoints) || blueprint.totalPoints <= 0)) errors.push('totalPoints must be positive.');
  if (blueprint.timeLimitMinutes !== undefined && (!Number.isFinite(blueprint.timeLimitMinutes) || blueprint.timeLimitMinutes <= 0)) errors.push('timeLimitMinutes must be positive.');
  if (blueprint.examDate !== undefined && Number.isNaN(Date.parse(blueprint.examDate))) errors.push('examDate must be a valid date.');
  return errors;
}

export function normalizedBlueprintSections(blueprint: ExamBlueprint): ExamBlueprintSection[] {
  const total = blueprint.sections.reduce((sum, section) => sum + section.weight, 0);
  if (!(total > 0)) throw new Error('Blueprint weights must sum to a positive value.');
  return blueprint.sections.map(section => ({ ...section, weight: section.weight / total }));
}

export function createEqualWeightBlueprint(catalogId: string, cards: CardVersion[], examDate?: string): ExamBlueprint {
  const topics = [...new Set(cards.filter(card => card.status === 'released').map(card => card.topicId))].sort();
  if (!topics.length) throw new Error('Cannot create a blueprint without released cards.');
  return {
    id: `${catalogId}:equal-topics`,
    catalogId,
    version: 1,
    title: 'Equal topic weighting',
    examDate,
    sections: topics.map(topicId => ({ topicId, weight: 1 })),
  };
}

export interface ReadinessInput {
  catalogId: string;
  cards: CardVersion[];
  progress: Record<string, Progress>;
  blueprint?: ExamBlueprint;
  calculatedAt?: Date;
}

export function calculateReadiness(input: ReadinessInput): ReadinessSnapshot {
  const released = input.cards.filter(card => card.status === 'released');
  const blueprint = input.blueprint ?? createEqualWeightBlueprint(input.catalogId, released);
  const errors = validateExamBlueprint(blueprint, released);
  if (errors.length) throw new Error(errors.join(' '));
  const sections = normalizedBlueprintSections(blueprint);

  const topics: ReadinessTopicSnapshot[] = sections.map(section => {
    const topicCards = released.filter(card => card.topicId === section.topicId);
    const itemCount = topicCards.length;
    const coveredItems = topicCards.filter(card => hasLearningEvidence(input.progress[card.id])).length;
    const coverage = itemCount ? coveredItems / itemCount : 0;
    const mastery = itemCount
      ? topicCards.reduce((sum, card) => sum + masteryScore(input.progress[card.id]), 0) / itemCount
      : 0;
    return {
      topicId: section.topicId,
      weight: percent(section.weight),
      itemCount,
      coveredItems,
      coverage: percent(coverage),
      mastery: percent(mastery),
    };
  });

  const weightedMastery = sections.reduce((sum, section, index) => sum + (topics[index].mastery / 100) * section.weight, 0);
  const weightedCoverage = sections.reduce((sum, section, index) => sum + (topics[index].coverage / 100) * section.weight, 0);
  const coverageAdjustment = 0.5 + 0.5 * weightedCoverage;
  const readiness = weightedMastery * coverageAdjustment;

  const weakest = topics
    .map(topic => ({ topicId: topic.topicId, score: (topic.mastery / 100) * (0.5 + 0.5 * topic.coverage / 100) }))
    .sort((a, b) => a.score - b.score || a.topicId.localeCompare(b.topicId))[0];
  const calculatedAt = input.calculatedAt ?? new Date();

  return {
    id: `readiness:${input.catalogId}:${calculatedAt.toISOString()}`,
    catalogId: input.catalogId,
    blueprintId: blueprint.id,
    calculatedAt: calculatedAt.toISOString(),
    readiness: percent(readiness),
    mastery: percent(weightedMastery),
    coverage: percent(weightedCoverage),
    coverageAdjustment: percent(coverageAdjustment),
    topics,
    weakestTopicId: weakest?.topicId,
  };
}
