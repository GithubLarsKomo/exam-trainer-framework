export interface PwaControllerChangeState {
  updateActivationRequested: boolean;
  reloadingForUpdate: boolean;
}

export function shouldOfferWaitingUpdate(hasWaitingWorker: boolean, hasController: boolean): boolean {
  return hasWaitingWorker && hasController;
}

export function shouldReloadAfterControllerChange(state: PwaControllerChangeState): boolean {
  return state.updateActivationRequested && !state.reloadingForUpdate;
}
