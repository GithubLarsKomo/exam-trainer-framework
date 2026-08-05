import { describe, expect, it } from 'vitest';
import { shouldOfferWaitingUpdate, shouldReloadAfterControllerChange } from '../src/pwa-update-policy';

describe('PWA update policy',()=>{
  it('does not offer an update for first service-worker control without a waiting update',()=>{
    expect(shouldOfferWaitingUpdate(false,true)).toBe(false);
    expect(shouldOfferWaitingUpdate(true,false)).toBe(false);
    expect(shouldOfferWaitingUpdate(true,true)).toBe(true);
  });

  it('never reloads on controllerchange before explicit update activation',()=>{
    expect(shouldReloadAfterControllerChange({updateActivationRequested:false,reloadingForUpdate:false})).toBe(false);
  });

  it('reloads exactly once after the learner explicitly activates a waiting update',()=>{
    expect(shouldReloadAfterControllerChange({updateActivationRequested:true,reloadingForUpdate:false})).toBe(true);
    expect(shouldReloadAfterControllerChange({updateActivationRequested:true,reloadingForUpdate:true})).toBe(false);
  });
});
