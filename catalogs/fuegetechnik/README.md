# Fügetechnik reference catalog

## Runtime source of truth

The built-in application catalog is composed from `src/builtin-v04.ts` and `src/builtin-v04-additions.ts` by `src/fuegetechnik-catalog.ts`. That composed runtime catalog is the authoritative built-in content used by the application.

`catalog.json` and `cards.json` in this directory are early JSON-format scaffolding from the repository baseline. They are not loaded by the current application and must not be used to infer runtime card count or release readiness. In particular, the intentionally empty `cards.json` is not evidence that the runtime catalog is empty.

## Pilot scope

The pilot shall cover numbered subtasks from exam-memory questions 1–11 and contain at least 40 released cards. Runtime composition and blocking publication validation are guarded by `tests/fuegetechnik-catalog.test.ts`.

## Source-grounding rule

Questions, answers, source pages, terminology, images, and chapter names must be derived from the supplied script and exam-memory protocol. Unsupported details must not be silently added.

If a source does not support a complete answer:

1. keep the card in `draft`, `in_review`, or `changes_requested` as appropriate;
2. document the uncertainty in the change/review context;
3. do not publish the card as `released`;
4. release only after manual clarification.

Missing source-page metadata remains an explicit catalog-completion warning even when the card otherwise passes blocking publication validation.

## Assets

Store authorized PNG or WebP excerpts in `assets/`.

Do not commit copyrighted source material to a public repository unless redistribution is permitted.
