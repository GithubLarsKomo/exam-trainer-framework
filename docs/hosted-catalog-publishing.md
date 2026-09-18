# Hosted catalog publishing

ETF publishes shared catalog releases from an explicit, reviewed release plan. The publication path is intentionally separate from personal/local Teach practice.

## Release authority

`catalogs/hosted-release-plan.json` is the only publication intent file. A release is eligible only when all of the following are true:

- `status` is `released`;
- `approved` is explicitly `true`;
- the requested id and version exactly match the runtime catalog produced by the named source;
- every included legacy card, KnowledgeItem and QuestionVariant is released;
- the catalog is not archived;
- Registry v1 asset restrictions are satisfied.

Adding content to Teach, importing Anki material, editing a draft, or creating a local ETF catalog does **not** publish it.

## Source forms

A release-plan source can be a runtime factory or a deterministic repository source mapped by `scripts/generate-hosted-catalogs.ts`.

For larger reviewed catalogs, ETF may keep the exact approved source as a deterministic `.json.gz` file under `catalogs/sources/`. The build decompresses it, parses it through the normal ETF catalog boundary and runs the same release validation as runtime-generated catalogs. A companion provenance note records the source chain and release transformation.

The compressed source is not served directly. Production receives only the generated, validated versioned ETF catalog export.

## Build output

`npm run hosted:generate` creates generated static artifacts under `public/catalogs/`:

```text
public/catalogs/
  registry.json
  fuegetechnik/
    0.5.10.json
  enterprise-leadership-n1/
    0.3.0.json
```

The versioned catalog file is the canonical ETF catalog export (`format=etf-catalog`, `version=1`). The registry stores the SHA-256 hash of the exact UTF-8 bytes written to that file. Vite copies these generated files into `dist/catalogs/`; the production container serves the same paths.

Generated files are intentionally not committed. The reviewed release plan and mapped runtime/source catalog are authoritative, and every production build regenerates hashes and artifacts from them.

## Adding or updating a hosted release

1. Prepare and validate the runtime catalog through the normal ETF publication workflow.
2. Add or update the source mapping in `scripts/generate-hosted-catalogs.ts` if a new catalog family is introduced.
3. For a deterministic repository source, store the approved compressed catalog plus a provenance note under `catalogs/sources/`.
4. Add an exact id/version entry to `catalogs/hosted-release-plan.json` with `approved: true` only after explicit release approval.
5. Run `npm run build`.
6. Verify the generated registry and versioned catalog through CI.
7. Merge only after Unit/Build, hosted-release verification, production-container smoke, Chromium/PWA, desktop WebKit and mobile WebKit are green.
8. Coolify may then deploy `main`; no separate publishing webhook is required.

## Deep-link installation boundary

A published catalog may be discovered by a learning deep link. Discovery alone does not mutate learner state. If the catalog is absent or an older/draft local copy cannot satisfy the link, ETF may offer a one-click install/update action only for an entry from its same-origin verified registry.

Installation remains explicit and reuses the normal registry protections: SHA-256 verification, exact ID/version match, released-content validation, local snapshot before replacement, and preservation of learner progress.

## Privacy boundary

Published catalog artifacts contain learning content only. ETF does not publish learner progress, ReviewEvents, session state, FSRS/classic scheduler state, confidence, readiness, or personal Teach mission state.

## Registry v1 limitation

Catalogs containing `assetRefs` are rejected. Binary asset publication requires a future authenticated asset-manifest protocol with per-asset integrity metadata; publication must not silently bypass this restriction.
