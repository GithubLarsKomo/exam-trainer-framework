import { legacyQuestionVariantId, type AssetKind, type Catalog, type FsrsShadowState, type ReadinessSnapshot, type ReviewEvent } from './model';

export type PersistedHistoryEntry = { cardId:string; outcome:'correct'|'partial'|'incorrect'; at:string };
export type PersistedExamAttempt = { id:string; at:string; points:number; maxPoints:number; percentage:number; items:number };

export interface PersistedAssetRecord {
  id:string; sha256:string; mediaType:string; kind:AssetKind; byteLength:number; fileNames:string[]; catalogIds:string[]; source:'anki'|'local'; createdAt:string; bytes:Uint8Array;
}

export type PersistedState = {
  schemaVersion:number;
  progress:Record<string,unknown>;
  history:PersistedHistoryEntry[];
  reviewEvents?:ReviewEvent[];
  fsrsShadow?:Record<string,FsrsShadowState>;
  readinessSnapshots?:ReadinessSnapshot[];
  review:Record<string,string>;
  activeCatalog?:unknown;
  catalogs?:Catalog[];
  activeCatalogId?:string;
  sessions?:Record<string,unknown>;
  examAttempts?:PersistedExamAttempt[];
  migrationLog?:Array<{from:number;to:number;at:string;status:string;message?:string}>;
  lastBackupAt?:string;
};

export const DB_NAME='exam-trainer-framework';
export const DB_VERSION=3;
export const STATE_STORE='kv';
export const ASSET_STORE='assets';
export const CATALOG_STORE='catalogs';
const STATE_KEY='state';
const LEGACY_KEY='etf-state-v1';

function request<T>(req:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error??new Error('IndexedDB request failed'));});}
function transactionDone(tx:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??new Error('IndexedDB transaction failed'));tx.onabort=()=>reject(tx.error??new Error('IndexedDB transaction aborted'));});}

export function openExamTrainerDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
    if(!db.objectStoreNames.contains(ASSET_STORE)){const assets=db.createObjectStore(ASSET_STORE,{keyPath:'id'});assets.createIndex('sha256','sha256',{unique:true});}
    if(!db.objectStoreNames.contains(CATALOG_STORE)) db.createObjectStore(CATALOG_STORE,{keyPath:'catalogId'});
  };
  req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error??new Error('IndexedDB could not be opened'));
});}

async function read<T>(key:string):Promise<T|undefined>{const db=await openExamTrainerDb();try{return await request(db.transaction(STATE_STORE,'readonly').objectStore(STATE_STORE).get(key)) as T|undefined;}finally{db.close();}}
async function write<T>(key:string,value:T):Promise<void>{const db=await openExamTrainerDb();try{const tx=db.transaction(STATE_STORE,'readwrite');const done=transactionDone(tx);tx.objectStore(STATE_STORE).put(value,key);await done;}finally{db.close();}}

async function readCatalogs():Promise<Catalog[]>{const db=await openExamTrainerDb();try{return await request(db.transaction(CATALOG_STORE,'readonly').objectStore(CATALOG_STORE).getAll()) as Catalog[];}finally{db.close();}}

function withoutCatalogs(state:PersistedState):PersistedState{const copy=structuredClone(state);delete copy.catalogs;delete copy.activeCatalog;return copy;}

async function persistStateAndCatalogs(state:PersistedState):Promise<void>{
  const migrated=migrate(state);
  const catalogs=Array.isArray(migrated.catalogs)?migrated.catalogs:[];
  const db=await openExamTrainerDb();
  try{
    const tx=db.transaction([STATE_STORE,CATALOG_STORE],'readwrite');const done=transactionDone(tx);
    tx.objectStore(STATE_STORE).put(withoutCatalogs(migrated),STATE_KEY);
    const store=tx.objectStore(CATALOG_STORE);store.clear();for(const catalog of catalogs) store.put(structuredClone(catalog));
    await done;
  }finally{db.close();}
}

export async function loadState(fallback:PersistedState):Promise<PersistedState>{
  const stored=await read<PersistedState>(STATE_KEY);
  if(stored){
    const migrated=migrate(stored);const separate=await readCatalogs();
    if(separate.length) return {...migrated,catalogs:separate};
    if(Array.isArray(migrated.catalogs)&&migrated.catalogs.length){await persistStateAndCatalogs(migrated);return migrated;}
    return migrated;
  }
  const legacy=typeof localStorage==='undefined'?null:localStorage.getItem(LEGACY_KEY);
  if(legacy){try{const parsed=JSON.parse(legacy) as Partial<PersistedState>;const migrated=migrate({...fallback,...parsed,schemaVersion:1});await persistStateAndCatalogs(migrated);localStorage.removeItem(LEGACY_KEY);return migrated;}catch{/* Keep fallback and do not destroy malformed legacy data. */}}
  const migratedFallback=migrate(fallback);await persistStateAndCatalogs(migratedFallback);return migratedFallback;
}

export async function saveState(state:PersistedState):Promise<void>{await persistStateAndCatalogs(state);}

export async function createSnapshot(state:PersistedState,reason:string):Promise<string>{const id=`snapshot:${new Date().toISOString()}:${reason}`;await write(id,structuredClone(state));return id;}

export async function replaceState(next:PersistedState,current:PersistedState,reason:string):Promise<PersistedState>{await createSnapshot(current,reason);const migrated=migrate(next);await persistStateAndCatalogs(migrated);return migrated;}

/** Replaces learner state, catalog repository and binary assets in one IndexedDB transaction. */
export async function replaceStateAndAssetsAtomically(next:PersistedState,assets:PersistedAssetRecord[]):Promise<PersistedState>{
  const migrated=migrate(next);const catalogs=Array.isArray(migrated.catalogs)?migrated.catalogs:[];const db=await openExamTrainerDb();
  try{
    const tx=db.transaction([STATE_STORE,CATALOG_STORE,ASSET_STORE],'readwrite');const done=transactionDone(tx);
    tx.objectStore(STATE_STORE).put(withoutCatalogs(migrated),STATE_KEY);
    const catalogStore=tx.objectStore(CATALOG_STORE);catalogStore.clear();for(const catalog of catalogs) catalogStore.put(structuredClone(catalog));
    const assetStore=tx.objectStore(ASSET_STORE);assetStore.clear();for(const asset of assets) assetStore.add(asset);
    await done;if(typeof localStorage!=='undefined')localStorage.removeItem(LEGACY_KEY);return migrated;
  }finally{db.close();}
}

function canonicalLegacyCardId(cardId:string):string{return cardId.replace(/#exam\d+$/,'');}
function migrateLegacyHistory(history:PersistedHistoryEntry[]):ReviewEvent[]{return history.map((entry,index)=>{const knowledgeItemId=canonicalLegacyCardId(entry.cardId);return{id:`legacy:${index}:${entry.at}:${knowledgeItemId}`,knowledgeItemId,questionVariantId:legacyQuestionVariantId(knowledgeItemId),source:entry.cardId===knowledgeItemId?'learning':'exam',outcome:entry.outcome,answeredAt:entry.at,migrationSource:'legacy-history'};});}

export function migrate(input:PersistedState):PersistedState{
  const state:PersistedState={schemaVersion:Number(input.schemaVersion||1),progress:input.progress??{},history:Array.isArray(input.history)?input.history:[],reviewEvents:Array.isArray(input.reviewEvents)?input.reviewEvents:[],fsrsShadow:input.fsrsShadow??{},readinessSnapshots:Array.isArray(input.readinessSnapshots)?input.readinessSnapshots:[],review:input.review??{},activeCatalog:input.activeCatalog,catalogs:Array.isArray(input.catalogs)?input.catalogs:undefined,activeCatalogId:input.activeCatalogId,sessions:input.sessions??{},examAttempts:Array.isArray(input.examAttempts)?input.examAttempts:[],migrationLog:Array.isArray(input.migrationLog)?input.migrationLog:[],lastBackupAt:input.lastBackupAt};
  if(state.schemaVersion<2){state.migrationLog!.push({from:state.schemaVersion,to:2,at:new Date().toISOString(),status:'success'});state.schemaVersion=2;}
  if(state.schemaVersion<3){if(!state.reviewEvents!.length&&state.history.length)state.reviewEvents=migrateLegacyHistory(state.history);state.migrationLog!.push({from:state.schemaVersion,to:3,at:new Date().toISOString(),status:'success',message:'Added ReviewEvent and FSRS shadow state containers.'});state.schemaVersion=3;}
  return state;
}
