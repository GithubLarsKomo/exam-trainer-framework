import { loadState, type PersistedState } from './db';
import type { Catalog } from './model';
import type { EditorCard } from './card-editor-domain';

let observer:MutationObserver|undefined;
let scheduled=false;
let injecting=false;
const fallback=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]??c));

async function context():Promise<{catalog:Catalog}>{
  const state=await loadState(fallback());
  const catalog=(state.catalogs??[]).find(entry=>entry.catalogId===state.activeCatalogId)??state.catalogs?.[0];
  if(!catalog)throw new Error('Kein aktiver Katalog.');
  return{catalog};
}

async function inject():Promise<void>{
  const initialForm=document.querySelector<HTMLFormElement>('#card-form');
  if(!initialForm||initialForm.querySelector('[data-exam-dependency-editor]')||injecting)return;
  injecting=true;
  try{
    const id=String(new FormData(initialForm).get('id')??'');
    const {catalog}=await context();
    const form=document.querySelector<HTMLFormElement>('#card-form');
    if(!form||form!==initialForm||form.querySelector('[data-exam-dependency-editor]'))return;
    const card=catalog.cards.find(entry=>entry.id===id) as EditorCard|undefined;
    const section=document.createElement('section');
    section.dataset.examDependencyEditor='';
    section.className='advanced-editor';
    section.innerHTML=`<hr><span class="eyebrow">Abhängige Prüfungsaufgabe</span><p class="muted">Karten mit derselben Prüfungsgruppe werden gemeinsam ausgewählt. Teilaufgaben ab Position 2 bleiben gesperrt, bis die vorherige Teilaufgabe bewertet wurde.</p><div class="form-grid"><label>Prüfungsgruppe<input name="editorExamGroupId" value="${esc(card?.examGroupId??'')}" placeholder="z. B. Aufgabe-7"></label><label>Reihenfolge in Gruppe<input name="editorExamGroupOrder" type="number" min="1" step="1" value="${card?.examGroupOrder??''}" placeholder="1"></label></div>`;
    form.querySelector('.editor-actions')?.insertAdjacentElement('beforebegin',section);
  }finally{injecting=false;}
}

function schedule():void{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;void inject().catch(()=>{});});
}

export function installExamDependencyEditorFeature():void{
  schedule();
  const root=document.querySelector('#app');
  if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}
}
