# Public deployment legal baseline

This checklist tracks the operator-specific work that cannot be truthfully inferred from the public repository. The application now contains public `Impressum` and `Datenschutz` pages, but the marked operator placeholders remain a release/deployment blocker until verified values are inserted.

## Operator identity

- [ ] Replace `[BETREIBERNAME / FIRMA EINTRAGEN]` with the legally correct operator name.
- [ ] Add a serviceable postal address.
- [ ] Add a monitored contact email address.
- [ ] Add legal form, representative, register and tax/business identifiers where applicable.
- [ ] Decide whether additional media-law responsibility information is applicable and remove the placeholder when not required.

## Hosting and processing

- [ ] Confirm the production hosting entity/product and server location used for the public deployment.
- [ ] Confirm the required data-processing agreement with the hosting provider is in place where applicable.
- [ ] Record the actual reverse-proxy/web-server access and error log fields.
- [ ] Record and configure the actual log-retention period; replace `[SERVER-/PROXY-LOG-AUFBEWAHRUNG EINTRAGEN]`.
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
- [ ] No operator placeholders remain in the deployed release candidate.
- [ ] Verify the final wording against the actual deployment and, when appropriate, obtain qualified legal review.

## Current implementation boundary

The repository currently supports a local-first/offline application model and contains no identified advertising analytics or telemetry integration. This checklist deliberately does not infer operator identity, hosting contract details, proxy configuration, retention periods or applicability of additional professional/media-law disclosures.
