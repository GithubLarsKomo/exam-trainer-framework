import type { CardStatus, CardVersion, Catalog, QuestionType } from './model';

export interface CardSourceMetadata { kind?:'script'|'book'|'standard'|'web'|'exam-memory'|'other'; title?:string; url?:string; section?:string; accessedAt?:string }
export interface TypoTolerance { enabled:boolean; maxDistance:number }
export type EditorCard = CardVersion & { sourceMeta?:CardSourceMetadata; answer:CardVersion['answer'] & { typoTolerance?:TypoTolerance } };

export type CardListFilters={query?:string;status?:CardStatus|'all';questionType?:QuestionType|'all';topic?:string|'all';sort?:'id'|'topic'|'status'|'updated-desc'|'updated-asc'};

export function parseSynonyms(text:string):Record<string,string[]>{
  const result:Record<string,string[]>={};
  for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;const [term,...rest]=line.split('=>');const key=term?.trim();const values=rest.join('=>').split(',').map(v=>v.trim()).filter(Boolean);if(key&&values.length)result[key]=Array.from(new Set(values));}
  return result;
}
export function formatSynonyms(value?:Record<string,string[]>):string{return Object.entries(value??{}).map(([term,aliases])=>`${term} => ${aliases.join(', ')}`).join('\n');}

export function filterAndSortCards(cards:CardVersion[],filters:CardListFilters):CardVersion[]{
  const q=filters.query?.trim().toLowerCase()??'';
  const filtered=cards.filter(card=>(!q||`${card.id} ${card.prompt} ${card.topicId} ${card.tags.join(' ')}`.toLowerCase().includes(q))&&(filters.status==='all'||!filters.status||card.status===filters.status)&&(filters.questionType==='all'||!filters.questionType||card.questionType===filters.questionType)&&(filters.topic==='all'||!filters.topic||card.topicId===filters.topic));
  const sort=filters.sort??'id';
  return [...filtered].sort((a,b)=>sort==='topic'?a.topicId.localeCompare(b.topicId)||a.id.localeCompare(b.id):sort==='status'?a.status.localeCompare(b.status)||a.id.localeCompare(b.id):sort==='updated-desc'?b.changedAt.localeCompare(a.changedAt):sort==='updated-asc'?a.changedAt.localeCompare(b.changedAt):a.id.localeCompare(b.id));
}

export function updateCardFromForm(existing:EditorCard|undefined,form:FormData,now=new Date()):EditorCard{
  const previousAnswer=structuredClone(existing?.answer??{modelAnswer:''});
  const status=String(form.get('status')??existing?.status??'draft') as CardStatus;
  const synonyms=parseSynonyms(String(form.get('editorSynonyms')??formatSynonyms(previousAnswer.synonyms)));
  const typoEnabled=String(form.get('editorTypoEnabled')??'')==='on';
  const typoDistance=Math.max(0,Math.min(5,Number(form.get('editorTypoDistance')??1)||1));
  const sourceMeta:CardSourceMetadata={kind:(String(form.get('editorSourceKind')??'')||undefined) as CardSourceMetadata['kind'],title:String(form.get('editorSourceTitle')??'').trim()||undefined,url:String(form.get('editorSourceUrl')??'').trim()||undefined,section:String(form.get('editorSourceSection')??'').trim()||undefined,accessedAt:String(form.get('editorSourceAccessedAt')??'').trim()||undefined};
  return {
    ...(existing?structuredClone(existing):{} as EditorCard),
    id:String(form.get('id')??existing?.id??'').trim(),
    version:existing?.version??1,
    status,
    topicId:String(form.get('topicId')??existing?.topicId??'').trim(),
    examQuestion:String(form.get('examQuestion')??existing?.examQuestion??'').trim(),
    prompt:String(form.get('prompt')??existing?.prompt??'').trim(),
    points:Number(form.get('points')??existing?.points??0),
    difficulty:Number(form.get('difficulty')??existing?.difficulty??2) as EditorCard['difficulty'],
    tags:String(form.get('tags')??'').split(',').map(v=>v.trim()).filter(Boolean),
    questionType:String(form.get('questionType')??existing?.questionType??'free_text') as QuestionType,
    answer:{...previousAnswer,modelAnswer:String(form.get('modelAnswer')??previousAnswer.modelAnswer).trim(),requiredTerms:String(form.get('requiredTerms')??'').split(',').map(v=>v.trim()).filter(Boolean),value:String(form.get('value')??'')!==''?Number(form.get('value')):undefined,tolerance:{type:'absolute',value:Number(form.get('tolerance')??0)},synonyms,typoTolerance:{enabled:typoEnabled,maxDistance:typoDistance}},
    source:String(form.get('source')??existing?.source??'').trim(),
    sourcePage:String(form.get('sourcePage')??existing?.sourcePage??'').trim()||undefined,
    changeReason:String(form.get('changeReason')??existing?.changeReason??'').trim()||undefined,
    changedAt:now.toISOString(),
    sourceMeta:Object.values(sourceMeta).some(Boolean)?sourceMeta:undefined,
  };
}

export function applyBulkEdit(catalog:Catalog,ids:Set<string>,patch:{status?:CardStatus;topicId?:string;addTag?:string},now=new Date()):Catalog{
  const next=structuredClone(catalog);const at=now.toISOString();
  next.cards=next.cards.map(card=>{if(!ids.has(card.id))return card;const tags=patch.addTag?Array.from(new Set([...card.tags,patch.addTag])):card.tags;return{...card,status:patch.status??card.status,topicId:patch.topicId?.trim()||card.topicId,tags,changedAt:at,changeReason:card.changeReason??'Bulk edit'};});next.updatedAt=at;return next;
}

export function archiveCard(catalog:Catalog,cardId:string,now=new Date()):Catalog{return applyBulkEdit(catalog,new Set([cardId]),{status:'retired'},now);}
