import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { CATALOG_STORE, DB_NAME, STATE_STORE, loadState, openExamTrainerDb, saveState, type PersistedState } from '../src/db';
import type { Catalog } from '../src/model';

function freshIndexedDb():void{Object.defineProperty(globalThis,'indexedDB',{value:new IDBFactory(),configurable:true});}
const cat:Catalog={catalogId:'cat-a',title:'A',version:'1.0.0',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z',cards:[]};
const state=():PersistedState=>({schemaVersion:3,progress:{x:{stage:2}},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[],catalogs:[cat],activeCatalogId:'cat-a'});

async function rawStores(){const db=await openExamTrainerDb();try{const tx=db.transaction([STATE_STORE,CATALOG_STORE],'readonly');const raw=await new Promise<any>((resolve,reject)=>{const r=tx.objectStore(STATE_STORE).get('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const catalogs=await new Promise<any[]>((resolve,reject)=>{const r=tx.objectStore(CATALOG_STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return{raw,catalogs};}finally{db.close();}}

describe('catalog store separation',()=>{
  beforeEach(()=>freshIndexedDb());
  it('stores learner state without embedded catalogs and hydrates them on load',async()=>{await saveState(state());const stored=await rawStores();expect(stored.raw.catalogs).toBeUndefined();expect(stored.raw.progress.x).toEqual({stage:2});expect(stored.catalogs.map(c=>c.catalogId)).toEqual(['cat-a']);const loaded=await loadState({schemaVersion:3,progress:{},history:[],review:{}});expect(loaded.catalogs?.[0].title).toBe('A');expect(loaded.activeCatalogId).toBe('cat-a');});
  it('keeps catalog persistence compatible with repeated writes',async()=>{const first=state();await saveState(first);first.catalogs![0].title='Updated';first.progress.y={stage:4};await saveState(first);const loaded=await loadState({schemaVersion:3,progress:{},history:[],review:{}});expect(loaded.catalogs?.[0].title).toBe('Updated');expect(loaded.progress.y).toEqual({stage:4});expect((await rawStores()).catalogs).toHaveLength(1);});
});
