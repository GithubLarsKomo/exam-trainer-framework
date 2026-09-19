# Enterprise / white-label deployment

Status: implementation guide for ETF SPEC.md section 29  
Reference profile: `enterprise-euroimmun`

## Build modes

Generic/public build:

```bash
npm run build
```

Enterprise implementation build without production authentication:

```bash
npm run build:enterprise
```

This build is intentionally marked:

```text
access.mode = pending-entra
access.productionReady = false
```

It is suitable for controlled implementation and artifact inspection only. Do not expose it on a public origin.

Tenant-restricted enterprise release build:

```bash
ETF_ENTRA_TENANT_ID=<tenant-id-or-verified-tenant-domain> npm run build:enterprise:release
```

On Windows PowerShell:

```powershell
$env:ETF_ENTRA_TENANT_ID="<tenant-id-or-verified-tenant-domain>"
npm run build:enterprise:release
```

The release build generates `dist/staticwebapp.config.json`, marks the deployment profile as `entra`, and sets `productionReady=true`.

## Azure Static Web Apps authentication

The generated configuration uses a tenant-specific Microsoft Entra v2 issuer:

```text
https://login.microsoftonline.com/<TENANT>/v2.0
```

The Azure Static Web App must define these application settings:

| Setting | Purpose |
|---|---|
| `AZURE_CLIENT_ID` | Application (client) ID of the Entra app registration |
| `AZURE_CLIENT_SECRET` | Client secret stored only in Azure Static Web Apps application settings / Key Vault-backed configuration |

Neither value belongs in ETF source control. The client secret must never be shipped to the browser.

The generated routing policy requires the built-in `authenticated` role for the complete application. Unauthenticated requests are redirected to:

```text
/.auth/login/aad?post_login_redirect_uri=.referrer
```

The `.referrer` redirect preserves an EPUB deep-link request so that `catalog`, `focus`, and `mode` remain available after authentication.

## Entra app registration

The corporate Entra administrator must create or approve an app registration for the enterprise ETF deployment.

Required callback endpoint:

```text
https://<enterprise-host>/.auth/login/aad/callback
```

Recommended account scope: single organizational tenant.

The ETF build intentionally does not invent or store the tenant ID, client ID, or client secret. They are deployment parameters controlled by the organization.

## Private catalog delivery

The enterprise build packages:

```text
private-catalogs/
  enterprise-leadership-n1/
    0.3.0.json
```

The catalog is not listed in the generic public Hosted Catalog Registry.

`deployment-profile.json` contains only the private catalog metadata required by ETF:

- stable catalog ID;
- release version;
- same-origin private path;
- SHA-256 content hash;
- released state.

When an enterprise deep link requests the catalog, ETF verifies hash, ID, version, and release state before installing or updating the local IndexedDB copy.

## OneDrive / SharePoint distribution

OneDrive / SharePoint is the controlled content and release distribution layer for:

- `Unternehmen_mitfuehren_*.epub`;
- approved release notes;
- enterprise release packages;
- deployment handoff documentation;
- optional archived build artifacts.

It is not the PWA runtime origin.

The final EPUB must link to the protected enterprise HTTPS hostname, not to OneDrive file URLs and not to the generic public ETF runtime.

## Branding

Current implementation profile:

```text
Product name: Euroimmun Learning
Primary wordmark: Euroimmun
Secondary wordmark: Learning
Theme: green, flat, restrained geometry, no shadows
```

No proprietary corporate font or official logo binary is committed. The current build uses a neutral text/initial mark. Replace it only with approved corporate assets whose deployment rights are confirmed.

## Release gate

Before the first production deployment:

1. obtain the authoritative enterprise hostname;
2. obtain/confirm the Entra tenant identifier;
3. create/approve the Entra app registration;
4. configure `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` in Azure;
5. build with `npm run build:enterprise:release`;
6. deploy `dist/` to the protected Azure Static Web App;
7. verify an unauthenticated request is redirected to Entra;
8. verify a user outside the configured tenant cannot authenticate;
9. verify a valid corporate user returns to the original EPUB deep link;
10. verify the private catalog loads but is absent from the generic deployment;
11. validate offline reopen after one complete authenticated load;
12. validate on iPhone Safari/PWA and desktop Edge or Chrome.

## Public-build confidentiality gate

CI rejects the generic build if `dist/` contains:

- `private-catalogs/`;
- the private catalog identity `enterprise-leadership-n1`;
- the confidential trainer title;
- a non-generic deployment profile.

CI separately builds the enterprise profile and verifies the private catalog hash and profile metadata. It also builds a synthetic tenant-restricted release configuration to verify the Entra routing contract without using real corporate credentials.
