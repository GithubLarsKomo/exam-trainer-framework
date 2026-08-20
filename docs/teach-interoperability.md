# Teach interoperability

This document defines the first backward-compatible interoperability boundary between `exam-trainer-framework` (ETF) and the Skillz `/teach` learning orchestrator.

The integration deliberately keeps responsibilities separate:

- Skillz `/teach` owns learning mission, evidence selection, pedagogical sequencing and semantic competence interpretation.
- ETF owns learning/exam sessions, QuestionVariants, ReviewEvents, local learner state, scheduling and offline runtime behavior.
- ETF does not become dependent on Skillz to operate existing catalogs.
- Skillz does not reproduce ETF scheduling or learner-state persistence.

## Additive content metadata

`CardVersion`, `KnowledgeItem` and `QuestionVariant` accept optional learning metadata:

```ts
interface LearningContentMetadata {
  learningObjective?: string;
  competencyClass?: 'knowledge' | 'application' | 'transfer';
  origin?: ContentOrigin;
}

interface ContentOrigin {
  type: 'skillz-teach' | 'anki' | 'manual' | 'other';
  missionId?: string;
  sourceSkill?: string;
  sourceRefs?: string[];
  sourceCommit?: string;
}
```

`Catalog` accepts optional `origin` metadata as well.

All fields are optional. Existing catalogs therefore remain valid without migrations. Legacy CardVersion projection copies the optional metadata into the generated KnowledgeItem and QuestionVariant so provenance is not lost when existing card-based workflows are used.

Anki remains an inbound content source. Setting `origin.type = "anki"` does not import or activate Anki scheduling/review history.

## Portable Teach catalog bundle

Teach-generated content may be transported as:

```json
{
  "format": "etf-teach-catalog",
  "version": 1,
  "catalog": {
    "catalogId": "teach-example",
    "title": "Example learning catalog",
    "version": "1.0.0",
    "createdAt": "2026-08-20T18:00:00.000Z",
    "updatedAt": "2026-08-20T18:00:00.000Z",
    "cards": [],
    "origin": {
      "type": "skillz-teach",
      "missionId": "mission-example"
    }
  }
}
```

Use:

- `buildTeachCatalogBundle(catalog)` for the in-memory contract;
- `serializeTeachCatalogBundle(catalog)` for JSON transport;
- `parseTeachCatalogBundle(text)` for strict Teach-format parsing.

The wrapper intentionally retains a top-level `catalog` field, so ETF's existing `parseCatalogExport()` can import the same bundle. No parallel catalog runtime is introduced.

Content publication remains governed by ETF's existing catalog/card workflow. Teach provenance does not bypass `draft -> in_review -> approved -> released` rules.

## Review evidence export

ETF learner history remains local by default. Teach receives only explicitly scoped evidence required for semantic learning assessment.

`exportTeachReviewEvidence()` requires:

```ts
interface TeachEvidenceExportRequest {
  missionId: string;
  catalogId: string;
  knowledgeItemIds: string[];
  questionVariantIds?: string[];
  since?: string;
  until?: string;
}
```

Output format:

```json
{
  "format": "etf-teach-review-evidence",
  "version": 1,
  "missionId": "mission-example",
  "catalogId": "teach-example",
  "generatedAt": "2026-08-20T19:00:00.000Z",
  "filters": {
    "knowledgeItemIds": ["concept-a"]
  },
  "reviewEvents": [
    {
      "id": "event-1",
      "knowledgeItemId": "concept-a",
      "questionVariantId": "concept-a:q1",
      "source": "learning",
      "outcome": "correct",
      "answeredAt": "2026-08-20T18:30:00.000Z",
      "responseTimeMs": 18000,
      "masteryBefore": 2,
      "masteryAfter": 3
    }
  ],
  "summary": [
    {
      "knowledgeItemId": "concept-a",
      "reviewCount": 1,
      "learningReviewCount": 1,
      "examReviewCount": 0,
      "correct": 1,
      "partial": 0,
      "incorrect": 0,
      "latestAnsweredAt": "2026-08-20T18:30:00.000Z"
    }
  ]
}
```

The exported ReviewEvent view deliberately excludes scheduler internals, FSRS state, sessions, catalog inventory, backups and unrelated learner history. Learning vs examination provenance remains visible through `source`.

A percentage or scheduler stage is not a semantic competence decision. Skillz `learning-assessment` interprets the scoped evidence against a prior assessment specification and only then proposes a semantic learning-state change.

## Privacy boundary

The contract is designed for local-first use:

- no learner account is required;
- no full `AppState` export is required;
- requests must name the KnowledgeItems being assessed;
- optional variant/time filters can reduce the exported evidence further;
- server-side hosting of ETF/catalogs does not imply server-side learner-history storage.

Cross-device learner synchronization and server-side learner profiles remain outside this contract.

## Compatibility guarantees for v1

1. Existing catalogs without Teach metadata remain valid.
2. Existing catalog export/import remains valid.
3. Teach bundles remain importable by the existing catalog parser.
4. Legacy CardVersion -> KnowledgeItem projection preserves optional Teach metadata when present.
5. ETF's classic scheduler and FSRS shadow policy are unchanged.
6. Existing learning/exam ReviewEvents remain the evidence source; no second event model is created.
7. Anki scheduling/history remains excluded.

Later phases may add hosted catalog discovery and UI actions, but those features should consume these contracts rather than introduce a second Teach-specific runtime.
