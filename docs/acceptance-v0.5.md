# Exam Trainer Framework — Acceptance v0.5

Date: 2026-08-05 (consolidated automated evidence)

This document separates automated evidence from device-specific manual acceptance. A checkbox is only considered complete when the corresponding evidence exists. The 1.0 automated-suite completion rule is defined in [automated-test-matrix.md](automated-test-matrix.md). The executable real-device, accessibility and deployment protocol is defined in [manual-acceptance-1.0.md](manual-acceptance-1.0.md).

## Automated acceptance

- [x] Full Vitest suite passes in GitHub Actions.
- [x] TypeScript compilation passes in GitHub Actions.
- [x] Vite production build passes in GitHub Actions.
- [x] Schema migration tests preserve learner progress, catalogs, readiness snapshots and legacy review history.
- [x] Full `.etfb` backup tests cover state + binary assets, tamper detection and atomic rollback.
- [x] Structured question-domain tests cover single choice, multiple choice, cloze, matching, ordering and case study.
- [x] Image-label hotspot tests cover normalized coordinates and KnowledgeItem synchronization.
- [x] Asset tests cover IndexedDB upgrade, hashing, deduplication, linking and orphan validation.
- [x] Recoverable-session tests cover exact queue rotation, position, reveal/outcome state, response timing and non-linear examination navigation.
- [x] IndexedDB roundtrip test preserves an active examination session including structured responses.
- [x] Examination selection tests cover blueprint weighting, atomic dependent groups, ordering and dependency locking.
- [x] Adaptive Queue tests cover blueprint precedence, FSRS shadow isolation and bounded leech influence.
- [x] FSRS shadow-evaluation tests cover evidence thresholds, retention/workload gates and migrated-history exclusion.
- [x] PWA update-policy tests prove that first controller acquisition cannot trigger an unsolicited reload and explicit update activation can reload at most once.

## Production-browser acceptance

Playwright runs against the built Vite production preview with separate merge gates for Chromium, Desktop-WebKit and Mobile-WebKit.

- [x] All ten question renderers are exercised in real browsers.
- [x] Prompt/answer asset reveal behavior is exercised in real browsers.
- [x] Interrupted-session recovery restores persisted answer state.
- [x] Examination navigation remains non-linear without prematurely committing review events.
- [x] Dependent examination subtasks remain locked until predecessors are graded.
- [x] Editing released content creates a draft successor while the active release remains immutable.
- [x] A real legacy `.apkg` passes mapping → preview → explicit commit.
- [x] Touch gestures remain opt-in, ignore answer controls and cannot bypass dependency locks.
- [x] FSRS Shadow status is visible without exposing an activation control.
- [x] Core product views and an active learning session are checked for horizontal overflow at a 320 CSS-px viewport.
- [x] Primary bottom-navigation touch targets are checked for at least 44×44 CSS px.

## Responsive and accessibility evidence

Implemented and partly automated:

- [x] Mobile bottom navigation.
- [x] Tablet/desktop navigation layout.
- [x] Responsive dashboard, metric grids, forms and editor layout.
- [x] Primary mobile navigation touch-target size is browser-tested.
- [x] 320 px horizontal-overflow regression is browser-tested.
- [x] Explicit `:focus-visible` keyboard focus styling.
- [x] Reduced-motion preference disables animation/transition behavior.
- [x] Safe-area padding is used for bottom navigation on iOS-style devices.
- [x] Learning card width is constrained for focused reading.

Visual/assistive quality still requires the manual checks below; source/CSS assertions are not treated as a substitute for real assistive technology.

## Learning-session UX acceptance

- [x] Session progress indicator is visible.
- [x] Remaining-time estimate is derived from median historical response time with a conservative fallback.
- [x] Free-text/numeric draft answers are saved in `sessionStorage` while typing.
- [x] Draft answers survive an accidental page reload in the same browser tab.
- [x] The learner's answer remains visible next to the model answer after reveal.
- [x] Structured question answers survive the reveal redraw.
- [x] Self-grading remains authoritative for scheduler state.
- [x] Active learning and examination sessions persist exact queue/order, position, reveal state, response timing and answer state in IndexedDB.
- [x] Interrupted sessions produce an explicit resume/discard entry point instead of silently restarting.
- [x] Examination outcomes remain editable during navigation and are committed to learner progress only once, on final submission.
- [x] Examination overview exposes unanswered, revealed and graded states with direct numbered navigation.
- [x] Optional touch gestures are additive aliases only; reveal and grading remain explicit button actions.

## Offline / persistence / update acceptance

- [x] Header reports current online/offline state while clarifying local persistence.
- [x] Settings show persistent-storage status, local storage usage and last-backup timestamp.
- [x] PWA update installation no longer silently replaces the active worker.
- [x] A waiting service worker produces a visible update banner and explicit update action.
- [x] Reload-on-controller-change policy is unit-tested to require explicit update activation and to prevent repeated reloads.

A full real-browser two-version service-worker update remains part of manual deployment/device acceptance because the functional Playwright projects deliberately block service workers to keep IndexedDB/browser acceptance deterministic.

## Manual device acceptance — still required

Execute and record these checks with [manual-acceptance-1.0.md](manual-acceptance-1.0.md). These items require real-device/browser interaction and must not be inferred from CI:

- [ ] iPhone Safari: install PWA, launch offline, complete a learning session, reveal/grade, terminate/reopen during a mixed structured session and verify exact resume, export/import `.etfb`, upload a photo, edit an image-label hotspot, exercise optional gestures.
- [ ] iPad Safari: repeat core learning, exact-resume, examination navigation, authoring, import, backup and hotspot flows in portrait and landscape.
- [ ] Desktop Chrome/Edge/Safari: keyboard-only navigation, visible focus, offline reload, exact session resume, examination overview/navigation, update banner and structured question interactions.
- [ ] Confirm VoiceOver/NVDA labels and announcement quality for navigation, update banner, examination question buttons, structured controls and image-label inputs.
- [ ] Confirm a real deployed service-worker update presents the banner and reloads only after explicit activation.

## Out of scope / deferred

- Cross-device synchronization is explicitly out of scope; device migration is handled by `.etfb` full backup/restore.
- FSRS activation is deferred until sufficient real Shadow evidence and a controlled Classic-vs-FSRS pilot satisfy the explicit activation policy.
- AI-assisted cause hypotheses are optional and approval-gated; they are not part of scheduler correctness.
