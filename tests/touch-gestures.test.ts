import { describe, expect, it } from 'vitest';
import { detectHorizontalSwipe, touchGestureAction } from '../src/touch-gestures';

describe('touch gesture domain',()=>{
  it('detects deliberate horizontal swipes in both directions',()=>{
    expect(detectHorizontalSwipe({x:220,y:100,at:0},{x:100,y:112,at:300})).toBe('left');
    expect(detectHorizontalSwipe({x:100,y:100,at:0},{x:205,y:90,at:250})).toBe('right');
  });

  it('rejects short, vertical and slow movements',()=>{
    expect(detectHorizontalSwipe({x:100,y:100,at:0},{x:150,y:102,at:200})).toBeUndefined();
    expect(detectHorizontalSwipe({x:100,y:100,at:0},{x:180,y:210,at:250})).toBeUndefined();
    expect(detectHorizontalSwipe({x:200,y:100,at:0},{x:100,y:105,at:900})).toBeUndefined();
  });

  it('maps exam swipes only to existing navigation semantics',()=>{
    expect(touchGestureAction('left','exam',false)).toBe('next');
    expect(touchGestureAction('right','exam',true)).toBe('previous');
  });

  it('allows only safe learning skip before reveal and never grades by gesture',()=>{
    expect(touchGestureAction('left','learning',false)).toBe('skip');
    expect(touchGestureAction('right','learning',false)).toBeUndefined();
    expect(touchGestureAction('left','learning',true)).toBeUndefined();
    expect(touchGestureAction('right','learning',true)).toBeUndefined();
  });
});
