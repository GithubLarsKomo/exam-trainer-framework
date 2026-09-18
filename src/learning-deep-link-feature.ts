import { loadState, saveState, type PersistedState } from './db';
import {
  learningDeepLinkSignature,
  parseLearningDeepLink,
  resolveLearningDeepLinkVariant,
  type LearningDeepLink,
} from './learning-deep-link';
import {
  ACTIVE_SESSION_KEY,
  createRecoverableSession,
  type RecoverableSessionState,
} from './recoverable-session';

const LAUNCH_MARKER_KEY = 'etf:learning-deep-link:v1';
const fallbackState = (): PersistedState => ({
  schemaVersion: 3,
  progress: {},
  history: [],
  review: {},
  sessions: {},
  examAttempts: [],
  migrationLog: [],
});

function stripLearningDeepLink(): void {
  const url = new URL(location.href);
  url.searchParams.delete('catalog');
  url.searchParams.delete('focus');
  url.searchParams.delete('mode');
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function notice(
  title: string,
  message: string,
  action?: { label: string; run: () => void },
): void {
  const inject = (): boolean => {
    const main = document.querySelector<HTMLElement>('.app-shell main');
    if (!main) return false;
    if (main.querySelector('[data-learning-deep-link-notice]')) return true;

    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.dataset.learningDeepLinkNotice = '';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');

    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'ETF Lernlink';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = message;

    panel.append(eyebrow, heading, copy);
    if (action) {
      const actions = document.createElement('div');
      actions.className = 'question-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary';
      button.textContent = action.label;
      button.addEventListener('click', action.run);
      actions.append(button);
      panel.append(actions);
    }
    main.insertAdjacentElement('afterbegin', panel);
    return true;
  };

  if (inject()) return;
  const root = document.querySelector('#app');
  if (!root) return;
  const observer = new MutationObserver(() => {
    if (inject()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
}

function openCatalogs(): void {
  const control = document.querySelector<HTMLElement>('[data-view="catalogs"]');
  control?.click();
}

function sameFocusedSession(
  session: RecoverableSessionState | undefined,
  link: LearningDeepLink,
  questionVariantId: string,
): boolean {
  return Boolean(
    session
    && session.catalogId === link.catalogId
    && session.kind === 'learning'
    && session.itemIds.length === 1
    && session.itemIds[0] === link.focusId
    && session.questionVariantIds?.[link.focusId] === questionVariantId,
  );
}

function resumeMarkedLink(link: LearningDeepLink): void {
  const signature = learningDeepLinkSignature(link);
  const attempt = (): boolean => {
    const resume = document.querySelector<HTMLElement>('[data-recoverable-resume]');
    if (!resume) return false;
    sessionStorage.removeItem(LAUNCH_MARKER_KEY);
    stripLearningDeepLink();
    resume.click();
    return true;
  };

  if (attempt()) return;
  const root = document.querySelector('#app');
  if (!root) return;
  const observer = new MutationObserver(() => {
    if (attempt()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });

  // A changed URL in the same tab must not accidentally auto-resume an older marker.
  if (sessionStorage.getItem(LAUNCH_MARKER_KEY) !== signature) observer.disconnect();
}

async function launch(link: LearningDeepLink): Promise<void> {
  const signature = learningDeepLinkSignature(link);
  if (sessionStorage.getItem(LAUNCH_MARKER_KEY) === signature) {
    resumeMarkedLink(link);
    return;
  }

  const state = await loadState(fallbackState());
  const catalogs = state.catalogs ?? [];
  const catalog = catalogs.find(candidate => candidate.catalogId === link.catalogId);
  if (!catalog) {
    notice(
      'Katalog noch nicht lokal verfügbar',
      `Der Lernlink erwartet den Katalog „${link.catalogId}“. Importiere ihn zuerst über die kontrollierte Katalogverwaltung; der Lernlink installiert keine Inhalte stillschweigend.`,
      { label: 'Kataloge öffnen', run: openCatalogs },
    );
    return;
  }

  let variant;
  try {
    variant = resolveLearningDeepLinkVariant(catalog, link, state.reviewEvents ?? []);
  } catch (error) {
    notice(
      'Lernfokus nicht startbar',
      error instanceof Error ? error.message : 'Der Lernfokus konnte nicht aufgelöst werden.',
      { label: 'Kataloge öffnen', run: openCatalogs },
    );
    return;
  }

  state.sessions ??= {};
  const active = state.sessions[ACTIVE_SESSION_KEY] as RecoverableSessionState | undefined;
  if (active && !sameFocusedSession(active, link, variant.id)) {
    const replace = confirm(
      'Es ist bereits eine unterbrochene Lern- oder Prüfungssitzung gespeichert. Diese Sitzung verwerfen und den Lernlink starten?',
    );
    if (!replace) {
      notice(
        'Bestehende Sitzung bleibt erhalten',
        'Der Lernlink wurde nicht gestartet. Setze die bestehende Sitzung fort oder verwirf sie bewusst, bevor du den Link erneut öffnest.',
      );
      return;
    }
  }

  if (!sameFocusedSession(active, link, variant.id)) {
    state.sessions[ACTIVE_SESSION_KEY] = createRecoverableSession({
      catalogId: link.catalogId,
      kind: 'learning',
      mode: 'all',
      itemIds: [link.focusId],
      questionVariantIds: { [link.focusId]: variant.id },
    });
  }
  state.activeCatalogId = link.catalogId;
  await saveState(state);
  sessionStorage.setItem(LAUNCH_MARKER_KEY, signature);
  location.reload();
}

export function installLearningDeepLinkFeature(): void {
  let link: LearningDeepLink | undefined;
  try {
    link = parseLearningDeepLink(location.search);
  } catch (error) {
    notice(
      'Ungültiger Lernlink',
      error instanceof Error ? error.message : 'Der ETF-Lernlink ist ungültig.',
    );
    return;
  }
  if (!link) return;
  void launch(link).catch(error => {
    notice(
      'Lernlink konnte nicht gestartet werden',
      error instanceof Error ? error.message : 'Unbekannter Fehler beim Starten des Lernlinks.',
    );
  });
}
