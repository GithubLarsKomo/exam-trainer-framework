# Impeccable Review v2 — Exam Trainer Framework

Status: implementation in progress  
Authority: `PRODUCT.md`, `DESIGN.md`  
Evidence: desktop start-screen and editor screenshots from local port 3001, current `main` implementation, prior green CI.

## Findings

### VC-01 — blocking — Brand presence is missing in rendered app chrome
**Evidence:** desktop screenshots show only the textual product eyebrow and catalog title. The dedicated brand slot in the left rail is present geometrically, but its raster logo is effectively invisible. The previously embedded `exam-trainer-framework-logo.png` is an oversized generated raster canvas and is unsuitable as a compact UI lockup.

**Authority:** `DESIGN.md` sections 6 and 14.

**Impact:** the product still feels like a generic dark application instead of a coherent ETF-branded tool. Asset existence is not sufficient; branding must be visible in the actual rendered UI.

**Change:** stop depending on the unsuitable horizontal raster for application chrome. Build a robust lockup from the approved square ETF app mark plus typographic wordmark `Exam Trainer Framework`. Render it as real DOM in the desktop header and left rail. On mobile use the compact square mark. Keep favicon/PWA/app icon on the same master mark.

**Verify:** header and rail lockups are visibly rendered; both image elements report loaded natural dimensions > 0; mobile remains compact. Browser acceptance explicitly gates these conditions.

### VC-02 — high — Desktop geometry leaves excessive dead space
**Evidence:** on a wide desktop viewport the command centre is visually detached from the left rail and occupies a narrow centred island with large unused space.

**Authority:** `DESIGN.md` sections 4, 6 and 7: compact application surface, left rail, moderately compact command centre.

**Impact:** weak app character, inefficient scan path, lower information density than intended.

**Change:** align header/main to a consistent left-anchored content grid after the rail; keep a controlled maximum work width instead of independent centring.

**Verify:** rail, header and command-centre surfaces share a clear left alignment and use wide desktop space without becoming stretched.

### VC-03 — high — Editor contains duplicate preview content
**Evidence:** the editor screenshot shows a new `Produktionsvorschau` followed by the legacy question/answer preview with the same content.

**Authority:** `DESIGN.md` section 10 plus product principle `Power without clutter`.

**Impact:** competing hierarchy, unnecessary vertical length, ambiguity about which preview is authoritative.

**Change:** keep exactly one production preview and remove the legacy sibling rendering once the enhanced preview is active.

**Verify:** one question preview, one model-answer preview, no repeated question/solution below it.

### VC-04 — medium — Editor work/preview ratio is too balanced for a power surface
**Evidence:** editor form and preview consume similar perceived weight despite the editor being the primary task.

**Authority:** `DESIGN.md` section 10: form/editor left, sticky live preview right; dense authoring surface.

**Change:** desktop ratio approximately 65/35 with a minimum usable preview width; stack on mobile.

### VC-05 — medium — Quick access still risks template-card feel
**Evidence:** start screen follows hero → metrics → generic quick-action block; while improved, the lower actions can still read as a reusable dashboard template.

**Authority:** `DESIGN.md` sections 7 and 17.

**Change:** retain only a small set of functional actions and use a compact two-column desktop layout / single-column mobile layout.

## Visual Completion Gate

Before merge, re-render and verify:

- desktop start screen with visible header and rail branding,
- mobile start screen with compact mark,
- desktop editor with one preview,
- mobile editor or narrow editor state,
- learning/session surface,
- CI including explicit brand-image load gate, 320px overflow/accessibility/browser matrix.

No merge while VC-01..VC-03 remain open.
