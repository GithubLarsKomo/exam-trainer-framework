# DESIGN.md — Exam Trainer Framework

Status: **approved**  
Depends on: `PRODUCT.md`  
Source: `exam-trainer-design-system-r1` (`sha256:12a9e4618585a443cc68cfbd8f1d0a9af81f2afe16b03c49b32435e4307474c6`)  
Approved: 2026-08-23

## 1. Design intent

ETF is a **dark, compact, technically precise application surface** for exam-oriented learning and catalog authoring. It must feel like a focused tool, not a landing page, dashboard template, school app or corporate LMS.

The visual system should communicate control, concentration and progress without decorative noise. Learning views are calmer and more isolated; editing and table surfaces may be denser.

## 2. Theme

### Default
- Dark theme is the default.
- A light theme may be added later only as an explicit alternative, not as the primary visual authority.
- Use very dark charcoal/graphite rather than pure black.

### Base palette direction
The following semantic direction is normative; exact implementation values may be tuned for contrast while preserving the relationships.

- Canvas: near-black graphite (`#0b0e14` class)
- Primary surface: dark graphite-blue (`#111722` class)
- Elevated/secondary surface: slightly lighter graphite (`#151d29` class)
- Primary text: cool off-white
- Muted text: cool grey-blue
- Borders: subtle cool 1 px separators
- Brand: electric blue / azure
- Success: restrained green
- Warning: amber
- Danger: warm red

Brand colour is **substantial but functional**. It appears in active navigation, primary actions, progress, focus states and selected/important interactive surfaces. It is not used as decoration.

## 3. Typography

- Use a system/UI sans stack with a technical-geometric character.
- No external font dependency is permitted for core runtime.
- Typography should be compact, legible and neutral rather than editorial or playful.
- Headlines use tight tracking and strong hierarchy but remain product-scale, not marketing-scale.
- Numeric status values may use tabular numerals.
- Avoid excessive uppercase; small eyebrow labels are acceptable for metadata/state grouping.

## 4. Density

Density is **surface-adaptive**:

- Learning: airy enough to isolate the current task and reduce distraction.
- Start/dashboard: moderately compact.
- Catalog editor, filters, tables and administration: distinctly denser.

Whitespace is used to separate responsibility and reading order, not to create a luxury/landing-page feel.

## 5. Surfaces and component character

- Prefer flat surfaces with 1 px borders.
- Default radii are moderate, approximately 8–12 px.
- Larger radii are reserved for major containers only and should remain restrained.
- Shadows are reserved for true overlays/elevated layers, not ordinary cards.
- Avoid decorative glassmorphism, gradient text, large ornamental gradients and generic card mosaics.
- Information that belongs together should be grouped as one coherent surface rather than split into interchangeable cards.

## 6. Navigation

### Desktop and landscape tablet
Use a **compact left rail/sidebar** as the primary navigation pattern.

The rail should:
- make the application character immediately obvious;
- contain Start, Lernen, Prüfung, Fortschritt, Kataloge and Einstellungen;
- keep labels readable without becoming a wide admin sidebar;
- use electric blue/azure for the active state;
- remain visually subordinate to the current work surface.

### Mobile
Keep five primary bottom navigation targets:

1. Start
2. Lernen
3. Prüfung
4. Fortschritt
5. Kataloge

`Einstellungen` remains secondary and must not force a sixth persistent mobile tab.

Touch targets are at least 44 × 44 CSS px.

## 7. Start screen

The start screen is a **compact command centre**, not a marketing hero.

Order of emphasis:

1. today's learning recommendation and primary CTA;
2. a compact connected KPI/readiness strip;
3. a small number of secondary actions;
4. operational state such as offline/local status and backup information only where useful.

Do not use oversized slogans, decorative hero imagery or a template-like metric-card grid.

## 8. Learning screen

Learning is the strongest focus surface in the application.

- One task is visually isolated at a time.
- Use a relatively narrow readable content width.
- Keep the session/status row compact.
- Peripheral navigation and metrics must not compete with the task.
- The prompt is the dominant text element.
- Input and reveal actions are obvious and touch-friendly.

After `Lösung zeigen`, preserve this hierarchy:

1. **Eigene Antwort**
2. **Musterlösung**
3. **Bewertungshilfe / advisory information**
4. **Selbsteinstufung**

The user's answer remains visible after reveal. Distinguish these sections using structure, labels and restrained semantic accents; colour alone is insufficient.

## 9. Exam surfaces

Exam views should feel stricter and quieter than ordinary learning configuration.

- Keep blueprint and readiness information explicit and inspectable.
- Avoid celebratory/gamified visuals.
- Use strong status hierarchy and compact tabular presentation where appropriate.
- Critical grading boundaries must be visually and semantically explicit.

## 10. Catalog and editor surfaces

The editor is a power surface.

### Desktop
Preferred structure:
- form/editor on the left;
- sticky live preview on the right;
- compact tables, filters and list views;
- clear separation of editable draft, published state and validation status.

### Mobile
The full editing workflow must remain usable on iPhone. Progressive stacking/tabs are acceptable, but no feature may become desktop-only.

Dense surfaces may use smaller spacing than learning views, while maintaining touch accessibility for controls used on mobile.

## 11. Buttons and interactive states

- Primary action: electric blue/azure filled treatment.
- Secondary actions: dark neutral surfaces with 1 px borders.
- Destructive actions: semantic red treatment.
- Selected/active states use brand colour plus shape/label/state differences.
- Disabled states remain legible but clearly inactive.
- Keyboard focus is highly visible and must not be removed.

Do not use lift/scale animation as a default interaction cue.

## 12. Motion

Motion is minimal and functional only:

- short hover/focus transitions;
- expand/collapse transitions where useful;
- loading/state transitions;
- no decorative parallax, bouncing, card lifting or attention-seeking animation.

Respect `prefers-reduced-motion` by disabling non-essential transitions and animation.

## 13. Icons and imagery

### Icons
- Use one consistent monochrome icon language.
- Icons support recognition; labels remain available where meaning may be ambiguous.
- Avoid emoji as the final product icon system.

### Images
Images are used only as subject matter or learning aids. No decorative stock/AI illustration belongs in the application chrome.

## 14. Logo and app mark

ETF requires a dedicated app mark derived from the same conceptual discipline as the Grilling identity but using the ETF colour system.

The mark should combine the ideas of:
- **learning / knowledge**;
- **exam / verification**;
- **brain / cognition**.

It must remain legible as a small app icon, work on dark graphite surfaces, and use electric blue/azure as the defining colour. It should be geometric, compact and technical rather than playful, mascot-like or school-themed.

Preferred characteristics:
- simple silhouette;
- no text inside the primary icon;
- no graduation cap, cartoon brain, trophy or checkmark badge cliché as the sole metaphor;
- cognition/brain structure may be abstracted into connected paths, folds or nodes;
- an exam/verification motif may be integrated subtly through a tick, completion path or structured frame;
- usable in monochrome and in the primary blue-on-graphite version.

The app icon, header mark and PWA manifest icons should derive from the same master mark.

## 15. Accessibility

WCAG 2.2 AA is the minimum visual baseline.

Mandatory design rules:

- visible keyboard focus;
- text/background contrast at or above AA requirements;
- colour never carries state alone;
- controls remain usable at 200% zoom where applicable;
- mobile touch targets are at least 44 × 44 CSS px;
- no essential hover-only affordances;
- core surfaces do not horizontally overflow at 320 px;
- reduced-motion preferences are respected.

## 16. AI/model presentation

Future model output must be explicitly labelled as `KI-Vorschlag` or `Modellhinweis`.

It must:
- be visually distinct from authoritative solutions;
- never silently replace a model solution or deterministic result;
- remain dismissible/overridable;
- state uncertainty or provenance where relevant;
- use assistive styling, not success/approval styling.

## 17. Anti-patterns

Do not introduce:

- generic identical card grids;
- decorative glassmorphism;
- gradient text;
- marketing hero layouts;
- metric-card template compositions as a default dashboard device;
- decorative stock or AI imagery;
- modal-first architecture;
- excessive pill controls;
- gamification/streak visuals as product identity;
- school/child motifs;
- broad corporate-LMS navigation patterns;
- emoji as the production icon language.

## 18. Implementation hierarchy

When changing ETF UI:

1. `PRODUCT.md` defines product intent.
2. This `DESIGN.md` defines visual and interaction authority.
3. Existing component conventions are preserved where they do not conflict.
4. Changes should be evolutionary unless an approved design rule explicitly requires structural change.
5. Automated accessibility/layout gates remain release requirements.
