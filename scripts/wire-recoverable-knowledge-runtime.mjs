import { readFileSync, writeFileSync } from 'node:fs';

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one anchor, found ${count}`);
  return source.replace(before, after);
}

// One-shot materializer: all anchors are exact and fail closed if the branch moved.
// 1) Add a backward-compatible variant snapshot to recoverable sessions.
{
  const path = 'src/recoverable-session.ts';
  let source = readFileSync(path, 'utf8');
  source = replaceExactly(source,
    '  queueReasons?: Record<string,QueueReasonCode[]>;\n  timeSpentMs: Record<string,number>;',
    '  queueReasons?: Record<string,QueueReasonCode[]>;\n  questionVariantIds?: Record<string,string>;\n  timeSpentMs: Record<string,number>;',
    'session-state variant map');
  source = replaceExactly(source,
    '  queueReasons?: Record<string,QueueReasonCode[]>;\n  nowMs?: number;',
    '  queueReasons?: Record<string,QueueReasonCode[]>;\n  questionVariantIds?: Record<string,string>;\n  nowMs?: number;',
    'session-input variant map');
  source = replaceExactly(source,
    '    queueReasons: input.queueReasons ? structuredClone(input.queueReasons) : undefined,\n    timeSpentMs: {},',
    '    queueReasons: input.queueReasons ? structuredClone(input.queueReasons) : undefined,\n    questionVariantIds: input.questionVariantIds ? structuredClone(input.questionVariantIds) : undefined,\n    timeSpentMs: {},',
    'session-create variant map');
  writeFileSync(path, source);
}

// 2) Allow the runtime to reconstruct the exact selected variant on resume.
{
  const path = 'src/knowledge-learning-runtime.ts';
  let source = readFileSync(path, 'utf8');
  const anchor = `export function runtimeQuestionsForCatalog(catalog: Catalog, reviewEvents: ReviewEvent[] = []): RuntimeQuestion[] {\n  return effectiveKnowledgeItems(catalog).map(item => runtimeQuestion(item, selectQuestionVariant(item, reviewEvents)));\n}\n`;
  const replacement = `${anchor}\n/** Reconstruct one exact released QuestionVariant for a semantic KnowledgeItem. */\nexport function runtimeQuestionForVariant(\n  catalog: Catalog,\n  knowledgeItemId: string,\n  questionVariantId: string,\n): RuntimeQuestion | undefined {\n  const item = effectiveKnowledgeItems(catalog).find(candidate => candidate.id === knowledgeItemId);\n  if (!item) return undefined;\n  const variant = releasedVariants(item).find(candidate => candidate.id === questionVariantId);\n  return variant ? runtimeQuestion(item, variant) : undefined;\n}\n`;
  source = replaceExactly(source, anchor, replacement, 'exact runtime variant helper');
  writeFileSync(path, source);
}

// 3) Move the recoverable-session feature onto the same KnowledgeItem runtime.
{
  const path = 'src/recoverable-session-feature.ts';
  let source = readFileSync(path, 'utf8');
  source = replaceExactly(source,
    "import { legacyQuestionVariantId, type AppState, type CardVersion, type Catalog, type Outcome, type Progress, type QueueReasonCode } from './model';",
    "import { type AppState, type CardVersion, type Catalog, type Outcome, type Progress, type QueueReasonCode } from './model';\nimport { runtimeQuestionForVariant, runtimeQuestionsForCatalog, type RuntimeQuestion } from './knowledge-learning-runtime';",
    'recoverable runtime import');

  source = replaceExactly(source,
`function releasedCards(catalog: Catalog): CardVersion[] { return catalog.cards.filter(card=>card.status==='released'); }\nfunction cardProgress(state: PersistedState & Partial<AppState>, card: CardVersion): Progress {\n  return state.progress?.[card.id] ?? {stage:1,dueAt:new Date(0).toISOString(),correct:0,partial:0,incorrect:0,skipped:0,marked:false,cardVersion:card.version};\n}\nfunction isDue(progress: Progress): boolean { return new Date(progress.dueAt).getTime() <= Date.now(); }\nfunction sessionCard(catalog: Catalog, session: RecoverableSessionState): CardVersion | undefined {\n  const id=currentSessionCardId(session); return id ? catalog.cards.find(card=>card.id===id) : undefined;\n}\n`,
`function runtimeCards(catalog: Catalog, state: PersistedState & Partial<AppState>): RuntimeQuestion[] {\n  return runtimeQuestionsForCatalog(catalog,state.reviewEvents??[]);\n}\nfunction cardProgress(state: PersistedState & Partial<AppState>, card: CardVersion): Progress {\n  return state.progress?.[card.id] ?? {stage:1,dueAt:new Date(0).toISOString(),correct:0,partial:0,incorrect:0,skipped:0,marked:false,cardVersion:card.version};\n}\nfunction isDue(progress: Progress): boolean { return new Date(progress.dueAt).getTime() <= Date.now(); }\nfunction variantSnapshot(cards: RuntimeQuestion[], ids: string[]): Record<string,string> {\n  const byId=new Map(cards.map(card=>[card.id,card]));\n  return Object.fromEntries(ids.flatMap(id=>{const card=byId.get(id);return card?[[id,card.questionVariantId]]:[];}));\n}\nfunction sessionCardById(catalog: Catalog, session: RecoverableSessionState, state: PersistedState & Partial<AppState>, id: string): RuntimeQuestion | undefined {\n  const variantId=session.questionVariantIds?.[id];\n  if(variantId){const exact=runtimeQuestionForVariant(catalog,id,variantId);if(exact)return exact;}\n  return runtimeCards(catalog,state).find(card=>card.id===id);\n}\nfunction sessionCard(catalog: Catalog, session: RecoverableSessionState, state: PersistedState & Partial<AppState>): RuntimeQuestion | undefined {\n  const id=currentSessionCardId(session); return id ? sessionCardById(catalog,session,state,id) : undefined;\n}\n`,
    'recoverable card helpers');

  source = replaceExactly(source,
    '  const cards=releasedCards(catalog);\n  if(!cards.length) return;',
    '  const cards=runtimeCards(catalog,state);\n  if(!cards.length) return;',
    'startToday runtime cards');
  source = replaceExactly(source,
    "  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'learning',mode:'today',itemIds:plan.items.map(item=>item.cardId),queueReasons:queueReasonsObject(plan.items)});",
    "  const ids=plan.items.map(item=>item.cardId);\n  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'learning',mode:'today',itemIds:ids,queueReasons:queueReasonsObject(plan.items),questionVariantIds:variantSnapshot(cards,ids)});",
    'startToday variant snapshot');
  source = replaceExactly(source,
    "  const cards=releasedCards(catalog).filter(card=>topic==='all'||card.topicId===topic);",
    "  const cards=runtimeCards(catalog,state).filter(card=>topic==='all'||card.topicId===topic);",
    'startCustom runtime cards');
  source = replaceExactly(source,
    "  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'learning',mode,itemIds:ids});",
    "  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'learning',mode,itemIds:ids,questionVariantIds:variantSnapshot(cards,ids)});",
    'startCustom variant snapshot');
  source = replaceExactly(source,
    '  const cards=releasedCards(catalog);\n  const mode=',
    '  const cards=runtimeCards(catalog,state);\n  const mode=',
    'startExam runtime cards');
  source = replaceExactly(source,
    "  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'exam',mode,itemIds:ids});",
    "  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'exam',mode,itemIds:ids,questionVariantIds:variantSnapshot(cards,ids)});",
    'startExam variant snapshot');

  source = source.replaceAll('sessionCard(catalog,session)', 'sessionCard(catalog,session,state)');
  source = replaceExactly(source,
    '  const cards=releasedCards(catalog); if(!cards.length)return;',
    '  const cards=runtimeCards(catalog,state); if(!cards.length)return;',
    'readiness runtime cards');
  source = replaceExactly(source,
    "  applyReview(state as AppState,{knowledgeItemId:card.id,questionVariantId:legacyQuestionVariantId(card.id),cardVersion:card.version},outcome,'learning',at,elapsed,{fsrsShadowEnabled:true});",
    "  applyReview(state as AppState,{knowledgeItemId:card.knowledgeItemId,questionVariantId:card.questionVariantId,cardVersion:card.version},outcome,'learning',at,elapsed,{fsrsShadowEnabled:true});",
    'learning concrete variant review');
  source = replaceExactly(source,
    "  const cards=session.itemIds.map(id=>catalog.cards.find(card=>card.id===id)).filter((card):card is CardVersion=>Boolean(card));",
    "  const cards=session.itemIds.map(id=>sessionCardById(catalog,session,state,id)).filter((card):card is RuntimeQuestion=>Boolean(card));",
    'exam runtime card reconstruction');
  source = replaceExactly(source,
    "for(const card of cards){const outcome=session.outcomes[card.id];if(!outcome)continue;applyReview(state as AppState,{knowledgeItemId:card.id,questionVariantId:legacyQuestionVariantId(card.id),cardVersion:card.version},outcome,'exam',submittedAt,session.timeSpentMs[card.id]??0,{fsrsShadowEnabled:true});}",
    "for(const card of cards){const outcome=session.outcomes[card.id];if(!outcome)continue;applyReview(state as AppState,{knowledgeItemId:card.knowledgeItemId,questionVariantId:card.questionVariantId,cardVersion:card.version},outcome,'exam',submittedAt,session.timeSpentMs[card.id]??0,{fsrsShadowEnabled:true});}",
    'exam concrete variant review');
  writeFileSync(path, source);
}
