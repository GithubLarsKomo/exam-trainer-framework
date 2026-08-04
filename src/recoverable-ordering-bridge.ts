import { loadState, saveState, type PersistedState } from './db';
import { ACTIVE_SESSION_KEY, type RecoverableSessionState } from './recoverable-session';

const fallbackState=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
let pending:number|undefined;

async function persistOrdering():Promise<void>{
  if(!document.querySelector('[data-recoverable-session]'))return;
  const order=Array.from(document.querySelectorAll<HTMLElement>('.etf-structured-question ol li span')).map(span=>span.textContent?.trim()??'');
  if(!order.length)return;
  const state=await loadState(fallbackState());
  const session=state.sessions?.[ACTIVE_SESSION_KEY] as RecoverableSessionState|undefined;
  if(!session)return;
  const cardId=session.itemIds[session.currentIndex];
  if(!cardId)return;
  session.responses[cardId]={...(session.responses[cardId]??{}),orderingText:order};
  session.updatedAt=new Date().toISOString();
  state.sessions![ACTIVE_SESSION_KEY]=session;
  await saveState(state);
}

export function installRecoverableOrderingBridge():void{
  document.addEventListener('click',event=>{
    const target=event.target as Element|null;
    if(!target?.closest('[data-order-up],[data-order-down]')||!document.querySelector('[data-recoverable-session]'))return;
    if(pending!==undefined)clearTimeout(pending);
    pending=window.setTimeout(()=>{pending=undefined;void persistOrdering().catch(()=>{});},25);
  });
}
