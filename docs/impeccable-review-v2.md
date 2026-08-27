# Impeccable Review v2 — Exam Trainer Framework

Status: implementation in progress  
Authority: `PRODUCT.md`, `DESIGN.md`  
Evidence: repeated desktop start-screen and editor screenshots from local port 3001, current feature-branch implementation, browser acceptance and CI.

## Findings

### VC-01 — closed — Brand presence in rendered app chrome
**Evidence:** the latest desktop render visibly shows the ETF vector mark and typographic wordmark in the left rail. The vector master mark is loaded from `/assets/etf-mark.svg` and the broken oversized raster lockup is no longer used for app chrome.

**Authority:** `DESIGN.md` sections 6 and 14.

**Resolution:** desktop keeps the permanent ETF identity in the rail. Mobile keeps the compact mark in the header. The desktop header no longer duplicates the full brand lockup and instead prioritises the active catalog context.

**Verification:** browser acceptance checks that the desktop rail mark and mobile header mark are visible, use the SVG master, have loaded natural dimensions and occupy a usable rendered size.

### VC-02 — high — Desktop geometry and context hierarchy
**Evidence:** earlier desktop renders showed duplicated brand emphasis and a content island narrower than the available app workspace.

**Authority:** `DESIGN.md` sections 4, 6 and 7.

**Change implemented:** desktop header is reduced to active catalog title plus operational status; header and main share the same left edge; the controlled content maximum is increased to 1160 px (1120 px in the narrower desktop breakpoint); command-centre surfaces use the full controlled work width.

**Verify:** next desktop re-render shows `Fügetechnik` aligned to the hero/KPI/action surfaces with no duplicate desktop lockup and without excessive empty space.

### VC-03 — high — Editor contains duplicate preview content
**Evidence:** the first editor render showed a new `Produktionsvorschau` followed by the legacy question/answer preview with the same content.

**Authority:** `DESIGN.md` section 10 plus product principle `Power without clutter`.

**Change implemented:** keep exactly one production preview and remove legacy siblings once the enhanced preview is active.

**Verify:** one question preview, one model-answer preview, no repeated question/solution below it.

### VC-04 — medium — Editor work/preview ratio
**Authority:** `DESIGN.md` section 10: form/editor left, sticky live preview right; dense authoring surface.

**Change implemented:** desktop ratio approximately 65/35 with a minimum usable preview width; stack on mobile.

**Verify:** editor remains the dominant work surface while preview remains readable and sticky.

### VC-05 — medium — Quick access template-card feel
**Evidence:** the four secondary actions previously appeared as four equal mini-cards inside another bordered panel.

**Authority:** `DESIGN.md` sections 7 and 17.

**Change implemented:** on desktop the quick-access container loses card treatment and the actions become a flatter two-column action list separated by hairlines. Mobile remains a single-column touch-friendly list.

**Verify:** `Heute lernen` remains visually dominant and quick access reads clearly as secondary navigation rather than another dashboard card grid.

### VC-06 — high — Desktop rail must expose Settings
**Evidence:** the latest desktop screenshot shows Start, Lernen, Prüfung, Fortschritt and Kataloge but no visible `Einstellungen`, although `DESIGN.md` requires the complete desktop rail.

**Authority:** `DESIGN.md` section 6.

**Change implemented:** desktop explicitly renders `[data-view="settings"]` and anchors it to the bottom of the rail. Mobile still hides the sixth persistent target and uses the secondary settings shortcut.

**Verify:** desktop browser acceptance requires the Settings rail target to be visible while the 320 px mobile test still requires exactly five primary bottom-nav targets.

## Visual Completion Gate

Before merge, re-render and verify:

- desktop start screen: rail-only permanent branding, aligned catalog header, visible Settings, flatter quick access;
- mobile start screen with compact header mark and five primary bottom targets;
- desktop editor with one preview and approximately 65/35 work/preview hierarchy;
- mobile editor or narrow editor state;
- learning/session surface;
- full CI including explicit brand-image gate, desktop Settings gate, 320 px overflow/accessibility, Chromium, WebKit and Mobile-WebKit.

PR remains Draft until the re-render closes VC-02, VC-03, VC-04, VC-05 and VC-06 and CI is green.
