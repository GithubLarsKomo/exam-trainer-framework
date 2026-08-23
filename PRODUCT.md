# PRODUCT.md — Exam Trainer Framework

Status: **approved**  
Source: `exam-trainer-product-context-r1` (`sha256:28801619d579e8033a26eb79a6fa72fac97610604d0d1bb3757393fe59be8110`)  
Approved: 2026-08-23

## 1. Product identity

Exam Trainer Framework (ETF) is a **learner-first exam trainer** with a reusable catalog framework in the background. It is an application/product surface, not a landing page, marketing site, social learning platform or corporate LMS.

ETF is a local-first, offline-capable PWA for exam-oriented learning, adaptive daily planning and exam simulation. The first reference catalog is Fügetechnik, while the product must remain transferable to other subjects and catalogs.

The product serves a deliberately generic audience of learners and authors. Learning and catalog authoring coexist in the same application, but whenever learning flow and editorial power compete, **learning flow wins**. Authoring may be denser, more technical and clearly secondary.

## 2. Core user model

- Exactly one local user; no login or role model is required for the core product.
- Learning data, catalogs and assets remain locally controlled by default.
- No telemetry or external backend is required for core operation.
- The same user may learn and edit catalogs.
- Multiple catalogs may be installed; one learning session uses exactly one catalog.
- Full catalog editing remains possible on iPhone.

## 3. Primary jobs to be done

ETF must enable the user to:

1. know immediately what is useful to learn today;
2. start a sensible learning session with very few decisions;
3. assess exam readiness and knowledge gaps credibly;
4. practise one task at a time without surrounding interface clutter;
5. simulate exams using explicit blueprints and topic weighting;
6. completely inspect, edit, version, validate, import and export catalogs;
7. retain ownership of learning data and move it via transparent export/import;
8. transfer the same framework to new subjects without redesigning the product concept.

## 4. Success criteria

Product success means that the user can:

- identify the day's learning focus immediately;
- understand current exam readiness and weak areas;
- enter a useful session with minimal friction;
- control and improve the source catalog independently;
- trust that data remain local, inspectable and exportable;
- reuse ETF for additional subjects and catalogs.

These outcomes take precedence over vanity engagement metrics.

## 5. Product personality

ETF should feel:

- **focused** — one clear task and one obvious next action at a time;
- **technically precise** — explicit states, evidence and controllable behaviour;
- **motivating** — progress should feel actionable without becoming game mechanics.

ETF must not feel:

- childish or school-themed;
- gamified through streaks, badges or rewards as an end in itself;
- like corporate LMS or administrative software;
- like a dashboard overloaded with simultaneous metrics;
- like a marketing/landing page;
- like a social comparison or community product.

## 6. Strategic product principles

### One main task per moment
The interface should make the current primary action obvious. Secondary complexity is revealed only when needed.

### Evidence before decoration
Recommendations, readiness and progress must be explainable from data or deterministic logic. Visual confidence must not exceed evidential confidence.

### Local trust
Core use is local-first and offline-capable. Hidden data flows are prohibited. Export/import paths must remain understandable to the user.

### Power without clutter
Power features belong in the product, especially catalog editing, versioning and validation, but must not overload the learner-facing flow.

## 7. Information architecture

Primary product destinations are:

- Start
- Lernen
- Prüfung
- Fortschritt
- Kataloge
- Einstellungen

On iPhone, the five primary bottom tabs are Start, Lernen, Prüfung, Fortschritt and Kataloge. Einstellungen remains secondary.

Editorial functions live under `Kataloge`.

## 8. Learning experience

A learning view focuses on **exactly one task**.

After revealing a solution, the hierarchy is:

1. own answer;
2. model solution;
3. grading/advisory help;
4. self-rating.

Own answers remain visible after reveal. Touch interaction must not rely on hover or gestures alone. Desktop keyboard operation is supported, while touch remains a first-class fallback.

## 9. Editorial experience

The editor is a power surface and may be denser than learning screens. It supports all catalog-management capabilities defined by the current product version, including local assets, validation, versioning and publication state.

Published cards are immutable; editing creates a new draft version. A single local author may publish their own changes.

## 10. Accessibility

WCAG 2.2 AA is the minimum product target, with robust keyboard, touch and reduced-motion support.

Core requirements include:

- no essential hover-only interaction;
- touch targets at least 44 × 44 CSS pixels;
- no horizontal scrolling at 320 px for core flows;
- visible keyboard focus;
- colour is never the only carrier of meaning;
- reduced-motion preferences are respected.

## 11. AI/ML readiness

ETF is **AI-ready but not AI-dependent**.

Desirable future assistive capabilities include:

- proposing explanations and alternative solution paths;
- generating additional practice variants;
- assisting authors with structuring and revising catalog content.

### Authority boundary
AI remains advisory. Grading, release/publication and other critical decisions require a deterministic or manual fallback. Model output must never silently become authoritative content.

### Data boundary
Learning answers are local by default. External use for model improvement is prohibited unless the user gives explicit, purpose-bound opt-in consent.

### Presentation boundary
Future model output must be clearly marked as an AI/model suggestion, separated from authoritative solutions, and always overridable.

## 12. Non-goals

The core product does not aim to become:

- a multi-user learning management system;
- a social/community learning network;
- a cloud-sync platform by default;
- an engagement/gamification platform;
- an AI-autonomous grading or publishing system;
- a marketing surface around the learning application.

## 13. Design authority

`DESIGN.md` defines the visual and interaction system. Where implementation differs from this product context, this file has higher authority for product intent; `DESIGN.md` must remain consistent with it.
