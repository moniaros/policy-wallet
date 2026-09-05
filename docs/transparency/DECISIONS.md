# PW-TRANSPARENCY-02 — decisions of record

Decisions the owner took in writing, with the constraint each restates. The goal-level decision
log (agent choices under standing authority) lives in `PROGRESS.md`; this file holds only what the
owner ratified.

| Id | Date | Decision | Constraint as restated |
|---|---|---|---|
| D-V1 | 2026-09-05 | **V1 ratified: the B0/B1 edits to `lib/gap-detection.ts` stand. No revert.** The diff against 45013e3f is 192 deletions and 10 insertions: the legacy write path (`DetectedGap`, `detectGapsForPolicy`, `detectGapsForUser`, `createGapInstances`) and the two dead presentation maps (`getSeverityColor`, `getSeverityLabel`) removed; `decideGapsForPolicy`, `evaluateGapLogic`, `evaluateAcordFieldCheck`, `ruleInputsFor` and `hasEvaluableRule` byte-identical (function-level SHA-256); every remaining severity assignment and rule predicate unchanged. | **Detection and severity logic untouched; the legacy write path may be removed.** Enforced from R1 onward by the freeze pin in `tests/unit/gap-severity-display-single-source.test.ts` (`FROZEN_GAP_DETECTION_SHA256` at the ratified HEAD of the file): any further edit fails CI until the owner ratifies it and re-pins. |
