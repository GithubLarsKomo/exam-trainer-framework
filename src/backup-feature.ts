import { createFullBackup, FULL_BACKUP_LIMITS, parseFullBackup } from './backup';
import { loadState, replaceStateAndAssetsAtomically, saveState, type PersistedState } from './db';

let observer: MutationObserver | undefined;

function fallbackState(): PersistedState {
  return { schemaVersion:3, progress:{}, history:[], review:{}, sessions:{}, examAttempts:[], migrationLog:[] };
}

function downloadBytes(name: string, bytes: Uint8Array): void {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type:'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportFullBackup(button: HTMLButtonElement): Promise<void> {
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = 'Vollbackup wird erstellt …';
  try {
    const createdAt = new Date();
    const current = await loadState(fallbackState());
    const state = structuredClone(current);
    state.lastBackupAt = createdAt.toISOString();
    const archive = await createFullBackup(state, createdAt);
    await saveState(state);
    downloadBytes(`etf-full-backup-${createdAt.toISOString().slice(0,10)}.etfb`, archive);
  } catch (error) {
    alert(`Vollbackup fehlgeschlagen: ${String(error)}`);
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}

async function importFullBackup(file: File): Promise<void> {
  if (file.size > FULL_BACKUP_LIMITS.maxArchiveBytes) throw new Error('Die Backup-Datei überschreitet das Sicherheitslimit.');
  const parsed = await parseFullBackup(new Uint8Array(await file.arrayBuffer()));
  const bytes = parsed.assets.reduce((sum, asset) => sum + asset.byteLength, 0);
  const catalogs = parsed.state.catalogs?.length ?? 0;
  const answer = confirm(`Vollbackup vom ${new Date(parsed.manifest.createdAt).toLocaleString('de-DE')} wiederherstellen?\n\n${catalogs} Kataloge · ${parsed.assets.length} Assets · ${(bytes / (1024 * 1024)).toFixed(1)} MiB\n\nDer aktuelle lokale State und Assetbestand werden atomar ersetzt.`);
  if (!answer) return;
  await replaceStateAndAssetsAtomically(parsed.state, parsed.assets);
  alert('Vollbackup wurde vollständig wiederhergestellt.');
  location.reload();
}

function markLegacyControls(settings: HTMLElement): void {
  const legacyExport = settings.querySelector<HTMLButtonElement>('[data-export]');
  if (legacyExport && !legacyExport.dataset.backupLegacyMarked) {
    legacyExport.dataset.backupLegacyMarked = 'true';
    legacyExport.textContent = 'JSON-State exportieren (ohne Medien)';
  }
  const legacyInput = settings.querySelector<HTMLInputElement>('#backup-import');
  const legacyLabel = legacyInput?.closest('label');
  if (legacyLabel && !legacyLabel.hasAttribute('data-backup-legacy-marked')) {
    legacyLabel.setAttribute('data-backup-legacy-marked', 'true');
    const textNode = Array.from(legacyLabel.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = 'JSON-State importieren (ohne Medien) ';
  }
}

function injectFullBackupControls(): void {
  const settings = document.querySelector<HTMLElement>('.settings-list');
  if (!settings) return;
  markLegacyControls(settings);
  if (settings.querySelector('[data-full-backup-export]')) return;

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.dataset.fullBackupExport = '';
  exportButton.className = 'primary';
  exportButton.textContent = 'Vollbackup exportieren (.etfb)';
  exportButton.addEventListener('click', () => void exportFullBackup(exportButton));

  const importLabel = document.createElement('label');
  importLabel.className = 'button-like';
  importLabel.dataset.fullBackupImportLabel = '';
  importLabel.append('Vollbackup importieren (.etfb) ');
  const input = document.createElement('input');
  input.hidden = true;
  input.type = 'file';
  input.accept = '.etfb,application/zip';
  input.dataset.fullBackupImport = '';
  input.addEventListener('change', event => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    void importFullBackup(file).catch(error => alert(`Vollbackup konnte nicht wiederhergestellt werden: ${String(error)}`));
  });
  importLabel.append(input);

  settings.prepend(importLabel);
  settings.prepend(exportButton);
  const panel = settings.closest<HTMLElement>('.panel');
  if (panel && !panel.querySelector('[data-full-backup-note]')) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.dataset.fullBackupNote = '';
    note.textContent = 'Für Gerätewechsel das Vollbackup verwenden: Es enthält Lernstand, Kataloge und alle lokalen Binärassets. Das ältere JSON-Backup enthält keine Medien.';
    settings.insertAdjacentElement('afterend', note);
  }
}

export function installBackupFeature(): void {
  injectFullBackupControls();
  const root = document.querySelector('#app');
  if (!root) return;
  observer?.disconnect();
  observer = new MutationObserver(() => injectFullBackupControls());
  observer.observe(root, { childList:true, subtree:true });
}
