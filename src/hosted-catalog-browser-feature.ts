import { createSnapshot, loadState, saveState, type PersistedState } from './db';
import {
  downloadHostedCatalog,
  fetchHostedCatalogRegistry,
  installDownloadedCatalog,
  type HostedCatalogRegistryEntryV1,
} from './hosted-catalog-registry';
import type { Catalog } from './model';

let observer: MutationObserver | undefined;
let scheduled = false;
let injecting = false;
const DEFAULT_REGISTRY_URL = '/catalogs/registry.json';
const fallback = (): PersistedState => ({schemaVersion:3,progress:{},history:[],review:{},sessions:{},examAttempts:[],migrationLog:[]});
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

async function localCatalogs(): Promise<{state: PersistedState; catalogs: Catalog[]}> {
  const state = await loadState(fallback());
  return { state, catalogs: state.catalogs ?? [] };
}

function absoluteRegistryUrl(value: string): string {
  const url = new URL(value.trim(), location.href);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Registry URL muss HTTP(S) verwenden.');
  if (url.username || url.password) throw new Error('Registry URL darf keine Zugangsdaten enthalten.');
  return url.toString();
}

export function hostedCatalogLocalState(entry: HostedCatalogRegistryEntryV1, catalogs: Catalog[]): 'missing' | 'same-version' | 'different-version' {
  const local = catalogs.find(catalog => catalog.catalogId === entry.id);
  if (!local) return 'missing';
  return local.version === entry.version ? 'same-version' : 'different-version';
}

export function hostedCatalogActionLabel(entry: HostedCatalogRegistryEntryV1, catalogs: Catalog[]): string {
  const state = hostedCatalogLocalState(entry, catalogs);
  if (state === 'missing') return 'Lokal importieren';
  if (state === 'same-version') return 'Lokale Kopie ersetzen';
  return `Auf ${entry.version} aktualisieren`;
}

function statusText(entry: HostedCatalogRegistryEntryV1, catalogs: Catalog[]): string {
  const local = catalogs.find(catalog => catalog.catalogId === entry.id);
  if (!local) return 'Noch nicht lokal vorhanden';
  if (local.version === entry.version) return `Lokal vorhanden · ${local.version}`;
  return `Lokal ${local.version} · Registry ${entry.version}`;
}

function registryRows(entries: HostedCatalogRegistryEntryV1[], catalogs: Catalog[]): string {
  if (!entries.length) return '<p class="muted">Die Registry enthält keine freigegebenen Kataloge.</p>';
  return `<div class="table-scroll"><table><thead><tr><th>Katalog</th><th>Version</th><th>Status</th><th>Aktion</th></tr></thead><tbody>${entries.map((entry, index) => {
    const details = [entry.description, ...(entry.tags ?? []).map(tag => `#${tag}`)].filter(Boolean).join(' · ');
    return `<tr><td><strong>${esc(entry.title)}</strong>${details ? `<br><small class="muted">${esc(details)}</small>` : ''}</td><td>${esc(entry.version)}</td><td>${esc(statusText(entry, catalogs))}</td><td><button type="button" data-hosted-catalog-import="${index}">${esc(hostedCatalogActionLabel(entry, catalogs))}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

async function renderBrowser(): Promise<void> {
  const lifecycle = document.querySelector<HTMLElement>('[data-catalog-lifecycle]');
  if (!lifecycle || lifecycle.querySelector('[data-hosted-catalog-browser]') || injecting) return;
  injecting = true;
  try {
    const host = document.querySelector<HTMLElement>('[data-catalog-lifecycle]');
    if (!host || host.querySelector('[data-hosted-catalog-browser]')) return;
    const section = document.createElement('section');
    section.dataset.hostedCatalogBrowser = '';
    section.innerHTML = `<hr><span class="eyebrow">Hosted Catalogs</span><h3>Freigegebene Kataloge beziehen</h3><p class="muted">Registry-Metadaten dienen nur der Auswahl. Vor jedem lokalen Import wird der Katalog erneut geladen, per SHA-256 geprüft und gegen ID, Version und Release-Status validiert.</p><div class="question-actions"><input type="url" data-hosted-registry-url value="${esc(DEFAULT_REGISTRY_URL)}" aria-label="Hosted Catalog Registry URL"><button type="button" data-hosted-registry-load>Registry laden</button></div><p class="muted" data-hosted-registry-status>Noch keine Registry geladen.</p><div data-hosted-registry-results></div>`;
    host.append(section);

    const input = section.querySelector<HTMLInputElement>('[data-hosted-registry-url]')!;
    const loadButton = section.querySelector<HTMLButtonElement>('[data-hosted-registry-load]')!;
    const status = section.querySelector<HTMLElement>('[data-hosted-registry-status]')!;
    const results = section.querySelector<HTMLElement>('[data-hosted-registry-results]')!;

    loadButton.addEventListener('click', async () => {
      loadButton.disabled = true;
      status.textContent = 'Registry wird geladen …';
      results.replaceChildren();
      try {
        const registryUrl = absoluteRegistryUrl(input.value);
        const registry = await fetchHostedCatalogRegistry(registryUrl);
        const { catalogs } = await localCatalogs();
        status.textContent = `${registry.catalogs.length} freigegebene Kataloge gefunden.`;
        results.innerHTML = registryRows(registry.catalogs, catalogs);
        results.querySelectorAll<HTMLButtonElement>('[data-hosted-catalog-import]').forEach(button => {
          button.addEventListener('click', async () => {
            const index = Number(button.dataset.hostedCatalogImport);
            const entry = registry.catalogs[index];
            if (!entry) return;
            button.disabled = true;
            status.textContent = `${entry.title} wird heruntergeladen und geprüft …`;
            try {
              const downloaded = await downloadHostedCatalog(entry, registryUrl);
              const { state, catalogs: currentCatalogs } = await localCatalogs();
              const existing = currentCatalogs.find(catalog => catalog.catalogId === entry.id);
              if (existing) {
                const accepted = confirm(`Katalog „${entry.title}“ ist lokal als Version ${existing.version} vorhanden. Durch die verifizierte Registry-Version ${entry.version} ersetzen? Lernfortschritt bleibt erhalten.`);
                if (!accepted) {
                  status.textContent = 'Import abgebrochen; lokale Kopie blieb unverändert.';
                  button.disabled = false;
                  return;
                }
              }
              await createSnapshot(state, `hosted-catalog-import-${entry.id}-${entry.version}`);
              state.catalogs = installDownloadedCatalog(currentCatalogs, downloaded, { replaceExisting: Boolean(existing) });
              await saveState(state);
              status.textContent = `„${entry.title}“ ${existing ? 'ersetzt' : 'importiert'} und lokal gespeichert.`;
              location.reload();
            } catch (error) {
              status.textContent = error instanceof Error ? error.message : 'Hosted Catalog konnte nicht importiert werden.';
              button.disabled = false;
            }
          });
        });
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Registry konnte nicht geladen werden.';
      } finally {
        loadButton.disabled = false;
      }
    });
  } finally {
    injecting = false;
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    void renderBrowser().catch(() => {});
  });
}

export function installHostedCatalogBrowserFeature(): void {
  schedule();
  const root = document.querySelector('#app');
  if (root) {
    observer?.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
  }
}
