# Learning deep links

ETF can start one focused, recoverable learning session from a URL without introducing a second scheduler or progress model.

## Contract

Canonical form:

```text
?catalog=<catalogId>&focus=<knowledgeItemId>&mode=<mode>
```

Required:

- `catalog`: exact local ETF catalog id.
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
?catalog=enterprise-leadership&focus=decision-architecture-rights&mode=practice
```

## Runtime rules

1. The catalog must already be available locally. A learning link never performs a silent hosted-catalog import.
2. The focused KnowledgeItem and requested competency variant must be `released`.
3. The deep link creates a normal one-item recoverable ETF learning session and pins the selected `QuestionVariant.id`.
4. ReviewEvents, learner progress, scheduling and readiness keep the semantic `KnowledgeItem.id`; no second progress identity is created.
5. If another recoverable session exists, replacing it requires explicit user confirmation.
6. After the focused session is resumed, ETF removes `catalog`, `focus` and `mode` from the address bar so browser refresh does not launch the link again.
7. Invalid or unavailable links fail visibly and leave learner state unchanged.

## EPUB integration

An EPUB can keep stable semantic focus ids while changing only the external ETF base URL. This permits the content producer to own chapter semantics and ETF to own learning runtime behavior.

For a three-step learning path, use three links to the same `focus`:

```text
?catalog=enterprise-leadership&focus=<knowledgeItemId>&mode=retrieval
?catalog=enterprise-leadership&focus=<knowledgeItemId>&mode=practice
?catalog=enterprise-leadership&focus=<knowledgeItemId>&mode=transfer
```

For later repetition, use `mode=review` so ETF's existing variant rotation chooses the next retrieval surface.
