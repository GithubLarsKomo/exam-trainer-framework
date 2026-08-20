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

## Build output

`npm run hosted:generate` creates generated static artifacts under `public/catalogs/`:

```text
public/catalogs/
  registry.json
  fuegetechnik/
    0.5.10.json
```

The versioned catalog file is the canonical ETF catalog export (`format=etf-catalog`, `version=1`). The registry stores the SHA-256 hash of the exact UTF-8 bytes written to that file. Vite copies these generated files into `dist/catalogs/`; the production container serves the same paths.

Generated files are intentionally not committed. The reviewed release plan and runtime catalog source are authoritative, and every production build regenerates hashes and artifacts from them.

## Adding or updating a hosted release

1. Prepare and validate the runtime catalog through the normal ETF publication workflow.
2. Add or update the source mapping in `scripts/generate-hosted-catalogs.ts` if a new catalog family is introduced.
3. Add an exact id/version entry to `catalogs/hosted-release-plan.json` with `approved: true` only after explicit release approval.
4. Run `npm run build`.
5. Verify the generated registry and versioned catalog through CI.
6. Merge only after Unit/Build, hosted-release verification, production-container smoke, Chromium/PWA, desktop WebKit and mobile WebKit are green.
7. Coolify may then deploy `main`; no separate publishing webhook is required.

## Privacy boundary

Published catalog artifacts contain learning content only. ETF does not publish learner progress, ReviewEvents, session state, FSRS/classic scheduler state, confidence, readiness, or personal Teach mission state.

## Registry v1 limitation

Catalogs containing `assetRefs` are rejected. Binary asset publication requires a future authenticated asset-manifest protocol with per-asset integrity metadata; publication must not silently bypass this restriction.
