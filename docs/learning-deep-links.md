# Learning deep links

ETF can start one focused, recoverable learning session from a URL without introducing a second scheduler or progress model.

## Contract

Canonical form:

```text
?catalog=<catalogId>&focus=<knowledgeItemId>&mode=<mode>
```

Required:

- `catalog`: exact ETF catalog id.
- `focus`: exact released `KnowledgeItem.id`.

Optional:

- `mode`: defaults to `practice`.

Supported modes:

| URL mode | ETF competency surface | Runtime behavior |
|---|---|---|
| `retrieval` | `knowledge` | deterministic released retrieval variant |
| `application` | `application` | deterministic released application variant |
| `practice` | `application` | backward-compatible alias for `application` |
| `transfer` | `transfer` | deterministic released transfer variant |
| `review` | adaptive | existing unseen/least-recently-seen ETF variant selection |
| `repeat` | adaptive | alias for `review` |

Example for *Unternehmen mitführen*:

```text
?catalog=enterprise-leadership-n1&focus=decision-architecture-rights&mode=practice
```

The shared hosted release is `enterprise-leadership-n1@0.3.0`. The earlier v0.2 artifact remains a historical draft source and is not silently promoted in-place.

## Runtime rules

1. A matching local released catalog starts immediately.
2. If the requested catalog is missing, or a local draft/older version cannot satisfy the link, ETF checks its same-origin hosted registry.
3. When a released registry entry exists, ETF offers an explicit **install/update & start** action. Nothing is installed merely by opening the URL.
4. After user confirmation, ETF downloads the versioned catalog with `cache: no-store`, verifies SHA-256, catalog ID, catalog version and release status, creates a local state snapshot, installs/replaces only the local catalog copy, and then starts the requested focus.
5. An unknown or unpublished catalog still falls back to manual catalog management; the learning link never accepts arbitrary content.
6. The focused KnowledgeItem and requested competency variant must be `released`.
7. The deep link creates a normal one-item recoverable ETF learning session and pins the selected `QuestionVariant.id`.
8. ReviewEvents, learner progress, scheduling and readiness keep the semantic `KnowledgeItem.id`; no second progress identity is created.
9. If another recoverable session exists, replacing it requires explicit user confirmation.
10. After the focused session is resumed, ETF removes `catalog`, `focus` and `mode` from the address bar so browser refresh does not launch the link again.

## EPUB integration

An EPUB can keep stable semantic focus ids while changing only the external ETF base URL. This permits the content producer to own chapter semantics and ETF to own learning runtime behavior.

For a three-step learning path, use three links to the same `focus`:

```text
?catalog=enterprise-leadership-n1&focus=<knowledgeItemId>&mode=retrieval
?catalog=enterprise-leadership-n1&focus=<knowledgeItemId>&mode=practice
?catalog=enterprise-leadership-n1&focus=<knowledgeItemId>&mode=transfer
```

For later repetition, use `mode=review` so ETF's existing variant rotation chooses the next retrieval surface.

The route contract is deployment-host agnostic. Do not bake an absolute hostname into an EPUB until the authoritative production ETF base URL is confirmed.
