let observer: MutationObserver | undefined;
let scheduled = false;

function brandMarkup(className: string): HTMLElement {
  const brand = document.createElement('div');
  brand.className = className;
  brand.innerHTML = `
    <img src="/assets/etf-mark.svg" alt="" decoding="async">
    <span class="brand-wordmark"><strong>Exam Trainer</strong><small>Framework</small></span>
  `;
  return brand;
}

function ensureHeaderBrand(): void {
  const brandHost = document.querySelector<HTMLElement>('.app-header > div:first-child');
  if (!brandHost) return;
  const eyebrow = brandHost.querySelector<HTMLElement>(':scope > .eyebrow');
  eyebrow?.classList.add('brand-eyebrow-replaced');
  if (brandHost.querySelector('.app-brand-lockup')) return;
  brandHost.prepend(brandMarkup('app-brand-lockup'));
}

function ensureRailBrand(): void {
  const nav = document.querySelector<HTMLElement>('.bottom-nav');
  if (!nav || nav.querySelector('.rail-brand')) return;
  const brand = brandMarkup('rail-brand');
  brand.setAttribute('aria-label', 'Exam Trainer Framework');
  nav.prepend(brand);
}

function dedupeEditorPreview(): void {
  const holder = document.querySelector<HTMLElement>('.preview [data-production-preview]');
  const aside = holder?.closest<HTMLElement>('.preview');
  if (!holder || !aside || aside.dataset.visualCompletionDedupe === 'true') return;
  for (const child of Array.from(aside.children)) {
    if (child !== holder) child.remove();
  }
  aside.dataset.visualCompletionDedupe = 'true';
}

function apply(): void {
  ensureHeaderBrand();
  ensureRailBrand();
  dedupeEditorPreview();
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    apply();
  });
}

export function installVisualCompletionV2(): void {
  apply();
  const root = document.querySelector('#app');
  if (!root) return;
  observer?.disconnect();
  observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true });
}
