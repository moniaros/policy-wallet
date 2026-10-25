# PW-RENEWAL-01 — What changed at renewal

| | |
|---|---|
| **Wave** | 2 (needs ASSET-01; renewal linking from INGEST-01) |
| **Step 0** | Opus 5.5 · high |
| **Build** | Opus 5.5 · high (diff engine). UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: no |
| **Waits on** | H1 to send reminders. The in-app diff ships without it. |
| **Session start** | STATUS.md + this file |

## Customer outcome
When I upload my renewal I see, in plain Greek, what changed:
- premium Δ,
- covers added or removed,
- limits and deductibles changed,
- new exclusions,

plus the questions to ask my agent. Before renewal (45 days, once H1 allows), one message tells me what's coming up.

## Step 0 — investigate, no code
1. The STATUS.md placeholder for "renewal delta extraction" (Tier C, deferred). Confirm whether a **deterministic diff over two existing extractions** removes the need for a new extraction mode.
2. **Diff rules:** field-level comparison on extracted coverage data, with the article reference for both versions. A field unreadable in either version → «δεν συγκρίνεται», never "unchanged".
3. **"Questions to ask"** are generated from diff entries by template, not free LLM text. Each template string goes through `greek-copy-reviewer`.
4. **Renewal-window event** for NOTIFY-01: trigger at 45 days before end date; one follow-up at 7 days only if no renewal has been uploaded. Cadence is a proposal for H1, not a decision.

## Build (after approval)
Diff engine → renewal comparison view on the asset → question templates → renewal-window events (dispatch still governed by NOTIFY-01's kill switch).

## Acceptance criteria
- Fixture pairs covering a premium increase, a removed cover, a changed deductible, a new exclusion, and an unreadable field: every change detected and cited. The unreadable field is never shown as "no change".
- No severity, ranking or colour-as-judgement on diff entries.
- CRITICAL 0.

## Guards (fail first)
Absence-is-not-reassurance on diff output. Severity framing on the renewal view.

## Out of scope
Market price comparison or "you could pay less" content. That needs the compliance decision (transformation doc halt #3) and isn't scheduled.

## /goal
```
/goal Renewal diff from the approved STEP0 works on preview against all fixture pairs, all acceptance criteria in docs/series/PW-RENEWAL-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and adversarial-reviewer prints CRITICAL: 0 — or stop after 40 turns.
```
