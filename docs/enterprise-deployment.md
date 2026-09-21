# Enterprise / white-label deployment on Hetzner

Status: implementation guide for ETF SPEC.md section 29  
Reference profile: `enterprise-euroimmun`

## Target architecture

The corporate reference deployment is self-hosted and contains no Azure runtime dependency.

```text
OneDrive / SharePoint
  -> confidential EPUB / release package
  -> https://<enterprise-domain>/
  -> Hetzner server
  -> Coolify Traefik
  -> Authentik Forward Auth
  -> ETF enterprise container
  -> private same-origin catalog
  -> local IndexedDB learner state
```

Responsibilities are intentionally separated:

- **OneDrive / SharePoint**: controlled document and release distribution.
- **DNS / new enterprise domain**: stable user-facing HTTPS origin.
- **Hetzner + Coolify**: container runtime, deployment and TLS routing.
- **Traefik + Authentik**: authentication and authorization gate.
- **ETF**: learning application, private catalog verification and local learner state.

ETF does not need direct OIDC/SAML/OAuth support in this architecture. Authentication is completed before a request reaches the application.

## Build modes

Generic/public build:

```bash
npm run build
```

Enterprise implementation build without a production access gateway:

```bash
npm run build:enterprise
```

This build is deliberately marked:

```text
access.mode = pending-proxy
access.proxyAuthorizationRequired = true
access.productionReady = false
```

It is suitable for controlled implementation and browser acceptance only.

Enterprise release build:

```bash
npm run build:enterprise:release
```

This build is marked:

```text
access.mode = proxy
access.proxyAuthorizationRequired = true
access.productionReady = true
```

A release artifact is valid only when it is deployed behind the approved authentication proxy. The profile being marked production-ready is not permission to expose the container directly.

## Container build for Coolify

The Dockerfile supports build arguments.

Generic image:

```bash
docker build -t exam-trainer-framework .
```

Enterprise release image:

```bash
docker build \
  --build-arg ETF_DEPLOYMENT_PROFILE=enterprise-euroimmun \
  --build-arg ETF_ENTERPRISE_RELEASE=1 \
  -t exam-trainer-framework:enterprise .
```

For the enterprise runtime set:

```text
ETF_TRUST_AUTH_PROXY=1
```

Do not set this variable on a container that can be reached directly by untrusted clients. It tells ETF that the identity headers arriving from the upstream proxy are authoritative.

The ETF application port is 3000. In production it must be reachable through the Coolify proxy network only; do not intentionally publish a bypass hostname or direct public port that skips Authentik.

## Authentik mode

Use **Forward auth (single application)** for the ETF enterprise domain.

This keeps application-level policies specific to the learning application and avoids coupling its access rules to unrelated services.

In Authentik create:

1. a Proxy Provider using Forward auth (single application);
2. External host `https://<enterprise-domain>`;
3. the corresponding Authentik Application;
4. access policies/groups appropriate for the corporate learning application.

The exact identity source behind Authentik is a company policy choice. ETF does not require Microsoft Entra ID. Authentik may use any approved corporate identity source.

## Coolify / Traefik Forward Auth

Coolify's Traefik proxy shall call the Authentik outpost before forwarding requests to ETF.

Create a reusable dynamic middleware in the Coolify proxy configuration. The internal Authentik hostname is deployment-specific:

```yaml
http:
  middlewares:
    etf-authentik:
      forwardAuth:
        address: "http://<authentik-internal-host>:9000/outpost.goauthentik.io/auth/traefik"
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username
          - X-authentik-email
          - X-authentik-name
          - X-authentik-uid
          - X-authentik-groups
          - X-authentik-entitlements
```

Attach `etf-authentik@file` to the HTTPS router that Coolify creates for `<enterprise-domain>`.

Preserve any existing middleware such as gzip; append Authentik instead of replacing the existing middleware chain.

The Authentik outpost route under `/outpost.goauthentik.io` must remain reachable according to the Authentik Forward Auth configuration so sign-in and sign-out can complete. As an operational check, `https://<enterprise-domain>/outpost.goauthentik.io/ping` should return the expected successful outpost response before the ETF release is accepted.

## ETF proxy identity contract

After successful Forward Auth, Traefik copies the trusted Authentik identity headers to ETF.

ETF exposes a minimal same-origin browser endpoint:

```text
GET /auth/user
```

Expected server-side inputs:

```text
X-authentik-uid
X-authentik-email
X-authentik-name
X-authentik-username
```

Identity precedence for the stable local binding is:

1. `X-authentik-uid`;
2. email;
3. username.

The endpoint is enabled only when `ETF_TRUST_AUTH_PROXY=1`.

Without the trusted-proxy runtime flag it returns a fail-closed response even if a client sends forged `X-authentik-*` headers.

The security model therefore requires both:

- network/routing isolation so clients cannot bypass Traefik/Authentik;
- `ETF_TRUST_AUTH_PROXY=1` only on the protected enterprise container.

## User binding and logout

ETF stores only a local opaque binding to the authenticated user ID.

If Authentik reports a different user on a browser profile that already contains enterprise ETF state, ETF purges local learner/catalog data before allowing the new identity to continue.

The application action **Abmelden & lokale Firmendaten löschen**:

1. clears ETF IndexedDB/local binding;
2. opens `/auth/logout`;
3. ETF redirects to `/outpost.goauthentik.io/sign_out`;
4. Authentik terminates the outpost session.

Authentication tokens are never stored in ETF learner backups, catalogs, ReviewEvents or application state.

## Private catalog delivery

The enterprise build packages:

```text
private-catalogs/
  enterprise-leadership-n1/
    0.3.0.json
```

The catalog is not listed in the generic public Hosted Catalog Registry.

`deployment-profile.json` contains only the metadata required by ETF:

- stable catalog ID;
- release version;
- private same-origin path;
- SHA-256 content hash;
- released state.

When a deep link requests the catalog, ETF verifies hash, ID, version and release state before installing or updating the local IndexedDB copy.

## Canonical catalog export for downstream release packages

The enterprise catalog has exactly one released source:

`catalogs/sources/enterprise-leadership-n1-v0.3.0.json.gz`

Book, EPUB and OneDrive / SharePoint release-package builders must **not** synthesize or promote their own copy of this catalog. The default package policy is to omit catalog bytes entirely and let the protected ETF runtime deliver the private same-origin catalog.

If a controlled release package explicitly requires a catalog snapshot for archive or handoff, export the canonical released bytes only:

```bash
npm run catalog:enterprise:verify
npm run catalog:enterprise:export -- --output /path/to/ETF-LEADERSHIP-CATALOG-v0.3.0.json
```

The export command fails closed unless:

- compressed source SHA-256 is `22aa8af7b180aa251c7f4abc4d3c8262369e0c4f3a3cd3b1d686628ba1a1c747`;
- decompressed JSON SHA-256 is `a7b8a45f307be0024472b1fd85b62db9aea9b7fb363e029fbb3de24a0e9c26ee`;
- catalog identity is `enterprise-leadership-n1@0.3.0`;
- exactly 12 KnowledgeItems and 36 QuestionVariants are present;
- every KnowledgeItem and QuestionVariant is `released`.

A downstream package copy has no release authority of its own. In particular, older `leadership-trainer-v0.2*`, `leadership-trainer-v0.3-integration-candidate*` or book-package-local `ETF-LEADERSHIP-CATALOG-v0.3.json` artifacts must not be used as runtime or release inputs.

## Deep-link behavior

The confidential EPUB links only to stable routing metadata:

```text
https://<enterprise-domain>/
  ?catalog=enterprise-leadership-n1
  &focus=<knowledgeItemId>
  &mode=<retrieval|application|transfer>
```

The URL contains no question text, answer text or book excerpt.

When an unauthenticated reader follows the link:

1. Traefik/Authentik handles sign-in before ETF is served;
2. Authentik returns to the original URL;
3. ETF receives the original query string;
4. ETF resolves the private catalog;
5. the selected focus starts.

## Offline behavior

After a successful authenticated online load and private catalog installation:

- application shell/resources may be available from the PWA cache;
- the verified private catalog and learner state reside in IndexedDB;
- Authentik responses and private catalog HTTP responses are not service-worker cached;
- ETF can allow an offline-bound session only for the last locally bound identity.

A fresh user or a user without a prior trusted binding requires an online authenticated access first.

## OneDrive / SharePoint distribution

OneDrive / SharePoint is the controlled distribution and artifact layer for:

- `Unternehmen_mitfuehren_*.epub`;
- approved release packages;
- release notes;
- deployment handoff documentation;
- optionally archived enterprise build artifacts.

It is not the PWA runtime origin.

The final EPUB must point to the new protected enterprise domain on Hetzner.

## Branding

Current implementation profile:

```text
Product name: Euroimmun Learning
Primary wordmark: Euroimmun
Secondary wordmark: Learning
Theme: green, flat, restrained geometry, no shadows
```

No proprietary corporate font or official logo binary is committed. Replace the neutral mark only with approved corporate assets whose deployment rights are confirmed.

## Coolify deployment parameters

The production resource should use:

```text
Host: Hetzner
Platform: Coolify
Proxy: Traefik
Container port: 3000
Build arg ETF_DEPLOYMENT_PROFILE=enterprise-euroimmun
Build arg ETF_ENTERPRISE_RELEASE=1
Runtime env ETF_TRUST_AUTH_PROXY=1
Domain: https://<enterprise-domain>/
Authentication middleware: etf-authentik@file
```

The new domain itself remains a deployment parameter until selected.

## Release gate

Before the first production deployment:

1. select and configure the new enterprise domain;
2. point DNS to the Hetzner/Coolify endpoint;
3. create the Authentik Forward Auth single-application provider and application;
4. define the appropriate Authentik access policy/group;
5. configure the Coolify/Traefik Forward Auth middleware;
6. configure enterprise Docker build arguments;
7. set `ETF_TRUST_AUTH_PROXY=1` in the protected runtime;
8. verify there is no public route that bypasses Authentik;
9. verify unauthenticated navigation is redirected to Authentik and returns to the same deep link;
10. verify `/auth/user` reports the authenticated identity only through the protected route;
11. verify user switching purges previous local corporate state;
12. verify the private catalog loads while remaining absent from the generic deployment;
13. validate offline reopen after one complete authenticated load;
14. validate on iPhone Safari/PWA and desktop Edge or Chrome;
15. rewrite the next *Unternehmen mitführen* EPUB to the new enterprise domain.

## Public-build confidentiality gate

CI rejects the generic build if `dist/` contains:

- `private-catalogs/`;
- the private catalog identity `enterprise-leadership-n1`;
- the confidential trainer title;
- a non-generic deployment profile.

CI also verifies:

- the enterprise implementation build is `pending-proxy`;
- the enterprise release build is `proxy` and has no Azure Static Web Apps configuration;
- the enterprise Docker image exposes the trusted Authentik identity contract only when proxy trust is explicitly enabled;
- browser acceptance for the private-catalog workflow.
