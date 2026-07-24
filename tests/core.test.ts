import { describe, expect, it } from 'vitest';
import { allocatePoints, applyOutcome, numericMatches, STAGE_INTERVAL_MS } from '../src/core';

describe('spaced repetition', () => {
  it('promotes, demotes and retains stages correctly', () => {
    expect(applyOutcome(1, 'correct', 0)).toEqual({stage:2,dueAt:STAGE_INTERVAL_MS[2],retry:false});
    expect(applyOutcome(1, 'incorrect', 0)).toEqual({stage:1,dueAt:STAGE_INTERVAL_MS[1],retry:true});
    expect(applyOutcome(4, 'partial', 0)).toEqual({stage:4,dueAt:STAGE_INTERVAL_MS[4]/2,retry:true});
    expect(applyOutcome(5, 'correct', 0)).toEqual({stage:5,dueAt:STAGE_INTERVAL_MS[5],retry:false});
  });
});

describe('numeric assessment', () => {
  it('supports absolute and relative tolerances', () => {
    expect(numericMatches(10.1, 10, {type:'absolute',value:0.1})).toBe(true);
    expect(numericMatches(109, 100, {type:'relative',value:0.1})).toBe(true);
    expect(numericMatches(111, 100, {type:'relative',value:0.1})).toBe(false);
  });
});

describe('exam allocation', () => {
  it('creates exactly 57 tasks and 202 points', () => {
    const points = allocatePoints(57, 202);
    expect(points).toHaveLength(57);
    expect(points.reduce((a,b)=>a+b,0)).toBe(202);
    expect(Math.min(...points)).toBeGreaterThanOrEqual(1);
  });
});
