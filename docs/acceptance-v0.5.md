# Exam Trainer Framework — Acceptance v0.5

Date: 2026-08-04

This document separates automated evidence from device-specific manual acceptance. A checkbox is only considered complete when the corresponding evidence exists.

## Automated acceptance

- [x] Full Vitest suite passes in GitHub Actions.
- [x] TypeScript compilation passes in GitHub Actions.
- [x] Vite production build passes in GitHub Actions.
- [x] Netlify deploy preview succeeds for the acceptance PR.
- [x] Schema migration tests preserve learner progress, catalogs, readiness snapshots and legacy review history.
- [x] Full `.etfb` backup tests cover state + binary assets, tamper detection and atomic rollback.
- [x] Structured question-domain tests cover single choice, multiple choice, cloze, matching, ordering and case study.
- [x] Image-label hotspot tests cover normalized coordinates and KnowledgeItem synchronization.
- [x] Asset tests cover IndexedDB upgrade, hashing, deduplication, linking and orphan validation.
- [x] Recoverable-session tests cover exact queue rotation, position, reveal/outcome state, response timing and non-linear examination navigation.
- [x] IndexedDB roundtrip test preserves an active examination session including structured responses.
- [x] Examination selection tests prove dynamic blueprint weighting is independent of raw question counts and fixed profiles keep unique question IDs.

## Responsive and accessibility acceptance

Implemented and verified by code/build review:

- [x] Mobile bottom navigation.
- [x] Tablet/desktop navigation layout.
- [x] Responsive dashboard, metric grids, forms and editor layout.
- [x] Interactive controls use at least 44 px / 46 px touch targets.
- [x] Explicit `:focus-visible` keyboard focus styling.
- [x] Reduced-motion preference disables animation/transition behavior.
- [x] Safe-area padding is used for bottom navigation on iOS-style devices.
- [x] Learning card width is constrained for focused reading.

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

## Offline / persistence / update acceptance

- [x] Header reports current online/offline state while clarifying local persistence.
- [x] Settings show persistent-storage status, local storage usage and last-backup timestamp.
- [x] PWA update installation no longer silently replaces the active worker.
- [x] A waiting service worker produces a visible update banner and explicit update action.
- [x] The app reloads once after the newly selected worker takes control.

## Manual device acceptance — still required

These items require real-device/browser interaction and must not be inferred from CI:

- [ ] iPhone Safari: install PWA, launch offline, complete a learning session, reveal/grade, terminate/reopen during a mixed structured session and verify exact resume, export/import `.etfb`, upload a photo, edit an image-label hotspot.
- [ ] iPad Safari: repeat core learning, exact-resume, examination navigation, authoring, import, backup and hotspot flows in portrait and landscape.
- [ ] Desktop Chrome/Edge/Safari: keyboard-only navigation, visible focus, offline reload, exact session resume, examination overview/navigation, update banner and structured question interactions.
- [ ] Confirm no horizontal overflow at 320 px CSS viewport width, including the examination number grid.
- [ ] Confirm VoiceOver/NVDA labels for navigation, update banner, examination question buttons, structured controls and image-label inputs.

## Deferred acceptance

- Cross-device synchronization is explicitly out of scope; device migration is handled by `.etfb` full backup/restore.
- Optional gesture navigation remains a separate roadmap item; all essential actions have button-based controls.
- Dependent examination tasks remain a separate roadmap item.
