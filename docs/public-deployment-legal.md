# Public deployment legal baseline

This checklist tracks the operator-specific work that must match the real public deployment. The application contains public `Impressum` and `Datenschutz` pages and the operator identity has been supplied. Infrastructure-specific verification remains a deployment gate where noted below.

## Operator identity

- [x] Operator name: Lars Komorowski.
- [x] Serviceable postal address: Ribeweg 3, 23909 Ratzeburg, Germany.
- [x] Monitored contact email address: larskomo@gmx.de.
- [x] No company/legal-form/register placeholders are published because the supplied operator is a private individual.
- [x] No additional media-law responsibility block is published for the current non-editorial learning application.

## Hosting and processing

- [ ] Confirm the production hosting entity/product and server location used for the public deployment.
- [ ] Confirm the required data-processing agreement with the hosting provider is in place where applicable.
- [ ] Record the actual reverse-proxy/web-server access and error log fields.
- [ ] Configure server/proxy log retention to the published policy: normally no more than 7 days, with longer retention only for a concrete security or abuse investigation.
- [ ] Confirm whether DNS, proxy, CDN, uptime monitoring, error reporting or other infrastructure providers receive visitor data; add them to the privacy notice when applicable.
- [ ] Confirm backup location and retention where server-side backups are enabled.

## Application data-flow verification

- [ ] Re-run a repository/deployment check for analytics, telemetry, external fonts, tracking pixels and remote API calls.
- [ ] Confirm learner progress, catalogs, imported media and recoverable sessions remain local unless the user explicitly exports them.
- [ ] Confirm no new backend synchronization has been introduced.
- [ ] Revisit the notice before enabling any non-essential tracking or third-party embedded content.

## Public acceptance

- [ ] `Impressum` is reachable in one interaction from every primary app view.
- [ ] `Datenschutz` is reachable in one interaction from every primary app view.
- [ ] Both pages work directly by URL and link back to the app.
- [ ] Legal pages are available from the installed PWA/offline cache after one successful online installation/update.
- [x] No operator-identity placeholders remain in the legal pages.
- [ ] Verify the final wording against the actual deployment and, when appropriate, obtain qualified legal review.

## Current implementation boundary

The repository currently supports a local-first/offline application model and contains no identified advertising analytics or telemetry integration. The public privacy notice now commits to a maximum normal server/proxy log-retention period of seven days; the production reverse-proxy/web-server configuration must be verified or adjusted to match that published policy before the legal baseline is treated as deployment-ready.
