# Exam Trainer Framework — Release Notes v0.5

Date: 2026-08-05 (consolidated acceptance state)

## Highlights

v0.5 turns the original exam-oriented PWA into a substantially more complete local learning platform while preserving the offline-first, no-account design.

### Adaptive learning and exam readiness

- KnowledgeItem / QuestionVariant domain projection
- immutable ReviewEvent history
- classic five-stage scheduler retained as authoritative
- FSRS 5.4.1 shadow scheduling for evidence-based evaluation
- explicit FSRS Shadow → controlled-pilot → activation policy; no automatic activation
- blueprint-weighted Readiness score
- adaptive `Heute lernen` queue with explainable reason codes
- learning diagnostics for repeated failures, uncertainty, slow recall, exam failures and regression
- bounded leech influence in the Adaptive Queue

### Learning and examination UX

- exact recoverable learning/exam sessions in IndexedDB
- queue order, current position, reveal state, answer state and timing restored after interruption
- non-linear examination overview/navigation
- exam reviews committed only once at final submission
- fixed and blueprint-weighted dynamic examination selection
- dependent examination subtasks selected atomically and unlocked in sequence
- optional touch gestures with complete button fallback
- gestures never reveal or grade by themselves

### Anki / CSV / TSV import

- safe CSV/TSV parsing and field mapping
- direct `.apkg` support for legacy and modern Anki schemas
- mixed-note-type ordinal fallback with warnings
- explicit Preview → Commit workflow
- no execution of imported template HTML/JavaScript
- no Anki scheduling/review-history import
- modern zstd/protobuf media-map decoding
- media size/hash integrity checks
- imported images/audio linked into the local asset library

### Asset library

- dedicated IndexedDB binary store
- SHA-256 deduplication across catalogs
- offline raster-image/audio rendering
- local image/audio upload
- alt-text and rights/source metadata
- card/variant asset references
- usage/orphan/missing-binary validation
- image-label hotspot editor with normalized responsive coordinates

### Full backup and restore

- `.etfb` full-backup format
- learner state, catalogs and binary assets in one archive
- asset byte-length and SHA-256 validation before restore
- atomic IndexedDB restore with rollback on transaction failure
- previous JSON state-only backups remain importable for compatibility

### Complete question-type coverage

The application supports:

- free text
- numeric
- single choice
- multiple choice
- cloze
- matching
- ordering
- image labels
- drawing
- case study

Structured types use native interactive controls in learning/exam sessions and keep learner self-assessment authoritative after reveal.

### Local catalog authoring and publication

- multiple local catalogs with separated persistence
- create, duplicate, import/export, archive, restore and protected final delete
- full mobile-first card editor, search, filter and bulk operations
- immutable released versions
- explicit `draft → in_review → approved → released` workflow with change-request/retirement paths
- workflow log, version history, comparison and restore-as-new-draft
- publication validation with blocking errors and confirmable warnings
- dependency-group validation for examination subtasks

### UX, PWA and browser acceptance

- responsive mobile/tablet/desktop navigation and layouts
- explicit keyboard focus states and reduced-motion behavior
- online/offline and persistence/backup status indicators
- remaining-time estimate in sessions
- learner answer preserved after reveal
- explicit PWA update banner instead of silent worker takeover
- Playwright acceptance against production build in Chromium, Desktop-WebKit and iPhone-15-style Mobile-WebKit

## Verification

The consolidated v0.5 code path passes:

- complete Vitest suite;
- strict TypeScript compilation;
- Vite production build;
- Chromium browser acceptance;
- Desktop-WebKit browser acceptance;
- Mobile-WebKit browser acceptance.

WebKit/iPhone emulation increases Safari/mobile coverage but does not replace real-device acceptance. See `docs/acceptance-v0.5.md` for the evidence matrix.

## Still open before a full 1.0 release

The remaining work is now concentrated rather than broad feature development:

- real-device iPhone Safari acceptance;
- tablet/desktop manual acceptance and local deployment acceptance;
- approved local Fügetechnik examination assets;
- complete source-page metadata and remaining content review;
- validation of historical Fügetechnik task/point distribution against source evidence;
- sufficient real FSRS shadow evidence and, only if eligible, a controlled Classic-vs-FSRS pilot;
- final 1.0 release decision and tag.

User and author documentation are maintained separately in `docs/user-guide.md` and `docs/catalog-authoring.md`.
