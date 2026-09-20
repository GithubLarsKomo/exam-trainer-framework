# Coolify / Hetzner enterprise deployment

This directory contains deployment examples for the protected ETF enterprise runtime.

## Required application settings

Build arguments:

```text
ETF_DEPLOYMENT_PROFILE=enterprise-euroimmun
ETF_ENTERPRISE_RELEASE=1
```

Runtime environment:

```text
ETF_TRUST_AUTH_PROXY=1
```

Application port:

```text
3000
```

Domain:

```text
https://<enterprise-domain>/
```

Do not expose an additional public domain or host port that bypasses Coolify Traefik.

## Authentik

Use an Authentik Proxy Provider in **Forward auth (single application)** mode with:

```text
External host = https://<enterprise-domain>
```

Attach the provider to a dedicated Authentik Application and bind the approved organization access policy/group.

The identity source behind Authentik is deployment policy and is not coupled to ETF.

## Traefik

Add `authentik-forward-auth.example.yml` as a Coolify proxy dynamic configuration after replacing the internal Authentik hostname.

Then attach:

```text
etf-authentik@file
```

to the HTTPS router for the ETF resource. Preserve existing middleware such as gzip by appending the middleware rather than replacing the current chain.

The proxy must forward at least:

- `X-authentik-uid`;
- `X-authentik-email`;
- `X-authentik-name`;
- `X-authentik-username`.

## Verification

Before changing the EPUB links, verify:

```text
https://<enterprise-domain>/outpost.goauthentik.io/ping
```

reaches the Authentik outpost successfully.

Then verify:

1. an unauthenticated browser is sent through Authentik;
2. the original ETF deep-link query survives sign-in;
3. `/auth/user` resolves the logged-in identity;
4. an anonymous direct request for `/private-catalogs/enterprise-leadership-n1/0.3.0.json` is not served;
5. the same request succeeds after Authentik authorization;
6. no alternate domain/port bypasses the authentication middleware.

See `docs/enterprise-deployment.md` for the complete release gate.
