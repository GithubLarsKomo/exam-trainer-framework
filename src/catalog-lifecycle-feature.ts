import { createSnapshot, loadState, saveState, type PersistedState } from './db';
import { archiveCatalog, catalogExport, deleteCatalog, parseCatalogExport, restoreCatalog } from './catalog-repository';
import type { Catalog } from './model';

let observer: MutationObserver|undefined;
let scheduled=false;
let renderPanelInjecting=false;
const fallback=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

async function context():Promise<{state:PersistedState;catalogs:Catalog[];active:Catalog}>{
  const state=await loadState(fallback());const catalogs=state.catalogs??[];const active=catalogs.find(c=>c.catalogId===state.activeCatalogId)??catalogs.find(c=>!c.archived)??catalogs[0];
  if(!active) throw new Error('Kein Katalog vorhanden.');return{state,catalogs,active};
}

function download(name:string,text:string):void{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}

async function renderPanel():Promise<void>{
  const initialHost=document.querySelector<HTMLElement>('.catalog-switch')?.parentElement;
  // The lifecycle panel is inserted as a sibling of the host, not a descendant. A
  // host.querySelector() guard therefore never saw the already-rendered panel and the
  // MutationObserver could inject unbounded duplicates. Use the document-level marker
  // and an in-flight guard so the feature is idempotent across async IndexedDB reads.
  if(!initialHost||document.querySelector('[data-catalog-lifecycle]')||renderPanelInjecting)return;
  renderPanelInjecting=true;
  try{
    const {catalogs,active}=await context();
    const host=document.querySelector<HTMLElement>('.catalog-switch')?.parentElement;
    if(!host||host!==initialHost||document.querySelector('[data-catalog-lifecycle]'))return;
    const archived=catalogs.filter(c=>c.archived);
    const panel=document.createElement('section');panel.dataset.catalogLifecycle='';panel.className='panel';
    panel.innerHTML=`<span class="eyebrow">Katalog-Lifecycle</span><h2>Verwalten und sichern</h2><p class="muted">Archivieren und endgültiges Löschen erzeugen vorher automatisch einen lokalen Snapshot.</p><div class="question-actions"><button type="button" data-catalog-export>Aktiven Katalog exportieren</button><label class="button-like">Katalog importieren<input type="file" accept="application/json,.json" data-catalog-import hidden></label><button type="button" data-catalog-archive ${catalogs.filter(c=>!c.archived).length<=1?'disabled':''}>Aktiven Katalog archivieren</button></div>${archived.length?`<div class="table-scroll"><table><thead><tr><th>Archiv</th><th>Version</th><th>Aktion</th></tr></thead><tbody>${archived.map(c=>`<tr><td>${esc(c.title)}</td><td>${esc(c.version)}</td><td><button type="button" data-catalog-restore="${esc(c.catalogId)}">Wiederherstellen</button> <button type="button" class="danger" data-catalog-delete="${esc(c.catalogId)}">Endgültig löschen</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Keine archivierten Kataloge.</p>'}`;
    host.insertAdjacentElement('afterend',panel);

    panel.querySelector<HTMLElement>('[data-catalog-export]')?.addEventListener('click',()=>download(`${active.catalogId}.etf-catalog.json`,catalogExport(active)));
    panel.querySelector<HTMLInputElement>('[data-catalog-import]')?.addEventListener('change',async event=>{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;try{const imported=parseCatalogExport(await file.text());const {state,catalogs}=await context();if(catalogs.some(c=>c.catalogId===imported.catalogId)) imported.catalogId=`${imported.catalogId}-import-${Date.now()}`;imported.updatedAt=new Date().toISOString();state.catalogs=[...catalogs,imported];state.activeCatalogId=imported.catalogId;await saveState(state);location.reload();}catch(error){alert(error instanceof Error?error.message:'Katalog konnte nicht importiert werden.');}});
    panel.querySelector<HTMLElement>('[data-catalog-archive]')?.addEventListener('click',async()=>{const {state,catalogs,active}=await context();if(!confirm(`Katalog „${active.title}“ archivieren?`))return;await createSnapshot(state,`archive-catalog-${active.catalogId}`);const result=archiveCatalog(catalogs,active.catalogId,state.activeCatalogId??active.catalogId);state.catalogs=result.catalogs;state.activeCatalogId=result.activeCatalogId;await saveState(state);location.reload();});
    panel.querySelectorAll<HTMLElement>('[data-catalog-restore]').forEach(button=>button.addEventListener('click',async()=>{const {state,catalogs}=await context();state.catalogs=restoreCatalog(catalogs,button.dataset.catalogRestore!);await saveState(state);location.reload();}));
    panel.querySelectorAll<HTMLElement>('[data-catalog-delete]').forEach(button=>button.addEventListener('click',async()=>{const id=button.dataset.catalogDelete!;const {state,catalogs,active}=await context();const target=catalogs.find(c=>c.catalogId===id);if(!target||!confirm(`Archiv „${target.title}“ endgültig löschen?`))return;await createSnapshot(state,`delete-catalog-${id}`);const result=deleteCatalog(catalogs,id,state.activeCatalogId??active.catalogId);state.catalogs=result.catalogs;state.activeCatalogId=result.activeCatalogId;await saveState(state);location.reload();}));
  }finally{renderPanelInjecting=false;}
}

function schedule():void{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;void renderPanel().catch(()=>{});});}
export function installCatalogLifecycleFeature():void{schedule();const root=document.querySelector('#app');if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}}
