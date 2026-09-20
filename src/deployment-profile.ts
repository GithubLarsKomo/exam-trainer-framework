import type { HostedCatalogRegistryEntryV1 } from './hosted-catalog-registry';

export const DEPLOYMENT_PROFILE_SCHEMA_VERSION = 2 as const;

export type DeploymentProfileKind = 'generic' | 'enterprise';
export type DeploymentAccessMode = 'none' | 'pending-proxy' | 'proxy';

export interface DeploymentBranding {
  productName: string;
  shortName: string;
  wordmarkPrimary: string;
  wordmarkSecondary?: string;
  theme: string;
  logoUrl?: string;
}

export interface DeploymentAccess {
  mode: DeploymentAccessMode;
  proxyAuthorizationRequired: boolean;
  productionReady: boolean;
}

export interface DeploymentCatalogPolicy {
  publicRegistry: boolean;
  autoInstallPrivateCatalogOnDeepLink: boolean;
  autoUpdatePrivateCatalogOnDeepLink: boolean;
}

export interface DeploymentProfile {
  schemaVersion: typeof DEPLOYMENT_PROFILE_SCHEMA_VERSION;
  id: string;
  kind: DeploymentProfileKind;
  branding: DeploymentBranding;
  access: DeploymentAccess;
  catalogPolicy: DeploymentCatalogPolicy;
  privateCatalogs: HostedCatalogRegistryEntryV1[];
}

const genericProfile: DeploymentProfile = {
  schemaVersion: DEPLOYMENT_PROFILE_SCHEMA_VERSION,
  id: 'generic',
  kind: 'generic',
  branding: {
    productName: 'Exam Trainer Framework',
    shortName: 'ETF',
    wordmarkPrimary: 'Exam Trainer',
    wordmarkSecondary: 'Framework',
    theme: 'default',
    logoUrl: '/assets/etf-mark.svg',
  },
  access: {
    mode: 'none',
    proxyAuthorizationRequired: false,
    productionReady: true,
  },
  catalogPolicy: {
    publicRegistry: true,
    autoInstallPrivateCatalogOnDeepLink: false,
    autoUpdatePrivateCatalogOnDeepLink: false,
  },
  privateCatalogs: [],
};

let currentProfile: DeploymentProfile = structuredClone(genericProfile);
let currentProfileUrl: string | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} darf nicht leer sein.`);
  return value.trim();
}

function parsePrivateCatalog(value: unknown, index: number): HostedCatalogRegistryEntryV1 {
  if (!isRecord(value)) throw new Error(`privateCatalogs[${index}] ist kein Objekt.`);
  const hash = nonEmpty(value.contentHash, `privateCatalogs[${index}].contentHash`).toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/.test(hash)) throw new Error(`privateCatalogs[${index}].contentHash ist ungültig.`);
  if (value.status !== 'released') throw new Error(`privateCatalogs[${index}] muss status=released haben.`);
  return {
    id: nonEmpty(value.id, `privateCatalogs[${index}].id`),
    version: nonEmpty(value.version, `privateCatalogs[${index}].version`),
    title: nonEmpty(value.title, `privateCatalogs[${index}].title`),
    catalogUrl: nonEmpty(value.catalogUrl, `privateCatalogs[${index}].catalogUrl`),
    contentHash: hash,
    status: 'released',
    description: value.description === undefined ? undefined : nonEmpty(value.description, `privateCatalogs[${index}].description`),
    tags: Array.isArray(value.tags)
      ? value.tags.map((tag, tagIndex) => nonEmpty(tag, `privateCatalogs[${index}].tags[${tagIndex}]`))
      : undefined,
  };
}

export function parseDeploymentProfile(value: unknown): DeploymentProfile {
  if (!isRecord(value) || value.schemaVersion !== DEPLOYMENT_PROFILE_SCHEMA_VERSION) {
    throw new Error('Ungültiges ETF Deployment-Profile-Format.');
  }
  if (!isRecord(value.branding) || !isRecord(value.access) || !isRecord(value.catalogPolicy)) {
    throw new Error('Deployment-Profile enthält unvollständige Konfiguration.');
  }

  const kind = value.kind;
  if (kind !== 'generic' && kind !== 'enterprise') throw new Error('Unbekannter Deployment-Profile-Typ.');
  const accessMode = value.access.mode;
  if (accessMode !== 'none' && accessMode !== 'pending-proxy' && accessMode !== 'proxy') {
    throw new Error('Unbekannter Access-Modus.');
  }

  const privateCatalogs = Array.isArray(value.privateCatalogs)
    ? value.privateCatalogs.map(parsePrivateCatalog)
    : [];

  const identities = new Set<string>();
  for (const entry of privateCatalogs) {
    const identity = `${entry.id}@${entry.version}`;
    if (identities.has(identity)) throw new Error(`Doppelter privater Katalog: ${identity}`);
    identities.add(identity);
  }

  return {
    schemaVersion: DEPLOYMENT_PROFILE_SCHEMA_VERSION,
    id: nonEmpty(value.id, 'id'),
    kind,
    branding: {
      productName: nonEmpty(value.branding.productName, 'branding.productName'),
      shortName: nonEmpty(value.branding.shortName, 'branding.shortName'),
      wordmarkPrimary: nonEmpty(value.branding.wordmarkPrimary, 'branding.wordmarkPrimary'),
      wordmarkSecondary: value.branding.wordmarkSecondary === undefined
        ? undefined
        : nonEmpty(value.branding.wordmarkSecondary, 'branding.wordmarkSecondary'),
      theme: nonEmpty(value.branding.theme, 'branding.theme'),
      logoUrl: value.branding.logoUrl === undefined ? undefined : nonEmpty(value.branding.logoUrl, 'branding.logoUrl'),
    },
    access: {
      mode: accessMode,
      proxyAuthorizationRequired: value.access.proxyAuthorizationRequired === true,
      productionReady: value.access.productionReady === true,
    },
    catalogPolicy: {
      publicRegistry: value.catalogPolicy.publicRegistry === true,
      autoInstallPrivateCatalogOnDeepLink: value.catalogPolicy.autoInstallPrivateCatalogOnDeepLink === true,
      autoUpdatePrivateCatalogOnDeepLink: value.catalogPolicy.autoUpdatePrivateCatalogOnDeepLink === true,
    },
    privateCatalogs,
  };
}

export function getDeploymentProfile(): DeploymentProfile {
  return currentProfile;
}

export function getDeploymentProfileUrl(): string | undefined {
  return currentProfileUrl;
}

export function privateCatalogFor(catalogId: string): HostedCatalogRegistryEntryV1 | undefined {
  return currentProfile.privateCatalogs.find(entry => entry.id === catalogId);
}

export function applyDeploymentProfile(profile: DeploymentProfile): void {
  currentProfile = structuredClone(profile);
  document.documentElement.dataset.deploymentProfile = profile.id;
  document.documentElement.dataset.deploymentKind = profile.kind;
  document.documentElement.dataset.deploymentTheme = profile.branding.theme;
  document.title = profile.branding.productName;

  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta && profile.kind === 'enterprise') themeMeta.content = '#0d1711';
}

export async function initializeDeploymentProfile(fetchImpl: typeof fetch = fetch): Promise<DeploymentProfile> {
  const url = new URL('./deployment-profile.json', document.baseURI).toString();
  currentProfileUrl = url;
  try {
    const response = await fetchImpl(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Deployment-Profile konnte nicht geladen werden (${response.status}).`);
    const profile = parseDeploymentProfile(await response.json());
    applyDeploymentProfile(profile);
    return profile;
  } catch {
    currentProfile = structuredClone(genericProfile);
    applyDeploymentProfile(currentProfile);
    return currentProfile;
  }
}
