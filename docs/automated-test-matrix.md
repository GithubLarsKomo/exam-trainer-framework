# Automated test matrix — 1.0 gate

This document defines what `Complete automated test suite` means for Exam Trainer Framework. It does **not** replace real-device or assistive-technology acceptance.

## Required CI gates

Every release candidate must pass:

- `verify`: Vitest + strict TypeScript + Vite production build;
- `browser-chromium`: Playwright against the production preview;
- `browser-webkit`: desktop WebKit/Safari-equivalent functional acceptance;
- `browser-mobile-webkit`: iPhone-style WebKit functional acceptance.

No retries are used to turn flaky failures green.

## Coverage by risk area

| Risk area | Automated evidence |
| --- | --- |
| Classic scheduling and grading | core/review-engine unit tests |
| FSRS shadow isolation and evaluation | scheduler, simulation and FSRS-shadow evaluation unit tests; Settings browser smoke |
| Schema migration / learner progress preservation | DB migration tests |
| Exact session recovery | recoverable-session domain/storage tests + browser reload/resume workflow |
| Exam navigation / deferred review commit | recoverable-session tests + browser workflow |
| Dependent examination subtasks | dependency unit tests + browser lock/unlock workflow |
| Adaptive Queue / blueprint precedence | exam-intelligence, today-plan and diagnostics tests |
| All ten question renderers | structured/image-label unit tests + Chromium/WebKit/Mobile-WebKit browser renderer suite |
| Touch gestures | pure gesture tests + browser opt-in/input-isolation/dependency-lock tests |
| Publication immutability / versioning | publication-workflow unit tests + released→draft browser workflow |
| Catalog persistence/lifecycle | catalog-store and catalog-repository tests |
| Asset storage and rendering | asset-store/authoring/rendering/image-label tests + browser renderer asset checks |
| Full backup integrity | `.etfb` roundtrip, hash/tamper and atomic rollback tests |
| CSV/TSV/APKG import safety | delimited/import/APKG/media-map tests + real legacy APKG browser Preview→Commit flow |
| PWA update reload safety | pure update-policy tests: first controller acquisition never reloads; explicit activation reloads at most once |
| Narrow mobile layout | browser acceptance at 320 CSS px across primary views and an active learning session |
| Primary mobile touch targets | browser assertion that primary bottom-navigation buttons remain at least 44×44 CSS px |
| CI/browser infrastructure | production build before every browser job; traces/screenshots/video retained on failures |

## Explicitly manual even when automated suite is complete

The following cannot be closed by CI alone:

- real iPhone Safari PWA installation/offline/device-termination behavior;
- real iPad portrait/landscape interaction;
- desktop keyboard-only acceptance across actual Chrome/Edge/Safari installations;
- VoiceOver/NVDA announcement quality;
- operating-system file/photo pickers;
- user-visible performance/ergonomics judgment on real devices;
- source/content correctness of the Fügetechnik catalog.

## Completion rule

The automated suite may be marked complete when:

1. every risk area above has deterministic unit/integration and/or production-browser evidence appropriate to the risk;
2. all four required CI gates pass on the same final head;
3. no known product-critical regression is intentionally excluded from automation when it can be tested deterministically;
4. remaining manual acceptance is explicitly tracked separately.

Adding future product behavior reopens this gate if that behavior introduces a new critical invariant without corresponding automated evidence.
