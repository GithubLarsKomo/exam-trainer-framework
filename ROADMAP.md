# ROADMAP

## 0.1 — Repository baseline

- [x] Create specification
- [x] Define repository structure
- [x] Add catalog schema baseline
- [x] Add Fügetechnik catalog placeholders
- [x] Initialize Vite and TypeScript application
- [x] Add automated build and tests

## 0.2 — Learning core

- [x] IndexedDB repositories
- [x] Scheduling engine
- [x] Session engine
- [x] Backup and restore
- [x] Statistics

## 0.3 — MVP question renderers

- [x] Free text
- [x] Numeric
- [x] Drawing and criteria checklist
- [ ] Image labels with assets

## 0.4 — UX/UI and local catalog authoring

Decisions: [docs/grill-decisions-v0.4.md](docs/grill-decisions-v0.4.md)

### Phase A — Information architecture and design system

- [ ] Mobile bottom navigation
- [ ] Desktop/tablet navigation
- [ ] Redesigned start dashboard
- [ ] Responsive component and spacing system
- [ ] Accessible focus states and 44 px touch targets
- [ ] Offline, persistence and backup indicators

### Phase B — Learning and examination UX

- [ ] Focused learning card layout
- [ ] Session progress and remaining-time estimate
- [ ] Autosaved active session
- [ ] Improved reveal and self-grading flow
- [ ] Optional touch gestures with button fallback
- [ ] Examination overview and answer navigation
- [ ] Fixed and dynamic examination profiles
- [ ] Dependent examination tasks

### Phase C — Multiple local catalogs

- [ ] Catalog repository separated from learner state
- [ ] Migrate built-in and imported catalogs
- [ ] Catalog list and active learning catalog
- [ ] Create, duplicate, archive and delete catalog
- [ ] Complete catalog import and export
- [ ] Snapshot before destructive catalog operations

### Phase D — Full card editor

- [ ] Card list, search, filters and sorting
- [ ] Multi-select and bulk editing
- [ ] Create, edit, duplicate and archive cards
- [ ] Mobile-first editor
- [ ] Live preview using production renderer
- [ ] JSON view
- [ ] Per-card synonyms and typo tolerance
- [ ] Source metadata editor

### Phase E — All question types

- [x] Free text
- [x] Numeric
- [ ] Single choice
- [ ] Multiple choice
- [ ] Cloze
- [ ] Matching
- [ ] Ordering
- [ ] Image labels
- [x] Drawing
- [ ] Case study

### Phase F — Versioning and publication

- [ ] Immutable released card versions
- [ ] New draft generated from released card
- [ ] Workflow states and transition log
- [ ] Version history and comparison
- [ ] Restore earlier version as new draft
- [ ] Catalog validation report
- [ ] Blocking errors and confirmable warnings

### Phase G — Asset library

Asset binaries live in a dedicated IndexedDB object store. Catalog JSON carries only manifests and references so learner state stays compact and assets can be deduplicated by content hash.

- [x] IndexedDB asset store with database upgrade path
- [x] SHA-256 content hashing and binary deduplication
- [x] Asset manifest metadata for type, size, source and filename
- [x] Card and question-variant asset references for resolved imports
- [x] Offline image/audio rendering from asset references with a fail-closed media allowlist
- [x] Read-only Asset Library inventory with usage and local-presence status
- [ ] Upload from iPhone files and photo library
- [ ] Rights and alt-text metadata authoring
- [ ] Asset usage and orphan validation across catalogs
- [ ] Image-label hotspot editor
- [x] Backup/export including binary assets with atomic restore

### Phase H — Acceptance

- [ ] Unit tests for catalog validation and versioning
- [ ] Tests for all question renderers
- [ ] Migration tests preserving learner progress
- [ ] Production build and CI pass
- [ ] iPhone Safari acceptance
- [ ] Tablet and desktop acceptance
- [ ] Version 0.4 release notes

## 0.5 — Fügetechnik catalog completion

- [x] Author at least 40 pilot cards
- [x] Cover available exam-memory questions 1–11
- [ ] Add approved local examination assets
- [ ] Complete source-page metadata
- [ ] Resolve remaining `needs_review` cards
- [ ] Validate historical task and point distribution

## 0.6 — PWA and deployment

- [x] Offline service worker
- [x] Install manifest
- [x] Netlify deployment
- [ ] Improved update lifecycle and update notice
- [ ] Manual local deployment acceptance

## 0.7 — Adaptive learning foundation

The existing five-stage scheduler remains authoritative while the new FSRS scheduler runs in shadow mode. Activation of FSRS is explicitly deferred until shadow data demonstrates equal or better retention with lower review effort.

- [x] Introduce `KnowledgeItem` and `QuestionVariant` projection for legacy cards
- [x] Add immutable `ReviewEvent` history with source and response-time context
- [x] Migrate learner state to schema v3 without reconstructing historical FSRS state
- [x] Extract the classic five-stage scheduler behind a scheduler interface
- [x] Add FSRS 5.4.1 in non-authoritative shadow mode
- [x] Route learning and exam reviews through the common review engine
- [x] Keep examination clone IDs from creating separate learner-progress records
- [x] Add deterministic trajectory and 500-item population simulation harness
- [ ] Collect sufficient shadow data for classic-vs-FSRS comparison
- [ ] Define activation thresholds for retention and review workload

## 0.8 — Exam intelligence and adaptive queue

Blueprint weights are authoritative for exam relevance; question counts never substitute for a known exam distribution. Readiness v1 is deterministic and transparent. FSRS remains non-authoritative and may only influence the queue when explicitly feature-enabled.

- [x] Add validated `ExamBlueprint` with optional exam date, points, item count and pass threshold
- [x] Add equal-topic fallback blueprint when no real blueprint is available
- [x] Add deterministic mastery and coverage calculation by blueprint section
- [x] Add transparent Readiness v1 with coverage adjustment and weakest-topic detection
- [x] Add Adaptive Queue scoring from classic due state, mastery, exam weight, exam proximity, coverage and recent failures
- [x] Persist explainable queue reason codes in queue results
- [x] Surface FSRS-due as a shadow reason without affecting default priority
- [x] Add tests proving blueprint weights beat unequal question counts
- [x] Add tests for queue ordering and FSRS shadow isolation
- [x] Persist readiness snapshots in learner state with bounded history
- [x] Connect catalog blueprint editing and exam date to the production UI
- [x] Add `Heute lernen` dashboard using the Adaptive Queue

## 0.9 — Learning diagnostics

Diagnostics are evidence-based observations over review history. They must not claim semantic causes that cannot be established from learner data alone.

- [x] Detect repeated failures and repeated uncertainty
- [x] Detect slow recall from response-time history
- [x] Detect recent exam failures and low mastery after repeated reviews
- [x] Detect regression after earlier correct responses
- [x] Classify persistent problem items as leeches
- [x] Show diagnostic observations and Readiness trend in the progress UI
- [x] Add targeted intervention suggestions per observable diagnostic pattern
- [ ] Feed confirmed leech state into the Adaptive Queue as a controlled reason code
- [ ] Add optional AI-assisted cause hypotheses behind explicit learner/content-review approval

## 0.10 — Anki import

Anki is an inbound content source, not a second runtime model. Imported decks are untrusted input. Scheduling history and template execution are explicitly excluded.

- [x] Add a shared normalized import model for CSV, TSV and APKG
- [x] Add robust CSV/TSV parsing with quoted fields and embedded newlines
- [x] Add automatic field-mapping suggestions and safe plain-text Preview candidates
- [x] Add direct APKG parsing for `collection.anki2`, `collection.anki21` and `collection.anki21b`
- [x] Read legacy Anki metadata from `col.models` and `col.decks`
- [x] Read modern schema-15+ fields, note types, templates and decks from normalized tables
- [x] Preserve note fields, tags, deck hierarchy, template identity, cloze semantics and media bytes
- [x] Never execute or render imported template HTML/JavaScript
- [x] Explicitly ignore Anki scheduling and review history
- [x] Enforce archive and decompressed-entry safety budgets for untrusted APKG files
- [x] Add production Import Preview and field-mapping UI
- [x] Commit approved Preview candidates into a new Exam Trainer catalog
- [x] Persist APKG media in the asset library and link resolved image/audio references
- [x] Render linked imported media offline in learning and examination flows
- [x] Decode modern zstd/protobuf media maps and compressed payloads with size/hash integrity checks

## 1.0 — Full release

- [ ] Full Fügetechnik catalog
- [ ] Cross-device acceptance
- [ ] Complete automated test suite
- [ ] User and author documentation
- [ ] Tagged release

## Explicitly deferred

- User accounts and roles
- PIN-protected authoring
- Cross-device synchronization
- WebDAV, iCloud or server synchronization
- GitHub synchronization from the app
- LLM grading
- Automatic partial scoring for complex responses
