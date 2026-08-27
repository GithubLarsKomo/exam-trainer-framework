# Impeccable Review v2 — Exam Trainer Framework

Status: implementation in progress  
Authority: `PRODUCT.md`, `DESIGN.md`  
Evidence: desktop start-screen and editor screenshots from local port 3001, current `main` implementation, prior green CI.

## Findings

### VC-01 — high — Brand presence is weaker than the approved design intent
**Evidence:** desktop screenshots show `EXAM TRAINER FRAMEWORK` mainly as small text; the approved logo asset is not meaningfully visible in the application chrome. The left rail shows only a small `ETF` treatment.

**Authority:** `DESIGN.md` sections 6 and 14.

**Impact:** the product feels like a generic dark application with an ETF label instead of a coherent branded tool.

**Change:** render the approved horizontal logo as a real image in the header and rail; use the compact mark on mobile.

**Verify:** logo visibly renders in desktop header/rail and remains compact on mobile without reducing task focus.

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

- desktop start screen,
- mobile start screen,
- desktop editor with one preview,
- mobile editor or narrow editor state,
- learning/session surface,
- CI including 320px overflow/accessibility/browser matrix.

No merge while VC-01..VC-03 remain open.
