import { builtinCatalog } from './builtin-v04';
import { getStoredAsset, listStoredAssets } from './asset-store';
import { assetRenderKind, formatAssetBytes, isAssetRoleVisible } from './asset-rendering';
import { loadState, type PersistedState } from './db';
import type { CardVersion, Catalog } from './model';

let observer: MutationObserver | undefined;
let renderScheduled = false;
let renderGeneration = 0;
let renderedSignature = '';
const activeObjectUrls: string[] = [];

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]!));

function fallbackState(): PersistedState {
  return { schemaVersion:3, progress:{}, history:[], review:{}, sessions:{}, examAttempts:[], migrationLog:[] };
}

async function activeCatalog(): Promise<Catalog> {
  const state = await loadState(fallbackState());
  const catalogs = Array.isArray(state.catalogs) && state.catalogs.length ? state.catalogs : [structuredClone(builtinCatalog)];
  return catalogs.find(catalog => catalog.catalogId === state.activeCatalogId) ?? catalogs[0];
}

function app(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>('#app') ?? undefined;
}

function cleanupRenderedAssets(): void {
  for (const url of activeObjectUrls.splice(0)) URL.revokeObjectURL(url);
  document.querySelectorAll('.etf-asset-block').forEach(element => element.remove());
  renderedSignature = '';
}

function visibleCard(catalog: Catalog): CardVersion | undefined {
  const prompt = document.querySelector<HTMLElement>('.question-card h2')?.textContent?.trim();
  if (!prompt) return undefined;
  const candidates = catalog.cards.filter(card => card.prompt.trim() === prompt);
  if (candidates.length === 1) return candidates[0];
  const topicLine = document.querySelector<HTMLElement>('.session-top span:nth-child(2)')?.textContent?.trim() ?? '';
  const topicMatches = candidates.filter(card => topicLine.startsWith(`${card.topicId} ·`) || topicLine === card.topicId);
  return topicMatches.length === 1 ? topicMatches[0] : undefined;
}

function objectUrl(bytes: Uint8Array, mediaType: string): string {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type: mediaType }));
  activeObjectUrls.push(url);
  return url;
}

async function renderSessionAssets(): Promise<void> {
  const questionCard = document.querySelector<HTMLElement>('.question-card');
  if (!questionCard) {
    if (renderedSignature) cleanupRenderedAssets();
    return;
  }
  const catalog = await activeCatalog();
  const card = visibleCard(catalog);
  if (!card?.assetRefs?.length) {
    if (renderedSignature) cleanupRenderedAssets();
    return;
  }
  const revealed = Boolean(questionCard.querySelector('.answer-box'));
  const signature = `${catalog.catalogId}|${card.id}|${revealed}|${card.assetRefs.map(ref => `${ref.assetId}:${ref.role}`).join(',')}`;
  if (signature === renderedSignature) return;

  const generation = ++renderGeneration;
  cleanupRenderedAssets();
  renderedSignature = signature;
  const promptBlock = document.createElement('div');
  promptBlock.className = 'etf-asset-block';
  promptBlock.style.margin = '1rem 0';
  const answerBlock = document.createElement('div');
  answerBlock.className = 'etf-asset-block';
  answerBlock.style.marginTop = '1rem';

  for (const ref of card.assetRefs) {
    if (!isAssetRoleVisible(ref.role, revealed)) continue;
    const stored = await getStoredAsset(ref.assetId);
    if (generation !== renderGeneration) return;
    if (!stored) continue;
    const kind = assetRenderKind(stored.mediaType);
    if (!kind) continue;

    const url = objectUrl(stored.bytes, stored.mediaType);
    const wrapper = document.createElement('figure');
    wrapper.dataset.assetId = ref.assetId;
    wrapper.style.margin = '0 0 1rem';
    if (kind === 'image') {
      const image = document.createElement('img');
      image.src = url;
      image.alt = ref.altText ?? ref.sourceFileName ?? 'Lernmedium';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.style.maxWidth = '100%';
      image.style.height = 'auto';
      image.style.borderRadius = '12px';
      wrapper.append(image);
    } else {
      const audio = document.createElement('audio');
      audio.src = url;
      audio.controls = true;
      audio.preload = 'metadata';
      audio.style.width = '100%';
      wrapper.append(audio);
    }
    (ref.role === 'prompt' || ref.role === 'attachment' ? promptBlock : answerBlock).append(wrapper);
  }

  if (promptBlock.childElementCount) questionCard.querySelector('h2')?.insertAdjacentElement('afterend', promptBlock);
  const answerBox = questionCard.querySelector<HTMLElement>('.answer-box');
  if (answerBlock.childElementCount && answerBox) answerBox.append(answerBlock);
}

function scheduleSessionRender(): void {
  if (renderScheduled) return;
  renderScheduled = true;
  queueMicrotask(() => {
    renderScheduled = false;
    void renderSessionAssets().catch(() => {
      // Asset display is supplementary; a missing/corrupt asset must not break a learning session.
    });
  });
}

function shell(content: string): string {
  return `<div class="app-shell"><header class="app-header"><div><div class="eyebrow">Exam Trainer Framework</div><h1>Asset Library</h1></div><button data-asset-back>← Zur App</button></header><main>${content}</main></div>`;
}

async function renderAssetLibrary(): Promise<void> {
  const root = app();
  if (!root) return;
  const catalog = await activeCatalog();
  const manifest = catalog.assets ?? [];
  const stored = await listStoredAssets(catalog.catalogId);
  const storedIds = new Set(stored.map(asset => asset.id));
  const linkCounts = new Map<string, number>();
  for (const card of catalog.cards) for (const ref of card.assetRefs ?? []) linkCounts.set(ref.assetId, (linkCounts.get(ref.assetId) ?? 0) + 1);
  const bytes = manifest.reduce((sum, asset) => sum + asset.byteLength, 0);
  const rows = manifest.map(asset => `<tr><td>${esc(asset.fileName ?? asset.id.slice(0, 22))}</td><td>${esc(asset.kind)}</td><td>${esc(asset.mediaType)}</td><td>${formatAssetBytes(asset.byteLength)}</td><td>${linkCounts.get(asset.id) ?? 0}</td><td>${storedIds.has(asset.id) ? 'lokal' : 'fehlt'}</td></tr>`).join('');
  root.innerHTML = shell(`<section class="panel"><span class="eyebrow">${esc(catalog.title)}</span><h2>${manifest.length} Assets</h2><p>${formatAssetBytes(bytes)} Manifestgröße · ${stored.length} Binärdatensätze lokal vorhanden.</p><p class="muted">SVG, HTML, PDF und unbekannte Medientypen werden aus importierten Daten nicht direkt gerendert. Rasterbilder und unterstützte Audiodateien bleiben vollständig offline.</p></section><section class="panel"><h2>Bestand</h2>${rows ? `<div class="table-scroll"><table><thead><tr><th>Datei</th><th>Art</th><th>Typ</th><th>Größe</th><th>Links</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>Für diesen Katalog sind noch keine Assets hinterlegt.</p>'}</section>`);
  root.querySelector<HTMLElement>('[data-asset-back]')?.addEventListener('click', () => location.reload());
}

function injectSettingsButton(): void {
  const settings = document.querySelector<HTMLElement>('.settings-list');
  if (!settings || settings.querySelector('[data-open-asset-library]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.openAssetLibrary = '';
  button.textContent = 'Asset Library';
  button.addEventListener('click', () => void renderAssetLibrary());
  settings.append(button);
}

export function installAssetFeature(): void {
  injectSettingsButton();
  scheduleSessionRender();
  const root = app();
  if (!root) return;
  observer?.disconnect();
  observer = new MutationObserver(() => {
    injectSettingsButton();
    scheduleSessionRender();
  });
  observer.observe(root, { childList:true, subtree:true });
}
