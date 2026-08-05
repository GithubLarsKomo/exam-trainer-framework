# FSRS activation policy

FSRS runs in shadow mode. The classic five-stage scheduler remains authoritative for due dates and learner progress until a controlled comparison demonstrates that FSRS preserves retention while reducing review effort.

## Why shadow evidence is not enough for activation

A learner currently reviews according to the classic scheduler. Therefore a shadow run cannot directly observe the counterfactual outcome that would have occurred if FSRS had delayed or advanced that review. Shadow evidence can validate plausibility and identify a safe pilot candidate, but it cannot by itself prove superiority or non-inferiority.

## Shadow → controlled pilot gate

The active catalog must provide all of the following evidence:

- at least **400** non-migrated reviews containing both classic and FSRS scheduling decisions;
- at least **40** distinct knowledge items;
- at least **30** days between the first and latest usable review;
- at least **150** subsequent reviews performed at or after the prior FSRS due time;
- at least **150** mature interval samples where both schedulers scheduled at least one day after a correct response;
- observed recall at/after the prior FSRS due time of at least **88%** (`partial` and `correct` count as remembered; `incorrect` does not);
- projected FSRS review effort no greater than **95%** of the classic scheduler estimate.

Projected effort is estimated from the reciprocal of post-review intervals on mature correct-review samples. It is an engineering screening metric, not a causal workload result.

Passing these gates changes the status only to **pilot candidate**. It never changes scheduling authority automatically.

## Controlled pilot → activation gate

A future controlled pilot must compare Classic and FSRS on contemporaneous item groups. Before FSRS may become authoritative, the pilot must contain at least:

- **300 reviews per arm**;
- **30 distinct knowledge items per arm**;
- **30 days** of observation;
- FSRS retention no more than **2 percentage points below** Classic (non-inferiority margin);
- FSRS review effort no greater than **95%** of Classic.

The pilot must be explicitly enabled and reviewed. A passing result permits a separate activation decision; it does not automatically switch the scheduler.

## Safety and interpretation

- Migrated legacy history is excluded from shadow evidence because historical FSRS state was intentionally not reconstructed.
- The evaluation is catalog-scoped.
- `partial` maps to FSRS `Hard` and therefore counts as remembered for retention screening.
- Exam and learning reviews are both retained as evidence because both flow through the same review engine, but future pilot analysis may stratify them.
- No AI system participates in scheduling or activation decisions.
- Threshold changes require an explicit code/documentation change and normal review/CI.
