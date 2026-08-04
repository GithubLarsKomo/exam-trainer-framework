# Exam Trainer Framework — Release Notes v0.5

Date: 2026-08-04

## Highlights

v0.5 turns the original exam-oriented PWA into a substantially more complete local learning platform while preserving the offline-first, no-account design.

### Adaptive learning and exam readiness

- KnowledgeItem / QuestionVariant domain projection
- immutable ReviewEvent history
- classic five-stage scheduler retained as authoritative
- FSRS 5.4.1 shadow scheduling for later evidence-based activation
- blueprint-weighted Readiness score
- adaptive “Heute lernen” queue with explainable reason codes
- learning diagnostics for repeated failures, uncertainty, slow recall, exam failures and regression

### Anki / CSV / TSV import

- safe CSV/TSV parsing and field mapping
- direct `.apkg` support for legacy and modern Anki schemas
- mixed-note-type ordinal fallback with warnings
- explicit Preview → Commit workflow
- no execution of imported template HTML/JavaScript
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

- new `.etfb` full-backup format
- learner state, catalogs and binary assets in one archive
- asset byte-length and SHA-256 validation before restore
- atomic IndexedDB restore with rollback on transaction failure
- previous JSON state-only backups remain importable for compatibility

### Complete question-type coverage

The application now supports:

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

### UX and PWA polish

- responsive mobile/tablet/desktop navigation and layouts
- explicit keyboard focus states and reduced-motion behavior
- online/offline and persistence/backup status indicators
- remaining-time estimate in learning sessions
- free-text/numeric draft recovery inside the current browser tab
- learner answer remains visible after solution reveal
- explicit PWA update banner instead of silent worker takeover

## Verification

The v0.5 acceptance branch passes the complete automated Vitest suite, TypeScript compilation, Vite production build and Netlify deploy preview. See `docs/acceptance-v0.5.md` for the evidence matrix and remaining manual device checks.

## Still open before a full 1.0 release

- exact active-session queue restoration after browser termination
- optional touch gestures
- examination overview / answer navigation
- dependent examination tasks
- remaining catalog/editor/versioning workflow items
- complete Fügetechnik source/asset review
- real-device iPhone/iPad/desktop accessibility acceptance
- FSRS activation decision after sufficient shadow evidence
