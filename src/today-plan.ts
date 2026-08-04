import { buildAdaptiveQueue, type AdaptiveQueueInput, type AdaptiveQueueItem } from './adaptive-queue';

export interface TodayPlan {
  items: AdaptiveQueueItem[];
  due: number;
  review: number;
  weakness: number;
  newContent: number;
  estimatedMinutes: number;
}

export interface TodayPlanOptions {
  minimumItems?: number;
  defaultSecondsPerItem?: number;
}

function estimateSecondsPerItem(input: AdaptiveQueueInput, fallback: number): number {
  const samples = input.reviewEvents
    .map(event => event.responseTimeMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 5_000 && value <= 300_000)
    .slice(-50);
  if (!samples.length) return fallback;
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length / 1000;
  return Math.max(15, Math.min(120, average));
}

export function buildTodayPlan(input: AdaptiveQueueInput, options: TodayPlanOptions = {}): TodayPlan {
  const ranked = buildAdaptiveQueue({ ...input, options: { ...input.options, limit: undefined } });
  const dueItems = ranked.filter(item => item.signals.classicDue);
  const releasedCount = input.cards.filter(card => card.status === 'released').length;
  const minimumItems = Math.max(0, options.minimumItems ?? 30);
  const target = Math.max(dueItems.length, Math.min(minimumItems, releasedCount));
  const selectedIds = new Set(dueItems.map(item => item.cardId));

  for (const item of ranked) {
    if (selectedIds.size >= target) break;
    selectedIds.add(item.cardId);
  }

  const items = ranked.filter(item => selectedIds.has(item.cardId));
  const secondsPerItem = estimateSecondsPerItem(input, options.defaultSecondsPerItem ?? 45);
  const estimatedMinutes = items.length ? Math.max(1, Math.round(items.length * secondsPerItem / 60)) : 0;

  return {
    items,
    due: items.filter(item => item.signals.classicDue).length,
    review: items.filter(item => item.category === 'review').length,
    weakness: items.filter(item => item.category === 'weakness').length,
    newContent: items.filter(item => item.category === 'new').length,
    estimatedMinutes,
  };
}
