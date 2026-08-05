import { loadState, type PersistedState } from './db';
import type { AppState, Catalog } from './model';
import { evaluateFsrsShadow, FSRS_ACTIVATION_POLICY } from './fsrs-shadow-evaluation';

let observer:MutationObserver|undefined;
let scheduled=false;
let injecting=false;
const fallback=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const pct=(value:number|undefined)=>value===undefined?'–':`${(value*100).toFixed(1).replace('.',',')} %`;
const num=(value:number)=>Number.isInteger(value)?String(value):value.toFixed(1).replace('.',',');

async function context():Promise<{state:PersistedState & Partial<AppState>;catalog:Catalog}>{
  const state=await loadState(fallback()) as PersistedState & Partial<AppState>;
  const catalog=(state.catalogs??[]).find(entry=>entry.catalogId===state.activeCatalogId)??state.catalogs?.[0];
  if(!catalog)throw new Error('Kein aktiver Katalog.');
  return{state,catalog};
}

function statusCopy(status:ReturnType<typeof evaluateFsrsShadow>['status']):{title:string;detail:string}{
  if(status==='pilot-candidate')return{title:'Kandidat für kontrollierten Pilot',detail:'Die Shadow-Gates sind erfüllt. FSRS bleibt trotzdem ohne Entscheidungshoheit; vor Aktivierung ist ein kontrollierter Vergleich gegen den klassischen Scheduler erforderlich.'};
  if(status==='hold')return{title:'Noch nicht pilotfähig',detail:'Die Datenmenge reicht aus, aber mindestens ein Retentions- oder Aufwandskriterium ist noch nicht erfüllt.'};
  return{title:'Datenerhebung läuft',detail:'Die Mindestmenge an echten Shadow-Beobachtungen ist noch nicht erreicht. Der klassische Fünf-Stufen-Scheduler bleibt vollständig autoritativ.'};
}

async function inject():Promise<void>{
  if(document.querySelector('[data-fsrs-shadow-evaluation]')||injecting)return;
  const heading=Array.from(document.querySelectorAll<HTMLElement>('.panel h2')).find(node=>node.textContent?.trim()==='Daten und Sicherung');
  const anchor=heading?.closest<HTMLElement>('.panel');
  if(!anchor)return;
  injecting=true;
  try{
    const {state,catalog}=await context();
    if(document.querySelector('[data-fsrs-shadow-evaluation]'))return;
    const ids=catalog.cards.filter(card=>card.status==='released').map(card=>card.id);
    const evaluation=evaluateFsrsShadow(state.reviewEvents??[],ids);
    const copy=statusCopy(evaluation.status);
    const p=FSRS_ACTIVATION_POLICY.shadow;
    const panel=document.createElement('section');
    panel.className='panel';
    panel.dataset.fsrsShadowEvaluation='';
    panel.innerHTML=`<span class="eyebrow">FSRS Shadow · ohne Einfluss auf den Lernplan</span><h2>${copy.title}</h2><p>${copy.detail}</p><div class="metrics"><article class="metric-card"><span>Shadow-Reviews</span><strong>${evaluation.reviewCount}</strong><small>Ziel ≥ ${p.minReviews}</small></article><article class="metric-card"><span>Wissenseinheiten</span><strong>${evaluation.distinctItems}</strong><small>Ziel ≥ ${p.minDistinctItems}</small></article><article class="metric-card"><span>Beobachtung</span><strong>${num(evaluation.observationDays)} Tage</strong><small>Ziel ≥ ${p.minObservationDays}</small></article><article class="metric-card"><span>FSRS-fällige Reviews</span><strong>${evaluation.fsrsDueReviews}</strong><small>Ziel ≥ ${p.minFsrsDueReviews}</small></article><article class="metric-card"><span>Retention bei Fälligkeit</span><strong>${pct(evaluation.observedRecallAtFsrsDue)}</strong><small>Ziel ≥ ${pct(p.minObservedRecallAtDue)}</small></article><article class="metric-card"><span>Proj. Review-Aufwand</span><strong>${pct(evaluation.projectedReviewEffortRatio)}</strong><small>Ziel ≤ ${pct(p.maxProjectedReviewEffortRatio)} von Classic</small></article></div>${evaluation.reasons.length?`<details><summary>Offene Gates (${evaluation.reasons.length})</summary><ul>${evaluation.reasons.map(reason=>`<li>${reason}</li>`).join('')}</ul></details>`:''}<p class="muted">Eine Shadow-Auswertung kann keine kontrafaktische Retention beweisen. Selbst bei „Pilotkandidat“ erfolgt keine automatische Umschaltung. Für eine spätere Aktivierung gilt ein kontrollierter Classic-vs-FSRS-Pilot mit Retentions-Nichtunterlegenheit (max. 2 Prozentpunkte) und mindestens 5 % geringerem Review-Aufwand.</p>`;
    anchor.insertAdjacentElement('afterend',panel);
  }finally{injecting=false;}
}

function schedule():void{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;void inject().catch(()=>{});});
}

export function installFsrsShadowEvaluationFeature():void{
  schedule();
  const root=document.querySelector('#app');
  if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}
}
