import { builtinCatalog } from './builtin-v04';
import { loadState, type PersistedState } from './db';
import { estimateRemainingMinutes, sessionDraftKey, storageUsageLabel } from './ux-status';
import type { Catalog } from './model';

let observer: MutationObserver | undefined;
let scheduled = false;
let updateBannerVisible = false;
let reloadingForUpdate = false;
const revealedAnswers = new Map<string,string>();

const fallbackState = (): PersistedState => ({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

async function activeContext(): Promise<{state:PersistedState;catalog:Catalog}> {
  const state=await loadState(fallbackState());
  if(!Array.isArray(state.catalogs)||!state.catalogs.length){state.catalogs=[structuredClone(builtinCatalog)];state.activeCatalogId=builtinCatalog.catalogId;}
  const catalog=state.catalogs.find(entry=>entry.catalogId===state.activeCatalogId)??state.catalogs[0];
  return {state,catalog};
}

function visibleCardId(catalog: Catalog): string | undefined {
  const questionCard=document.querySelector<HTMLElement>('.question-card');
  const cached=questionCard?.dataset.structuredCardId;
  if(cached && catalog.cards.some(card=>card.id===cached)) return cached;
  const prompt=questionCard?.querySelector<HTMLElement>('h2')?.textContent?.trim();
  if(!prompt) return undefined;
  const matches=catalog.cards.filter(card=>card.prompt.trim()===prompt);
  if(matches.length===1) return matches[0].id;
  const topicLine=document.querySelector<HTMLElement>('.session-top span:nth-child(2)')?.textContent?.trim()??'';
  const topicMatches=matches.filter(card=>topicLine.startsWith(`${card.topicId} ·`)||topicLine===card.topicId);
  return topicMatches.length===1?topicMatches[0].id:undefined;
}

async function refreshStatus(): Promise<void> {
  const pill=document.querySelector<HTMLElement>('.status-pill');
  if(pill){
    const text=navigator.onLine?'● lokal · online':'● lokal · offline';
    const title=navigator.onLine?'Lernstand liegt lokal; Netzwerk ist verfügbar.':'Lernstand liegt lokal; die App arbeitet ohne Netzwerk.';
    // MutationObserver watches childList changes. Replacing identical text on every
    // observer pass would therefore trigger this feature again indefinitely and
    // keep interactive controls permanently "unstable" for browsers/assistive tools.
    if(pill.textContent!==text) pill.textContent=text;
    if(pill.title!==title) pill.title=title;
  }
  const settings=document.querySelector<HTMLElement>('.settings-list');
  if(!settings) return;
  let panel=settings.parentElement?.querySelector<HTMLElement>('[data-ux-storage-status]');
  if(!panel){panel=document.createElement('div');panel.dataset.uxStorageStatus='';panel.className='notice';settings.insertAdjacentElement('afterend',panel);}
  const {state}=await activeContext();
  let persisted=false;
  let estimate:StorageEstimate|undefined;
  try{
    persisted=await navigator.storage?.persisted?.()??false;
    estimate=await navigator.storage?.estimate?.();
  }catch{/* Status is advisory only. */}
  const backup=state.lastBackupAt?new Date(state.lastBackupAt).toLocaleString('de-DE'):'noch keines';
  const html=`<strong>Lokale Datensicherheit</strong><br>${navigator.onLine?'Netzwerk verfügbar':'Offline-Modus'} · ${persisted?'persistenter Browserspeicher':'Browser-verwalteter Speicher'} · ${esc(storageUsageLabel(estimate?.usage,estimate?.quota))}<br>Letztes Backup: ${esc(backup)}`;
  if(panel.innerHTML!==html) panel.innerHTML=html;
}

function parseSessionPosition(): {current:number;total:number}|undefined {
  const text=document.querySelector<HTMLElement>('.session-top span:first-child')?.textContent?.trim();
  const match=text?.match(/(\d+)\s+von\s+(\d+)/i);
  if(!match) return undefined;
  return {current:Number(match[1]),total:Number(match[2])};
}

async function injectRemainingEstimate(): Promise<void> {
  const sessionTop=document.querySelector<HTMLElement>('.session-top');
  if(!sessionTop || sessionTop.querySelector('[data-session-estimate]')) return;
  const position=parseSessionPosition();
  if(!position) return;
  const {state,catalog}=await activeContext();
  const ids=new Set(catalog.cards.map(card=>card.id));
  const samples=(state.reviewEvents??[]).filter(event=>ids.has(event.knowledgeItemId)&&event.responseTimeMs!==undefined).map(event=>event.responseTimeMs!);
  const minutes=estimateRemainingMinutes(position.current,position.total,samples);
  const badge=document.createElement('span');
  badge.dataset.sessionEstimate='';
  badge.textContent=`ca. ${minutes} Min. übrig`;
  badge.title='Schätzung aus bisherigen Antwortzeiten; ohne Historie werden 75 Sekunden pro Aufgabe angenommen.';
  sessionTop.append(badge);
}

async function restoreDraft(): Promise<void> {
  const textarea=document.querySelector<HTMLTextAreaElement>('.question-card textarea#answer');
  if(!textarea || textarea.style.display==='none' || textarea.value) return;
  const {catalog}=await activeContext();
  const cardId=visibleCardId(catalog);
  if(!cardId) return;
  const saved=sessionStorage.getItem(sessionDraftKey(catalog.catalogId,cardId));
  if(saved!==null) textarea.value=saved;
}

async function showRevealedAnswer(): Promise<void> {
  const questionCard=document.querySelector<HTMLElement>('.question-card');
  const answerBox=questionCard?.querySelector<HTMLElement>('.answer-box');
  if(!questionCard||!answerBox||questionCard.querySelector('[data-user-answer-copy]')) return;
  const {catalog}=await activeContext();
  const cardId=visibleCardId(catalog);
  if(!cardId) return;
  const saved=revealedAnswers.get(`${catalog.catalogId}:${cardId}`)??sessionStorage.getItem(sessionDraftKey(catalog.catalogId,cardId));
  if(!saved?.trim()) return;
  const box=document.createElement('div');
  box.dataset.userAnswerCopy='';
  box.className='user-answer-copy';
  box.innerHTML=`<span class="eyebrow">Deine Antwort</span><p>${esc(saved)}</p>`;
  answerBox.insertAdjacentElement('beforebegin',box);
}

async function captureDraft(textarea: HTMLTextAreaElement): Promise<void> {
  const {catalog}=await activeContext();
  const cardId=visibleCardId(catalog);
  if(cardId) sessionStorage.setItem(sessionDraftKey(catalog.catalogId,cardId),textarea.value);
}

async function captureBeforeReveal(): Promise<void> {
  const textarea=document.querySelector<HTMLTextAreaElement>('.question-card textarea#answer');
  if(!textarea || textarea.style.display==='none') return;
  const {catalog}=await activeContext();
  const cardId=visibleCardId(catalog);
  if(!cardId) return;
  const key=sessionDraftKey(catalog.catalogId,cardId);
  sessionStorage.setItem(key,textarea.value);
  revealedAnswers.set(`${catalog.catalogId}:${cardId}`,textarea.value);
}

async function clearGradedDraft(): Promise<void> {
  const {catalog}=await activeContext();
  const cardId=visibleCardId(catalog);
  if(!cardId) return;
  sessionStorage.removeItem(sessionDraftKey(catalog.catalogId,cardId));
  revealedAnswers.delete(`${catalog.catalogId}:${cardId}`);
}

function showUpdateBanner(registration: ServiceWorkerRegistration): void {
  if(updateBannerVisible) return;
  updateBannerVisible=true;
  const banner=document.createElement('div');
  banner.dataset.pwaUpdateBanner='';
  banner.setAttribute('role','status');
  banner.className='update-banner';
  banner.innerHTML='<span>Eine neue App-Version ist verfügbar.</span><button type="button" data-apply-update>Jetzt aktualisieren</button>';
  document.body.append(banner);
  banner.querySelector<HTMLElement>('[data-apply-update]')?.addEventListener('click',()=>registration.waiting?.postMessage({type:'SKIP_WAITING'}));
}

async function installUpdateLifecycle(): Promise<void> {
  if(!('serviceWorker' in navigator)) return;
  const registration=await navigator.serviceWorker.ready;
  if(registration.waiting && navigator.serviceWorker.controller) showUpdateBanner(registration);
  registration.addEventListener('updatefound',()=>{
    const worker=registration.installing;
    worker?.addEventListener('statechange',()=>{
      if(worker.state==='installed'&&navigator.serviceWorker.controller) showUpdateBanner(registration);
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloadingForUpdate) return;
    reloadingForUpdate=true;
    location.reload();
  });
  void registration.update().catch(()=>{});
}

function schedule(): void {
  if(scheduled) return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    void refreshStatus().catch(()=>{});
    void injectRemainingEstimate().catch(()=>{});
    void restoreDraft().catch(()=>{});
    void showRevealedAnswer().catch(()=>{});
  });
}

function bindGlobalEvents(): void {
  window.addEventListener('online',()=>schedule());
  window.addEventListener('offline',()=>schedule());
  document.addEventListener('input',event=>{
    const textarea=(event.target as Element | null)?.closest?.('.question-card textarea#answer') as HTMLTextAreaElement|null;
    if(textarea) void captureDraft(textarea);
  },true);
  document.addEventListener('click',event=>{
    const target=event.target as Element|null;
    if(target?.closest('[data-reveal]')) void captureBeforeReveal();
    if(target?.closest('[data-grade]')) void clearGradedDraft();
  },true);
}

export function installUxPolishFeature(): void {
  bindGlobalEvents();
  schedule();
  const root=document.querySelector('#app');
  if(root){observer?.disconnect();observer=new MutationObserver(()=>schedule());observer.observe(root,{childList:true,subtree:true});}
  void installUpdateLifecycle().catch(()=>{});
}
