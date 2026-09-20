# SPEC.md — Exam Trainer Framework (ETF)

**Status:** Baseline specification with optional enterprise/white-label profile  
**Version:** 0.3.0  
**Date:** 2026-09-20  
**Reference implementations:** Fügetechnik; enterprise leadership  
**Target deployment:** local/static PWA, hosted static PWA, or authenticated enterprise/white-label PWA  
**Primary language:** German  
**License:** to be decided before public release

---

## 1. Purpose

The Exam Trainer Framework (ETF) is a reusable, catalog-driven progressive web application for exam-oriented learning, spaced repetition, practice sessions, and exam simulations.

The framework separates:

1. the generic learning application,
2. one or more versioned learning catalogs,
3. catalog-specific media assets,
4. local learner state.

The first reference catalog is **Fügetechnik**. Its pilot scope covers questions 1–11 of the supplied exam-memory protocol. The long-term objective is to support the full course material without changing the application core.

---

## 2. Product vision

ETF shall enable a learner to install and use a complete learning application offline on an iPhone, iPad, or desktop browser. Learning content is imported from validated JSON catalogs. The application stores learning progress locally and does not require accounts, servers, analytics, telemetry, or external APIs.

Additional subjects shall be addable by supplying a new catalog and related assets, without modifying the learning engine.

---

## 3. Goals

ETF shall:

- prioritize exam-relevant content;
- support complete subject coverage through extensible catalogs;
- provide five-stage time-based spaced repetition;
- support multiple question and assessment types;
- provide a 57-task, 202-point exam-simulation model for the Fügetechnik example;
- work completely offline after installation;
- persist learner state in IndexedDB;
- support backup and restore as JSON;
- validate content catalogs before activation;
- support chapter-by-chapter review and release;
- preserve source references for every card;
- be deployable locally or as a static Netlify site.

---

## 4. Non-goals for version 1

Version 1 shall not require or include:

- user accounts;
- synchronization between devices;
- server-side databases;
- cloud storage;
- telemetry;
- advertisements;
- external AI services;
- automated final grading of free-text answers;
- collaborative multi-user editing;
- a server-side content-management system;
- public redistribution of copyrighted source images without the required rights.

---

## 5. Stakeholders

### 5.1 Learner

Uses learning modes, completes cards, performs exam simulations, reviews statistics, and manages backups.

### 5.2 Local catalog reviewer

Reviews cards locally and may change their workflow status. For the pilot, every local user may change card status.

### 5.3 Catalog author

Creates or edits versioned JSON catalog files and local media assets.

### 5.4 Maintainer

Maintains the framework, JSON schema, migrations, PWA, and deployment configuration.

---

## 6. Confirmed product decisions

### 6.1 Content and priority

- Exam-related content has priority.
- The full script remains the target content scope.
- The script and exam-memory protocol form the source basis.
- Definitions, terminology, procedural principles, advantages and disadvantages, formulas, calculations, diagrams, characteristic curves, and image labels are in scope.
- Each numbered subtask becomes one card.
- One or two variants shall normally be provided per exam-relevant knowledge item.
- Unclear content may be included with status `needs_review`.

### 6.2 Pilot

- The pilot covers exam-memory questions 1–11.
- The pilot shall include at least 40 cards.
- Pilot content is organized by script chapter rather than exam-number order.
- Every pilot card must be released before pilot acceptance.

### 6.3 Question types

The framework shall support:

- free text;
- numeric input with absolute or relative tolerance;
- image labeling with one free-text input per marker;
- drawing tasks with a criteria checklist and self-assessment.

### 6.4 Assessment

Assessment outcomes are:

- `correct`;
- `partial`;
- `incorrect`.

For free text:

- comparison ignores capitalization;
- comparison ignores punctuation;
- minor typing errors may be tolerated;
- synonyms may be configured;
- required terms shall be highlighted;
- automatic evaluation is advisory only;
- the learner makes the final decision.

For numeric input:

- each question may define an absolute or relative tolerance;
- unit requirements are defined per card.

For drawing tasks:

- the solution is represented by a reference image where available;
- partial criteria are shown as a checklist;
- the learner performs the final assessment.

### 6.5 Learning stages

ETF uses five stages with these standard intervals:

| Stage | Interval |
|---|---:|
| 1 | 10 minutes |
| 2 | 1 day |
| 3 | 3 days |
| 4 | 7 days |
| 5 | 21 days |

All new cards start at stage 1.

Assessment effects:

| Outcome | Stage change | Next due |
|---|---|---|
| Correct | +1, maximum 5 | full interval of resulting stage |
| Partial | unchanged | half interval of current stage |
| Incorrect | −1, minimum 1 | full interval of resulting stage |
| Skipped | unchanged | moved to end of current session |

Incorrect and partially correct cards are shown again at the end of the current session.

A correct answer at stage 5 retains stage 5 and sets the next due date to 21 days.

### 6.6 Card selection

Due cards are ordered by:

1. lowest stage;
2. oldest due date;
3. random order for equal priority.

Lower stages are prioritized but do not block higher-stage cards completely.

The implementation shall avoid immediate repetition unless the card is intentionally placed in the end-of-session retry queue.

### 6.7 Learning modes

ETF shall provide:

- all content;
- topic selection;
- new cards only;
- error cards only;
- exam focus;
- exam simulation.

No mandatory daily or session target is required.

### 6.8 Exam simulation

The Fügetechnik reference catalog defines an exam profile with:

- 57 subtasks;
- 202 total points;
- no default time limit;
- no default pass threshold.

The simulation shall use the same topic distribution as the reference exam while allowing new variants.

Variants shall preserve:

- learning objective;
- question type;
- difficulty.

Initial point allocation shall be estimated from the number of expected named elements, labels, and calculation steps, and marked for later validation.

`partial` gives 50% of the task points unless task-specific criteria define a more detailed score.

Free-text and drawing tasks require learner confirmation. Automatically assessable tasks may be graded automatically.

After completing an exam, the result shall include:

- total points;
- percentage;
- result by topic;
- error list;
- solutions;
- option to transfer errors into the learning system.

Incorrect exam cards are reset to stage 1.

---

## 7. Functional requirements

Requirement IDs are stable and shall be referenced by tests and issues.

### 7.1 Catalog management

**FR-CAT-001** The application shall load one or more versioned JSON catalogs.

**FR-CAT-002** Each catalog shall declare a unique catalog ID, title, language, version, schema version, and release date.

**FR-CAT-003** The importer shall validate catalogs against the ETF JSON Schema.

**FR-CAT-004** The importer shall detect duplicate card IDs.

**FR-CAT-005** The importer shall detect missing mandatory fields.

**FR-CAT-006** The importer shall validate question-type-specific fields.

**FR-CAT-007** The importer shall validate referenced local asset paths.

**FR-CAT-008** The importer shall validate points, tolerances, units, stages, and status values.

**FR-CAT-009** The importer shall warn about exact duplicate questions.

**FR-CAT-010** The importer should warn about highly similar questions.

**FR-CAT-011** A catalog shall not become active if blocking validation errors exist.

**FR-CAT-012** Only released cards shall appear in learning and exam modes.

**FR-CAT-013** Cards with `needs_review` may be displayed in review mode but not normal learning mode.

### 7.2 Card lifecycle

Supported status values:

- `draft`;
- `reviewed`;
- `released`;
- `needs_review`.

**FR-LIFE-001** Every card shall have a version number.

**FR-LIFE-002** Every card shall have a last-change date.

**FR-LIFE-003** Every card shall have a change reason.

**FR-LIFE-004** Every local user may update card status in the pilot.

**FR-LIFE-005** One person may review and release a card.

**FR-LIFE-006** Only `released` cards shall be eligible for learning and exam simulation.

### 7.3 Learning sessions

**FR-LEARN-001** A learner shall be able to start a session for any supported learning mode.

**FR-LEARN-002** The answer shall remain hidden until explicitly revealed or submitted.

**FR-LEARN-003** The learner shall be able to assess an answer as correct, partial, or incorrect.

**FR-LEARN-004** The learner shall be able to skip a card.

**FR-LEARN-005** A skipped card shall move to the end of the current session without changing stage or statistics.

**FR-LEARN-006** The learner shall be able to mark a card for later review.

**FR-LEARN-007** An interrupted session shall be resumable.

**FR-LEARN-008** Keyboard navigation shall be supported.

**FR-LEARN-009** Touch-friendly controls shall be used, even though gestures are not required for acceptance.

### 7.4 Scheduling

**FR-SRS-001** The system shall implement the five configured intervals.

**FR-SRS-002** New cards shall start at stage 1.

**FR-SRS-003** Correct shall promote by one stage up to stage 5.

**FR-SRS-004** Partial shall preserve the stage and schedule half its interval.

**FR-SRS-005** Incorrect shall demote by one stage down to stage 1.

**FR-SRS-006** Incorrect and partial cards shall be placed in the session retry queue.

**FR-SRS-007** Stage 5 cards shall remain due every 21 days.

**FR-SRS-008** Due-card selection shall follow stage, overdue age, then random tie-breaking.

**FR-SRS-009** Lower stages shall be prioritized but shall not create a permanent hard block for higher-stage due cards.

### 7.5 Statistics

The application shall display:

- current card stage;
- correct total;
- incorrect total;
- partial total;
- distribution by stage;
- error rate per card;
- progress by topic.

Statistics shall distinguish lifetime totals from the current session.

### 7.6 Backup, restore, and reset

**FR-DATA-001** Learner state shall be persisted in IndexedDB.

**FR-DATA-002** A complete learner-state backup shall be exportable as JSON.

**FR-DATA-003** A valid backup shall be importable.

**FR-DATA-004** A backup shall be created automatically before a complete reset.

**FR-DATA-005** The learner shall be able to reset all progress.

**FR-DATA-006** The learner shall be able to reset one topic.

**FR-DATA-007** The learner shall be able to reset one card.

**FR-DATA-008** Every reset shall require confirmation.

**FR-DATA-009** Backup import shall validate format and schema version before changing local data.

### 7.7 Migration

**FR-MIG-001** Application and catalog schema migrations shall run automatically when supported.

**FR-MIG-002** A backup shall be created before migration.

**FR-MIG-003** Migration results shall be recorded in a local migration log.

**FR-MIG-004** A material card change shall reset the card to stage 1.

A change is material when any of these changes:

- question content;
- model answer;
- required terms.

Changes to spelling, points, or source metadata alone do not automatically reset progress.

### 7.8 PWA and offline use

**FR-PWA-001** ETF shall be installable as a PWA.

**FR-PWA-002** All active catalogs and required assets shall be available offline after installation or first complete load.

**FR-PWA-003** The application shall work without external requests.

**FR-PWA-004** A new application version shall be downloaded in the background.

**FR-PWA-005** A downloaded update shall become active at the next application start.

**FR-PWA-006** The application shall show that an update is available or has been installed.

### 7.9 Source handling

Every card shall support:

- source filename;
- PDF page;
- printed script page;
- chapter;
- section;
- exam-memory question number.

Source references shall be shown only after the answer or solution is revealed.

Catalog-specific images shall be local PNG or WebP files stored below the catalog asset directory.

At first start and on an information page, the application shall state that included course material and source images are intended for permitted private/local use and may be subject to copyright.

---

## 8. Non-functional requirements

### 8.1 Privacy

**NFR-PRIV-001** No telemetry shall be collected.

**NFR-PRIV-002** No learner data shall leave the device.

**NFR-PRIV-003** In the core/local profile, the application shall make no external network requests during normal use.

**NFR-PRIV-004** An enterprise/white-label profile may make only the network requests explicitly required for authentication, application delivery, same-origin/private catalog delivery, and update checks. Learner answers, ReviewEvents, progress, sessions, and exam attempts remain local unless a later specification explicitly introduces synchronization.

### 8.2 Compatibility

Acceptance target devices:

- iPhone with Safari;
- iPad with Safari;
- desktop Chrome;
- desktop Edge.

### 8.3 Performance

- Initial application shell should become interactive within 2 seconds on a current desktop under normal local conditions.
- Card transitions should normally complete within 100 ms after required data is loaded.
- A catalog of 10,000 text-focused cards should remain usable.
- Large media shall be loaded lazily.
- IndexedDB operations shall not block the UI thread.

### 8.4 Accessibility

- semantic HTML;
- keyboard access;
- visible focus states;
- sufficient contrast;
- labels for all controls;
- no information communicated by color alone;
- responsive layout;
- minimum practical touch target of approximately 44 × 44 CSS pixels.

### 8.5 Maintainability

- application core and catalogs shall be separated;
- question renderers shall use a common interface;
- scheduling shall be isolated from UI code;
- catalog validation shall be independently testable;
- schema and migrations shall be versioned;
- no framework-specific catalog format shall leak into learner state.

### 8.6 Reliability

- state-changing operations shall be transactional where practical;
- failed imports shall leave the previous active catalog intact;
- failed migrations shall restore or preserve the pre-migration backup;
- reset operations shall never occur without explicit confirmation.

---

## 9. Architecture

ETF is a client-side static application.

```text
┌─────────────────────────────────────────────┐
│                  UI Layer                   │
│ Dashboard · Learning · Exam · Review · Data │
├─────────────────────────────────────────────┤
│              Application Services           │
│ Session · Assessment · Statistics · Import  │
├─────────────────────────────────────────────┤
│                 Domain Core                 │
│ Card · Scheduler · Exam Profile · Progress  │
├─────────────────────────────────────────────┤
│             Persistence Adapters            │
│ IndexedDB · JSON Import/Export · Cache       │
├─────────────────────────────────────────────┤
│               Static Catalogs               │
│ cards.json · catalog.json · assets           │
└─────────────────────────────────────────────┘
```

Recommended implementation:

- TypeScript;
- Vite;
- standards-based PWA service worker or `vite-plugin-pwa`;
- IndexedDB through a small repository abstraction, optionally Dexie;
- JSON Schema validation with Ajv;
- unit tests with Vitest;
- end-to-end tests with Playwright;
- static build output in `dist/`.

The project may begin with plain HTML, CSS, and JavaScript, but TypeScript is recommended because the catalog schema, migrations, assessment types, and learner-state rules are central to correctness.

No application backend is required for the core profile. An enterprise/white-label profile may depend on an external authentication gateway or reverse proxy without changing ETF into a server-side LMS.

---

## 10. Proposed repository structure

```text
exam-trainer-framework/
├── SPEC.md
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── LICENSE
├── netlify.toml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── app/
│   ├── domain/
│   ├── assessment/
│   ├── scheduling/
│   ├── persistence/
│   ├── catalog/
│   ├── exam/
│   ├── review/
│   ├── ui/
│   ├── styles/
│   └── main.ts
├── schemas/
│   ├── catalog.schema.json
│   └── learner-backup.schema.json
├── catalogs/
│   └── fuegetechnik/
│       ├── catalog.json
│       ├── cards.json
│       ├── exam-profile.json
│       ├── README.md
│       └── assets/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── architecture.md
    ├── catalog-authoring.md
    ├── deployment.md
    └── review-workflow.md
```

---

## 11. Domain model

### 11.1 Catalog

```ts
interface Catalog {
  schemaVersion: string;
  catalogId: string;
  version: string;
  title: string;
  description?: string;
  language: string;
  releasedAt: string;
  privateUseNotice?: string;
  topics: Topic[];
  cardsFile: string;
  examProfiles?: string[];
}
```

### 11.2 Card

```ts
type CardStatus = "draft" | "reviewed" | "released" | "needs_review";
type QuestionType = "free_text" | "numeric" | "image_labels" | "drawing";
type AssessmentOutcome = "correct" | "partial" | "incorrect";

interface Card {
  id: string;
  version: number;
  changedAt: string;
  changeReason: string;
  status: CardStatus;

  topicId: string;
  subtopicId?: string;
  title?: string;
  examPriority: number;

  questionType: QuestionType;
  prompt: string;
  points?: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  variantGroupId?: string;

  answer: AnswerDefinition;
  media?: MediaReference[];
  source: SourceReference;

  tags?: string[];
}
```

### 11.3 Answer definitions

```ts
interface FreeTextAnswer {
  kind: "free_text";
  modelAnswer: string;
  requiredTerms: string[];
  optionalTerms?: string[];
  synonyms?: Record<string, string[]>;
  typoTolerance?: number;
  ignoreCase: true;
  ignorePunctuation: true;
}

interface NumericAnswer {
  kind: "numeric";
  value: number;
  unit?: string;
  unitRequired?: boolean;
  tolerance:
    | { type: "absolute"; value: number }
    | { type: "relative"; value: number };
}

interface ImageLabelsAnswer {
  kind: "image_labels";
  image: string;
  markers: Array<{
    id: string;
    x: number;
    y: number;
    acceptedAnswers: string[];
  }>;
}

interface DrawingAnswer {
  kind: "drawing";
  referenceImage?: string;
  criteria: Array<{
    id: string;
    label: string;
    points?: number;
  }>;
}
```

### 11.4 Source reference

```ts
interface SourceReference {
  fileName: string;
  pdfPage?: number;
  printedPage?: string;
  chapter: string;
  section?: string;
  examQuestion?: string;
  note?: string;
}
```

### 11.5 Learner progress

```ts
interface CardProgress {
  catalogId: string;
  cardId: string;
  cardVersion: number;
  stage: 1 | 2 | 3 | 4 | 5;
  dueAt: string;
  firstSeenAt: string;
  lastReviewedAt?: string;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  skippedCount: number;
  markedForReview: boolean;
}
```

### 11.6 Session

```ts
interface LearningSession {
  id: string;
  catalogId: string;
  mode: LearningMode;
  topicIds: string[];
  startedAt: string;
  updatedAt: string;
  queue: string[];
  retryQueue: string[];
  completedCardIds: string[];
  currentCardId?: string;
  status: "active" | "completed" | "abandoned";
}
```

---

## 12. Scheduling algorithm

### 12.1 Interval calculation

```ts
const STAGE_INTERVAL_MS = {
  1: 10 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 3 * 24 * 60 * 60 * 1000,
  4: 7 * 24 * 60 * 60 * 1000,
  5: 21 * 24 * 60 * 60 * 1000,
};
```

For `partial`, use `STAGE_INTERVAL_MS[currentStage] / 2`.

### 12.2 Result application

```text
correct:
  stage := min(5, stage + 1)
  dueAt := now + interval(stage)

partial:
  stage := stage
  dueAt := now + interval(stage) / 2
  append card to session retry queue

incorrect:
  stage := max(1, stage - 1)
  dueAt := now + interval(stage)
  append card to session retry queue

skipped:
  no progress mutation
  append card to end of current queue
```

### 12.3 Due-card selection

Base sort:

```text
stage ascending
dueAt ascending
random tie breaker
```

To prevent permanent starvation of higher stages, the scheduler shall insert a due higher-stage card after a configurable number of lower-stage cards. Initial default: after 8 lower-stage cards, select the best due card from the remaining stages when available.

This fairness rule operationalizes the confirmed requirement that low stages are prioritized but do not completely block higher stages.

---

## 13. Assessment design

### 13.1 Free text

The application computes an advisory comparison:

- normalized learner text;
- normalized required terms;
- synonym expansion;
- typo-distance check;
- missing required-term list.

The application displays:

- submitted answer;
- model answer;
- matched required terms;
- missing required terms;
- source;
- buttons for correct, partial, and incorrect.

The advisory engine must not silently assign the final outcome.

### 13.2 Numeric

The application checks:

```text
absolute:
  abs(input - expected) <= tolerance

relative:
  abs(input - expected) / abs(expected) <= tolerance
```

If `unitRequired` is true, the accepted unit must be supplied.

The learner may still override the suggested result before recording it.

### 13.3 Image labels

- The image displays markers with stable IDs.
- Each marker has a text field.
- Accepted answers may include synonyms.
- The app provides advisory matching.
- The final result is learner-confirmed.

### 13.4 Drawing

- The task prompt is displayed without the solution.
- After reveal, the reference and criteria checklist are displayed.
- Criteria may carry point weights.
- The learner chooses the final assessment.

---

## 14. Exam engine

### 14.1 Exam profile

```ts
interface ExamProfile {
  id: string;
  catalogId: string;
  title: string;
  totalTasks: number;
  totalPoints: number;
  timeLimitMinutes?: number;
  passPercentage?: number;
  sections: ExamSectionRule[];
}
```

### 14.2 Generation rules

For the Fügetechnik full profile:

- select exactly 57 tasks;
- total exactly 202 points;
- preserve configured topic distribution;
- choose at most one active variant from a variant group;
- preserve question type and difficulty requirements;
- do not expose solutions during the examination, except that automatic input validation may identify malformed input;
- request learner assessment for free text and drawing;
- present a complete review after the examination.

The pilot may include the exam engine and profile structure before enough released cards exist for a complete high-quality 57-task simulation. Acceptance of the complete simulation requires sufficient released variants and a validated point distribution.

---

## 15. IndexedDB data stores

Recommended database name:

```text
exam-trainer-framework
```

Stores:

| Store | Key | Purpose |
|---|---|---|
| `app_meta` | key | app and schema metadata |
| `catalogs` | catalogId | installed catalog metadata |
| `cards` | `[catalogId, cardId]` | active validated cards |
| `progress` | `[catalogId, cardId]` | learner progress |
| `sessions` | sessionId | resumable sessions |
| `exam_attempts` | attemptId | exam results |
| `review_status` | `[catalogId, cardId]` | local workflow status |
| `migration_log` | id | migration results |
| `settings` | key | local preferences |

Catalog source JSON remains the canonical authored form. IndexedDB is the runtime representation.

---

## 16. Backup format

The backup shall contain:

```json
{
  "format": "etf-learner-backup",
  "schemaVersion": "1.0.0",
  "createdAt": "2026-07-24T20:00:00.000Z",
  "appVersion": "0.1.0",
  "catalogs": [
    {
      "catalogId": "fuegetechnik",
      "catalogVersion": "0.1.0"
    }
  ],
  "progress": [],
  "sessions": [],
  "examAttempts": [],
  "reviewStatus": [],
  "settings": {}
}
```

Before restore:

1. validate schema;
2. show catalog/version summary;
3. create a backup of current state;
4. import transactionally;
5. write a migration/import log entry.

---

## 17. Catalog validation severity

### Blocking errors

- invalid JSON;
- schema violation;
- duplicate ID;
- unknown question type;
- missing model answer or required data;
- invalid asset path;
- invalid status;
- negative points;
- invalid tolerance;
- released card with unresolved blocking source fields.

### Warnings

- very similar question text;
- missing optional source fields;
- missing variant;
- estimated point value;
- `needs_review` content;
- unbalanced topic distribution;
- unused asset.

---

## 18. User interface

### 18.1 Main navigation

- Dashboard
- Learn
- Exam
- Statistics
- Review
- Data
- Information

### 18.2 Dashboard

Displays:

- due cards;
- new cards;
- recent correctness;
- stage distribution;
- progress by topic;
- resume-session action;
- start-learning action;
- start-exam action.

### 18.3 Learning screen

```text
┌──────────────────────────────────────────────┐
│ Topic · Stage · Due · Progress               │
├──────────────────────────────────────────────┤
│ Question / image / labels                    │
│                                              │
│ Learner input                                │
├──────────────────────────────────────────────┤
│ Skip · Mark · Submit / Reveal                │
└──────────────────────────────────────────────┘
```

After reveal:

```text
┌──────────────────────────────────────────────┐
│ Model answer / criteria / advisory result    │
│ Missing required terms                       │
│ Source reference                             │
├──────────────────────────────────────────────┤
│ Incorrect · Partial · Correct                │
└──────────────────────────────────────────────┘
```

### 18.4 Review screen

The review screen shall provide:

- chapter filter;
- status filter;
- search;
- card preview;
- source information;
- version and change reason;
- status transition controls.

Only status changes are required in the pilot. Full authoring may remain file-based.

### 18.5 Data screen

- export backup;
- import backup;
- import catalog;
- validation report;
- reset all;
- reset topic;
- reset card;
- migration log.

---

## 19. Keyboard controls

Recommended defaults:

| Key | Action |
|---|---|
| Space / Enter | reveal or submit |
| 1 | incorrect |
| 2 | partial |
| 3 | correct |
| S | skip |
| M | mark for review |
| Esc | close dialog |

Shortcuts shall be inactive while a multiline text input has focus, except Escape.

---

## 20. Fügetechnik reference catalog

### 20.1 Catalog ID

```text
fuegetechnik
```

### 20.2 Pilot scope

The first release covers exam-memory questions 1–11, organized under the relevant script chapters.

The authoring process shall produce:

- at least 40 cards;
- one or two variants for each selected knowledge item;
- source references;
- advisory answer metadata;
- reviewed and released status;
- local PNG/WebP assets where required.

### 20.3 Initial thematic structure

Provisional topics:

- Grundlagen des Fügens;
- Schraubverbindungen;
- Nietverbindungen;
- Fügen durch Umformen;
- Clinchen;
- zugehörige Berechnungen und Darstellungen.

The final chapter names shall follow the supplied script terminology. They must not be silently replaced by generic terminology where the script uses a different structure.

### 20.4 Source limitations

The exact model answers, images, page references, question wording, and point allocation must be derived from the supplied script and exam-memory protocol during catalog authoring.

Where the source material is unclear:

- the card shall be marked `needs_review`;
- the uncertainty shall be recorded in `changeReason` or a dedicated note;
- the card shall not appear in normal learning or exam mode until released.

### 20.5 Private-use notice

The catalog shall include a notice explaining that source excerpts and images are intended only for permitted local/private study and must not be redistributed without the necessary rights.

---

## 21. Deployment

### 21.1 Local development

```bash
npm install
npm run dev
```

### 21.2 Local production preview

```bash
npm run build
npm run preview
```

Opening `index.html` directly through `file://` is not a supported production method because service workers and module loading require an HTTP origin.

A simple local deployment may use:

```bash
npm run build
npx serve dist
```

### 21.3 Netlify

Netlify configuration:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Cache-Control = "no-cache"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The application remains fully client-side. Netlify shall not receive learner progress unless future features explicitly change the architecture.

### 21.4 Base path

The build shall support root deployment and configurable subpath deployment.

---

## 22. Security considerations

- Render catalog content as text by default.
- Sanitize any supported rich text.
- Reject path traversal in asset references.
- Validate imported files before persistence.
- Apply size limits to imports and images.
- Never execute JavaScript from a catalog.
- Avoid storing secrets because ETF does not require any.
- Use a restrictive Content Security Policy compatible with the static application.
- Do not load fonts, scripts, analytics, or assets from third-party CDNs.

---

## 23. Testing strategy

### 23.1 Unit tests

- stage transitions;
- interval calculation;
- partial interval;
- retry-queue behavior;
- due-card sorting;
- fairness rule;
- numeric tolerances;
- text normalization;
- synonym matching;
- material-change detection;
- point summation;
- catalog validation.

### 23.2 Integration tests

- catalog import into IndexedDB;
- interrupted session restore;
- backup and restore;
- failed-import rollback;
- migration with backup;
- update activation;
- source and asset rendering.

### 23.3 End-to-end tests

- installable PWA;
- offline launch;
- complete learning cycle;
- all assessment outcomes;
- skip and mark;
- exam generation;
- exam completion and error transfer;
- reset with automatic backup.

### 23.4 Device acceptance

Manual acceptance:

- iPhone Safari;
- iPad Safari;
- desktop Chrome;
- desktop Edge.

---

## 24. Acceptance criteria

The pilot is accepted only when all conditions below are met.

### 24.1 Content

- At least 40 pilot cards exist.
- Pilot cards cover exam-memory questions 1–11.
- Each card has a unique ID.
- Each card has the required source metadata.
- Every pilot card has status `released`.
- Unclear source-derived content is resolved before release.
- Required local assets are present.

### 24.2 Learning

- New cards start at stage 1.
- Correct promotes exactly one stage.
- Partial retains stage and uses half interval.
- Incorrect demotes exactly one stage.
- Stage bounds are respected.
- Stage 5 repeats after 21 days.
- Retry queues work.
- skipped cards remain unchanged.
- lower-stage prioritization and higher-stage fairness work.

### 24.3 Data

- State survives restart.
- Full JSON backup works.
- Restore works.
- complete reset creates a backup.
- topic reset works.
- card reset works.
- invalid catalogs are rejected without replacing active data.
- migrations create a backup and log.

### 24.4 PWA

- application is installable;
- application starts offline;
- all active questions and assets work offline;
- update is downloaded and activates on next start;
- no external requests occur during ordinary use.

### 24.5 Exam

- the exam engine supports a 57-task, 202-point profile;
- configured distribution is preserved;
- only one variant per group is chosen;
- totals are correct;
- results by topic are available;
- error transfer resets incorrect cards to stage 1.

### 24.6 Compatibility

The accepted build works on all target devices listed in section 8.2.

---

## 25. Roadmap

### Phase 0 — Repository baseline

- create repository;
- add SPEC, README, roadmap, license decision;
- configure TypeScript, Vite, tests, linting;
- add Netlify configuration.

### Phase 1 — Domain and persistence

- catalog types and JSON Schema;
- validator;
- IndexedDB repositories;
- learner backup format;
- migration framework;
- scheduling unit tests.

### Phase 2 — Core learning application

- dashboard;
- learning-session engine;
- free-text, numeric, image-label, and drawing renderers;
- statistics;
- keyboard controls;
- session resume.

### Phase 3 — Fügetechnik pilot authoring

- extract and review questions 1–11;
- create at least 40 cards;
- add variants;
- add local image assets;
- enter source references;
- complete in-app review;
- release cards.

### Phase 4 — Exam engine

- exam profile;
- task selection;
- point allocation;
- exam UI;
- self-assessment;
- results and error transfer.

### Phase 5 — PWA and deployment

- service worker;
- manifest and icons;
- offline test suite;
- update lifecycle;
- Netlify deployment;
- local deployment documentation.

### Phase 6 — Pilot acceptance

- cross-device testing;
- content review;
- performance review;
- backup/restore test;
- complete acceptance checklist.

### Phase 7 — Full Fügetechnik catalog

- expand from pilot to full script;
- review all chapters;
- validate full exam distributions;
- release catalog 1.0.

---

## 26. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Source material lacks complete model answers | Incorrect learning content | mark as `needs_review`; do not release until resolved |
| Point distribution is estimated | Exam score may not reflect original examination | store estimated flag; validate later |
| Copyright restrictions on script images | Distribution risk | local/private use notice; keep assets out of public repository unless authorized |
| Purely local data can be lost | Loss of progress | prominent backup; automatic backup before reset/migration |
| Browser storage eviction | Loss of progress | backup reminders; request persistent storage where supported |
| PWA update changes data structures | Corrupt state | versioned migrations with pre-migration backup |
| Free-text matching overstates correctness | Poor learning feedback | advisory result only; learner decides |
| Higher stages starve behind lower stages | inefficient retention | fairness insertion after configurable lower-stage count |
| Public Netlify deployment exposes copyrighted catalog assets | legal risk | deploy framework separately; keep private catalog in permitted environment |

---

## 27. Open implementation decisions

These do not block the specification baseline:

- exact UI visual design;
- whether to use Dexie or a custom IndexedDB wrapper;
- exact typo-distance algorithm;
- exact fairness threshold, initially proposed as 8;
- license for the framework;
- whether copyrighted Fügetechnik assets may be committed to a public repository;
- exact task-by-task distribution of the 202 points;
- exact full-course chapter structure after source extraction.

Changes to confirmed product behavior require updating this specification and recording the decision.

---

## 28. Definition of done for version 1.0

ETF 1.0 is done when:

1. the generic application satisfies all accepted requirements;
2. the full Fügetechnik catalog is available and released;
3. all target learning and exam modes are functional;
4. the 57-task, 202-point exam profile is validated;
5. offline operation passes on all target devices;
6. backup, restore, migration, and resets are tested;
7. no blocking catalog-validation errors remain;
8. deployment documentation covers local hosting and Netlify;
9. automated and manual acceptance tests pass;
10. the release is tagged and documented in the changelog.


---

## 29. Enterprise / white-label deployment profile

### 29.1 Purpose and scope

ETF shall support an optional **enterprise / white-label deployment profile** for confidential or organization-internal learning products.

This profile extends the generic ETF product without creating a separate application fork. The generic/local profile remains the default product and keeps its local-first, no-login behavior.

The first specified corporate use case is an internal leadership-learning deployment for *Unternehmen mitführen*. The architecture is intentionally reusable for future internal leadership, regulatory, compliance, product, quality, or technical learning catalogs.

The enterprise profile separates four concerns:

1. the reusable ETF application core;
2. organization-specific branding and access policy;
3. confidential organization-specific learning catalogs;
4. controlled distribution of books and release artifacts.

The enterprise profile shall not turn ETF into a general-purpose corporate LMS. Learning flow remains the primary product surface.

### 29.2 Architecture decision

The enterprise solution shall use **one codebase with multiple deployment profiles**.

    exam-trainer-framework
            |
            +-- core / generic build
            |     generic branding
            |     local or public catalogs where permitted
            |     no login required
            |
            +-- enterprise / white-label build
                  organization branding
                  private catalogs
                  required external auth-proxy access when protected
                  no public exposure of confidential content

A separate long-lived source-code fork for each organization is prohibited unless a future architecture decision explicitly supersedes this requirement.

### 29.3 OneDrive / SharePoint boundary

OneDrive or SharePoint may be used as a **controlled organization-internal distribution and artifact store** for:

- EPUB files;
- release packages;
- release notes;
- catalog source packages;
- approved static build artifacts used for deployment handoff or archival;
- user-facing documentation.

OneDrive / SharePoint shall **not** be treated as the runtime origin of the PWA merely by opening HTML files from the file store. ETF requires a normal HTTP(S) origin for service workers, module loading, manifest behavior, offline caching, deep links, and reliable PWA installation.

The enterprise PWA shall therefore be served from an organization-controlled HTTPS origin.

For the *Unternehmen mitführen* reference deployment the approved target architecture is:

- a new organization-controlled HTTPS domain;
- a Hetzner-hosted server;
- Coolify for container deployment;
- Traefik as reverse proxy;
- Authentik Forward Auth as the authentication/authorization gate;
- the ETF enterprise container as an upstream reachable only through the protected proxy path.

ETF shall remain hosting-provider independent. No Azure runtime service is required by the reference deployment.

### 29.4 Enterprise reference flow

The intended internal learning flow is:

    OneDrive / SharePoint
      -> confidential EPUB or learning package
         -> ETF deep link
            -> enterprise ETF HTTPS origin
               -> organization authentication when required
                  -> private/embedded catalog
                     -> local IndexedDB learner state
                        -> offline-capable subsequent learning

For *Unternehmen mitführen*, deep links shall continue to use stable ETF identities rather than embedding question text or model answers in the URL.

Canonical route shape:

    ?catalog=<catalogId>&focus=<knowledgeItemId>&mode=<mode>

Supported focus modes remain:

- retrieval;
- application / practice;
- transfer;
- review / repeat.

URLs must contain identifiers and routing metadata only. Confidential question content, model answers, source excerpts, and assessment specifications shall not be encoded into ordinary query parameters.

### 29.5 Functional requirements — deployment profiles

**FR-ENT-001** ETF shall support named deployment profiles without duplicating the application core.

**FR-ENT-002** A deployment profile shall be selectable at build or deployment configuration time.

**FR-ENT-003** The generic/core profile shall remain usable without login and without enterprise-specific assets.

**FR-ENT-004** Enterprise profile configuration shall be isolated from domain logic so that scheduling, assessment, ReviewEvents, learner state, and deep-link semantics behave consistently across profiles.

**FR-ENT-005** A build shall expose its active deployment-profile identity for diagnostics and release verification.

**FR-ENT-006** Enterprise profile configuration shall be version-controlled without committing secrets.

### 29.6 Functional requirements — branding

**FR-BRAND-001** An enterprise profile shall support organization-specific:

- application name;
- short name;
- logo;
- PWA icons;
- accent/theme tokens;
- browser/PWA manifest metadata;
- optional organization-specific information/legal text.

**FR-BRAND-002** Branding shall be implemented through configuration/assets and must not require a fork of learner or catalog logic.

**FR-BRAND-003** Enterprise branding must not leak into the generic/core production build.

**FR-BRAND-004** The build and automated tests shall make it possible to verify that the expected profile branding is present.

**FR-BRAND-005** Organization-specific fonts or licensed assets shall only be packaged when redistribution and deployment rights permit it.

### 29.7 Functional requirements — confidential catalogs

**FR-ENT-CAT-001** Confidential enterprise catalogs shall not be published to a public hosted-catalog registry.

**FR-ENT-CAT-002** An enterprise profile shall support at least one of these controlled content strategies:

1. catalog bundled into the authenticated enterprise build;
2. catalog served from the same authenticated organization-controlled origin;
3. catalog obtained from another explicitly approved private endpoint.

**FR-ENT-CAT-003** The selected enterprise content strategy shall preserve normal ETF catalog identity, versioning, release status, validation, and migration semantics.

**FR-ENT-CAT-004** Enterprise catalogs shall remain versioned independently from the application shell.

**FR-ENT-CAT-005** Released enterprise catalogs shall pass the same structural and lifecycle checks as other ETF catalogs.

**FR-ENT-CAT-006** Public build artifacts shall be tested for accidental inclusion of enterprise-private catalog IDs, titles, source text, model answers, or assets.

**FR-ENT-CAT-007** A failed enterprise catalog update shall leave the previously valid local catalog usable.

**FR-ENT-CAT-008** Enterprise catalog updates may replace an older local version only through an explicit release/update policy; learner progress shall be preserved according to normal ETF migration rules.

**FR-ENT-CAT-009** The initial *Unternehmen mitführen* enterprise catalog identity is "enterprise-leadership-n1". This identity is stable across deployment profiles.

### 29.8 Authentication and authorization

Authentication is optional for ETF in general but may be mandatory for an enterprise deployment profile.

**FR-AUTH-001** The enterprise profile shall support an external reverse-proxy authentication gateway without requiring ETF to implement its own OAuth, OIDC, SAML, LDAP, or identity-provider client.

**FR-AUTH-002** For the *Unternehmen mitführen* reference deployment, Authentik Forward Auth behind Coolify/Traefik shall be the preferred authentication gateway.

**FR-AUTH-003** The external gateway shall enforce organization-defined authentication and authorization before requests reach the protected ETF application.

**FR-AUTH-004** ETF shall consume only a minimal trusted identity contract from the upstream gateway. The initial Authentik contract uses X-authentik-uid, X-authentik-email, X-authentik-name, and X-authentik-username.

**FR-AUTH-005** ETF shall trust proxy-supplied identity headers only when an explicit runtime trust flag is enabled and the deployment prevents direct untrusted access to the upstream container.

**FR-AUTH-006** Authentication tokens, provider secrets, session cookies, and identity-provider credentials shall not be written into ETF catalog files, learner backups, ReviewEvents, or exported learning state.

**FR-AUTH-007** Deep links opened before authentication shall preserve the requested catalog, focus, and mode through the external authentication flow and continue to the intended learning focus after successful access.

**FR-AUTH-008** Authentication or authorization failure shall fail closed for protected enterprise content.

**FR-AUTH-009** Authentication must not silently enable cloud synchronization of learner answers or progress.

**FR-AUTH-010** A change of authenticated user identity on the same browser profile shall purge locally stored enterprise learner/catalog state before the new user proceeds.

**FR-AUTH-011** The enterprise deployment shall provide an explicit logout action that clears local corporate ETF state and terminates the upstream authentication session.

### 29.9 Learner data and privacy boundary

The enterprise profile keeps ETF **local-first**.

**NFR-ENT-PRIV-001** Learner answers, progress, ReviewEvents, scheduler state, recoverable sessions, exam attempts, and local preferences shall remain in browser storage by default.

**NFR-ENT-PRIV-002** Organization authentication may establish access to the application and catalogs but shall not by itself upload learner state.

**NFR-ENT-PRIV-003** OneDrive / SharePoint shall not receive learner progress automatically.

**NFR-ENT-PRIV-004** Any future synchronization, reporting, analytics, manager visibility, or server-side progress storage requires a separate explicit product/privacy specification.

**NFR-ENT-PRIV-005** Telemetry remains disabled by default in the enterprise profile unless separately approved and specified.

**NFR-ENT-PRIV-006** Network traffic in the enterprise profile shall be limited to declared authentication, application, catalog, asset, and update endpoints.

### 29.10 Offline and PWA behavior

**FR-ENT-PWA-001** After a successful authenticated first load and complete catalog acquisition, the enterprise PWA should remain usable offline to the greatest extent supported by the browser and identity architecture.

**FR-ENT-PWA-002** The service worker may cache only resources authorized for the active enterprise deployment.

**FR-ENT-PWA-003** Logout, account change, or a materially changed authorization context must not silently expose confidential content to a different user profile on a shared device.

**FR-ENT-PWA-004** The implementation shall document browser/platform limitations where an identity provider requires renewed network access.

**FR-ENT-PWA-005** PWA update behavior shall preserve the existing ETF rule: a new shell may download in the background but activation must not corrupt or discard local learner state.

### 29.11 Deep-link requirements for confidential books

**FR-ENT-LINK-001** Confidential EPUBs may contain normal HTTPS deep links to the enterprise ETF deployment.

**FR-ENT-LINK-002** The link shall transmit identifiers and requested learning mode, not the full catalog, question text, model answer, or confidential book excerpt.

**FR-ENT-LINK-003** A deep link shall resolve the requested released KnowledgeItem and QuestionVariant only after the required enterprise access policy has been satisfied.

**FR-ENT-LINK-004** If the required catalog is bundled or otherwise available in the enterprise deployment, the user shall not be forced through public catalog discovery.

**FR-ENT-LINK-005** If the enterprise catalog is missing or outdated, the application shall use the configured private/embedded update path rather than the public registry unless that public registry has been explicitly allowed for the profile.

**FR-ENT-LINK-006** Stable KnowledgeItem IDs shall allow the EPUB and ETF catalog to evolve independently as long as semantic identity is preserved.

### 29.12 Build and release policy

Each enterprise release shall produce a traceable application artifact and content release.

A release manifest should record at least:

- deployment-profile ID;
- ETF application version/commit;
- branding package version;
- catalog IDs and versions;
- content hashes;
- build timestamp;
- release status.

**FR-ENT-REL-001** The build pipeline shall be able to produce generic and enterprise artifacts from the same repository.

**FR-ENT-REL-002** Enterprise release artifacts shall be distinguishable from generic/public artifacts.

**FR-ENT-REL-003** Enterprise builds shall fail or be rejected when required branding, access-policy, or private-catalog configuration is missing.

**FR-ENT-REL-004** Public builds shall fail or be rejected when an enterprise-private catalog or restricted organization asset is detected.

**FR-ENT-REL-005** Enterprise catalog release shall remain an explicit action; a build must not silently promote draft content to "released".

**FR-ENT-REL-006** Release packages may be copied to OneDrive / SharePoint for controlled internal distribution, archival, or deployment handoff.

### 29.13 Example deployment-profile model

The exact implementation format may evolve, but the semantics should be equivalent to:

    id: enterprise-euroimmun

    branding:
      productName: "<organization learning name>"
      shortName: "<short name>"
      theme: "organization"
      logo: "<approved asset>"
      icons: "<approved PWA icon set>"

    access:
      mode: "proxy"
      proxyAuthorizationRequired: true

    catalogPolicy:
      publicRegistry: false
      strategy: "embedded-or-private-same-origin"
      allowedCatalogs:
        - enterprise-leadership-n1

    dataPolicy:
      learnerState: "local-indexeddb"
      telemetry: false
      synchronization: false

    distribution:
      contentStore: "onedrive-or-sharepoint"
      pwaRuntime: "approved-https-origin"

This object is illustrative. A production implementation may use TypeScript, JSON, environment-backed configuration, or another validated representation.

### 29.14 Reference implementation — Unternehmen mitführen

For the first enterprise implementation:

- learning product: *Unternehmen mitführen*;
- catalog ID: "enterprise-leadership-n1";
- learning-object model: 12 stable KnowledgeItems;
- variants: retrieval/knowledge, application, transfer;
- confidential EPUB distributed through an approved internal OneDrive / SharePoint location;
- enterprise ETF build uses organization-specific branding;
- enterprise catalog is not exposed through the generic public registry;
- ETF deep links open the corresponding learning focus;
- learner state remains local in IndexedDB;
- the protected reference runtime is self-hosted on Hetzner through Coolify/Traefik with Authentik Forward Auth;
- no Azure hosting or Azure-specific application runtime is required;
- the corporate identity source behind Authentik remains an organization policy/deployment choice.

The exact enterprise hostname, Authentik application/provider identifiers, branding asset package, and internal proxy service names are deployment parameters and are intentionally not embedded into the generic source specification.

### 29.15 Enterprise security requirements

**NFR-ENT-SEC-001** Enterprise catalog content shall be treated as confidential application content when classified as such by the organization.

**NFR-ENT-SEC-002** No confidential question or answer data shall be placed into URL query strings or URL fragments merely to avoid private hosting.

**NFR-ENT-SEC-003** No static enterprise build shall contain client secrets.

**NFR-ENT-SEC-004** Content Security Policy shall allow only the minimum origins required by the selected authentication and content-delivery architecture.

**NFR-ENT-SEC-005** Private catalogs and private assets shall never be referenced by an unauthenticated public registry unless explicitly approved for public exposure.

**NFR-ENT-SEC-006** Catalog validation and hash/version checks shall remain active in enterprise deployments.

**NFR-ENT-SEC-007** The release process shall include a negative-content check proving that enterprise-private content is absent from the generic/public build.

**NFR-ENT-SEC-008** A production enterprise container shall not be reachable through a public route that bypasses the configured authentication proxy.

**NFR-ENT-SEC-009** Private catalog HTTP responses shall require the trusted proxy runtime boundary and an authenticated proxy identity in addition to application-level catalog validation.

**NFR-ENT-SEC-010** The service worker shall not cache authentication endpoints or private catalog HTTP responses.

### 29.16 Enterprise acceptance criteria

An enterprise/white-label implementation is accepted only when all of the following pass:

1. generic and enterprise builds come from the same repository and shared domain core;
2. the generic build contains no enterprise-private catalog or organization-specific confidential asset;
3. the enterprise build displays the configured organization branding;
4. protected deployment access requires the configured external auth-proxy policy when authentication is enabled;
5. the configured Authentik policy denies unauthorized users/groups before ETF is reached;
6. an EPUB deep link survives authentication and starts the requested "focus" / "mode";
7. the confidential catalog is obtained only through the configured embedded/private content path;
8. ordinary enterprise learning does not upload learner progress or answers;
9. the application remains usable after the first complete load under documented offline constraints;
10. app/catalog updates preserve learner state;
11. OneDrive / SharePoint is used as controlled content/release distribution, not as a substitute for the required HTTPS PWA runtime;
12. iPhone Safari/PWA and desktop Edge or Chrome pass an end-to-end acceptance run;
13. release provenance records the app commit, deployment profile, catalog version, and content hashes;
14. direct anonymous access to private catalog bytes fails;
15. the protected application has no public bypass route around Traefik/Authentik;
16. changing the authenticated identity clears prior local enterprise state.

### 29.17 Open deployment decisions

The following are deployment-specific and do not block this architecture specification:

- exact organization-facing product name;
- exact logo/icon/font package;
- exact new enterprise domain;
- exact Hetzner/Coolify resource and internal network naming;
- exact Authentik application/provider and organization access policy;
- whether the first private catalog is bundled directly into the build or loaded from an authenticated same-origin endpoint;
- exact OneDrive / SharePoint folder structure and retention policy;
- whether enterprise build artifacts are archived in OneDrive / SharePoint in addition to the deployment platform.

These decisions shall be resolved in deployment/configuration documentation without changing the core architecture unless they alter the privacy, trust, or learner-state boundary.
