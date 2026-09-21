import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadEnterpriseLeadershipCatalogSource } from './enterprise-catalog-source';

type ProfileId = 'generic' | 'enterprise-euroimmun';

const repoRoot = resolve(import.meta.dirname, '..');
const publicRoot = join(repoRoot, 'public');
const profileId = (process.env.ETF_DEPLOYMENT_PROFILE?.trim() || 'generic') as ProfileId;
const enterpriseRelease = process.env.ETF_ENTERPRISE_RELEASE === '1';

if (profileId !== 'generic' && profileId !== 'enterprise-euroimmun') {
  throw new Error(`Unknown ETF_DEPLOYMENT_PROFILE: ${profileId}`);
}

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex')}`;
}

await rm(join(publicRoot, 'private-catalogs'), { recursive: true, force: true });

let profile: Record<string, unknown>;
let manifest: Record<string, unknown>;

if (profileId === 'generic') {
  profile = {
    schemaVersion: 2,
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
  manifest = {
    id: './',
    name: 'Exam Trainer Framework',
    short_name: 'ETF',
    description: 'Offline-Prüfungstrainer mit fünfstufigem Spaced Repetition',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b0e14',
    theme_color: '#0b0e14',
    lang: 'de',
    categories: ['education', 'productivity'],
    icons: [
      { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/assets/etf-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
} else {
  const { catalog, sourceText: exported } = await loadEnterpriseLeadershipCatalogSource();
  const relativeCatalogPath = 'private-catalogs/enterprise-leadership-n1/0.3.0.json';
  const target = join(publicRoot, relativeCatalogPath);
  await mkdir(join(publicRoot, 'private-catalogs', 'enterprise-leadership-n1'), { recursive: true });
  await writeFile(target, exported, 'utf8');

  profile = {
    schemaVersion: 2,
    id: 'enterprise-euroimmun',
    kind: 'enterprise',
    branding: {
      productName: 'Euroimmun Learning',
      shortName: 'Euroimmun',
      wordmarkPrimary: 'Euroimmun',
      wordmarkSecondary: 'Learning',
      theme: 'euroimmun',
    },
    access: {
      mode: enterpriseRelease ? 'proxy' : 'pending-proxy',
      proxyAuthorizationRequired: true,
      productionReady: enterpriseRelease,
    },
    catalogPolicy: {
      publicRegistry: false,
      autoInstallPrivateCatalogOnDeepLink: true,
      autoUpdatePrivateCatalogOnDeepLink: true,
    },
    privateCatalogs: [{
      id: catalog.catalogId,
      version: catalog.version,
      title: catalog.title,
      description: catalog.description,
      tags: ['leadership', 'unternehmen-mitfuehren', 'de'],
      catalogUrl: `./${relativeCatalogPath}`,
      contentHash: sha256(exported),
      status: 'released',
    }],
  };
  manifest = {
    id: './',
    name: 'Euroimmun Learning',
    short_name: 'Euroimmun',
    description: 'Interne, offlinefähige Lernanwendung',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b0e14',
    theme_color: '#0d1711',
    lang: 'de',
    categories: ['education', 'productivity'],
    icons: [
      { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/assets/etf-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}

await writeFile(join(publicRoot, 'deployment-profile.json'), JSON.stringify(profile, null, 2) + '\n', 'utf8');
await writeFile(join(publicRoot, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
