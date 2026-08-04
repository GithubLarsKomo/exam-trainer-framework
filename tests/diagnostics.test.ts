import { describe, expect, it } from 'vitest';
import { analyzeLearningDiagnostics, interventionsFor } from '../src/diagnostics';
import type { Progress, ReviewEvent } from '../src/model';

function event(id: string, outcome: ReviewEvent['outcome'], day: number, options: Partial<ReviewEvent> = {}): ReviewEvent {
  return { id:`${id}:${day}:${outcome}`, knowledgeItemId:id, questionVariantId:`${id}:q1`, source:'learning', outcome, answeredAt:`2026-08-${String(day).padStart(2,'0')}T08:00:00.000Z`, ...options };
}
function progress(stage:number):Progress{return {stage,dueAt:'2026-08-10T00:00:00.000Z',correct:1,partial:0,incorrect:0,skipped:0,marked:false,cardVersion:1};}

describe('learning diagnostics',()=>{
  it('detects repeated failures and proposes bounded interventions',()=>{
    const events=[event('a','correct',1),event('a','incorrect',2),event('a','incorrect',3),event('a','incorrect',4)];
    const [d]=analyzeLearningDiagnostics(events,{a:progress(1)},new Date('2026-08-05T00:00:00Z'));
    expect(d.leech).toBe(true);
    expect(d.codes).toContain('REPEATED_FAILURE');
    expect(d.codes).toContain('REGRESSION_AFTER_SUCCESS');
    expect(d.interventions).toContain('REVIEW_EXPLANATION');
    expect(d.interventions).toContain('TRY_ALTERNATE_VARIANT');
    expect(d.interventions).toContain('COMPARE_WITH_PRIOR_SUCCESS');
  });

  it('detects uncertainty and slow recall from observable review data',()=>{
    const events=[event('b','partial',1,{responseTimeMs:70_000}),event('b','partial',2,{responseTimeMs:80_000}),event('b','partial',3,{responseTimeMs:90_000})];
    const [d]=analyzeLearningDiagnostics(events,{b:progress(3)},new Date('2026-08-05T00:00:00Z'));
    expect(d.codes).toContain('REPEATED_UNCERTAINTY');
    expect(d.codes).toContain('SLOW_RECALL');
    expect(d.medianResponseTimeMs).toBe(80_000);
    expect(d.interventions).toEqual(expect.arrayContaining(['REVIEW_EXPLANATION','SHORT_RECALL_DRILL']));
  });

  it('elevates recent exam failures and low mastery after many reviews',()=>{
    const events=[1,2,3,4,5,6].map(day=>event('c',day===6?'incorrect':'correct',day,day===6?{source:'exam'}:{}));
    const [d]=analyzeLearningDiagnostics(events,{c:progress(2)},new Date('2026-08-10T00:00:00Z'));
    expect(d.severity).toBe('high');
    expect(d.leech).toBe(true);
    expect(d.interventions).toEqual(expect.arrayContaining(['RETEST_UNDER_EXAM_CONDITIONS','BREAK_DOWN_KNOWLEDGE_ITEM']));
  });

  it('deduplicates interventions shared by multiple diagnostic codes',()=>{
    expect(interventionsFor(['REPEATED_FAILURE','REPEATED_UNCERTAINTY']).filter(x=>x==='REVIEW_EXPLANATION')).toHaveLength(1);
  });
});
