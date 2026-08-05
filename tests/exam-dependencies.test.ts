import { describe, expect, it } from 'vitest';
import type { CardVersion, ExamBlueprint } from '../src/model';
import { buildExamSelectionUnits, lockedDependentExamCardIds, selectExamCardIdsWithDependencies } from '../src/exam-dependencies';

const card=(id:string,topicId='A',extra:Record<string,unknown>={}):CardVersion=>({
  id,version:1,status:'released',topicId,examQuestion:id,prompt:id,points:1,difficulty:2,tags:[],questionType:'free_text',answer:{modelAnswer:id},source:'test',changedAt:'2026-08-05T00:00:00.000Z',...extra,
} as CardVersion);

const blueprint:ExamBlueprint={id:'bp',catalogId:'c',version:1,totalItems:4,sections:[{topicId:'A',weight:1},{topicId:'B',weight:1}]};

describe('dependent examination tasks',()=>{
  it('keeps grouped subtasks adjacent and ordered as one selection unit',()=>{
    const cards=[
      card('a2','A',{examGroupId:'exam-1',examGroupOrder:2}),
      card('x','B'),
      card('a1','A',{examGroupId:'exam-1',examGroupOrder:1}),
    ];
    const units=buildExamSelectionUnits(cards);
    const group=units.find(unit=>unit.key==='group:exam-1');
    expect(group?.ids).toEqual(['a1','a2']);
  });

  it('never splits a dependent group in fixed selection',()=>{
    const cards=[
      card('a1','A',{examGroupId:'exam-1',examGroupOrder:1}),
      card('a2','A',{examGroupId:'exam-1',examGroupOrder:2}),
      card('b1','B'),card('b2','B'),card('b3','B'),
    ];
    const ids=selectExamCardIdsWithDependencies(cards,{...blueprint,totalItems:3},'fixed',()=>0.4);
    const hasFirst=ids.includes('a1');
    expect(ids.includes('a2')).toBe(hasFirst);
    if(hasFirst) expect(Math.abs(ids.indexOf('a1')-ids.indexOf('a2'))).toBe(1);
    expect(ids.length).toBeLessThanOrEqual(3);
  });

  it('keeps group order intact in dynamic blueprint selection',()=>{
    const cards=[
      card('a1','A',{examGroupId:'exam-1',examGroupOrder:1}),
      card('a2','A',{examGroupId:'exam-1',examGroupOrder:2}),
      card('a3','A'),card('b1','B'),card('b2','B'),
    ];
    const ids=selectExamCardIdsWithDependencies(cards,blueprint,'dynamic',()=>0.25);
    if(ids.includes('a1')) {
      expect(ids).toContain('a2');
      expect(ids.indexOf('a2')).toBe(ids.indexOf('a1')+1);
    }
    expect(ids.length).toBeLessThanOrEqual(blueprint.totalItems!);
  });

  it('does not exceed the global target when multiple weighted groups would overshoot independently',()=>{
    const cards=[
      card('a1','A',{examGroupId:'group-a',examGroupOrder:1}),
      card('a2','A',{examGroupId:'group-a',examGroupOrder:2}),
      card('b1','B',{examGroupId:'group-b',examGroupOrder:1}),
      card('b2','B',{examGroupId:'group-b',examGroupOrder:2}),
    ];
    const ids=selectExamCardIdsWithDependencies(cards,{...blueprint,totalItems:3},'dynamic',()=>0.25);
    expect(ids.length).toBeLessThanOrEqual(3);
    expect(ids.includes('a1')).toBe(ids.includes('a2'));
    expect(ids.includes('b1')).toBe(ids.includes('b2'));
  });

  it('allows an unavoidable atomic overflow only when every selectable unit exceeds the target',()=>{
    const cards=[
      card('a1','A',{examGroupId:'group-a',examGroupOrder:1}),
      card('a2','A',{examGroupId:'group-a',examGroupOrder:2}),
    ];
    const ids=selectExamCardIdsWithDependencies(cards,{...blueprint,totalItems:1},'fixed',()=>0.25);
    expect(ids).toEqual(['a1','a2']);
  });

  it('locks later subtasks until all predecessors are graded',()=>{
    const cards=[
      card('a1','A',{examGroupId:'exam-1',examGroupOrder:1}),
      card('a2','A',{examGroupId:'exam-1',examGroupOrder:2}),
      card('a3','A',{examGroupId:'exam-1',examGroupOrder:3}),
      card('b1','B'),
    ];
    expect([...lockedDependentExamCardIds(['b1','a1','a2','a3'],cards,{})]).toEqual(['a2','a3']);
    expect([...lockedDependentExamCardIds(['b1','a1','a2','a3'],cards,{a1:'correct'})]).toEqual(['a3']);
    expect([...lockedDependentExamCardIds(['b1','a1','a2','a3'],cards,{a1:'correct',a2:'partial'})]).toEqual([]);
  });
});
