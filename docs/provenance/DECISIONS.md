# PW-PROVENANCE-01 — decisions of record

Decisions the owner took in writing, with the constraint each restates. The goal-level decision log
(agent choices under standing authority) lives in `PROGRESS.md`; this file holds only what the owner
ratified.

| Id | Date | Decision | Constraint as restated |
|---|---|---|---|
| D-P1 | 2026-09-07 | **Scope: everything code-touchable** — W0–W5, plus MFA (§14.4), the PITR re-erasure job (§14.6), the breach runbook (§14.7) and the generated Art. 30 / DPIA-input artifacts (§14.2). | The five findings that are not code (`H-P1`…`H-P5`) are halted at open and never retried. |
| D-P2 | 2026-09-07 | **Full autonomy to production** — the loop merges to `NEW-UI` and deploys, per the CLAUDE.md standing authority. | Every merge passes the gate in `LOOP.md` §5; migrations land in both databases, verified by query, before the code merges; production is smoked after every deploy and the evidence committed. |
| D-P3 | 2026-09-07 | **One PR per wave**, each independently reviewable and revertable. | Matches how #311/#313/#314/#315 shipped. One commit at a time onto `NEW-UI` — CI there has `cancel-in-progress`, so a second push silently cancels the first and no deploy fires. |
