import { describe, expect, it } from 'vitest';
import {
  createDraftFromReleased,
  diffCardVersions,
  ensureVersionHistory,
  releaseApprovedDraft,
  releaseValidation,
  restoreVersionAsDraft,
  transitionCard,
  validateCatalog,
} from '../src/publication-workflow';
import type { CardVersion, Catalog } from '../src/model';

function released(overrides:Partial<CardVersion>={}):CardVersion{return {id:'card-1',version:1,status:'released',topicId:'T',examQuestion:'1',prompt:'Original question',points:2,difficulty:2,tags:['tag'],questionType:'free_text',answer:{modelAnswer:'Original answer',requiredTerms:['term']},source:'Script',sourcePage:'12',changedAt:'2026-08-01T00:00:00.000Z',...overrides};}
function catalog(card:CardVersion=released()):Catalog{return {catalogId:'cat',title:'Catalog',version:'1.0.0',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z',cards:[card]};}

describe('publication workflow',()=>{
  it('seeds immutable history from existing released content',()=>{const source=catalog();const versioned=ensureVersionHistory(source);expect(versioned.versionHistory?.['card-1']).toHaveLength(1);source.cards[0].prompt='mutated outside';expect(versioned.versionHistory?.['card-1'][0].prompt).toBe('Original question');});

  it('creates a draft successor without mutating the released version',()=>{const next=createDraftFromReleased(catalog(),'card-1','edit',new Date('2026-08-04T10:00:00Z'),'card-1:draft:test');const release=next.cards.find(c=>c.id==='card-1')!;const draft=next.cards.find(c=>c.id==='card-1:draft:test')!;draft.prompt='Changed question';expect(release).toMatchObject({status:'released',version:1,prompt:'Original question'});expect(draft).toMatchObject({status:'draft',version:2,parentId:'card-1'});expect(next.versionHistory?.['card-1'][0].prompt).toBe('Original question');expect(next.workflowLog?.at(-1)).toMatchObject({from:'released',to:'draft'});});

  it('enforces valid workflow transitions',()=>{const withDraft=createDraftFromReleased(catalog(),'card-1','edit',new Date(),'card-1:draft:test');expect(()=>transitionCard(withDraft,'card-1:draft:test','approved')).toThrow(/Ungültiger/);const review=transitionCard(withDraft,'card-1:draft:test','in_review','review');const approved=transitionCard(review,'card-1:draft:test','approved','ok');expect(approved.cards.find(c=>c.id==='card-1:draft:test')?.status).toBe('approved');expect(()=>transitionCard(approved,'card-1:draft:test','released')).toThrow(/releaseApprovedDraft/);});

  it('publishes approved draft under the stable logical id and keeps immutable release history',()=>{let next=createDraftFromReleased(catalog(),'card-1','edit',new Date('2026-08-02T00:00:00Z'),'card-1:draft:test');next.cards.find(c=>c.id==='card-1:draft:test')!.prompt='Version two';next=transitionCard(next,'card-1:draft:test','in_review');next=transitionCard(next,'card-1:draft:test','approved');const published=releaseApprovedDraft(next,'card-1:draft:test','release v2',new Date('2026-08-04T10:00:00Z'));expect(published.cards.filter(c=>c.id==='card-1')).toHaveLength(1);expect(published.cards.find(c=>c.id==='card-1')).toMatchObject({status:'released',version:2,prompt:'Version two'});expect(published.cards.some(c=>c.id==='card-1:draft:test')).toBe(false);expect(published.versionHistory?.['card-1'].map(v=>v.version)).toEqual([1,2]);expect(published.versionHistory?.['card-1'][0].prompt).toBe('Original question');expect(published.workflowLog?.at(-1)).toMatchObject({from:'approved',to:'released'});expect(published.knowledgeItems?.find(item=>item.id==='card-1')?.questionVariants[0].prompt).toBe('Version two');});

  it('restores an old release as a higher-version draft',()=>{let next=createDraftFromReleased(catalog(),'card-1','edit',new Date(),'card-1:draft:test');next=transitionCard(next,'card-1:draft:test','in_review');next=transitionCard(next,'card-1:draft:test','approved');next=releaseApprovedDraft(next,'card-1:draft:test','v2');const restored=restoreVersionAsDraft(next,'card-1',1,'restore v1',new Date('2026-08-04T11:00:00Z'),'card-1:draft:restore');expect(restored.cards.find(c=>c.id==='card-1:draft:restore')).toMatchObject({status:'draft',version:3,parentId:'card-1',prompt:'Original question'});});

  it('diffs content and validates blocking errors plus confirmable warnings',()=>{const a=released();const b=released({version:2,prompt:'Changed',tags:[],sourcePage:undefined});expect(diffCardVersions(a,b).map(d=>d.field)).toEqual(expect.arrayContaining(['prompt','tags','sourcePage']));const broken:CardVersion={...b,status:'approved',source:'',questionType:'single_choice',answer:{modelAnswer:'Answer',choices:[{id:'a',text:'A',correct:true}]}};const issues=validateCatalog(catalog(broken));expect(issues.some(issue=>issue.severity==='warning'&&issue.code==='NO_TAGS')).toBe(true);const releaseIssues=releaseValidation(catalog(broken),'card-1');expect(releaseIssues.some(issue=>issue.severity==='error'&&issue.code==='MISSING_RELEASE_SOURCE')).toBe(true);expect(releaseIssues.some(issue=>issue.severity==='error'&&issue.code==='INVALID_SINGLE_CHOICE')).toBe(true);expect(()=>releaseApprovedDraft(catalog(broken),'card-1')).toThrow(/Freigabe blockiert/);});
});
