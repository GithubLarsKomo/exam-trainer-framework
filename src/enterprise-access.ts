import { clearAllLocalData } from './db';
import type { DeploymentProfile } from './deployment-profile';

interface StaticWebAppPrincipal {
  userId?: string;
  userDetails?: string;
  userRoles?: string[];
}

interface StaticWebAppMeResponse {
  clientPrincipal?: StaticWebAppPrincipal | null;
}

export type EnterpriseAccessState =
  | { status: 'not-required' }
  | { status: 'pending-entra' }
  | { status: 'authenticated'; userId: string; userDetails?: string }
  | { status: 'offline-bound'; userId: string }
  | { status: 'redirecting' }
  | { status: 'blocked'; reason: string };

const bindingKey = (profileId: string) => `etf:enterprise-user-binding:v1:${profileId}`;

function loginUrl(): string {
  const current = location.href;
  return `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(current)}`;
}

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
    // If storage is unavailable, the protected host remains the primary access boundary.
  }
}

export function clearEnterpriseUserBinding(profileId: string): void {
  try {
    localStorage.removeItem(bindingKey(profileId));
  } catch {
    // Ignore unavailable localStorage.
  }
}

async function readPrincipal(fetchImpl: typeof fetch): Promise<StaticWebAppPrincipal | undefined> {
  const response = await fetchImpl('/.auth/me', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) return undefined;
  const payload = await response.json() as StaticWebAppMeResponse;
  const principal = payload.clientPrincipal ?? undefined;
  if (!principal?.userId) return undefined;
  if (!principal.userRoles?.includes('authenticated')) return undefined;
  return principal;
}

export async function enforceEnterpriseAccess(
  profile: DeploymentProfile,
  fetchImpl: typeof fetch = fetch,
): Promise<EnterpriseAccessState> {
  if (profile.kind !== 'enterprise') return { status: 'not-required' };
  if (profile.access.mode === 'pending-entra') return { status: 'pending-entra' };
  if (profile.access.mode !== 'entra') return { status: 'blocked', reason: 'Unbekannter Enterprise-Zugriffsmodus.' };

  const previousBinding = binding(profile.id);

  try {
    const principal = await readPrincipal(fetchImpl);
    if (!principal?.userId) {
      location.replace(loginUrl());
      return { status: 'redirecting' };
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
      reason: 'Die Firmenanmeldung konnte nicht verifiziert werden. Für den ersten Zugriff ist eine Online-Verbindung erforderlich.',
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
    panel.textContent = 'Enterprise-Implementierungsbuild: Entra-Zugriff ist noch nicht produktiv konfiguriert. Nicht öffentlich bereitstellen.';
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
      const redirect = encodeURIComponent(new URL('/', location.href).toString());
      location.href = `/.auth/logout?post_logout_redirect_uri=${redirect}`;
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
  if (state.status === 'pending-entra') showPendingBanner();
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
