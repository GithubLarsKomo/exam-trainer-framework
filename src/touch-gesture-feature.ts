import './touch-gesture-feature.css';
import { detectHorizontalSwipe, touchGestureAction, type GesturePoint } from './touch-gestures';

export const TOUCH_GESTURES_KEY = 'etf:touch-gestures:v1';

type ActivePointer = {
  pointerId: number;
  sessionId: string;
  start: GesturePoint;
};

let observer: MutationObserver | undefined;
let scheduled = false;
let activePointer: ActivePointer | undefined;

function enabled(): boolean {
  try { return localStorage.getItem(TOUCH_GESTURES_KEY) === '1'; }
  catch { return false; }
}

function setEnabled(value: boolean): void {
  try {
    if (value) localStorage.setItem(TOUCH_GESTURES_KEY,'1');
    else localStorage.removeItem(TOUCH_GESTURES_KEY);
  } catch { /* local storage can be unavailable in hardened/private contexts */ }
  schedule();
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return Boolean(target.closest('textarea,input,select,button,a,label,audio,video,[contenteditable="true"],.etf-structured-question,[data-image-label-answer]'));
}

function touchCapable(): boolean {
  return navigator.maxTouchPoints > 0 || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
}

function injectSettings(): void {
  if (document.querySelector('[data-touch-gesture-settings]')) return;
  const heading=Array.from(document.querySelectorAll<HTMLElement>('.panel h2')).find(node=>node.textContent?.trim()==='Daten und Sicherung');
  const anchor=heading?.closest<HTMLElement>('.panel');
  if(!anchor) return;
  const panel=document.createElement('section');
  panel.className='panel touch-gesture-settings';
  panel.dataset.touchGestureSettings='';
  panel.innerHTML=`<span class="eyebrow">Bedienung</span><h2>Touch-Gesten</h2><label class="check-row"><input type="checkbox" data-touch-gestures-toggle ${enabled()?'checked':''}><span>Swipe-Gesten auf Touch-Geräten aktivieren</span></label><p class="muted">Standardmäßig aus. In Prüfungen: links = nächste, rechts = vorherige Frage. Beim Lernen: links = später beantworten. Lösung und Bewertung bleiben immer bewusste Button-Aktionen; alle vorhandenen Buttons bleiben als vollständiger Fallback erhalten.</p>`;
  anchor.insertAdjacentElement('afterend',panel);
}

function syncSession(): void {
  const root=document.querySelector<HTMLElement>('[data-recoverable-session]');
  if(!root) return;
  const isEnabled=enabled();
  if(isEnabled) root.dataset.touchGesturesActive='';
  else delete root.dataset.touchGesturesActive;

  const existing=root.querySelector<HTMLElement>('[data-touch-gesture-hint]');
  if(!isEnabled || !touchCapable()) { existing?.remove(); return; }
  if(existing) return;
  const question=root.querySelector<HTMLElement>('.question-card');
  if(!question) return;
  const hint=document.createElement('p');
  hint.className='touch-gesture-hint';
  hint.dataset.touchGestureHint='';
  const exam=Boolean(root.querySelector('[data-recoverable-exam-nav]'));
  hint.textContent=exam?'Wischen: ← nächste · → vorherige Frage. Buttons bleiben verfügbar.':'Wischen nach links: später beantworten. Lösung und Bewertung bleiben per Button.';
  question.append(hint);
}

function sync(): void {
  injectSettings();
  syncSession();
}

function schedule(): void {
  if(scheduled) return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;sync();});
}

function sessionRoot(target: EventTarget | null): HTMLElement | undefined {
  if(!(target instanceof Element)) return undefined;
  return target.closest<HTMLElement>('[data-recoverable-session]') ?? undefined;
}

function activateExistingControl(root: HTMLElement, action: 'next'|'previous'|'skip'): void {
  const selector=action==='next'?'[data-recoverable-next]':action==='previous'?'[data-recoverable-prev]':'[data-recoverable-skip]';
  const control=root.querySelector<HTMLButtonElement>(selector);
  if(!control || control.disabled) return;
  control.click();
}

function onPointerDown(event: PointerEvent): void {
  if(!enabled() || event.pointerType!=='touch' || !event.isPrimary || isInteractiveTarget(event.target)) return;
  const root=sessionRoot(event.target);
  const question=(event.target as Element).closest('.question-card');
  if(!root || !question) return;
  activePointer={pointerId:event.pointerId,sessionId:root.dataset.recoverableSession??'',start:{x:event.clientX,y:event.clientY,at:event.timeStamp}};
}

function onPointerUp(event: PointerEvent): void {
  const pointer=activePointer;
  activePointer=undefined;
  if(!pointer || pointer.pointerId!==event.pointerId || event.pointerType!=='touch' || isInteractiveTarget(event.target)) return;
  const root=sessionRoot(event.target);
  if(!root || (root.dataset.recoverableSession??'')!==pointer.sessionId) return;
  const selection=window.getSelection();
  if(selection && !selection.isCollapsed && selection.toString().trim()) return;
  const direction=detectHorizontalSwipe(pointer.start,{x:event.clientX,y:event.clientY,at:event.timeStamp});
  if(!direction) return;
  const exam=Boolean(root.querySelector('[data-recoverable-exam-nav]'));
  const revealed=Boolean(root.querySelector('[data-recoverable-grade]'));
  const action=touchGestureAction(direction,exam?'exam':'learning',revealed);
  if(action) activateExistingControl(root,action);
}

function onPointerCancel(): void { activePointer=undefined; }

function onChange(event: Event): void {
  const target=event.target;
  if(!(target instanceof HTMLInputElement) || !target.matches('[data-touch-gestures-toggle]')) return;
  setEnabled(target.checked);
}

export function installTouchGestureFeature(): void {
  document.addEventListener('pointerdown',onPointerDown,{passive:true});
  document.addEventListener('pointerup',onPointerUp,{passive:true});
  document.addEventListener('pointercancel',onPointerCancel,{passive:true});
  document.addEventListener('change',onChange,true);
  window.addEventListener('storage',event=>{if(event.key===TOUCH_GESTURES_KEY)schedule();});
  schedule();
  const root=document.querySelector('#app');
  if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}
}
