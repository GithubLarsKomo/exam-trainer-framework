# Exam Trainer Framework — Manual acceptance 1.0

This runbook defines the evidence required to close the manual device, accessibility and deployment gates for 1.0. It complements automated browser acceptance; it does not replace it and it does not treat WebKit emulation as evidence for a real Apple device.

## Completion rule

`Cross-device acceptance` may be marked complete only when all required scenarios below have passed on the same release-candidate commit, every blocking defect has been resolved or explicitly removed from 1.0 scope, and the real deployed service-worker update flow has been observed successfully.

Record the exact candidate commit and deployed URL before starting. If the candidate changes in a way that can affect a scenario, repeat the affected scenario before release.

## Evidence header

Record once for each acceptance run:

| Field | Value |
| --- | --- |
| Date | |
| Tester | |
| Release-candidate commit | |
| Deployed URL / local production URL | |
| Backup fixture used | |
| Notes / known limitations | |

For each scenario record `PASS`, `FAIL` or `BLOCKED`, the device/browser version, and a short note. Screenshots or screen recordings are useful for failures but are not mandatory for a pass unless a defect needs visual evidence.

## A — iPhone Safari / installed PWA

Required on a real supported iPhone using Safari and the installed home-screen PWA.

- [ ] Install the PWA from the release-candidate deployment and launch it from the home screen.
- [ ] Confirm the expected catalog and existing learner state are available after normal restart.
- [ ] Put the device offline and cold-launch the installed PWA; the application shell and locally persisted data remain usable.
- [ ] Complete a normal learning item: enter an answer, reveal, compare the learner answer with the model answer, grade it and advance.
- [ ] Start a mixed structured learning session, enter at least one partially completed response, terminate the PWA, reopen it and resume the exact queue position and answer state.
- [ ] Exercise an examination with numbered/non-linear navigation and confirm staged outcomes are not committed to learner progress before final submission.
- [ ] Exercise an examination dependency group and confirm a later subtask remains locked until its predecessor is graded.
- [ ] Enable optional touch gestures and verify the documented navigation aliases; answer controls, reveal and grading remain protected from gesture side effects.
- [ ] Export a full `.etfb` backup, change local state, restore the backup and confirm learner state, catalogs and referenced media return together.
- [ ] Import a photo through the iOS file/photo picker, add required asset metadata and use it in an image-label item.
- [ ] Create or edit at least one image-label hotspot and verify it remains correctly positioned after leaving and reopening the editor.
- [ ] Confirm portrait layout has no clipped primary controls or horizontal page scrolling in normal use.

## B — iPad Safari

Required on a real supported iPad. Run core interaction in both portrait and landscape.

- [ ] Launch the PWA and confirm navigation/layout adapts correctly in portrait.
- [ ] Repeat navigation/layout acceptance in landscape.
- [ ] Complete and resume a mixed learning session after terminating/reopening the app.
- [ ] Complete examination overview, direct question navigation and final submission.
- [ ] Verify dependent examination subtasks cannot be bypassed through navigation.
- [ ] Create/edit a card and confirm the production-shaped preview remains usable in both orientations.
- [ ] Import content through the production Preview → Commit path.
- [ ] Export and restore a full `.etfb` backup.
- [ ] Upload an image and edit an image-label hotspot.
- [ ] Confirm no essential control is hidden by safe areas, browser chrome or the on-screen keyboard.

## C — Desktop browser acceptance

Required on current desktop Chrome and Edge. Safari is additionally required when a macOS device is available for the 1.0 candidate.

For each browser:

- [ ] Navigate all primary application views using the keyboard only.
- [ ] Confirm keyboard focus is always visibly identifiable on interactive controls.
- [ ] Complete a learning item including reveal and grading without a pointer.
- [ ] Complete structured question controls that are expected to support keyboard operation.
- [ ] Start a session, reload/close and reopen as applicable, and verify exact session recovery.
- [ ] Exercise examination overview and non-linear navigation without premature review-event commits.
- [ ] Switch offline and reload; local application shell and persisted data remain available.
- [ ] Export and restore a full `.etfb` backup.
- [ ] Verify the update banner and explicit update action when a waiting service worker is available.

## D — Assistive-technology acceptance

Automated DOM assertions do not establish announcement quality. Perform at least the following real assistive-technology checks.

### VoiceOver

Use VoiceOver with Safari on an Apple device.

- [ ] Primary navigation destinations have concise, understandable names and state.
- [ ] The PWA update banner and update action are announced in a usable order.
- [ ] Examination question-number controls communicate enough state to distinguish current/answered/locked questions.
- [ ] Structured question controls expose understandable labels, roles and selected state.
- [ ] Image-label inputs and hotspot authoring controls expose meaningful labels or instructions.
- [ ] Reveal/grade flow does not strand focus or make the learner answer/model answer relationship ambiguous.

### NVDA

Use NVDA with Chrome or Edge on Windows.

- [ ] Repeat the navigation, update-banner, examination-navigation, structured-control and image-label checks above.
- [ ] Confirm focus order follows the visual/task order during learning and examination flows.
- [ ] Confirm dynamic status changes that require user awareness are perceivable without relying only on color.

## E — Real service-worker update

This scenario must use two actually deployed versions. Functional Playwright tests intentionally block service workers and cannot close this gate.

1. Deploy release-candidate version A and open/install it so version A controls the page.
2. Deploy version B with an observable, non-destructive version distinction.
3. Keep/reopen the version-A client until the new worker is waiting.
4. Confirm the app presents the update notice rather than silently replacing the active application.
5. Do not activate the update yet; verify the current session remains usable.
6. Trigger the explicit update action.
7. Confirm the application reloads only after the selected worker takes control and does not enter a reload loop.
8. Confirm persisted learner data and any recoverable session remain consistent after the update.

Result:

- [ ] PASS — explicit update observed end to end on a real deployed PWA.

## F — Local production deployment

Use the documented production build/serve path rather than the Vite development server.

```bash
npm install
npm run build
npx serve dist
```

- [ ] Production build completes without error.
- [ ] The served app opens over HTTP and direct `file://` use is not required.
- [ ] Primary views, learning and examination flows load correctly from the production bundle.
- [ ] Reloading a nested/current application state does not break application startup.
- [ ] Offline behavior is tested only after the service worker has had a chance to control the production page.
- [ ] Browser developer tools show no product-blocking uncaught errors during the smoke flow.

## Result matrix

| Area | Device / OS | Browser / PWA | Commit | Result | Evidence / notes |
| --- | --- | --- | --- | --- | --- |
| iPhone | | Safari / installed PWA | | | |
| iPad portrait | | Safari / PWA | | | |
| iPad landscape | | Safari / PWA | | | |
| Desktop Chrome | | Chrome | | | |
| Desktop Edge | | Edge | | | |
| Desktop Safari | | Safari | | | |
| VoiceOver | | Safari | | | |
| NVDA | | Chrome/Edge | | | |
| Service-worker update | | deployed PWA | | | |
| Local production deployment | | | | | |

## Failure handling

A failed scenario should produce a reproducible defect with:

- release-candidate commit;
- exact device/OS/browser;
- minimal reproduction steps;
- expected and observed behavior;
- whether learner data could be lost or corrupted;
- supporting screenshot/video/log when useful.

Do not mark the parent roadmap checkbox complete while a required row is `FAIL` or `BLOCKED`. After a fix, repeat the failed scenario and any adjacent scenario whose invariant may have changed.
