import { builtinCatalog } from './builtin-v04';
import { loadState, migrate, saveState, type PersistedState } from './db';
import { parseApkgImport } from './import-anki';
import { createCatalogFromImportPreview } from './import-commit';
import { parseDelimitedImport } from './import-delimited';
import { createImportPreview, suggestImportMapping } from './import-preview';
import type { ImportMapping, ImportPreview, NormalizedImportBundle } from './import-model';
import type { AppState } from './model';

let bundle: NormalizedImportBundle | undefined;
let preview: ImportPreview | undefined;
let observer: MutationObserver | undefined;

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]!));

function app(): HTMLElement {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('App root not found.');
  return root;
}

function baseName(name?: string): string {
  return (name ?? 'Import').replace(/\.(apkg|csv|tsv)$/i, '').trim() || 'Import';
}

function slug(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'import';
}

function shell(body: string): string {
  return `<div class="app-shell"><header class="app-header"><div><div class="eyebrow">Exam Trainer Framework</div><h1>Inhalte importieren</h1></div><button data-import-back>← Zur App</button></header><main>${body}</main></div>`;
}

function renderChooser(message = ''): void {
  bundle = undefined;
  preview = undefined;
  app().innerHTML = shell(`<section class="panel"><span class="eyebrow">Anki / CSV / TSV</span><h2>Importdatei auswählen</h2><p>Der Import läuft immer über Mapping, sanitisiertes Preview und einen expliziten Commit. Anki-Scheduling-Historie wird nicht übernommen.</p>${message ? `<div class="notice">${esc(message)}</div>` : ''}<label class="button-like">Datei auswählen<input id="content-import-file" hidden type="file" accept=".apkg,.csv,.tsv,text/csv,text/tab-separated-values"></label><p class="muted">APKG-Inhalte werden als nicht vertrauenswürdig behandelt. Template-HTML und JavaScript werden niemals ausgeführt.</p></section>`);
  bindScreen();
}

function fieldNames(): string[] {
  if (!bundle) return [];
  return [...new Set(bundle.notes.flatMap(note => note.fields.map(field => field.name)))];
}

function selectOptions(selected: string | undefined, optional = false): string {
  const options = optional ? [''] : [];
  options.push(...fieldNames());
  return options.map(value => `<option value="${esc(value)}" ${value === (selected ?? '') ? 'selected' : ''}>${value ? esc(value) : '– nicht verwenden –'}</option>`).join('');
}

function warningList(): string {
  if (!preview?.warnings.length) return '<p>Keine Importwarnungen.</p>';
  return `<ul>${preview.warnings.slice(0, 50).map(warning => `<li><strong>${warning.blocking ? 'Blockierend' : 'Hinweis'}:</strong> ${esc(warning.message)}</li>`).join('')}</ul>${preview.warnings.length > 50 ? `<p class="muted">Weitere ${preview.warnings.length - 50} Warnungen ausgeblendet.</p>` : ''}`;
}

function renderPreview(): void {
  if (!bundle || !preview) return renderChooser();
  const mapping = preview.mapping;
  const sampleRows = preview.candidates.slice(0, 25).map(candidate => `<tr><td>${esc(candidate.topicId)}</td><td>${esc(candidate.prompt)}</td><td>${esc(candidate.modelAnswer)}</td><td>${esc(candidate.questionType)}</td></tr>`).join('');
  const mediaNotice = bundle.media.length
    ? `<div class="notice"><strong>${bundle.media.length} Mediendateien erkannt.</strong> Sie bleiben im Parser-Bundle erhalten, werden aber bis zur Asset-Library noch nicht in den Katalog committed. Bild-/Audio-abhängige Wissenseinheiten im Preview besonders prüfen.</div>`
    : '';
  const metadata = bundle.sourceKind === 'apkg'
    ? `APKG · ${esc(bundle.metadata.collectionFile ?? 'unbekannte Collection')} · Schema ${esc(bundle.metadata.ankiSchemaVersion ?? 'unbekannt')}`
    : `${bundle.sourceKind.toUpperCase()} · Trennzeichen ${bundle.metadata.delimiter === '\t' ? 'Tab' : 'Komma'}`;
  app().innerHTML = shell(`<section class="panel"><span class="eyebrow">Preview</span><h2>${esc(bundle.sourceName ?? 'Import')}</h2><p>${metadata} · ${bundle.notes.length} Quell-Notes · ${preview.candidates.length} importierbare Wissenseinheiten</p><div class="notice">Scheduling importiert: <strong>nein</strong>. Templates werden nicht ausgeführt; angezeigter Inhalt ist Plain Text.</div>${mediaNotice}</section><section class="panel"><h2>Feldzuordnung</h2><div class="form-grid"><label>Frage<select id="map-question">${selectOptions(mapping.questionField)}</select></label><label>Musterantwort<select id="map-answer">${selectOptions(mapping.answerField)}</select></label><label>Erklärung<select id="map-explanation">${selectOptions(mapping.explanationField,true)}</select></label><label>Quelle<select id="map-source">${selectOptions(mapping.sourceField,true)}</select></label><label>Thema<select id="map-topic">${selectOptions(mapping.topicField,true)}</select></label><label>Fallback-Thema<input id="map-default-topic" value="${esc(mapping.defaultTopic ?? 'Import')}"></label><label>Fallback-Quelle<input id="map-default-source" value="${esc(mapping.defaultSource ?? '')}"></label></div>${bundle.sourceKind === 'apkg' ? `<label><input id="map-topic-deck" type="checkbox" ${mapping.topicFromDeck ? 'checked' : ''}> Deck-Hierarchie als Thema verwenden, wenn kein Themenfeld gesetzt ist</label>` : ''}<label><input id="map-tags" type="checkbox" ${mapping.tagsAsTags === false ? '' : 'checked'}> Tags übernehmen</label><div class="question-actions"><button data-import-remap>Preview neu berechnen</button></div></section><section class="panel"><h2>Warnungen</h2>${warningList()}</section><section class="panel"><h2>Stichprobe</h2>${sampleRows ? `<div class="table-scroll"><table><thead><tr><th>Thema</th><th>Frage</th><th>Musterantwort</th><th>Typ</th></tr></thead><tbody>${sampleRows}</tbody></table></div>` : '<p>Keine importierbaren Wissenseinheiten mit diesem Mapping.</p>'}</section><section class="panel"><h2>Commit</h2><div class="form-grid"><label>Katalogtitel<input id="import-title" value="${esc(baseName(bundle.sourceName))}"></label><label>Status<select id="import-status"><option value="draft">Entwurf – erst nach Review lernbar</option><option value="released">Freigegeben – nach diesem Preview direkt lernbar</option></select></label></div><p class="muted">Der Import erzeugt immer einen neuen Katalog. Bestehende Kataloge und Lernstände werden nicht überschrieben.</p><div class="question-actions"><button data-import-new-file>Andere Datei</button><button class="primary" data-import-commit ${preview.canCommit ? '' : 'disabled'}>${preview.candidates.length} Wissenseinheiten übernehmen</button></div></section>`);
  bindScreen();
}

function readMapping(): ImportMapping {
  if (!preview) throw new Error('No import preview available.');
  return {
    questionField: document.querySelector<HTMLSelectElement>('#map-question')?.value ?? preview.mapping.questionField,
    answerField: document.querySelector<HTMLSelectElement>('#map-answer')?.value ?? preview.mapping.answerField,
    explanationField: document.querySelector<HTMLSelectElement>('#map-explanation')?.value || undefined,
    sourceField: document.querySelector<HTMLSelectElement>('#map-source')?.value || undefined,
    topicField: document.querySelector<HTMLSelectElement>('#map-topic')?.value || undefined,
    topicFromDeck: document.querySelector<HTMLInputElement>('#map-topic-deck')?.checked ?? false,
    defaultTopic: document.querySelector<HTMLInputElement>('#map-default-topic')?.value.trim() || 'Import',
    defaultSource: document.querySelector<HTMLInputElement>('#map-default-source')?.value.trim() || 'Import',
    tagsAsTags: document.querySelector<HTMLInputElement>('#map-tags')?.checked ?? true,
  };
}

async function parseFile(file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'apkg') {
    bundle = await parseApkgImport(new Uint8Array(await file.arrayBuffer()), file.name);
  } else if (extension === 'csv' || extension === 'tsv') {
    if (file.size > 100 * 1024 * 1024) throw new Error('CSV/TSV-Dateien über 100 MiB werden im Browser-Import nicht verarbeitet.');
    bundle = parseDelimitedImport(await file.text(), extension, file.name);
  } else {
    throw new Error('Unterstützt werden .apkg, .csv und .tsv.');
  }
  preview = createImportPreview(bundle, suggestImportMapping(bundle));
  renderPreview();
}

async function commitPreview(): Promise<void> {
  if (!bundle || !preview) return;
  preview = createImportPreview(bundle, readMapping());
  if (!preview.canCommit) return renderPreview();
  const title = document.querySelector<HTMLInputElement>('#import-title')?.value.trim() || baseName(bundle.sourceName);
  const status = document.querySelector<HTMLSelectElement>('#import-status')?.value === 'released' ? 'released' : 'draft';
  const timestamp = Date.now();
  const catalog = createCatalogFromImportPreview(preview, {
    catalogId: `import-${slug(title)}-${timestamp}`,
    title,
    status,
  });
  const fallback: PersistedState = { schemaVersion:3, progress:{}, history:[], review:{}, sessions:{}, examAttempts:[], migrationLog:[] };
  const raw = migrate(await loadState(fallback)) as PersistedState & Partial<AppState>;
  const catalogs = Array.isArray(raw.catalogs) && raw.catalogs.length ? raw.catalogs : [structuredClone(builtinCatalog)];
  raw.catalogs = [...catalogs, catalog];
  raw.activeCatalogId = catalog.catalogId;
  await saveState(raw);
  app().innerHTML = shell(`<section class="panel centered"><div class="success">✓</div><h2>Import übernommen</h2><p>${catalog.cards.length} Wissenseinheiten wurden als neuer Katalog „${esc(catalog.title)}“ gespeichert.</p><p class="muted">Status: ${status === 'released' ? 'freigegeben' : 'Entwurf'}. Anki-Scheduling-Historie wurde nicht übernommen.</p><button class="primary" data-import-reload>Importierten Katalog öffnen</button></section>`);
  bindScreen();
}

function bindScreen(): void {
  document.querySelector<HTMLElement>('[data-import-back]')?.addEventListener('click', () => location.reload());
  document.querySelector<HTMLElement>('[data-import-reload]')?.addEventListener('click', () => location.reload());
  document.querySelector<HTMLElement>('[data-import-new-file]')?.addEventListener('click', () => renderChooser());
  document.querySelector<HTMLElement>('[data-import-remap]')?.addEventListener('click', () => {
    if (!bundle || !preview) return;
    preview = createImportPreview(bundle, readMapping());
    renderPreview();
  });
  document.querySelector<HTMLElement>('[data-import-commit]')?.addEventListener('click', () => void commitPreview().catch(error => alert(String(error))));
  document.querySelector<HTMLInputElement>('#content-import-file')?.addEventListener('change', event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    app().innerHTML = shell('<section class="panel"><h2>Import wird lokal analysiert …</h2><p>Die Datei verlässt das Gerät nicht.</p></section>');
    void parseFile(file).catch(error => renderChooser(`Import fehlgeschlagen: ${String(error)}`));
  });
}

function injectSettingsButton(): void {
  const settings = document.querySelector<HTMLElement>('.settings-list');
  if (!settings || settings.querySelector('[data-open-content-import]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.openContentImport = '';
  button.textContent = 'Anki / CSV / TSV importieren';
  button.addEventListener('click', () => renderChooser());
  settings.append(button);
}

export function installImportFeature(): void {
  injectSettingsButton();
  const root = document.querySelector('#app');
  if (!root) return;
  observer?.disconnect();
  observer = new MutationObserver(() => injectSettingsButton());
  observer.observe(root, { childList:true, subtree:true });
}
