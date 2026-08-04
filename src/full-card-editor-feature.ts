import './full-card-editor.css';
import { loadState, saveState, type PersistedState } from './db';
import { applyBulkEdit, archiveCard, filterAndSortCards, formatSynonyms, updateCardFromForm, type CardListFilters, type EditorCard } from './card-editor-domain';
import { cardVersionToKnowledgeItem, type CardStatus, type CardVersion, type Catalog, type QuestionType } from './model';

let observer:MutationObserver|undefined;
let scheduled=false;
let toolbarInjecting=false;
let advancedEditorInjecting=false;
let bulkMode=false;
const selected=new Set<string>();
let filters:CardListFilters={status:'all',questionType:'all',topic:'all',sort:'id'};
const fallback=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

async function context():Promise<{state:PersistedState;catalog:Catalog}>{const state=await loadState(fallback());const catalog=(state.catalogs??[]).find(c=>c.catalogId===state.activeCatalogId)??state.catalogs?.[0];if(!catalog)throw new Error('Kein aktiver Katalog.');return{state,catalog};}
function syncKnowledgeItem(catalog:Catalog,card:CardVersion):void{const item=cardVersionToKnowledgeItem(card);const list=catalog.knowledgeItems??=[];const index=list.findIndex(entry=>entry.id===item.id);if(index>=0)list[index]=item;else list.push(item);catalog.knowledgeItems=list;}

function styleRows(orderedIds:string[]):void{const list=document.querySelector<HTMLElement>('.card-list');if(!list)return;const allowed=new Set(orderedIds);const rank=new Map(orderedIds.map((id,index)=>[id,index]));const rows=Array.from(list.querySelectorAll<HTMLElement>('[data-edit-card]'));rows.sort((a,b)=>(rank.get(a.dataset.editCard!)??999999)-(rank.get(b.dataset.editCard!)??999999));for(const row of rows){const id=row.dataset.editCard!;row.hidden=!allowed.has(id);row.classList.toggle('bulk-selected',selected.has(id));row.setAttribute('aria-pressed',bulkMode?String(selected.has(id)):'false');list.append(row);}}
async function applyListFilters():Promise<void>{const {catalog}=await context();const query=document.querySelector<HTMLInputElement>('#catalog-search')?.value??'';styleRows(filterAndSortCards(catalog.cards,{...filters,query}).map(c=>c.id));const count=document.querySelector<HTMLElement>('[data-bulk-count]');if(count)count.textContent=`${selected.size} ausgewählt`;}

async function injectCatalogToolbar():Promise<void>{
  const initialList=document.querySelector<HTMLElement>('.card-list');
  if(!initialList||document.querySelector('[data-full-editor-toolbar]')||toolbarInjecting)return;
  toolbarInjecting=true;
  try{
    const {catalog}=await context();
    const list=document.querySelector<HTMLElement>('.card-list');
    // The view may have changed while IndexedDB was loading. Also re-check the marker
    // after the await so concurrent MutationObserver passes cannot inject duplicates.
    if(!list||list!==initialList||document.querySelector('[data-full-editor-toolbar]'))return;
    const topics=Array.from(new Set(catalog.cards.map(c=>c.topicId))).sort();const bar=document.createElement('section');bar.dataset.fullEditorToolbar='';bar.className='editor-toolbar panel';
    bar.innerHTML=`<div class="form-grid"><label>Status<select data-filter-status><option value="all">Alle</option>${['draft','in_review','changes_requested','approved','released','retired'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select></label><label>Fragetyp<select data-filter-type><option value="all">Alle</option>${['free_text','numeric','single_choice','multiple_choice','cloze','matching','ordering','image_labels','drawing','case_study'].map(t=>`<option value="${t}">${t}</option>`).join('')}</select></label><label>Thema<select data-filter-topic><option value="all">Alle</option>${topics.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></label><label>Sortierung<select data-filter-sort><option value="id">ID</option><option value="topic">Thema</option><option value="status">Status</option><option value="updated-desc">Zuletzt geändert</option><option value="updated-asc">Älteste Änderung</option></select></label></div><div class="bulk-toolbar"><button type="button" data-bulk-toggle>Mehrfachauswahl</button><strong data-bulk-count>0 ausgewählt</strong><select data-bulk-status><option value="">Status unverändert</option>${['draft','in_review','changes_requested','approved','released','retired'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select><input data-bulk-topic placeholder="Thema setzen (optional)"><input data-bulk-tag placeholder="Tag ergänzen (optional)"><button type="button" class="primary" data-bulk-apply>Auf Auswahl anwenden</button></div>`;
    list.insertAdjacentElement('beforebegin',bar);bar.querySelector<HTMLSelectElement>('[data-filter-status]')!.value=filters.status??'all';bar.querySelector<HTMLSelectElement>('[data-filter-type]')!.value=filters.questionType??'all';bar.querySelector<HTMLSelectElement>('[data-filter-topic]')!.value=filters.topic??'all';bar.querySelector<HTMLSelectElement>('[data-filter-sort]')!.value=filters.sort??'id';
    bar.querySelector<HTMLSelectElement>('[data-filter-status]')!.onchange=e=>{filters.status=(e.target as HTMLSelectElement).value as CardListFilters['status'];void applyListFilters();};bar.querySelector<HTMLSelectElement>('[data-filter-type]')!.onchange=e=>{filters.questionType=(e.target as HTMLSelectElement).value as QuestionType|'all';void applyListFilters();};bar.querySelector<HTMLSelectElement>('[data-filter-topic]')!.onchange=e=>{filters.topic=(e.target as HTMLSelectElement).value;void applyListFilters();};bar.querySelector<HTMLSelectElement>('[data-filter-sort]')!.onchange=e=>{filters.sort=(e.target as HTMLSelectElement).value as CardListFilters['sort'];void applyListFilters();};
    bar.querySelector<HTMLElement>('[data-bulk-toggle]')!.onclick=()=>{bulkMode=!bulkMode;if(!bulkMode)selected.clear();bar.classList.toggle('bulk-active',bulkMode);void applyListFilters();};
    bar.querySelector<HTMLElement>('[data-bulk-apply]')!.onclick=async()=>{if(!selected.size)return alert('Keine Karten ausgewählt.');const {state,catalog}=await context();const status=bar.querySelector<HTMLSelectElement>('[data-bulk-status]')!.value as CardStatus|'';const topic=bar.querySelector<HTMLInputElement>('[data-bulk-topic]')!.value;const tag=bar.querySelector<HTMLInputElement>('[data-bulk-tag]')!.value.trim();const next=applyBulkEdit(catalog,selected,{status:status||undefined,topicId:topic||undefined,addTag:tag||undefined});state.catalogs=(state.catalogs??[]).map(c=>c.catalogId===catalog.catalogId?next:c);await saveState(state);selected.clear();location.reload();};
    document.querySelector<HTMLInputElement>('#catalog-search')?.addEventListener('input',()=>queueMicrotask(()=>void applyListFilters()));await applyListFilters();
  }finally{toolbarInjecting=false;}
}

async function injectAdvancedEditor():Promise<void>{
  const initialForm=document.querySelector<HTMLFormElement>('#card-form');
  if(!initialForm||initialForm.querySelector('[data-advanced-editor]')||advancedEditorInjecting)return;
  advancedEditorInjecting=true;
  try{
    const id=String(new FormData(initialForm).get('id')??'');const {catalog}=await context();
    const form=document.querySelector<HTMLFormElement>('#card-form');
    if(!form||form!==initialForm||form.querySelector('[data-advanced-editor]'))return;
    const card=catalog.cards.find(c=>c.id===id) as EditorCard|undefined;const block=document.createElement('section');block.dataset.advancedEditor='';block.className='advanced-editor';const sourceMeta=card?.sourceMeta;
    block.innerHTML=`<hr><span class="eyebrow">Antworttoleranz</span><label>Synonyme <textarea name="editorSynonyms" rows="4" placeholder="Begriff => Alias 1, Alias 2">${esc(formatSynonyms(card?.answer.synonyms))}</textarea></label><div class="form-grid"><label class="check-row"><input name="editorTypoEnabled" type="checkbox" ${card?.answer.typoTolerance?.enabled?'checked':''}> Tippfehler-Toleranz aktiv</label><label>Max. Edit-Distanz<input name="editorTypoDistance" type="number" min="0" max="5" value="${card?.answer.typoTolerance?.maxDistance??1}"></label></div><span class="eyebrow">Quellenmetadaten</span><div class="form-grid"><label>Quellentyp<select name="editorSourceKind"><option value="">–</option>${['script','book','standard','web','exam-memory','other'].map(kind=>`<option value="${kind}" ${sourceMeta?.kind===kind?'selected':''}>${kind}</option>`).join('')}</select></label><label>Titel / Referenz<input name="editorSourceTitle" value="${esc(sourceMeta?.title??'')}"></label><label>URL<input name="editorSourceUrl" type="url" value="${esc(sourceMeta?.url??'')}"></label><label>Abschnitt<input name="editorSourceSection" value="${esc(sourceMeta?.section??'')}"></label><label>Zugriff am<input name="editorSourceAccessedAt" type="date" value="${esc(sourceMeta?.accessedAt?.slice(0,10)??'')}"></label></div>`;
    form.querySelector('.editor-actions')?.insertAdjacentElement('beforebegin',block);const danger=form.querySelector<HTMLElement>('[data-delete-card]');if(danger){danger.textContent='Archivieren';danger.title='Die Karte wird auf retired gesetzt und bleibt in Historie/Backups erhalten.';}enhancePreview(form,card);
  }finally{advancedEditorInjecting=false;}
}

function previewCard(form:HTMLFormElement,existing?:EditorCard):EditorCard|undefined{try{return updateCardFromForm(existing,new FormData(form));}catch{return existing;}}
function enhancePreview(form:HTMLFormElement,existing?:EditorCard):void{const aside=document.querySelector<HTMLElement>('.preview');if(!aside||aside.querySelector('[data-production-preview]'))return;const holder=document.createElement('div');holder.dataset.productionPreview='';holder.innerHTML='<span class="eyebrow">Produktionsvorschau</span><article class="question-card" data-editor-preview><h2></h2><div class="answer-box"><span class="eyebrow">Musterlösung</span><p></p></div></article>';aside.prepend(holder);const update=()=>{const card=previewCard(form,existing);if(!card)return;const q=holder.querySelector<HTMLElement>('.question-card')!;q.dataset.structuredCardId=card.id;q.querySelector('h2')!.textContent=card.prompt||'Fragevorschau';q.querySelector('.answer-box p')!.textContent=card.answer.modelAnswer||'Noch keine Musterlösung';};form.addEventListener('input',update);form.addEventListener('change',update);update();}

async function saveEnhanced(form:HTMLFormElement):Promise<void>{
  const fd=new FormData(form);const originalId=String(fd.get('id')??'').trim();const {state,catalog}=await context();const existing=catalog.cards.find(c=>c.id===originalId) as EditorCard|undefined;const candidate=updateCardFromForm(existing,fd);if(!candidate.id||!candidate.prompt||!candidate.answer.modelAnswer)throw new Error('ID, Frage und Musterlösung sind erforderlich.');const next=structuredClone(catalog);
  if(existing?.status==='released'){candidate.id=`${existing.id}:draft:${crypto.randomUUID().slice(0,8)}`;candidate.version=existing.version+1;candidate.status='draft';candidate.parentId=existing.id;candidate.changeReason=candidate.changeReason||'Entwurf aus freigegebener Version';next.cards.push(candidate);}else{const index=next.cards.findIndex(c=>c.id===originalId);if(index>=0)next.cards[index]=candidate;else next.cards.push(candidate);}
  syncKnowledgeItem(next,candidate);next.updatedAt=new Date().toISOString();state.catalogs=(state.catalogs??[]).map(c=>c.catalogId===catalog.catalogId?next:c);await saveState(state);location.reload();
}

async function archiveCurrent(form:HTMLFormElement):Promise<void>{const id=String(new FormData(form).get('id')??'');const {state,catalog}=await context();const next=archiveCard(catalog,id);state.catalogs=(state.catalogs??[]).map(c=>c.catalogId===catalog.catalogId?next:c);await saveState(state);location.reload();}
function showJson(form:HTMLFormElement):void{const dialog=document.createElement('dialog');dialog.className='json-dialog';dialog.innerHTML='<form method="dialog"><div class="section-head"><h2>Karten-JSON</h2><button>Schließen</button></div><pre></pre></form>';const id=String(new FormData(form).get('id')??'');void context().then(({catalog})=>{const existing=catalog.cards.find(c=>c.id===id) as EditorCard|undefined;dialog.querySelector('pre')!.textContent=JSON.stringify(previewCard(form,existing),null,2);});document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();}

function captureClicks(event:Event):void{const target=event.target as Element|null;const row=target?.closest<HTMLElement>('[data-edit-card]');if(row&&bulkMode){event.preventDefault();event.stopImmediatePropagation();const id=row.dataset.editCard!;selected.has(id)?selected.delete(id):selected.add(id);void applyListFilters();return;}const form=document.querySelector<HTMLFormElement>('#card-form');if(!form)return;if(target?.closest('[data-save-card]')){event.preventDefault();event.stopImmediatePropagation();void saveEnhanced(form).catch(error=>alert(error instanceof Error?error.message:String(error)));return;}if(target?.closest('[data-delete-card]')){event.preventDefault();event.stopImmediatePropagation();if(confirm('Karte archivieren? Sie bleibt historisch erhalten.'))void archiveCurrent(form);return;}if(target?.closest('[data-json-card]')){event.preventDefault();event.stopImmediatePropagation();showJson(form);}}
function schedule():void{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;void injectCatalogToolbar().catch(()=>{});void injectAdvancedEditor().catch(()=>{});});}
export function installFullCardEditorFeature():void{document.addEventListener('click',captureClicks,true);schedule();const root=document.querySelector('#app');if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}}
