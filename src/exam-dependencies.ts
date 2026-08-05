import type { CardVersion, ExamBlueprint, Outcome } from './model';

export interface ExamDependencyMetadata {
  examGroupId?: string;
  examGroupOrder?: number;
}

export type ExamDependentCard = CardVersion & ExamDependencyMetadata;

interface ExamSelectionUnit {
  key: string;
  topicId: string;
  ids: string[];
}

function metadata(card: CardVersion): ExamDependencyMetadata {
  const value = card as ExamDependentCard;
  const groupId = value.examGroupId?.trim();
  const order = Number.isInteger(value.examGroupOrder) && (value.examGroupOrder ?? 0) > 0
    ? value.examGroupOrder
    : undefined;
  return {examGroupId: groupId || undefined, examGroupOrder: order};
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildExamSelectionUnits(cards: CardVersion[]): ExamSelectionUnit[] {
  const grouped = new Map<string, ExamDependentCard[]>();
  const singles: ExamSelectionUnit[] = [];

  for (const card of cards) {
    const meta = metadata(card);
    if (!meta.examGroupId) {
      singles.push({key:`card:${card.id}`,topicId:card.topicId,ids:[card.id]});
      continue;
    }
    const list = grouped.get(meta.examGroupId) ?? [];
    list.push(card as ExamDependentCard);
    grouped.set(meta.examGroupId,list);
  }

  const groups = [...grouped.entries()].map(([groupId,members]) => {
    const ordered = [...members].sort((a,b) => {
      const aOrder = metadata(a).examGroupOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = metadata(b).examGroupOrder ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.id.localeCompare(b.id);
    });
    return {key:`group:${groupId}`,topicId:ordered[0]?.topicId ?? '',ids:ordered.map(card=>card.id)};
  });

  return [...groups,...singles];
}

function chooseWithinLimit(units: ExamSelectionUnit[], limit: number, random: () => number): ExamSelectionUnit[] {
  if (limit <= 0) return [];
  const selected: ExamSelectionUnit[] = [];
  let count = 0;
  const shuffled = shuffle(units,random);
  for (const unit of shuffled) {
    if (count >= limit) break;
    if (count + unit.ids.length > limit) continue;
    selected.push(unit);
    count += unit.ids.length;
  }
  if (!selected.length && shuffled.length && shuffled.every(unit=>unit.ids.length>limit)) {
    const smallest = [...shuffled].sort((a,b)=>a.ids.length-b.ids.length)[0];
    if (smallest) selected.push(smallest);
  }
  return selected;
}

export function selectExamCardIdsWithDependencies(
  cards: CardVersion[],
  blueprint: ExamBlueprint | undefined,
  mode: 'dynamic'|'fixed',
  random: () => number = Math.random,
): string[] {
  if (!cards.length) return [];
  const target = Math.min(Math.max(1,Math.round(blueprint?.totalItems ?? 57)),cards.length);
  const units = buildExamSelectionUnits(cards);

  if (mode === 'fixed' || !blueprint?.sections.length) {
    return shuffle(chooseWithinLimit(units,target,random),random).flatMap(unit=>unit.ids);
  }

  const sections = blueprint.sections.filter(section=>section.weight>0);
  const totalWeight = sections.reduce((sum,section)=>sum+section.weight,0);
  if (!totalWeight) return shuffle(chooseWithinLimit(units,target,random),random).flatMap(unit=>unit.ids);

  const pools = new Map<string,ExamSelectionUnit[]>();
  for (const unit of units) {
    const pool = pools.get(unit.topicId) ?? [];
    pool.push(unit);
    pools.set(unit.topicId,pool);
  }

  const selected: ExamSelectionUnit[] = [];
  const used = new Set<string>();
  let selectedCount = 0;
  for (const section of sections) {
    if (selectedCount >= target) break;
    const desired = target * section.weight / totalWeight;
    let topicCount = 0;
    for (const unit of shuffle(pools.get(section.topicId) ?? [],random)) {
      if (selectedCount >= target || topicCount >= desired) break;
      if (selectedCount + unit.ids.length > target) continue;
      const before = Math.abs(desired-topicCount);
      const after = Math.abs(desired-(topicCount+unit.ids.length));
      if (topicCount + unit.ids.length <= desired || after < before) {
        selected.push(unit);
        used.add(unit.key);
        topicCount += unit.ids.length;
        selectedCount += unit.ids.length;
      }
    }
  }

  if (selectedCount < target) {
    const remaining = units.filter(unit=>!used.has(unit.key));
    for (const unit of chooseWithinLimit(remaining,target-selectedCount,random)) {
      if (selectedCount > 0 && selectedCount + unit.ids.length > target) continue;
      selected.push(unit);
      used.add(unit.key);
      selectedCount += unit.ids.length;
      if (selectedCount >= target) break;
    }
  }

  if (!selected.length && units.length) {
    const fallback = [...units].sort((a,b)=>a.ids.length-b.ids.length)[0];
    if (fallback) selected.push(fallback);
  }

  return shuffle(selected,random).flatMap(unit=>unit.ids);
}

export function lockedDependentExamCardIds(
  itemIds: string[],
  cards: CardVersion[],
  outcomes: Record<string,Outcome>,
): Set<string> {
  const selected = new Set(itemIds);
  const byGroup = new Map<string,ExamDependentCard[]>();
  for (const card of cards) {
    if (!selected.has(card.id)) continue;
    const groupId = metadata(card).examGroupId;
    if (!groupId) continue;
    const list = byGroup.get(groupId) ?? [];
    list.push(card as ExamDependentCard);
    byGroup.set(groupId,list);
  }

  const locked = new Set<string>();
  for (const members of byGroup.values()) {
    const ordered = [...members].sort((a,b) => {
      const aOrder=metadata(a).examGroupOrder??Number.MAX_SAFE_INTEGER;
      const bOrder=metadata(b).examGroupOrder??Number.MAX_SAFE_INTEGER;
      return aOrder-bOrder || itemIds.indexOf(a.id)-itemIds.indexOf(b.id);
    });
    let predecessorComplete = true;
    for (const card of ordered) {
      if (!predecessorComplete) locked.add(card.id);
      predecessorComplete = predecessorComplete && Boolean(outcomes[card.id]);
    }
  }
  return locked;
}

export function dependentExamContext(cardId:string,cards:CardVersion[]): {groupId:string;position:number;total:number}|undefined {
  const card=cards.find(entry=>entry.id===cardId); if(!card)return undefined;
  const groupId=metadata(card).examGroupId; if(!groupId)return undefined;
  const members=cards.filter(entry=>metadata(entry).examGroupId===groupId).sort((a,b)=>(metadata(a).examGroupOrder??Number.MAX_SAFE_INTEGER)-(metadata(b).examGroupOrder??Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id));
  const position=members.findIndex(entry=>entry.id===cardId);
  return position<0?undefined:{groupId,position:position+1,total:members.length};
}
