import { builtinCatalog } from './builtin-v04';
import { getStoredAsset } from './asset-store';
import { assetRenderKind } from './asset-rendering';
import { loadState, saveState, type PersistedState } from './db';
import { configureImageLabelCard, MAX_IMAGE_LABEL_HOTSPOTS } from './image-labels';
import type { CardVersion, Catalog, ImageLabelHotspot } from './model';

let observer: MutationObserver | undefined;
let scheduled = false;
let editorState: { assetId:string; cardId:string; hotspots:ImageLabelHotspot[]; objectUrl:string } | undefined;
let sessionSignature = '';
let sessionAssetKey = '';
let sessionObjectUrl = '';
const sessionAnswers = new Map<string,Record<string,string>>();

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]!));

function fallbackState(): PersistedState {
  return { schemaVersion:3, progress:{}, history:[], review:{}, sessions:{}, examAttempts:[], migrationLog:[] };
}

async function activeContext(): Promise<{state:PersistedState;catalog:Catalog}> {
  const state = await loadState(fallbackState());
  if (!Array.isArray(state.catalogs) || !state.catalogs.length) {
    state.catalogs = [structuredClone(builtinCatalog)];
    state.activeCatalogId = builtinCatalog.catalogId;
  }
  const catalog = state.catalogs.find(entry => entry.catalogId === state.activeCatalogId) ?? state.catalogs[0];
  return {state,catalog};
}

function app(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>('#app') ?? undefined;
}

function blobUrl(bytes: Uint8Array, mediaType: string): string {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return URL.createObjectURL(new Blob([buffer], {type:mediaType}));
}

function nextHotspotId(hotspots: ImageLabelHotspot[]): string {
  let index = 1;
  const ids = new Set(hotspots.map(hotspot=>hotspot.id));
  while (ids.has(`h${index}`)) index++;
  return `h${index}`;
}

async function openEditor(assetId: string, cardId: string): Promise<void> {
  const {catalog} = await activeContext();
  const asset = catalog.assets?.find(entry=>entry.id===assetId);
  const card = catalog.cards.find(entry=>entry.id===cardId);
  if (!asset || asset.kind !== 'image' || !card) throw new Error('Bild-Asset oder Zielkarte wurde nicht gefunden.');
  const stored = await getStoredAsset(assetId);
  if (!stored || assetRenderKind(stored.mediaType) !== 'image') throw new Error('Dieses Bildformat ist für den Hotspot-Editor nicht freigegeben.');
  if (editorState?.objectUrl) URL.revokeObjectURL(editorState.objectUrl);
  const objectUrl = blobUrl(stored.bytes, stored.mediaType);
  editorState = {
    assetId, cardId, objectUrl,
    hotspots: card.questionType === 'image_labels' && card.assetRefs?.some(ref=>ref.assetId===assetId && ref.role==='prompt')
      ? structuredClone(card.answer.imageLabels ?? [])
      : [],
  };
  renderEditor(catalog, card);
}

function renderEditor(catalog: Catalog, card: CardVersion): void {
  const root = app();
  if (!root || !editorState) return;
  const markers = editorState.hotspots.map((hotspot,index)=>`<button type="button" data-hotspot-marker="${esc(hotspot.id)}" style="position:absolute;left:${hotspot.x*100}%;top:${hotspot.y*100}%;transform:translate(-50%,-50%);min-width:32px;min-height:32px;border-radius:999px"><strong>${index+1}</strong></button>`).join('');
  const rows = editorState.hotspots.map((hotspot,index)=>`<div class="form-grid" data-hotspot-row="${esc(hotspot.id)}"><label>Hotspot ${index+1}<input data-hotspot-label value="${esc(hotspot.label)}"></label><label>Position<input disabled value="${(hotspot.x*100).toFixed(1)} % / ${(hotspot.y*100).toFixed(1)} %"></label><button type="button" class="danger" data-hotspot-delete="${esc(hotspot.id)}">Entfernen</button></div>`).join('');
  root.innerHTML = `<div class="app-shell"><header class="app-header"><div><div class="eyebrow">Image Labels</div><h1>${esc(card.id)} · Hotspots</h1></div><button data-hotspot-cancel>← Abbrechen</button></header><main><section class="panel"><h2>${esc(card.prompt)}</h2><p>Tippe/klicke direkt auf das Bild, um einen Hotspot anzulegen. Koordinaten werden relativ zum Bild gespeichert und bleiben damit responsive.</p><div style="position:relative;display:inline-block;max-width:100%;touch-action:manipulation"><img id="hotspot-editor-image" src="${esc(editorState.objectUrl)}" alt="${esc(catalog.assets?.find(asset=>asset.id===editorState!.assetId)?.altText ?? 'Hotspot-Editor') }" style="display:block;max-width:100%;height:auto;border-radius:12px">${markers}</div><p class="muted">${editorState.hotspots.length} / ${MAX_IMAGE_LABEL_HOTSPOTS} Hotspots</p></section><section class="panel"><h2>Beschriftungen</h2>${rows || '<p>Noch keine Hotspots. Auf das Bild tippen, um den ersten Punkt anzulegen.</p>'}<div class="question-actions"><button class="primary" data-hotspot-save ${editorState.hotspots.length?'':'disabled'}>Als Image-Label-Frage speichern</button></div></section></main></div>`;
  bindEditor();
}

function bindEditor(): void {
  if (!editorState) return;
  document.querySelector<HTMLElement>('[data-hotspot-cancel]')?.addEventListener('click',()=>{
    if (editorState?.objectUrl) URL.revokeObjectURL(editorState.objectUrl);
    editorState=undefined;
    location.reload();
  });
  document.querySelector<HTMLImageElement>('#hotspot-editor-image')?.addEventListener('click',event=>{
    if (!editorState || editorState.hotspots.length >= MAX_IMAGE_LABEL_HOTSPOTS) return;
    const image=event.currentTarget as HTMLImageElement;
    const rect=image.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));
    const y=Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));
    editorState.hotspots.push({id:nextHotspotId(editorState.hotspots),label:`Bezeichnung ${editorState.hotspots.length+1}`,x,y});
    void activeContext().then(({catalog})=>{
      const card=catalog.cards.find(entry=>entry.id===editorState?.cardId);
      if (card) renderEditor(catalog,card);
    });
  });
  document.querySelectorAll<HTMLInputElement>('[data-hotspot-label]').forEach(input=>input.addEventListener('input',()=>{
    const row=input.closest<HTMLElement>('[data-hotspot-row]');
    const hotspot=editorState?.hotspots.find(entry=>entry.id===row?.dataset.hotspotRow);
    if (hotspot) hotspot.label=input.value;
  }));
  document.querySelectorAll<HTMLElement>('[data-hotspot-delete]').forEach(button=>button.addEventListener('click',()=>{
    if (!editorState) return;
    editorState.hotspots=editorState.hotspots.filter(hotspot=>hotspot.id!==button.dataset.hotspotDelete);
    void activeContext().then(({catalog})=>{
      const card=catalog.cards.find(entry=>entry.id===editorState?.cardId);
      if (card) renderEditor(catalog,card);
    });
  }));
  document.querySelector<HTMLElement>('[data-hotspot-save]')?.addEventListener('click',()=>void saveEditor().catch(error=>alert(String(error))));
}

async function saveEditor(): Promise<void> {
  if (!editorState) return;
  document.querySelectorAll<HTMLInputElement>('[data-hotspot-label]').forEach(input=>{
    const row=input.closest<HTMLElement>('[data-hotspot-row]');
    const hotspot=editorState?.hotspots.find(entry=>entry.id===row?.dataset.hotspotRow);
    if (hotspot) hotspot.label=input.value;
  });
  const {state,catalog}=await activeContext();
  configureImageLabelCard(catalog,editorState.cardId,editorState.assetId,editorState.hotspots);
  await saveState(state);
  URL.revokeObjectURL(editorState.objectUrl);
  editorState=undefined;
  alert('Image-Label-Hotspots gespeichert.');
  location.reload();
}

function visibleCard(catalog: Catalog): CardVersion | undefined {
  const prompt=document.querySelector<HTMLElement>('.question-card h2')?.textContent?.trim();
  if (!prompt) return undefined;
  const candidates=catalog.cards.filter(card=>card.prompt.trim()===prompt);
  if (candidates.length===1) return candidates[0];
  const topicLine=document.querySelector<HTMLElement>('.session-top span:nth-child(2)')?.textContent?.trim()??'';
  const topicMatches=candidates.filter(card=>topicLine.startsWith(`${card.topicId} ·`)||topicLine===card.topicId);
  return topicMatches.length===1?topicMatches[0]:undefined;
}

function cleanupSessionBlock(): void {
  document.querySelectorAll('.etf-image-label-block').forEach(element=>element.remove());
  const textarea=document.querySelector<HTMLTextAreaElement>('.question-card textarea');
  if (textarea) textarea.style.display='';
  sessionSignature='';
}

function removeDuplicatePromptAsset(assetId:string): void {
  document.querySelectorAll<HTMLElement>('.etf-asset-block figure').forEach(figure=>{
    if (figure.dataset.assetId!==assetId) return;
    const block=figure.closest<HTMLElement>('.etf-asset-block');
    figure.remove();
    if (block && !block.children.length) block.remove();
  });
}

async function renderSession(): Promise<void> {
  if (editorState) return;
  const questionCard=document.querySelector<HTMLElement>('.question-card');
  if (!questionCard) {
    if (sessionSignature) cleanupSessionBlock();
    return;
  }
  const {catalog}=await activeContext();
  const card=visibleCard(catalog);
  const hotspots=card?.answer.imageLabels;
  const promptRef=card?.assetRefs?.find(ref=>ref.role==='prompt');
  if (!card || card.questionType!=='image_labels' || !hotspots?.length || !promptRef) {
    if (sessionSignature) cleanupSessionBlock();
    return;
  }
  const stored=await getStoredAsset(promptRef.assetId);
  if (!stored || assetRenderKind(stored.mediaType)!=='image') return;
  removeDuplicatePromptAsset(promptRef.assetId);
  const revealed=Boolean(questionCard.querySelector('.answer-box'));
  const signature=`${catalog.catalogId}|${card.id}|${promptRef.assetId}|${revealed}|${JSON.stringify(hotspots)}`;
  if (signature===sessionSignature && questionCard.querySelector('.etf-image-label-block')) return;
  questionCard.querySelectorAll('.etf-image-label-block').forEach(element=>element.remove());
  sessionSignature=signature;
  if (sessionAssetKey!==promptRef.assetId) {
    if (sessionObjectUrl) URL.revokeObjectURL(sessionObjectUrl);
    sessionAssetKey=promptRef.assetId;
    sessionObjectUrl=blobUrl(stored.bytes,stored.mediaType);
  }
  const textarea=questionCard.querySelector<HTMLTextAreaElement>('textarea');
  if (textarea) textarea.style.display='none';
  const answers=sessionAnswers.get(card.id)??{};
  sessionAnswers.set(card.id,answers);
  const markerHtml=hotspots.map((hotspot,index)=>`<div style="position:absolute;left:${hotspot.x*100}%;top:${hotspot.y*100}%;transform:translate(-50%,-50%);padding:.3rem .5rem;border-radius:999px;background:Canvas;color:CanvasText;border:2px solid currentColor;max-width:45%;font-size:.85rem"><strong>${index+1}</strong>${revealed?` · ${esc(hotspot.label)}`:''}</div>`).join('');
  const answerHtml=!revealed
    ? `<div class="form-grid">${hotspots.map((hotspot,index)=>`<label>${index+1}<input data-image-label-answer="${esc(hotspot.id)}" value="${esc(answers[hotspot.id]??'')}" placeholder="Bezeichnung"></label>`).join('')}</div>`
    : `<div class="table-scroll"><table><thead><tr><th>#</th><th>Deine Antwort</th><th>Muster</th></tr></thead><tbody>${hotspots.map((hotspot,index)=>`<tr><td>${index+1}</td><td>${esc(answers[hotspot.id]??'–')}</td><td>${esc(hotspot.label)}</td></tr>`).join('')}</tbody></table></div>`;
  const block=document.createElement('div');
  block.className='etf-image-label-block';
  block.innerHTML=`<div style="position:relative;display:inline-block;max-width:100%;margin:1rem 0"><img src="${esc(sessionObjectUrl)}" alt="${esc(promptRef.altText??promptRef.sourceFileName??'Bildbeschriftung')}" style="display:block;max-width:100%;height:auto;border-radius:12px">${markerHtml}</div>${answerHtml}`;
  const heading=questionCard.querySelector('h2');
  heading?.insertAdjacentElement('afterend',block);
  block.querySelectorAll<HTMLInputElement>('[data-image-label-answer]').forEach(input=>input.addEventListener('input',()=>{
    answers[input.dataset.imageLabelAnswer??'']=input.value;
  }));
}

async function injectEditorButtons(): Promise<void> {
  if (editorState) return;
  const {catalog}=await activeContext();
  document.querySelectorAll<HTMLElement>('[data-asset-entry]').forEach(details=>{
    if (details.querySelector('[data-image-label-editor]')) return;
    const assetId=details.dataset.assetEntry;
    const asset=catalog.assets?.find(entry=>entry.id===assetId);
    if (!asset || asset.kind!=='image') return;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.imageLabelEditor='';
    button.textContent='Hotspots für ausgewählte Karte bearbeiten';
    button.addEventListener('click',()=>{
      const cardId=details.querySelector<HTMLSelectElement>('[data-asset-card]')?.value;
      if (assetId&&cardId) void openEditor(assetId,cardId).catch(error=>alert(String(error)));
    });
    const actions=document.createElement('div');
    actions.className='question-actions';
    actions.append(button);
    details.append(actions);
  });
}

function schedule(): void {
  if (scheduled) return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    void injectEditorButtons().catch(()=>{});
    void renderSession().catch(()=>{});
  });
}

export function installImageLabelFeature(): void {
  schedule();
  const root=app();
  if (!root) return;
  observer?.disconnect();
  observer=new MutationObserver(()=>schedule());
  observer.observe(root,{childList:true,subtree:true});
}
