import { builtinCatalog } from './builtin-v04';
import { analyzeCatalogAssets, linkAssetToCard, removeAssetFromCatalog, unlinkAssetFromCard, updateCatalogAssetMetadata, upsertCatalogAsset } from './asset-authoring';
import { detachAssetFromCatalog, getStoredAsset, inferMediaType, listStoredAssets, storeAsset } from './asset-store';
import { assetRenderKind, formatAssetBytes, isAssetRoleVisible } from './asset-rendering';
import { loadState, saveState, type PersistedState } from './db';
import type { AssetRole, CardVersion, Catalog } from './model';

let observer: MutationObserver | undefined;
let renderScheduled = false;
let renderGeneration = 0;
let renderedSignature = '';
const activeObjectUrls: string[] = [];
const MAX_LOCAL_ASSET_BYTES = 128 * 1024 * 1024;
const MAX_UPLOAD_BATCH_BYTES = 512 * 1024 * 1024;

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]!));

function fallbackState(): PersistedState {
  return { schemaVersion:3, progress:{}, history:[], review:{}, sessions:{}, examAttempts:[], migrationLog:[] };
}

async function activeContext(): Promise<{ state: PersistedState; catalog: Catalog }> {
  const state = await loadState(fallbackState());
  if (!Array.isArray(state.catalogs) || !state.catalogs.length) {
    state.catalogs = [structuredClone(builtinCatalog)];
    state.activeCatalogId = builtinCatalog.catalogId;
  }
  const catalog = state.catalogs.find(entry => entry.catalogId === state.activeCatalogId) ?? state.catalogs[0];
  return { state, catalog };
}

async function activeCatalog(): Promise<Catalog> {
  return (await activeContext()).catalog;
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

function cardOptions(catalog: Catalog): string {
  return catalog.cards.map(card => `<option value="${esc(card.id)}">${esc(card.id)} · ${esc(card.prompt.slice(0,80))}</option>`).join('');
}

function roleOptions(): string {
  const roles: Array<[AssetRole,string]> = [['prompt','Frage'],['answer','Musterlösung'],['reference','Referenz nach Aufdecken'],['attachment','Anhang sofort']];
  return roles.map(([role,label]) => `<option value="${role}">${label}</option>`).join('');
}

function issueLabel(code: string): string {
  return ({ORPHAN_ASSET:'nicht verwendet',MISSING_BINARY:'Binärdaten fehlen',MISSING_MANIFEST:'Manifest fehlt',UNMANIFESTED_BINARY:'Binärdaten ohne Manifest',DUPLICATE_REF:'doppelte Referenz'} as Record<string,string>)[code] ?? code;
}

async function renderAssetLibrary(message = ''): Promise<void> {
  const root = app();
  if (!root) return;
  const { catalog } = await activeContext();
  const manifest = catalog.assets ?? [];
  const stored = await listStoredAssets(catalog.catalogId);
  const storedIds = new Set(stored.map(asset => asset.id));
  const analysis = analyzeCatalogAssets(catalog, storedIds);
  const bytes = manifest.reduce((sum, asset) => sum + asset.byteLength, 0);
  const linkedByAsset = new Map<string, Array<{cardId:string;role:AssetRole}>>();
  for (const card of catalog.cards) for (const ref of card.assetRefs ?? []) {
    const list = linkedByAsset.get(ref.assetId) ?? [];
    list.push({cardId:card.id,role:ref.role});
    linkedByAsset.set(ref.assetId,list);
  }
  const issueList = analysis.issues.length
    ? `<ul>${analysis.issues.slice(0,50).map(issue => `<li><strong>${esc(issueLabel(issue.code))}:</strong> ${esc(issue.message)}</li>`).join('')}</ul>`
    : '<p>Keine Asset-Inkonsistenzen gefunden.</p>';
  const assetEntries = manifest.map(asset => {
    const links = linkedByAsset.get(asset.id) ?? [];
    const linkList = links.length ? `<ul>${links.map(link => `<li>${esc(link.cardId)} · ${esc(link.role)} <button data-asset-unlink data-asset-id="${esc(asset.id)}" data-card-id="${esc(link.cardId)}" data-role="${esc(link.role)}">lösen</button></li>`).join('')}</ul>` : '<p class="muted">Noch nicht mit einer Karte verknüpft.</p>';
    return `<details class="panel" data-asset-entry="${esc(asset.id)}"><summary><strong>${esc(asset.fileName ?? asset.id.slice(0,22))}</strong> · ${esc(asset.kind)} · ${formatAssetBytes(asset.byteLength)} · ${analysis.usageCounts.get(asset.id) ?? 0} Links · ${storedIds.has(asset.id)?'lokal':'fehlt'}</summary><div class="form-grid"><label>Alt-Text<input data-asset-alt value="${esc(asset.altText ?? '')}" placeholder="Was ist auf dem Bild zu erkennen?"></label><label>Rechte / Quelle<input data-asset-rights value="${esc(asset.rights ?? '')}" placeholder="z. B. eigene Aufnahme / Lizenz / Quelle"></label></div><div class="question-actions"><button data-asset-save-metadata data-asset-id="${esc(asset.id)}">Metadaten speichern</button></div><h3>Kartenverknüpfung</h3>${linkList}${catalog.cards.length?`<div class="form-grid"><label>Karte<select data-asset-card>${cardOptions(catalog)}</select></label><label>Rolle<select data-asset-role>${roleOptions()}</select></label></div><button data-asset-link data-asset-id="${esc(asset.id)}">Mit Karte verknüpfen</button>`:'<p>Dieser Katalog enthält noch keine Karten.</p>'}${(analysis.usageCounts.get(asset.id)??0)===0?`<div class="question-actions"><button class="danger" data-asset-remove data-asset-id="${esc(asset.id)}">Unverwendetes Asset entfernen</button></div>`:''}</details>`;
  }).join('');
  const cleanupCount = analysis.orphanAssetIds.length + analysis.unmanifestedBinaryIds.length;
  root.innerHTML = shell(`<section class="panel"><span class="eyebrow">${esc(catalog.title)}</span><h2>${manifest.length} Assets</h2><p>${formatAssetBytes(bytes)} im Manifest · ${stored.length} Binärdatensätze diesem Katalog zugeordnet.</p>${message?`<div class="notice">${esc(message)}</div>`:''}<label class="button-like">Bilder / Audio hinzufügen<input id="asset-upload" hidden type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"></label><p class="muted">Auf iPhone/iPad öffnet dies den System-Datei-/Fotoauswahldialog. Pro Datei maximal 128 MiB, pro Auswahl maximal 512 MiB. Andere Dateitypen werden nicht übernommen.</p></section><section class="panel"><h2>Validierung</h2>${issueList}${cleanupCount?`<button data-asset-cleanup>${cleanupCount} unreferenzierte Speicherobjekte bereinigen</button>`:''}</section>${assetEntries || '<section class="panel"><p>Für diesen Katalog sind noch keine Assets hinterlegt.</p></section>'}`);
  bindAssetLibrary();
}

async function uploadAssets(files: File[]): Promise<void> {
  if (!files.length) return;
  const total = files.reduce((sum,file)=>sum+file.size,0);
  if (total > MAX_UPLOAD_BATCH_BYTES) throw new Error('Die gewählte Dateigruppe überschreitet 512 MiB.');
  const { state, catalog } = await activeContext();
  let imported = 0;
  let skipped = 0;
  for (const file of files) {
    const mediaType = file.type || inferMediaType(file.name);
    if (file.size > MAX_LOCAL_ASSET_BYTES || !assetRenderKind(mediaType)) {
      skipped++;
      continue;
    }
    const entry = await storeAsset({ bytes:new Uint8Array(await file.arrayBuffer()), catalogId:catalog.catalogId, fileName:file.name, mediaType, source:'local' });
    upsertCatalogAsset(catalog, entry);
    imported++;
  }
  catalog.updatedAt = new Date().toISOString();
  await saveState(state);
  await renderAssetLibrary(`${imported} Assets hinzugefügt${skipped?`; ${skipped} wegen Typ/Größe übersprungen`:''}.`);
}

async function saveMetadata(details: HTMLElement, assetId: string): Promise<void> {
  const { state, catalog } = await activeContext();
  updateCatalogAssetMetadata(catalog, assetId, {
    altText:details.querySelector<HTMLInputElement>('[data-asset-alt]')?.value,
    rights:details.querySelector<HTMLInputElement>('[data-asset-rights]')?.value,
  });
  await saveState(state);
  await renderAssetLibrary('Asset-Metadaten gespeichert.');
}

async function linkAsset(details: HTMLElement, assetId: string): Promise<void> {
  const cardId = details.querySelector<HTMLSelectElement>('[data-asset-card]')?.value;
  const role = details.querySelector<HTMLSelectElement>('[data-asset-role]')?.value as AssetRole | undefined;
  if (!cardId || !role) return;
  const { state, catalog } = await activeContext();
  linkAssetToCard(catalog, assetId, cardId, role);
  await saveState(state);
  await renderAssetLibrary('Asset-Verknüpfung gespeichert.');
}

async function unlinkAsset(assetId: string, cardId: string, role: AssetRole): Promise<void> {
  const { state, catalog } = await activeContext();
  unlinkAssetFromCard(catalog, assetId, cardId, role);
  await saveState(state);
  await renderAssetLibrary('Asset-Verknüpfung entfernt.');
}

async function removeUnusedAsset(assetId: string): Promise<void> {
  const { state, catalog } = await activeContext();
  removeAssetFromCatalog(catalog, assetId);
  await saveState(state);
  await detachAssetFromCatalog(assetId, catalog.catalogId);
  await renderAssetLibrary('Unverwendetes Asset aus diesem Katalog entfernt.');
}

async function cleanupUnusedAssets(): Promise<void> {
  const { state, catalog } = await activeContext();
  const stored = await listStoredAssets(catalog.catalogId);
  const analysis = analyzeCatalogAssets(catalog, stored.map(asset => asset.id));
  const detachIds = [...new Set([...analysis.orphanAssetIds, ...analysis.unmanifestedBinaryIds])];
  for (const assetId of analysis.orphanAssetIds) removeAssetFromCatalog(catalog, assetId);
  await saveState(state);
  for (const assetId of detachIds) await detachAssetFromCatalog(assetId, catalog.catalogId);
  await renderAssetLibrary(`${detachIds.length} unreferenzierte Speicherobjekte bereinigt.`);
}

function bindAssetLibrary(): void {
  document.querySelector<HTMLElement>('[data-asset-back]')?.addEventListener('click', () => location.reload());
  document.querySelector<HTMLInputElement>('#asset-upload')?.addEventListener('change', event => {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    target.value = '';
    void uploadAssets(files).catch(error => alert(`Asset-Upload fehlgeschlagen: ${String(error)}`));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-asset-save-metadata]').forEach(button => button.addEventListener('click', () => {
    const details = button.closest<HTMLElement>('[data-asset-entry]');
    const assetId = button.dataset.assetId;
    if (details && assetId) void saveMetadata(details, assetId).catch(error => alert(String(error)));
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-asset-link]').forEach(button => button.addEventListener('click', () => {
    const details = button.closest<HTMLElement>('[data-asset-entry]');
    const assetId = button.dataset.assetId;
    if (details && assetId) void linkAsset(details, assetId).catch(error => alert(String(error)));
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-asset-unlink]').forEach(button => button.addEventListener('click', () => {
    const {assetId,cardId,role} = button.dataset;
    if (assetId && cardId && role) void unlinkAsset(assetId, cardId, role as AssetRole).catch(error => alert(String(error)));
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-asset-remove]').forEach(button => button.addEventListener('click', () => {
    const assetId = button.dataset.assetId;
    if (assetId && confirm('Dieses unverwendete Asset aus dem Katalog entfernen?')) void removeUnusedAsset(assetId).catch(error => alert(String(error)));
  }));
  document.querySelector<HTMLElement>('[data-asset-cleanup]')?.addEventListener('click', () => {
    if (confirm('Alle unreferenzierten Asset-Manifeste und diesem Katalog zugeordneten Speicherobjekte bereinigen?')) void cleanupUnusedAssets().catch(error => alert(String(error)));
  });
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
