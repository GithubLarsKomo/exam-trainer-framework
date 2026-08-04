import { describe, expect, it } from 'vitest';
import type { CardVersion, ExamBlueprint } from '../src/model';
import {
  accrueCurrentTime,
  calculateExamScore,
  createRecoverableSession,
  currentSessionCardId,
  examQuestionStatuses,
  gradeExamCard,
  gradeLearningCard,
  navigateExam,
  selectExamCardIds,
  setSessionResponse,
  sessionComplete,
  skipLearningCard,
} from '../src/recoverable-session';

const card=(id:string,topicId='A',points=2):CardVersion=>({
  id,version:1,status:'released',topicId,examQuestion:id,prompt:`Prompt ${id}`,points,difficulty:2,tags:[],questionType:'free_text',
  answer:{modelAnswer:`Answer ${id}`},source:'test',changedAt:'2026-08-04T00:00:00.000Z',
});

describe('recoverable session state',()=>{
  it('preserves exact learning queue order across skip and grading',()=>{
    const session=createRecoverableSession({catalogId:'c',kind:'learning',mode:'all',itemIds:['a','b','c'],nowMs:1000,id:'s'});
    skipLearningCard(session,2000);
    expect(session.itemIds).toEqual(['b','c','a']);
    expect(currentSessionCardId(session)).toBe('b');
    gradeLearningCard(session,'correct',3000);
    expect(currentSessionCardId(session)).toBe('c');
    expect(session.completedCount).toBe(1);
    expect(session.outcomes.b).toBe('correct');
    expect(sessionComplete(session)).toBe(false);
  });

  it('persists structured response payloads independently from renderer memory',()=>{
    const session=createRecoverableSession({catalogId:'c',kind:'exam',mode:'dynamic',itemIds:['a'],nowMs:1000,id:'s'});
    setSessionResponse(session,'a',{
      text:'free',choices:['c2'],cloze:{b1:'ATP'},matching:{p1:'p2'},orderingText:['B','A'],caseStudy:{s1:'reason'},imageLabels:{h1:'Nucleus'},
    },1500);
    expect(session.responses.a).toEqual({
      text:'free',choices:['c2'],cloze:{b1:'ATP'},matching:{p1:'p2'},orderingText:['B','A'],caseStudy:{s1:'reason'},imageLabels:{h1:'Nucleus'},
    });
  });

  it('supports non-linear exam navigation and mutable pre-submit outcomes',()=>{
    const session=createRecoverableSession({catalogId:'c',kind:'exam',mode:'fixed',itemIds:['a','b','c'],nowMs:1000,id:'s'});
    navigateExam(session,2,1500);
    expect(currentSessionCardId(session)).toBe('c');
    gradeExamCard(session,'partial',2000);
    expect(session.outcomes.c).toBe('partial');
    expect(currentSessionCardId(session)).toBe('a');
    navigateExam(session,2,2500);
    gradeExamCard(session,'correct',3000);
    expect(session.outcomes.c).toBe('correct');
    expect(Object.keys(session.outcomes)).toHaveLength(1);
    expect(examQuestionStatuses(session)[2]).toMatchObject({current:false,outcome:'correct'});
  });

  it('completes an exam only after every item has an outcome',()=>{
    const session=createRecoverableSession({catalogId:'c',kind:'exam',mode:'fixed',itemIds:['a','b'],nowMs:1000,id:'s'});
    gradeExamCard(session,'correct',1500);
    expect(sessionComplete(session)).toBe(false);
    gradeExamCard(session,'incorrect',2000);
    expect(sessionComplete(session)).toBe(true);
  });

  it('scores partial answers at half of card points',()=>{
    const score=calculateExamScore([card('a','A',4),card('b','B',2),card('c','C',2)],{a:'correct',b:'partial',c:'incorrect'});
    expect(score).toEqual({points:5,maxPoints:8,percentage:62.5,items:3});
  });

  it('accumulates response time when navigating',()=>{
    const session=createRecoverableSession({catalogId:'c',kind:'exam',mode:'fixed',itemIds:['a','b'],nowMs:1000,id:'s'});
    accrueCurrentTime(session,2500);
    expect(session.timeSpentMs.a).toBe(1500);
    navigateExam(session,1,3000);
    expect(session.timeSpentMs.a).toBe(2000);
  });
});

describe('exam selection',()=>{
  it('uses blueprint weights instead of raw question counts in dynamic mode',()=>{
    const cards=[...Array.from({length:9},(_,i)=>card(`a${i}`,'A')),card('b1','B')];
    const blueprint:ExamBlueprint={id:'bp',catalogId:'c',version:1,totalItems:4,sections:[{topicId:'A',weight:1},{topicId:'B',weight:3}]};
    const ids=selectExamCardIds(cards,blueprint,'dynamic',()=>0.25);
    const byId=new Map(cards.map(item=>[item.id,item]));
    const topics=ids.map(id=>byId.get(id)?.topicId);
    expect(ids).toHaveLength(4);
    expect(topics.filter(topic=>topic==='B')).toHaveLength(1);
    expect(topics.filter(topic=>topic==='A')).toHaveLength(3);
  });

  it('respects fixed target size and returns unique card ids',()=>{
    const cards=Array.from({length:10},(_,i)=>card(`c${i}`));
    const blueprint:ExamBlueprint={id:'bp',catalogId:'c',version:1,totalItems:5,sections:[{topicId:'A',weight:1}]};
    const ids=selectExamCardIds(cards,blueprint,'fixed',()=>0.4);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });
});
