import { loadState, type PersistedState } from './db';
import type { AppState, Catalog } from './model';
import { ACTIVE_SESSION_KEY, currentSessionCardId, type RecoverableSessionState } from './recoverable-session';
import { dependentExamContext, lockedDependentExamCardIds } from './exam-dependencies';

let observer:MutationObserver|undefined;
let scheduled=false;
let decorating=false;
const fallback=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});

async function context():Promise<{state:PersistedState & Partial<AppState>;catalog:Catalog;session?:RecoverableSessionState}>{
  const state=await loadState(fallback()) as PersistedState & Partial<AppState>;
  const catalog=(state.catalogs??[]).find(entry=>entry.catalogId===state.activeCatalogId)??state.catalogs?.[0];
  if(!catalog)throw new Error('Kein aktiver Katalog.');
  const session=state.sessions?.[ACTIVE_SESSION_KEY] as RecoverableSessionState|undefined;
  return{state,catalog,session};
}

async function decorate():Promise<void>{
  const initialRoot=document.querySelector<HTMLElement>('[data-recoverable-session]');
  if(!initialRoot||decorating)return;
  decorating=true;
  try{
    const {catalog,session}=await context();
    const root=document.querySelector<HTMLElement>('[data-recoverable-session]');
    if(!root||root!==initialRoot||!session||session.kind!=='exam')return;
    const cards=catalog.cards.filter(card=>card.status==='released');
    const locked=lockedDependentExamCardIds(session.itemIds,cards,session.outcomes);
    root.querySelectorAll<HTMLButtonElement>('[data-recoverable-exam-nav]').forEach(button=>{
      const index=Number(button.dataset.recoverableExamNav);
      const cardId=session.itemIds[index];
      if(cardId&&locked.has(cardId)){
        button.disabled=true;
        button.dataset.dependentExamLocked='';
        button.title='Zuerst die vorherige Teilaufgabe bewerten.';
        button.setAttribute('aria-label',`${button.getAttribute('aria-label')??`Frage ${index+1}`} – gesperrt bis zur vorherigen Teilaufgabe`);
      }
    });
    const next=root.querySelector<HTMLButtonElement>('[data-recoverable-next]');
    const nextId=session.itemIds[session.currentIndex+1];
    if(next&&nextId&&locked.has(nextId)){
      next.disabled=true;
      next.dataset.dependentExamLocked='';
      next.title='Zuerst diese Teilaufgabe bewerten.';
    }
    const currentId=currentSessionCardId(session);
    const group=currentId?dependentExamContext(currentId,cards):undefined;
    const question=root.querySelector<HTMLElement>('.question-card');
    if(group&&question&&!question.querySelector('[data-dependent-exam-context]')){
      const badge=document.createElement('div');
      badge.dataset.dependentExamContext='';
      badge.className='eyebrow';
      badge.textContent=`Prüfungsgruppe ${group.groupId} · Teilaufgabe ${group.position} von ${group.total}`;
      question.querySelector('h2')?.insertAdjacentElement('beforebegin',badge);
    }
  }finally{decorating=false;}
}

function schedule():void{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;void decorate().catch(()=>{});});
}

export function installExamDependencyRuntimeFeature():void{
  schedule();
  const root=document.querySelector('#app');
  if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}
}
