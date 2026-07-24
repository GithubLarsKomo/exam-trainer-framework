# MVP acceptance status

## Implemented

- Responsive TypeScript/Vite single-page application
- PWA manifest and offline service worker
- Five-stage spaced repetition (10 minutes, 1 day, 3 days, 7 days, 21 days)
- Correct / partial / incorrect grading
- Retry queue for partial and incorrect answers
- Due, new, error, all, topic and exam modes
- Free-text, numeric and drawing/self-assessment cards
- Statistics, marking, backup, restore and reset
- 41 released pilot cards plus 10 explicitly marked review cards
- Netlify configuration and GitHub Actions build workflow

## Remaining before SPEC-complete acceptance

- Replace the current localStorage state adapter with IndexedDB and migration logging
- Activate validated imported JSON catalogs instead of using only the embedded MVP catalog
- Add install icons and verify installability on all target devices
- Complete source-page metadata and supply the missing examination images
- Resolve and release the 10 `needs_review` cards
- Validate the final 57-task / 202-point examination distribution
- Run and pass CI and manual device acceptance tests
