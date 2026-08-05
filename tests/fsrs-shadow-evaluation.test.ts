import { describe, expect, it } from 'vitest';
import type { Outcome, ReviewEvent } from '../src/model';
import { evaluateFsrsShadow, FSRS_ACTIVATION_POLICY } from '../src/fsrs-shadow-evaluation';

const DAY_MS=24*60*60*1000;
const start=new Date('2026-01-01T00:00:00.000Z').getTime();

function syntheticEvents(failIndexes:Set<number>):ReviewEvent[]{
  const events:ReviewEvent[]=[];
  for(let item=0;item<40;item++){
    for(let review=0;review<10;review++){
      const at=start+review*4*DAY_MS+item*1000;
      const outcome:Outcome=failIndexes.has(review)?'incorrect':'correct';
      events.push({
        id:`${item}-${review}`,
        knowledgeItemId:`item-${item}`,
        questionVariantId:`item-${item}:q1`,
        source:'learning',
        outcome,
        answeredAt:new Date(at).toISOString(),
        scheduler:{
          classic:{stage:3,dueAt:new Date(at+2*DAY_MS).toISOString()},
          fsrs:{dueAt:new Date(at+3*DAY_MS).toISOString(),stability:10,difficulty:5,state:2},
        },
      });
    }
  }
  return events;
}

describe('FSRS shadow evaluation',()=>{
  it('stays in data collection mode without sufficient real evidence',()=>{
    const result=evaluateFsrsShadow(syntheticEvents(new Set()).slice(0,80));
    expect(result.status).toBe('insufficient-data');
    expect(result.evidenceComplete).toBe(false);
    expect(result.reasons).toContain(`mindestens ${FSRS_ACTIVATION_POLICY.shadow.minReviews} Shadow-Reviews`);
  });

  it('marks a shadow dataset as pilot candidate only when retention and effort gates pass',()=>{
    const result=evaluateFsrsShadow(syntheticEvents(new Set([5])));
    expect(result.reviewCount).toBe(400);
    expect(result.distinctItems).toBe(40);
    expect(result.observationDays).toBeGreaterThanOrEqual(30);
    expect(result.fsrsDueReviews).toBe(360);
    expect(result.observedRecallAtFsrsDue).toBeCloseTo(320/360,6);
    expect(result.projectedReviewEffortRatio).toBeCloseTo(2/3,6);
    expect(result.evidenceComplete).toBe(true);
    expect(result.qualityGatesPass).toBe(true);
    expect(result.status).toBe('pilot-candidate');
  });

  it('holds when sufficient evidence shows retention below the safety threshold',()=>{
    const result=evaluateFsrsShadow(syntheticEvents(new Set([2,5,8])));
    expect(result.evidenceComplete).toBe(true);
    expect(result.observedRecallAtFsrsDue).toBeLessThan(FSRS_ACTIVATION_POLICY.shadow.minObservedRecallAtDue);
    expect(result.status).toBe('hold');
    expect(result.reasons.some(reason=>reason.includes('beobachtete Retention'))).toBe(true);
  });

  it('ignores migration-only history and can be scoped to a catalog item set',()=>{
    const events=syntheticEvents(new Set());
    events[0]={...events[0],migrationSource:'legacy-history'};
    const result=evaluateFsrsShadow(events,['item-0','item-1']);
    expect(result.reviewCount).toBe(19);
    expect(result.distinctItems).toBe(2);
    expect(result.status).toBe('insufficient-data');
  });
});
