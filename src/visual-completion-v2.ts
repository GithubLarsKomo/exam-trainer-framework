import { getDeploymentProfile } from './deployment-profile';

let observer: MutationObserver | undefined;
let scheduled = false;

function brandMarkup(className: string): HTMLElement {
  const profile = getDeploymentProfile();
  const brand = document.createElement('div');
  brand.className = className;

  if (profile.branding.logoUrl) {
    const image = document.createElement('img');
    image.src = profile.branding.logoUrl;
    image.alt = '';
    image.decoding = 'async';
    brand.append(image);
  } else {
    const mark = document.createElement('span');
    mark.className = 'brand-mark-text';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = profile.branding.shortName.slice(0, 2).toUpperCase();
    brand.append(mark);
  }

  const wordmark = document.createElement('span');
  wordmark.className = 'brand-wordmark';
  const primary = document.createElement('strong');
  primary.textContent = profile.branding.wordmarkPrimary;
  wordmark.append(primary);
  if (profile.branding.wordmarkSecondary) {
    const secondary = document.createElement('small');
    secondary.textContent = profile.branding.wordmarkSecondary;
    wordmark.append(secondary);
  }
  brand.append(wordmark);
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
  brand.setAttribute('aria-label', getDeploymentProfile().branding.productName);
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
