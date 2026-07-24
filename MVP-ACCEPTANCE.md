# MVP acceptance status

## Implemented

- Responsive TypeScript/Vite single-page application
- PWA manifest, install icon, and offline service worker
- IndexedDB persistence with automatic migration from the former localStorage state
- Pre-import and pre-reset internal snapshots plus downloadable backups
- Validated JSON catalog import and immediate activation
- Local card review status changes that control learning and exam eligibility
- Five-stage spaced repetition (10 minutes, 1 day, 3 days, 7 days, 21 days)
- Correct / partial / incorrect grading
- Retry queue for partial and incorrect answers
- Due, new, error, all, topic and exam modes
- Free-text, numeric and drawing/self-assessment cards
- Advisory required-term and numeric-tolerance evaluation
- Statistics, marking, backup, restore, full reset and topic reset
- Resumable durable learner state in IndexedDB
- Exact technical exam generation with 57 tasks and 202 points
- Exam-attempt history and result display
- 45 released pilot cards; four image-dependent cards remain explicitly `needs_review`
- Netlify configuration and GitHub Actions test/build workflow
- Automated tests for stage transitions, numeric tolerances, and 57/202 point allocation

## Source-dependent items still requiring user material or manual validation

These are not software implementation gaps:

- Supply the two missing examination images for questions 6 and 8.
- Add exact PDF and printed-page references to every card during final catalog editing.
- Validate the intended topic and point distribution of the original 202-point examination.
- Confirm the exact lecture answer for the replacement process in question 11; the current answer is visibly qualified.
- Perform manual acceptance on iPhone Safari, iPad Safari, desktop Chrome, and desktop Edge.

## Important MVP behavior

Until the full catalog provides at least 57 distinct released tasks, exam simulation repeats released cards as generated instances. It nevertheless creates exactly 57 tasks and allocates exactly 202 points. This is deliberate and disclosed in the exam screen; it must be replaced by a validated full exam blueprint before catalog version 1.0.
