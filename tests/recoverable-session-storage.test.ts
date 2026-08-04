import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadState, saveState, type PersistedState } from '../src/db';
import { ACTIVE_SESSION_KEY, createRecoverableSession, setSessionResponse } from '../src/recoverable-session';

const fallback=():PersistedState=>({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});

describe('recoverable session persistence',()=>{
  beforeEach(()=>Object.defineProperty(globalThis,'indexedDB',{value:new IDBFactory(),configurable:true}));

  it('roundtrips queue, position, reveal/outcome and structured response state through IndexedDB',async()=>{
    const state=fallback();
    const session=createRecoverableSession({catalogId:'catalog-a',kind:'exam',mode:'dynamic',itemIds:['a','b','c'],nowMs:1000,id:'session-a'});
    session.currentIndex=1;
    session.revealed.b=true;
    session.outcomes.a='correct';
    setSessionResponse(session,'b',{choices:['x'],orderingText:['second','first'],imageLabels:{h1:'A'}},2000);
    state.sessions![ACTIVE_SESSION_KEY]=session;
    await saveState(state);

    const restored=await loadState(fallback());
    expect(restored.sessions?.[ACTIVE_SESSION_KEY]).toEqual(session);
  });
});
