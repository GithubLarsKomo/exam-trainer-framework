import './recoverable-session.css';
import { builtinCatalog } from './builtin-v04';
import { loadState, saveState, type PersistedState } from './db';
import { applyReview } from './review-engine';
import { buildTodayPlan } from './today-plan';
import { calculateReadiness } from './exam-intelligence';
import { recordReadinessSnapshot } from './readiness-history';
import { legacyQuestionVariantId, type AppState, type CardVersion, type Catalog, type Outcome, type Progress, type QueueReasonCode } from './model';
import {
  ACTIVE_SESSION_KEY,
  accrueCurrentTime,
  calculateExamScore,
  createRecoverableSession,
  currentSessionCardId,
  examQuestionStatuses,
  gradeExamCard,
  gradeLearningCard,
  navigateExam,
  revealSessionCard,
  selectExamCardIds,
  setSessionResponse,
  sessionComplete,
  shuffleIds,
  skipLearningCard,
  type PersistedResponseState,
  type RecoverableSessionMode,
  type RecoverableSessionState,
} from './recoverable-session';

let observer: MutationObserver | undefined;
let scheduled = false;
let restoring = false;
let busy = false;
let resumeBannerInjecting = false;

const reasonLabels: Record<QueueReasonCode,string> = {
  CLASSIC_DUE:'klassisch fällig', FSRS_SHADOW_DUE:'FSRS-Shadow fällig (ohne Einfluss)', LOW_MASTERY:'niedrige Lernstufe',
  HIGH_EXAM_WEIGHT:'hohe Prüfungsgewichtung', COVERAGE_GAP:'noch nicht abgedeckt', EXAM_SOON:'Prüfung rückt näher',
  RECENT_FAILURE:'zuletzt unsicher oder falsch', NEW_CONTENT:'neuer Inhalt',
};
const questionLabels: Record<CardVersion['questionType'],string> = {
  free_text:'Freitext', numeric:'Zahl', single_choice:'Single Choice', multiple_choice:'Multiple Choice', cloze:'Lückentext',
  matching:'Zuordnung', ordering:'Reihenfolge', image_labels:'Bildbeschriftung', drawing:'Zeichnung', case_study:'Fallaufgabe',
};
const outcomeLabels: Record<Outcome,string> = {correct:'Gewusst',partial:'Unsicher',incorrect:'Nicht gewusst'};
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const fallbackState = (): PersistedState => ({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});

async function context(): Promise<{state:PersistedState & Partial<AppState>;catalog:Catalog}> {
  const state = await loadState(fallbackState()) as PersistedState & Partial<AppState>;
  state.sessions ??= {};
  state.reviewEvents ??= [];
  state.fsrsShadow ??= {};
  state.readinessSnapshots ??= [];
  if (!Array.isArray(state.catalogs) || !state.catalogs.length) {
    state.catalogs = [structuredClone(builtinCatalog)];
    state.activeCatalogId = builtinCatalog.catalogId;
  }
  const catalog = state.catalogs.find(entry=>entry.catalogId===state.activeCatalogId) ?? state.catalogs[0];
  return {state,catalog};
}

function activeSession(state: PersistedState & Partial<AppState>): RecoverableSessionState | undefined {
  const candidate = state.sessions?.[ACTIVE_SESSION_KEY] as RecoverableSessionState | undefined;
  if (!candidate || candidate.version!==1 || !Array.isArray(candidate.itemIds) || !candidate.itemIds.length) return undefined;
  return candidate;
}

function putSession(state: PersistedState & Partial<AppState>, session?: RecoverableSessionState): void {
  state.sessions ??= {};
  if (session) state.sessions[ACTIVE_SESSION_KEY] = session;
  else delete state.sessions[ACTIVE_SESSION_KEY];
}

function releasedCards(catalog: Catalog): CardVersion[] { return catalog.cards.filter(card=>card.status==='released'); }
function cardProgress(state: PersistedState & Partial<AppState>, card: CardVersion): Progress {
  return state.progress?.[card.id] ?? {stage:1,dueAt:new Date(0).toISOString(),correct:0,partial:0,incorrect:0,skipped:0,marked:false,cardVersion:card.version};
}
function isDue(progress: Progress): boolean { return new Date(progress.dueAt).getTime() <= Date.now(); }
function sessionCard(catalog: Catalog, session: RecoverableSessionState): CardVersion | undefined {
  const id=currentSessionCardId(session); return id ? catalog.cards.find(card=>card.id===id) : undefined;
}

async function persist(state: PersistedState & Partial<AppState>): Promise<void> { await saveState(state as PersistedState); }

function queueReasonsObject(items: Array<{cardId:string;reasons:QueueReasonCode[]}>): Record<string,QueueReasonCode[]> {
  return Object.fromEntries(items.map(item=>[item.cardId,item.reasons]));
}

async function startToday(): Promise<void> {
  const {state,catalog}=await context();
  const cards=releasedCards(catalog);
  if(!cards.length) return;
  const input={catalogId:catalog.catalogId,cards,progress:state.progress??{},reviewEvents:state.reviewEvents??[],fsrsShadow:state.fsrsShadow??{},blueprint:catalog.examBlueprint,now:new Date()};
  let plan;
  try { plan=buildTodayPlan(input); } catch { plan=buildTodayPlan({...input,blueprint:undefined}); }
  if(!plan.items.length) return alert('Für heute sind keine Aufgaben geplant.');
  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'learning',mode:'today',itemIds:plan.items.map(item=>item.cardId),queueReasons:queueReasonsObject(plan.items)});
  putSession(state,session); await persist(state); renderSession(session,state,catalog);
}

async function startCustom(): Promise<void> {
  const {state,catalog}=await context();
  const mode=(document.querySelector<HTMLSelectElement>('#mode')?.value ?? 'due') as RecoverableSessionMode;
  const topic=document.querySelector<HTMLSelectElement>('#topic')?.value ?? 'all';
  const cards=releasedCards(catalog).filter(card=>topic==='all'||card.topicId===topic);
  let selected = mode==='new' ? cards.filter(card=>!state.progress?.[card.id])
    : mode==='errors' ? cards.filter(card=>(cardProgress(state,card).incorrect??0)>0)
    : mode==='all' ? [...cards]
    : cards.filter(card=>isDue(cardProgress(state,card)));
  if(!selected.length) selected=cards.slice(0,10);
  const ids=shuffleIds(selected.map(card=>card.id));
  if(!ids.length) return alert('Für diese Auswahl sind keine Karten verfügbar.');
  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'learning',mode,itemIds:ids});
  putSession(state,session); await persist(state); renderSession(session,state,catalog);
}

async function startExam(): Promise<void> {
  const {state,catalog}=await context();
  const cards=releasedCards(catalog);
  const mode=(document.querySelector<HTMLSelectElement>('#exam-mode')?.value==='fixed'?'fixed':'dynamic') as 'fixed'|'dynamic';
  const ids=selectExamCardIds(cards,catalog.examBlueprint,mode);
  if(!ids.length) return alert('Es sind keine freigegebenen Prüfungsfragen verfügbar.');
  const session=createRecoverableSession({catalogId:catalog.catalogId,kind:'exam',mode,itemIds:ids});
  putSession(state,session); await persist(state); renderSession(session,state,catalog);
}

function responseForCard(session: RecoverableSessionState, cardId: string): PersistedResponseState {
  return session.responses[cardId] ?? {};
}

function captureVisibleResponse(session: RecoverableSessionState, cardId: string): PersistedResponseState {
  const previous=responseForCard(session,cardId);
  const response:PersistedResponseState={...previous};
  const textarea=document.querySelector<HTMLTextAreaElement>('.question-card textarea#answer');
  if(textarea && textarea.style.display!=='none') response.text=textarea.value;
  const choices=Array.from(document.querySelectorAll<HTMLInputElement>('.etf-structured-question input[name="structured-choice"]:checked')).map(input=>input.value);
  if(document.querySelector('.etf-structured-question input[name="structured-choice"]')) response.choices=choices;
  const cloze=Array.from(document.querySelectorAll<HTMLInputElement>('[data-cloze-answer]'));
  if(cloze.length) response.cloze=Object.fromEntries(cloze.map(input=>[input.dataset.clozeAnswer??'',input.value]));
  const matching=Array.from(document.querySelectorAll<HTMLSelectElement>('[data-match-answer]'));
  if(matching.length) response.matching=Object.fromEntries(matching.map(input=>[input.dataset.matchAnswer??'',input.value]));
  const caseStudy=Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-case-answer]'));
  if(caseStudy.length) response.caseStudy=Object.fromEntries(caseStudy.map(input=>[input.dataset.caseAnswer??'',input.value]));
  const imageLabels=Array.from(document.querySelectorAll<HTMLInputElement>('[data-image-label-answer]'));
  if(imageLabels.length) response.imageLabels=Object.fromEntries(imageLabels.map(input=>[input.dataset.imageLabelAnswer??'',input.value]));
  const ordering=Array.from(document.querySelectorAll<HTMLElement>('.etf-structured-question ol li span')).map(span=>span.textContent?.trim()??'');
  if(ordering.length) response.orderingText=ordering;
  return response;
}

async function saveVisibleResponse(): Promise<void> {
  if(restoring || !document.querySelector('[data-recoverable-session]')) return;
  const {state,catalog}=await context();
  const session=activeSession(state); if(!session||session.catalogId!==catalog.catalogId) return;
  const cardId=currentSessionCardId(session); if(!cardId) return;
  setSessionResponse(session,cardId,captureVisibleResponse(session,cardId));
  putSession(state,session); await persist(state);
}

function dispatchInput(element: HTMLElement, type: 'input'|'change'): void { element.dispatchEvent(new Event(type,{bubbles:true})); }
const tick=(ms=0)=>new Promise(resolve=>setTimeout(resolve,ms));

async function restoreOrdering(target: string[]): Promise<void> {
  if(!target.length) return;
  for(let i=0;i<target.length;i++) {
    let guard=0;
    while(guard++<target.length*2) {
      const rows=Array.from(document.querySelectorAll<HTMLElement>('.etf-structured-question ol li'));
      const current=rows.map(row=>row.querySelector('span')?.textContent?.trim()??'');
      const at=current.indexOf(target[i]);
      if(at<0||at===i) break;
      if(at>i) {
        const button=rows[at]?.querySelector<HTMLElement>(`[data-order-up="${at}"]`);
        if(!button) break;
        button.click(); await tick(12);
      } else {
        const button=rows[at]?.querySelector<HTMLElement>(`[data-order-down="${at}"]`);
        if(!button) break;
        button.click(); await tick(12);
      }
    }
  }
}

async function restoreVisibleResponse(): Promise<void> {
  if(!document.querySelector('[data-recoverable-session]')) return;
  const {state,catalog}=await context();
  const session=activeSession(state); if(!session||session.catalogId!==catalog.catalogId) return;
  const cardId=currentSessionCardId(session); if(!cardId) return;
  const response=responseForCard(session,cardId);
  restoring=true;
  try {
    const textarea=document.querySelector<HTMLTextAreaElement>('.question-card textarea#answer');
    if(textarea && textarea.style.display!=='none' && response.text!==undefined && !textarea.value) textarea.value=response.text;
    if(response.choices) Array.from(document.querySelectorAll<HTMLInputElement>('.etf-structured-question input[name="structured-choice"]')).forEach(input=>{const checked=response.choices!.includes(input.value);if(input.checked!==checked){input.checked=checked;dispatchInput(input,'change');}});
    if(response.cloze) Array.from(document.querySelectorAll<HTMLInputElement>('[data-cloze-answer]')).forEach(input=>{const value=response.cloze?.[input.dataset.clozeAnswer??''];if(value!==undefined&&input.value!==value){input.value=value;dispatchInput(input,'input');}});
    if(response.matching) Array.from(document.querySelectorAll<HTMLSelectElement>('[data-match-answer]')).forEach(input=>{const value=response.matching?.[input.dataset.matchAnswer??''];if(value!==undefined&&input.value!==value){input.value=value;dispatchInput(input,'change');}});
    if(response.caseStudy) Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-case-answer]')).forEach(input=>{const value=response.caseStudy?.[input.dataset.caseAnswer??''];if(value!==undefined&&input.value!==value){input.value=value;dispatchInput(input,'input');}});
    if(response.imageLabels) Array.from(document.querySelectorAll<HTMLInputElement>('[data-image-label-answer]')).forEach(input=>{const value=response.imageLabels?.[input.dataset.imageLabelAnswer??''];if(value!==undefined&&input.value!==value){input.value=value;dispatchInput(input,'input');}});
    if(response.orderingText?.length) await restoreOrdering(response.orderingText);
  } finally { restoring=false; }
}

function examNavigation(session: RecoverableSessionState): string {
  const statuses=examQuestionStatuses(session);
  const buttons=statuses.map(status=>{
    const cls=status.current?'current':status.outcome?`graded ${status.outcome}`:status.revealed?'revealed':'unanswered';
    const label=status.outcome?`${status.index+1}: ${outcomeLabels[status.outcome]}`:`Frage ${status.index+1}`;
    return `<button type="button" class="exam-nav-item ${cls}" data-recoverable-exam-nav="${status.index}" aria-label="${esc(label)}">${status.index+1}</button>`;
  }).join('');
  const graded=Object.keys(session.outcomes).length;
  return `<section class="exam-overview"><div class="section-head"><div><span class="eyebrow">Prüfungsübersicht</span><h3>${graded} von ${session.itemIds.length} bewertet</h3></div><button type="button" data-recoverable-submit ${graded===session.itemIds.length?'':'disabled'}>Prüfung abgeben</button></div><div class="exam-nav-grid">${buttons}</div></section>`;
}

function sessionShell(content:string,catalog:Catalog,session:RecoverableSessionState): string {
  return `<div class="app-shell" data-recoverable-session="${esc(session.id)}"><header class="app-header"><div><div class="eyebrow">${session.kind==='exam'?'Prüfung':'Lernsitzung'} · wiederaufnehmbar</div><h1>${esc(catalog.title)}</h1></div><button type="button" data-recoverable-pause>Sitzung pausieren</button></header><main>${content}</main></div>`;
}

function renderSession(session:RecoverableSessionState,state:PersistedState & Partial<AppState>,catalog:Catalog): void {
  const root=document.querySelector<HTMLElement>('#app'); if(!root) return;
  if(session.catalogId!==catalog.catalogId){root.innerHTML=sessionShell('<section class="panel"><h2>Katalog nicht aktiv</h2><p>Aktiviere den ursprünglichen Katalog oder verwirf die Sitzung.</p><button data-recoverable-discard>Gespeicherte Sitzung verwerfen</button></section>',catalog,session);return;}
  const card=sessionCard(catalog,session);
  if(!card){
    if(session.kind==='learning' && sessionComplete(session)){void finishLearning(state,session,catalog);return;}
    root.innerHTML=sessionShell('<section class="panel"><h2>Frage nicht mehr vorhanden</h2><p>Die gespeicherte Sitzung verweist auf eine gelöschte Karte.</p><button data-recoverable-discard>Sitzung verwerfen</button></section>',catalog,session);return;
  }
  const revealed=Boolean(session.revealed[card.id]);
  const reasons=session.queueReasons?.[card.id]??[];
  const own=responseForCard(session,card.id).text?.trim();
  const position=session.currentIndex+1;
  const total=session.itemIds.length;
  const why=reasons.length?`<details><summary>Warum diese Frage?</summary><p>${reasons.map(reason=>esc(reasonLabels[reason])).join(' · ')}</p></details>`:'';
  const answerCopy=revealed&&own?`<div class="user-answer-copy" data-user-answer-copy><span class="eyebrow">Deine Antwort</span><p>${esc(own)}</p></div>`:'';
  const gradeButtons=revealed?`<div class="grade-grid"><button class="danger" data-recoverable-grade="incorrect">Nicht gewusst</button><button data-recoverable-grade="partial">Unsicher</button><button class="primary" data-recoverable-grade="correct">Gewusst</button></div>`:'';
  const examControls=session.kind==='exam'?`<div class="question-actions"><button type="button" data-recoverable-prev ${session.currentIndex===0?'disabled':''}>← Vorherige</button><button type="button" data-recoverable-next ${session.currentIndex===session.itemIds.length-1?'disabled':''}>Nächste →</button></div>`:'';
  const learningControls=!revealed&&session.kind==='learning'?'<div class="question-actions"><button data-recoverable-skip>Später</button><button class="primary" data-recoverable-reveal>Lösung zeigen</button></div>':'';
  const examReveal=!revealed&&session.kind==='exam'?'<div class="question-actions"><button class="primary" data-recoverable-reveal>Lösung zeigen</button></div>':'';
  const promptInput=card.questionType==='drawing'?'<div class="drawing-hint">Zeichnung auf Papier oder in einer Zeichen-App anfertigen.</div>':`<textarea id="answer" rows="7" placeholder="Deine Antwort …">${esc(responseForCard(session,card.id).text??'')}</textarea>`;
  const answerBox=revealed?`${answerCopy}<div class="answer-box"><span class="eyebrow">Musterlösung</span><p>${esc(card.answer.modelAnswer)}</p></div>${gradeButtons}`:'';
  const overview=session.kind==='exam'?examNavigation(session):'';
  root.innerHTML=sessionShell(`${overview}<section class="session"><div class="session-top"><span>${position} von ${total}</span><span>${esc(card.topicId)} · ${card.points} P</span></div><div class="bar"><i style="width:${Math.round(position/total*100)}%"></i></div><article class="question-card" data-structured-card-id="${esc(card.id)}"><span class="eyebrow">${esc(questionLabels[card.questionType])}</span><h2>${esc(card.prompt)}</h2>${why}${promptInput}${answerBox}${learningControls}${examReveal}${examControls}</article></section>`,catalog,session);
  scheduleRestore();
}

async function finishLearning(state:PersistedState & Partial<AppState>,session:RecoverableSessionState,catalog:Catalog): Promise<void> {
  putSession(state,undefined); await persist(state);
  const root=document.querySelector<HTMLElement>('#app'); if(!root)return;
  root.innerHTML=`<div class="app-shell"><main><section class="panel centered"><div class="success">✓</div><h2>Sitzung abgeschlossen</h2><p>${session.completedCount} Aufgaben wurden bearbeitet und lokal gespeichert.</p><button class="primary" data-recoverable-home>Zur Startseite</button></section></main></div>`;
}

function recordReadiness(state:PersistedState & Partial<AppState>,catalog:Catalog,at:Date): void {
  const cards=releasedCards(catalog); if(!cards.length)return;
  try { recordReadinessSnapshot(state as AppState,calculateReadiness({catalogId:catalog.catalogId,cards,progress:state.progress??{},blueprint:catalog.examBlueprint,calculatedAt:at})); }
  catch { recordReadinessSnapshot(state as AppState,calculateReadiness({catalogId:catalog.catalogId,cards,progress:state.progress??{},calculatedAt:at})); }
}

async function revealCurrent(): Promise<void> {
  await saveVisibleResponse();
  const {state,catalog}=await context(); const session=activeSession(state); if(!session)return;
  const cardId=currentSessionCardId(session); if(!cardId)return;
  revealSessionCard(session,cardId); putSession(state,session); await persist(state); renderSession(session,state,catalog);
}

async function gradeCurrent(outcome:Outcome): Promise<void> {
  await saveVisibleResponse();
  const {state,catalog}=await context(); const session=activeSession(state); if(!session)return;
  const card=sessionCard(catalog,session); if(!card)return;
  if(session.kind==='exam') {
    gradeExamCard(session,outcome); putSession(state,session); await persist(state); renderSession(session,state,catalog); return;
  }
  const elapsed=(session.timeSpentMs[card.id]??0)+Math.max(0,Date.now()-session.currentStartedAtMs);
  const at=new Date();
  applyReview(state as AppState,{knowledgeItemId:card.id,questionVariantId:legacyQuestionVariantId(card.id),cardVersion:card.version},outcome,'learning',at,elapsed,{fsrsShadowEnabled:true});
  gradeLearningCard(session,outcome,at.getTime()); recordReadiness(state,catalog,at); putSession(state,session); await persist(state);
  if(sessionComplete(session)) await finishLearning(state,session,catalog); else renderSession(session,state,catalog);
}

async function skipCurrent(): Promise<void> {
  await saveVisibleResponse(); const {state,catalog}=await context(); const session=activeSession(state); if(!session||session.kind!=='learning')return;
  const card=sessionCard(catalog,session); if(!card)return;
  const p=cardProgress(state,card);p.skipped++;state.progress??={};state.progress[card.id]=p;
  skipLearningCard(session);putSession(state,session);await persist(state);renderSession(session,state,catalog);
}

async function navigateCurrentExam(index:number): Promise<void> {
  await saveVisibleResponse();const {state,catalog}=await context();const session=activeSession(state);if(!session||session.kind!=='exam')return;
  navigateExam(session,index);putSession(state,session);await persist(state);renderSession(session,state,catalog);
}

async function submitExam(): Promise<void> {
  await saveVisibleResponse();const {state,catalog}=await context();const session=activeSession(state);if(!session||session.kind!=='exam')return;
  accrueCurrentTime(session);
  if(!sessionComplete(session))return alert(`Noch ${session.itemIds.length-Object.keys(session.outcomes).length} Fragen ohne Bewertung.`);
  const cards=session.itemIds.map(id=>catalog.cards.find(card=>card.id===id)).filter((card):card is CardVersion=>Boolean(card));
  const submittedAt=new Date();
  for(const card of cards){const outcome=session.outcomes[card.id];if(!outcome)continue;applyReview(state as AppState,{knowledgeItemId:card.id,questionVariantId:legacyQuestionVariantId(card.id),cardVersion:card.version},outcome,'exam',submittedAt,session.timeSpentMs[card.id]??0,{fsrsShadowEnabled:true});}
  const score=calculateExamScore(cards,session.outcomes);
  state.examAttempts??=[];state.examAttempts.push({id:`exam-${crypto.randomUUID()}`,at:submittedAt.toISOString(),...score});
  recordReadiness(state,catalog,submittedAt);putSession(state,undefined);await persist(state);
  const threshold=catalog.examBlueprint?.passThreshold;const passed=threshold===undefined?undefined:score.percentage>=threshold*100;
  const rows=cards.map((card,index)=>`<tr><td>${index+1}</td><td>${esc(card.topicId)}</td><td>${esc(outcomeLabels[session.outcomes[card.id]])}</td><td>${card.points}</td></tr>`).join('');
  const root=document.querySelector<HTMLElement>('#app');if(!root)return;
  root.innerHTML=`<div class="app-shell"><main><section class="panel centered"><div class="success">✓</div><h2>Prüfung abgegeben</h2><div class="result-card"><span>Ergebnis</span><strong>${score.points} / ${score.maxPoints}</strong><small>${score.percentage}%${passed===undefined?'':passed?' · bestanden':' · nicht bestanden'}</small></div><div class="table-scroll"><table><thead><tr><th>#</th><th>Thema</th><th>Bewertung</th><th>Punkte max.</th></tr></thead><tbody>${rows}</tbody></table></div><button class="primary" data-recoverable-home>Zur Startseite</button></section></main></div>`;
}

async function pauseSession(): Promise<void> {
  await saveVisibleResponse();const {state}=await context();const session=activeSession(state);if(session){accrueCurrentTime(session);putSession(state,session);await persist(state);}location.reload();
}

async function resumeSession(): Promise<void> {
  const {state,catalog}=await context();const session=activeSession(state);if(!session)return;session.currentStartedAtMs=Date.now();putSession(state,session);await persist(state);renderSession(session,state,catalog);
}

async function discardSession(): Promise<void> {
  const {state}=await context();putSession(state,undefined);await persist(state);location.reload();
}

async function injectResumeBanner(): Promise<void> {
  if(document.querySelector('[data-recoverable-session]')||document.querySelector('[data-recoverable-resume-banner]')||resumeBannerInjecting)return;
  resumeBannerInjecting=true;
  try {
    const {state,catalog}=await context();
    const session=activeSession(state);if(!session)return;
    if(document.querySelector('[data-recoverable-session]')||document.querySelector('[data-recoverable-resume-banner]'))return;
    const main=document.querySelector<HTMLElement>('.app-shell main');if(!main)return;
    const valid=session.catalogId===catalog.catalogId;
    const graded=Object.keys(session.outcomes).length;
    const panel=document.createElement('section');panel.className='panel recoverable-resume-banner';panel.dataset.recoverableResumeBanner='';
    panel.innerHTML=`<div><span class="eyebrow">Unterbrochene ${session.kind==='exam'?'Prüfung':'Lernsitzung'}</span><h2>${valid?'Exakt fortsetzen':'Ursprünglicher Katalog ist nicht aktiv'}</h2><p>${session.kind==='exam'?`${graded} von ${session.itemIds.length} Fragen bewertet`:`${session.completedCount} von ${session.itemIds.length} Aufgaben abgeschlossen`} · zuletzt gespeichert ${esc(new Date(session.updatedAt).toLocaleString('de-DE'))}</p></div><div class="question-actions">${valid?'<button class="primary" data-recoverable-resume>Fortsetzen</button>':''}<button data-recoverable-discard>Verwerfen</button></div>`;
    main.insertAdjacentElement('afterbegin',panel);
  } finally {
    resumeBannerInjecting=false;
  }
}

function scheduleRestore(): void {
  setTimeout(()=>void restoreVisibleResponse().catch(()=>{}),0);
}

function schedule(): void {
  if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;void injectResumeBanner().catch(()=>{});if(document.querySelector('[data-recoverable-session]'))scheduleRestore();});
}

function intercept(event: Event): Element | undefined {
  const target=event.target as Element|null;
  return target?.closest('[data-start-today],[data-start-custom],[data-exam],[data-recoverable-resume],[data-recoverable-discard],[data-recoverable-pause],[data-recoverable-reveal],[data-recoverable-grade],[data-recoverable-skip],[data-recoverable-exam-nav],[data-recoverable-prev],[data-recoverable-next],[data-recoverable-submit],[data-recoverable-home]') ?? undefined;
}

function run(action:()=>Promise<void>): void { if(busy)return;busy=true;void action().catch(error=>alert(String(error))).finally(()=>{busy=false;}); }

function handleClick(event: MouseEvent): void {
  const control=intercept(event);if(!control)return;
  const customActive=Boolean(document.querySelector('[data-recoverable-session]'));
  const coreStart=control.matches('[data-start-today],[data-start-custom],[data-exam]');
  if(!customActive&&!coreStart&&!control.matches('[data-recoverable-resume],[data-recoverable-discard]'))return;
  event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
  if(control.matches('[data-start-today]'))return run(startToday);
  if(control.matches('[data-start-custom]'))return run(startCustom);
  if(control.matches('[data-exam]'))return run(startExam);
  if(control.matches('[data-recoverable-resume]'))return run(resumeSession);
  if(control.matches('[data-recoverable-discard]'))return run(discardSession);
  if(control.matches('[data-recoverable-pause]'))return run(pauseSession);
  if(control.matches('[data-recoverable-reveal]'))return run(revealCurrent);
  if(control.matches('[data-recoverable-grade]'))return run(()=>gradeCurrent((control as HTMLElement).dataset.recoverableGrade as Outcome));
  if(control.matches('[data-recoverable-skip]'))return run(skipCurrent);
  if(control.matches('[data-recoverable-exam-nav]'))return run(()=>navigateCurrentExam(Number((control as HTMLElement).dataset.recoverableExamNav)));
  if(control.matches('[data-recoverable-prev]'))return run(async()=>{const {state}=await context();const session=activeSession(state);if(session)await navigateCurrentExam(Math.max(0,session.currentIndex-1));});
  if(control.matches('[data-recoverable-next]'))return run(async()=>{const {state}=await context();const session=activeSession(state);if(session)await navigateCurrentExam(Math.min(session.itemIds.length-1,session.currentIndex+1));});
  if(control.matches('[data-recoverable-submit]'))return run(submitExam);
  if(control.matches('[data-recoverable-home]'))location.reload();
}

function handleResponseEvent(event: Event): void {
  if(restoring||!document.querySelector('[data-recoverable-session]'))return;
  const target=event.target as Element|null;
  if(!target?.closest('.question-card'))return;
  setTimeout(()=>void saveVisibleResponse().catch(()=>{}),0);
}

export function installRecoverableSessionFeature(): void {
  document.addEventListener('click',handleClick,true);
  document.addEventListener('input',handleResponseEvent,true);
  document.addEventListener('change',handleResponseEvent,true);
  window.addEventListener('pagehide',()=>{if(document.querySelector('[data-recoverable-session]'))void saveVisibleResponse().catch(()=>{});});
  const root=document.querySelector('#app');if(root){observer?.disconnect();observer=new MutationObserver(()=>schedule());observer.observe(root,{childList:true,subtree:true});}
  schedule();
}