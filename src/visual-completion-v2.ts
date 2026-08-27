let observer: MutationObserver | undefined;
let scheduled = false;

function ensureHeaderBrand(): void {
  const brandHost = document.querySelector<HTMLElement>('.app-header > div:first-child');
  if (!brandHost || brandHost.querySelector('.app-brand-logo')) return;
  const logo = document.createElement('img');
  logo.className = 'app-brand-logo';
  logo.src = '/assets/exam-trainer-framework-logo.png';
  logo.alt = 'Exam Trainer Framework';
  logo.decoding = 'async';
  brandHost.prepend(logo);
}

function ensureRailBrand(): void {
  const nav = document.querySelector<HTMLElement>('.bottom-nav');
  if (!nav || nav.querySelector('.rail-brand')) return;
  const brand = document.createElement('div');
  brand.className = 'rail-brand';
  brand.setAttribute('aria-hidden', 'true');
  brand.innerHTML = '<img src="/assets/exam-trainer-framework-logo.png" alt="">';
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
