# Exam Trainer Framework (ETF)

ETF is a catalog-driven offline Progressive Web App for exam-oriented learning, spaced repetition, and exam simulations.

The first reference catalog is **Fügetechnik**.

## Status

Repository baseline and requirements specification.

## Core principles

- fully local learner data;
- no telemetry;
- offline-first PWA;
- versioned JSON catalogs;
- IndexedDB persistence;
- five-stage spaced repetition;
- reusable framework separated from subject content;
- local or Netlify deployment.

## Documents

- [SPEC.md](SPEC.md)
- [ROADMAP.md](ROADMAP.md)
- [Catalog authoring](docs/catalog-authoring.md)
- [Deployment](docs/deployment.md)
- [Fügetechnik catalog](catalogs/fuegetechnik/README.md)

## Planned development stack

- TypeScript
- Vite
- IndexedDB
- JSON Schema / Ajv
- Vitest
- Playwright

## Important content notice

The framework can be public. Course scripts, extracted images, and derived learning content must only be committed or deployed when the necessary rights permit this. The initial Fügetechnik placeholders do not contain the supplied copyrighted source material.
