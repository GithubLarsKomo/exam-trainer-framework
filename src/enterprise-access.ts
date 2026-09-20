import { clearAllLocalData } from './db';
import type { DeploymentProfile } from './deployment-profile';

interface ProxyPrincipal {
  userId?: string;
  userDetails?: string;
}

interface ProxyUserResponse {
  authenticated?: boolean;
  principal?: ProxyPrincipal | null;
}

export type EnterpriseAccessState =
  | { status: 'not-required' }
  | { status: 'pending-proxy' }
  | { status: 'authenticated'; userId: string; userDetails?: string }
  | { status: 'offline-bound'; userId: string }
  | { status: 'blocked'; reason: string };

const bindingKey = (profileId: string) => `etf:enterprise-user-binding:v1:${profileId}`;

function binding(profileId: string): string | undefined {
  try {
    return localStorage.getItem(bindingKey(profileId)) || undefined;
  } catch {
    return undefined;
  }
}

function writeBinding(profileId: string, userId: string): void {
  try {
    localStorage.setItem(bindingKey(profileId), userId);
  } catch {
    // The reverse proxy remains the primary online access boundary.
  }
}

export function clearEnterpriseUserBinding(profileId: string): void {
  try {
    localStorage.removeItem(bindingKey(profileId));
  } catch {
    // Ignore unavailable localStorage.
  }
}

async function readPrincipal(fetchImpl: typeof fetch): Promise<ProxyPrincipal | undefined> {
  const response = await fetchImpl('/auth/user', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) return undefined;
  const payload = await response.json() as ProxyUserResponse;
  const principal = payload.authenticated === true ? payload.principal ?? undefined : undefined;
  if (!principal?.userId) return undefined;
  return principal;
}

export async function enforceEnterpriseAccess(
  profile: DeploymentProfile,
  fetchImpl: typeof fetch = fetch,
): Promise<EnterpriseAccessState> {
  if (profile.kind !== 'enterprise') return { status: 'not-required' };
  if (profile.access.mode === 'pending-proxy') return { status: 'pending-proxy' };
  if (profile.access.mode !== 'proxy') {
    return { status: 'blocked', reason: 'Unbekannter Enterprise-Zugriffsmodus.' };
  }

  const previousBinding = binding(profile.id);

  try {
    const principal = await readPrincipal(fetchImpl);
    if (!principal?.userId) {
      return {
        status: 'blocked',
        reason: 'Der vorgeschaltete Firmen-SSO-Gateway hat keine gültige Benutzeridentität bestätigt.',
      };
    }

    if (previousBinding && previousBinding !== principal.userId) {
      await clearAllLocalData();
    }
    writeBinding(profile.id, principal.userId);
    return {
      status: 'authenticated',
      userId: principal.userId,
      userDetails: principal.userDetails,
    };
  } catch {
    if (previousBinding && typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { status: 'offline-bound', userId: previousBinding };
    }
    return {
      status: 'blocked',
      reason: 'Die Firmenanmeldung konnte nicht über den vorgeschalteten SSO-Gateway verifiziert werden. Für den ersten Zugriff ist eine Online-Verbindung erforderlich.',
    };
  }
}

function showPendingBanner(): void {
  const inject = (): boolean => {
    const main = document.querySelector<HTMLElement>('.app-shell main');
    if (!main) return false;
    if (main.querySelector('[data-enterprise-access-warning]')) return true;
    const panel = document.createElement('section');
    panel.className = 'notice';
    panel.dataset.enterpriseAccessWarning = '';
    panel.textContent = 'Enterprise-Implementierungsbuild: Der vorgeschaltete Firmen-SSO-/Reverse-Proxy-Zugang ist noch nicht produktiv konfiguriert. Nicht öffentlich bereitstellen.';
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

function installLogoutControl(profile: DeploymentProfile): void {
  const inject = (): boolean => {
    const settings = document.querySelector<HTMLElement>('.settings-list');
    if (!settings) return false;
    if (settings.querySelector('[data-enterprise-logout]')) return true;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.enterpriseLogout = '';
    button.textContent = 'Abmelden & lokale Firmendaten löschen';
    button.addEventListener('click', async () => {
      if (!confirm('Abmelden und alle lokal gespeicherten ETF-Firmendaten auf diesem Gerät löschen?')) return;
      await clearAllLocalData();
      clearEnterpriseUserBinding(profile.id);
      location.href = '/auth/logout';
    });
    settings.append(button);
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

export function installEnterpriseAccessUi(
  profile: DeploymentProfile,
  state: EnterpriseAccessState,
): void {
  if (state.status === 'pending-proxy') showPendingBanner();
  if (profile.kind === 'enterprise' && (state.status === 'authenticated' || state.status === 'offline-bound')) {
    installLogoutControl(profile);
  }
}

export function renderEnterpriseAccessBlock(state: EnterpriseAccessState): void {
  if (state.status !== 'blocked') return;
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) return;
  app.innerHTML = `
    <main class="app-shell">
      <section class="panel">
        <span class="eyebrow">Euroimmun Learning</span>
        <h1>Zugriff nicht verfügbar</h1>
        <p>${state.reason}</p>
      </section>
    </main>
  `;
}
