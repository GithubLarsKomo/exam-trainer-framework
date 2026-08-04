import { builtinCatalog } from './builtin-v04';
import { loadState, saveState, type PersistedState } from './db';
import {
  compareClozeAnswer,
  configureStructuredQuestion,
  shuffledIds,
  structuredSource,
  type StructuredQuestionType,
} from './structured-question-types';
import type { CardVersion, Catalog } from './model';

let observer: MutationObserver | undefined;
let scheduled = false;
let sessionSignature = '';
let authoringCardId: string | undefined;

type SessionAnswer = {
  single?: string;
  multiple?: string[];
  cloze?: Record<string,string>;
  matching?: Record<string,string>;
  ordering?: string[];
  caseStudy?: Record<string,string>;
};
const answers = new Map<string,SessionAnswer>();

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]!));
const fallbackState = (): PersistedState => ({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const structuredTypes: StructuredQuestionType[] = ['single_choice','multiple_choice','cloze','matching','ordering','case_study'];
const labels: Record<StructuredQuestionType,string> = {
  single_choice:'Single Choice', multiple_choice:'Multiple Choice', cloze:'Lückentext', matching:'Zuordnung', ordering:'Reihenfolge', case_study:'Fallaufgabe',
};

async function activeContext(): Promise<{state:PersistedState;catalog:Catalog}> {
  const state = await loadState(fallbackState());
  if (!Array.isArray(state.catalogs) || !state.catalogs.length) {
    state.catalogs = [structuredClone(builtinCatalog)];
    state.activeCatalogId = builtinCatalog.catalogId;
  }
  const catalog = state.catalogs.find(entry => entry.catalogId === state.activeCatalogId) ?? state.catalogs[0];
  return {state,catalog};
}

function app(): HTMLElement | undefined { return document.querySelector<HTMLElement>('#app') ?? undefined; }

function visibleCard(catalog: Catalog): CardVersion | undefined {
  const cached = document.querySelector<HTMLElement>('.question-card')?.dataset.structuredCardId;
  if (cached) return catalog.cards.find(card => card.id === cached);
  const prompt = document.querySelector<HTMLElement>('.question-card h2')?.textContent?.trim();
  if (!prompt) return undefined;
  const candidates = catalog.cards.filter(card => card.prompt.trim() === prompt);
  if (candidates.length === 1) return candidates[0];
  const topicLine = document.querySelector<HTMLElement>('.session-top span:nth-child(2)')?.textContent?.trim() ?? '';
  const topicMatches = candidates.filter(card => topicLine.startsWith(`${card.topicId} ·`) || topicLine === card.topicId);
  return topicMatches.length === 1 ? topicMatches[0] : undefined;
}

function currentAnswer(cardId: string): SessionAnswer {
  const answer = answers.get(cardId) ?? {};
  answers.set(cardId, answer);
  return answer;
}

function hideDefaultTextarea(questionCard: HTMLElement): void {
  const textarea = questionCard.querySelector<HTMLTextAreaElement>('textarea#answer');
  if (textarea) textarea.style.display = 'none';
}

function cleanup(): void {
  document.querySelectorAll('.etf-structured-question').forEach(element => element.remove());
  const textarea = document.querySelector<HTMLTextAreaElement>('.question-card textarea#answer');
  if (textarea) textarea.style.display = '';
  sessionSignature = '';
}

function choiceBlock(card: CardVersion, revealed: boolean): string {
  const state = currentAnswer(card.id);
  const choices = card.answer.choices ?? [];
  if (!revealed) {
    const type = card.questionType === 'single_choice' ? 'radio' : 'checkbox';
    const selected = new Set(card.questionType === 'single_choice' ? (state.single ? [state.single] : []) : (state.multiple ?? []));
    return `<fieldset><legend>Antwort auswählen</legend>${choices.map(choice => `<label style="display:flex;gap:.65rem;align-items:flex-start;margin:.6rem 0"><input type="${type}" name="structured-choice" value="${esc(choice.id)}" ${selected.has(choice.id)?'checked':''}><span>${esc(choice.text)}</span></label>`).join('')}</fieldset>`;
  }
  const selected = new Set(card.questionType === 'single_choice' ? (state.single ? [state.single] : []) : (state.multiple ?? []));
  const correct = new Set(choices.filter(choice => choice.correct).map(choice => choice.id));
  const ok = selected.size === correct.size && Array.from(selected).every(value => correct.has(value));
  return `<div class="notice"><strong>${ok?'Auswahl entspricht der Musterlösung.':'Auswahl weicht von der Musterlösung ab.'}</strong></div><div class="table-scroll"><table><thead><tr><th>Option</th><th>Deine Wahl</th><th>Richtig</th></tr></thead><tbody>${choices.map(choice=>`<tr><td>${esc(choice.text)}</td><td>${selected.has(choice.id)?'✓':'–'}</td><td>${choice.correct?'✓':'–'}</td></tr>`).join('')}</tbody></table></div>`;
}

function clozeBlock(card: CardVersion, revealed: boolean): string {
  const blanks = card.answer.clozeBlanks ?? [];
  const state = currentAnswer(card.id);
  state.cloze ??= {};
  const tokens = new Map(blanks.map((blank,index)=>[blank.id,{blank,index}]));
  const parts = card.prompt.split(/(\[\[[A-Za-z0-9_-]+\]\])/g);
  const prompt = parts.map(part => {
    const match = /^\[\[([A-Za-z0-9_-]+)\]\]$/.exec(part);
    if (!match) return esc(part);
    const item = tokens.get(match[1]);
    if (!item) return esc(part);
    if (revealed) return `<strong style="padding:.15rem .35rem;border-bottom:2px solid currentColor">${esc(item.blank.answer)}</strong>`;
    return `<input data-cloze-answer="${esc(item.blank.id)}" value="${esc(state.cloze?.[item.blank.id]??'')}" aria-label="Lücke ${item.index+1}" style="display:inline-block;min-width:8rem;width:auto;margin:.2rem">`;
  }).join('');
  if (!revealed) return `<div style="font-size:1.1rem;line-height:2.2">${prompt}</div>`;
  return `<div style="font-size:1.1rem;line-height:2.2">${prompt}</div><div class="table-scroll"><table><thead><tr><th>Lücke</th><th>Deine Antwort</th><th>Muster</th><th></th></tr></thead><tbody>${blanks.map((blank,index)=>{const own=state.cloze?.[blank.id]??'';return `<tr><td>${index+1}</td><td>${esc(own||'–')}</td><td>${esc(blank.answer)}</td><td>${compareClozeAnswer(own,blank)?'✓':'–'}</td></tr>`}).join('')}</tbody></table></div>`;
}

function matchingBlock(card: CardVersion, revealed: boolean): string {
  const pairs = card.answer.matchingPairs ?? [];
  const state = currentAnswer(card.id);
  state.matching ??= {};
  const rightIds = shuffledIds(pairs.map(pair => pair.id), `${card.id}:matching`);
  const byId = new Map(pairs.map(pair => [pair.id,pair]));
  if (!revealed) return `<div class="form-grid">${pairs.map(pair=>`<label>${esc(pair.left)}<select data-match-answer="${esc(pair.id)}"><option value="">– auswählen –</option>${rightIds.map(id=>`<option value="${esc(id)}" ${state.matching?.[pair.id]===id?'selected':''}>${esc(byId.get(id)?.right??'')}</option>`).join('')}</select></label>`).join('')}</div>`;
  return `<div class="table-scroll"><table><thead><tr><th>Begriff</th><th>Deine Zuordnung</th><th>Muster</th></tr></thead><tbody>${pairs.map(pair=>{const selected=byId.get(state.matching?.[pair.id]??'')?.right??'–';return `<tr><td>${esc(pair.left)}</td><td>${esc(selected)}</td><td>${esc(pair.right)}</td></tr>`}).join('')}</tbody></table></div>`;
}

function orderingBlock(card: CardVersion, revealed: boolean): string {
  const items = card.answer.orderingItems ?? [];
  const state = currentAnswer(card.id);
  state.ordering ??= shuffledIds(items.map(item=>item.id), `${card.id}:ordering`);
  const byId = new Map(items.map(item=>[item.id,item]));
  if (!revealed) return `<ol style="padding-left:1.5rem">${state.ordering.map((itemId,index)=>`<li style="margin:.55rem 0"><span>${esc(byId.get(itemId)?.text??'')}</span> <button type="button" data-order-up="${index}" ${index===0?'disabled':''}>↑</button> <button type="button" data-order-down="${index}" ${index===state.ordering!.length-1?'disabled':''}>↓</button></li>`).join('')}</ol>`;
  const correct = items.map(item=>item.id);
  const ok = state.ordering.length===correct.length && state.ordering.every((value,index)=>value===correct[index]);
  return `<div class="notice"><strong>${ok?'Reihenfolge entspricht der Musterlösung.':'Reihenfolge weicht von der Musterlösung ab.'}</strong></div><div class="table-scroll"><table><thead><tr><th>#</th><th>Deine Reihenfolge</th><th>Muster</th></tr></thead><tbody>${items.map((item,index)=>`<tr><td>${index+1}</td><td>${esc(byId.get(state.ordering?.[index]??'')?.text??'–')}</td><td>${esc(item.text)}</td></tr>`).join('')}</tbody></table></div>`;
}

function caseStudyBlock(card: CardVersion, revealed: boolean): string {
  const parts = card.answer.caseStudyParts ?? [];
  const state = currentAnswer(card.id);
  state.caseStudy ??= {};
  if (!revealed) return `<div>${parts.map((part,index)=>`<section style="margin:1rem 0"><h3>${index+1}. ${esc(part.prompt)}</h3><textarea data-case-answer="${esc(part.id)}" rows="4" placeholder="Deine Antwort …">${esc(state.caseStudy?.[part.id]??'')}</textarea></section>`).join('')}</div>`;
  return `<div>${parts.map((part,index)=>`<section class="panel" style="margin:1rem 0"><h3>${index+1}. ${esc(part.prompt)}</h3><p><strong>Deine Antwort:</strong> ${esc(state.caseStudy?.[part.id]||'–')}</p><p><strong>Muster:</strong> ${esc(part.modelAnswer)}</p></section>`).join('')}</div>`;
}

function structuredHtml(card: CardVersion, revealed: boolean): string {
  switch (card.questionType) {
    case 'single_choice':
    case 'multiple_choice': return choiceBlock(card,revealed);
    case 'cloze': return clozeBlock(card,revealed);
    case 'matching': return matchingBlock(card,revealed);
    case 'ordering': return orderingBlock(card,revealed);
    case 'case_study': return caseStudyBlock(card,revealed);
    default: return '';
  }
}

function hasStructuredConfig(card: CardVersion): boolean {
  switch (card.questionType) {
    case 'single_choice':
    case 'multiple_choice': return (card.answer.choices?.length ?? 0) >= 2;
    case 'cloze': return Boolean(card.answer.clozeBlanks?.length);
    case 'matching': return (card.answer.matchingPairs?.length ?? 0) >= 2;
    case 'ordering': return (card.answer.orderingItems?.length ?? 0) >= 2;
    case 'case_study': return Boolean(card.answer.caseStudyParts?.length);
    default: return false;
  }
}

async function renderSession(): Promise<void> {
  if (authoringCardId) return;
  const questionCard = document.querySelector<HTMLElement>('.question-card');
  if (!questionCard) { if (sessionSignature) cleanup(); return; }
  const {catalog} = await activeContext();
  const card = visibleCard(catalog);
  if (!card || !structuredTypes.includes(card.questionType as StructuredQuestionType) || !hasStructuredConfig(card)) {
    if (sessionSignature) cleanup();
    return;
  }
  questionCard.dataset.structuredCardId = card.id;
  const revealed = Boolean(questionCard.querySelector('.answer-box'));
  const signature = `${catalog.catalogId}|${card.id}|${revealed}`;
  if (signature === sessionSignature && questionCard.querySelector('.etf-structured-question')) return;
  questionCard.querySelectorAll('.etf-structured-question').forEach(element=>element.remove());
  sessionSignature = signature;
  hideDefaultTextarea(questionCard);
  const block = document.createElement('div');
  block.className = 'etf-structured-question';
  block.style.margin = '1rem 0';
  block.innerHTML = structuredHtml(card,revealed);
  const heading = questionCard.querySelector('h2');
  heading?.insertAdjacentElement('afterend',block);
  bindSessionControls(card,block);
}

function bindSessionControls(card: CardVersion, block: HTMLElement): void {
  const state = currentAnswer(card.id);
  block.querySelectorAll<HTMLInputElement>('input[name="structured-choice"]').forEach(input=>input.addEventListener('change',()=>{
    if (card.questionType === 'single_choice') state.single = input.checked ? input.value : undefined;
    else state.multiple = Array.from(block.querySelectorAll<HTMLInputElement>('input[name="structured-choice"]:checked')).map(entry=>entry.value);
  }));
  block.querySelectorAll<HTMLInputElement>('[data-cloze-answer]').forEach(input=>input.addEventListener('input',()=>{(state.cloze??={})[input.dataset.clozeAnswer??'']=input.value;}));
  block.querySelectorAll<HTMLSelectElement>('[data-match-answer]').forEach(select=>select.addEventListener('change',()=>{(state.matching??={})[select.dataset.matchAnswer??'']=select.value;}));
  block.querySelectorAll<HTMLTextAreaElement>('[data-case-answer]').forEach(input=>input.addEventListener('input',()=>{(state.caseStudy??={})[input.dataset.caseAnswer??'']=input.value;}));
  block.querySelectorAll<HTMLElement>('[data-order-up],[data-order-down]').forEach(button=>button.addEventListener('click',()=>{
    const order = state.ordering;
    if (!order) return;
    const from = Number(button.dataset.orderUp ?? button.dataset.orderDown);
    const to = button.dataset.orderUp !== undefined ? from - 1 : from + 1;
    if (to < 0 || to >= order.length) return;
    [order[from],order[to]] = [order[to],order[from]];
    sessionSignature = '';
    void renderSession();
  }));
}

function instruction(type: StructuredQuestionType): string {
  switch (type) {
    case 'single_choice': return 'Eine Option pro Zeile; genau eine richtige Option mit * markieren.';
    case 'multiple_choice': return 'Eine Option pro Zeile; jede richtige Option mit * markieren.';
    case 'cloze': return 'Komplette Frage eingeben und jede Lücke als {{Antwort}} markieren. Anki-Syntax {{c1::Antwort}} wird ebenfalls akzeptiert.';
    case 'matching': return 'Ein Paar pro Zeile im Format Links => Rechts.';
    case 'ordering': return 'Ein Element pro Zeile in der korrekten Reihenfolge.';
    case 'case_study': return 'Eine Teilfrage pro Zeile im Format Teilfrage => Musterantwort. Der bestehende Karten-Prompt bleibt die Fallbeschreibung.';
  }
}

async function openAuthoring(cardId: string): Promise<void> {
  const {catalog} = await activeContext();
  const card = catalog.cards.find(entry=>entry.id===cardId);
  if (!card) throw new Error('Karte wurde nicht gefunden.');
  authoringCardId = cardId;
  const type = structuredTypes.includes(card.questionType as StructuredQuestionType) ? card.questionType as StructuredQuestionType : 'single_choice';
  renderAuthoring(catalog,card,type);
}

function renderAuthoring(catalog: Catalog, card: CardVersion, type: StructuredQuestionType): void {
  const root = app();
  if (!root) return;
  const source = type === card.questionType ? structuredSource(card) : '';
  root.innerHTML = `<div class="app-shell"><header class="app-header"><div><div class="eyebrow">Interaktive Fragetypen</div><h1>${esc(card.id)}</h1></div><button data-structured-cancel>← Zur App</button></header><main><section class="panel"><span class="eyebrow">${esc(catalog.title)}</span><h2>${esc(card.prompt)}</h2><label>Fragetyp<select id="structured-type">${structuredTypes.map(value=>`<option value="${value}" ${value===type?'selected':''}>${labels[value]}</option>`).join('')}</select></label><p class="muted" id="structured-help">${esc(instruction(type))}</p><label>Konfiguration<textarea id="structured-source" rows="12" spellcheck="false">${esc(source)}</textarea></label><div class="question-actions"><button class="primary" data-structured-save>Fragetyp speichern</button></div></section></main></div>`;
  document.querySelector<HTMLElement>('[data-structured-cancel]')?.addEventListener('click',()=>{authoringCardId=undefined;location.reload();});
  document.querySelector<HTMLSelectElement>('#structured-type')?.addEventListener('change',event=>{
    const next=(event.target as HTMLSelectElement).value as StructuredQuestionType;
    const help=document.querySelector<HTMLElement>('#structured-help');
    if(help) help.textContent=instruction(next);
    const textarea=document.querySelector<HTMLTextAreaElement>('#structured-source');
    if(textarea) textarea.value=next===card.questionType?structuredSource(card):'';
  });
  document.querySelector<HTMLElement>('[data-structured-save]')?.addEventListener('click',()=>void saveAuthoring().catch(error=>alert(String(error))));
}

async function saveAuthoring(): Promise<void> {
  if (!authoringCardId) return;
  const type=document.querySelector<HTMLSelectElement>('#structured-type')?.value as StructuredQuestionType;
  const source=document.querySelector<HTMLTextAreaElement>('#structured-source')?.value??'';
  const {state,catalog}=await activeContext();
  configureStructuredQuestion(catalog,authoringCardId,type,source);
  await saveState(state);
  authoringCardId=undefined;
  alert(`${labels[type]} gespeichert.`);
  location.reload();
}

async function injectAuthoringButton(): Promise<void> {
  if (authoringCardId) return;
  const form=document.querySelector<HTMLFormElement>('#card-form');
  const actions=form?.querySelector<HTMLElement>('.editor-actions');
  if (!form || !actions || actions.querySelector('[data-structured-authoring]')) return;
  const cardId=form.querySelector<HTMLInputElement>('input[name="id"]')?.value.trim();
  if (!cardId) return;
  const {catalog}=await activeContext();
  if (!catalog.cards.some(card=>card.id===cardId)) return;
  const button=document.createElement('button');
  button.type='button';
  button.dataset.structuredAuthoring='';
  button.textContent='Interaktiven Fragetyp konfigurieren';
  button.addEventListener('click',()=>void openAuthoring(cardId).catch(error=>alert(String(error))));
  actions.append(button);
}

function schedule(): void {
  if (scheduled) return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    void injectAuthoringButton().catch(()=>{});
    void renderSession().catch(()=>{});
  });
}

export function installStructuredQuestionFeature(): void {
  schedule();
  const root=app();
  if(!root) return;
  observer?.disconnect();
  observer=new MutationObserver(()=>schedule());
  observer.observe(root,{childList:true,subtree:true});
}
