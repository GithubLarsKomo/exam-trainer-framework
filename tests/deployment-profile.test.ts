import { describe, expect, it } from 'vitest';
import { parseDeploymentProfile } from '../src/deployment-profile';

describe('deployment profiles', () => {
  it('parses a generic profile', () => {
    const profile = parseDeploymentProfile({
      schemaVersion: 2,
      id: 'generic',
      kind: 'generic',
      branding: {
        productName: 'Exam Trainer Framework',
        shortName: 'ETF',
        wordmarkPrimary: 'Exam Trainer',
        wordmarkSecondary: 'Framework',
        theme: 'default',
        logoUrl: './assets/etf-mark.svg',
      },
      access: { mode: 'none', proxyAuthorizationRequired: false, productionReady: true },
      catalogPolicy: {
        publicRegistry: true,
        autoInstallPrivateCatalogOnDeepLink: false,
        autoUpdatePrivateCatalogOnDeepLink: false,
      },
      privateCatalogs: [],
    });
    expect(profile.id).toBe('generic');
    expect(profile.privateCatalogs).toEqual([]);
  });

  it('accepts a released private enterprise catalog and rejects malformed hashes', () => {
    const base = {
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
      access: { mode: 'pending-proxy', proxyAuthorizationRequired: true, productionReady: false },
      catalogPolicy: {
        publicRegistry: false,
        autoInstallPrivateCatalogOnDeepLink: true,
        autoUpdatePrivateCatalogOnDeepLink: true,
      },
      privateCatalogs: [{
        id: 'enterprise-leadership-n1',
        version: '0.3.0',
        title: 'Unternehmen mitführen – Leadership Trainer',
        catalogUrl: './private-catalogs/enterprise-leadership-n1/0.3.0.json',
        contentHash: `sha256:${'a'.repeat(64)}`,
        status: 'released',
      }],
    };
    expect(parseDeploymentProfile(base).privateCatalogs[0].id).toBe('enterprise-leadership-n1');
    expect(() => parseDeploymentProfile({
      ...base,
      privateCatalogs: [{ ...base.privateCatalogs[0], contentHash: 'sha256:broken' }],
    })).toThrow(/contentHash/);
  });

  it('rejects duplicate private catalog identities', () => {
    const entry = {
      id: 'enterprise-leadership-n1',
      version: '0.3.0',
      title: 'Leadership',
      catalogUrl: './catalog.json',
      contentHash: `sha256:${'b'.repeat(64)}`,
      status: 'released',
    };
    expect(() => parseDeploymentProfile({
      schemaVersion: 2,
      id: 'enterprise',
      kind: 'enterprise',
      branding: {
        productName: 'Enterprise',
        shortName: 'Enterprise',
        wordmarkPrimary: 'Enterprise',
        theme: 'enterprise',
      },
      access: { mode: 'pending-proxy', proxyAuthorizationRequired: true, productionReady: false },
      catalogPolicy: {
        publicRegistry: false,
        autoInstallPrivateCatalogOnDeepLink: true,
        autoUpdatePrivateCatalogOnDeepLink: true,
      },
      privateCatalogs: [entry, entry],
    })).toThrow(/Doppelter privater Katalog/);
  });
});
