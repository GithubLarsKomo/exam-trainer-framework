# Public deployment legal baseline

This checklist tracks the operator-specific work that must match the real public deployment. The application contains public `Impressum` and `Datenschutz` pages and the operator identity has been supplied. Infrastructure-specific verification is recorded below.

## Operator identity

- [x] Operator name: Lars Komorowski.
- [x] Serviceable postal address: Ribeweg 3, 23909 Ratzeburg, Germany.
- [x] Monitored contact email address: larskomo@gmx.de.
- [x] No company/legal-form/register placeholders are published because the supplied operator is a private individual.
- [x] No additional media-law responsibility block is published for the current non-editorial learning application.

## Hosting and processing

- [x] Public deployment is hosted on Hetzner infrastructure behind Coolify/Traefik.
- [x] Docker default logging is `json-file` with `max-size=10m` and `max-file=3`; the same effective options were verified for the application and Coolify/Traefik containers on 7 August 2026.
- [x] Traefik is started without an access-log option, and no access-log configuration references were found under the checked Coolify/Traefik configuration paths.
- [x] The public privacy notice describes the verified size-based Docker rotation instead of claiming an unverified time-based retention period.
- [ ] Confirm the applicable Hetzner data-processing agreement and exact server location/product in the hosting account.
- [ ] Confirm whether DNS, proxy, CDN, uptime monitoring, error reporting or other infrastructure providers receive visitor data; add them to the privacy notice when applicable.
- [ ] Confirm backup location and retention where server-side backups are enabled.

## Application data-flow verification

- [x] Repository check found no advertising analytics, telemetry integration, external web analytics or tracking pixels in the current public app baseline.
- [x] Learner progress, catalogs, imported media and recoverable sessions remain local unless the user explicitly exports them.
- [x] No application backend synchronization is part of the current local-first baseline.
- [ ] Revisit the notice before enabling any non-essential tracking or third-party embedded content.

## Public acceptance

- [x] `Impressum` is reachable in one interaction from the public app shell.
- [x] `Datenschutz` is reachable in one interaction from the public app shell.
- [x] Both pages work directly by URL and link back to the app.
- [x] Legal pages are included in the PWA/offline cache after one successful online installation/update.
- [x] No operator-identity placeholders remain in the legal pages.
- [x] Automated Chromium, desktop WebKit and mobile WebKit acceptance cover the legal links and legal-page baseline.
- [ ] When appropriate, obtain qualified legal review of the final production wording.

## Verified production logging snapshot — 7 August 2026

- Docker default log driver: `json-file`.
- Docker log options: `max-size=10m`, `max-file=3`.
- Same effective log configuration observed for the exam-trainer app container, `coolify-proxy`, Coolify, PostgreSQL, Redis, Sentinel and realtime containers.
- `coolify-proxy` runs Traefik v3.6 without `--accesslog`/`--accesslog.filepath` options.
- No access-log/retention references were found in the checked `/data/coolify/proxy`, `/data/coolify` and `/etc/traefik` paths.
- Docker log retention is therefore volume-based, not time-based; the public privacy notice intentionally states the volume criterion rather than a seven-day guarantee.

## Current implementation boundary

The repository currently supports a local-first/offline application model and contains no identified advertising analytics or telemetry integration. The public privacy notice now matches the verified production logging configuration instead of promising a time-based deletion interval that Docker is not configured to enforce.
