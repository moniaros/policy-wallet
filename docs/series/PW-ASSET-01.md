# PW-ASSET-01 — The household is made of things, not policies

| | |
|---|---|
| **Wave** | 1 — foundation; everything in Wave 2 builds on it |
| **Step 0** | Fable 5.1 · xhigh · `step0-investigator` |
| **Build** | Fable 5.1 · high (main session). The largest, longest-running build in the programme. UI pieces: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: **yes** (new tables, RLS) |
| **Waits on** | H4 (migration approval) before build |
| **Session start** | STATUS.md + this file |

## Customer outcome
The first screen answers *"am I covered right now?"* for each thing the household owns: «Το Yaris · καλύπτεται έως 14/3 · 410 €/χρόνο · 2 ασφαλιστήρια». One car with three policies is one row, not three.

## Step 0 — investigate, no code
1. **Current model.** The policy, `gap_instances`, `CoverageEnvelope` and `catalogue_version` tables; how the wallet list, dashboard and agent portfolio query them; every count rendered from them (the 23 / 13 / 11 / 9 / 36 / 10 problem).
2. **What the extractor already reads that identifies an asset:** plate number, VIN, property address / ΚΑΕΚ, insured person name, pet name and microchip, business name / ΑΦΜ. Extraction confidence for each.
3. **Proposed model.** An `insured_assets` table (type: vehicle, property, person, pet, business, other), a many-to-many link to policies, and ownership/household scope ready for HOUSEHOLD-01 without building it. Write the migration SQL in STEP0.md; don't apply it.
4. **Matching.** How a new policy attaches to an existing asset: a deterministic match on extracted identifiers first. When the match is uncertain, ask the user ("Ανήκει στο Yaris;"). Never merge silently. The user can always split or re-assign.
5. **Status per asset.** Derived only from dated facts: in force, expiring within N days, expired, unknown. «Άγνωστο» when dates couldn't be read. Never derived from gap or severity data.
6. **Annual cost per asset.** Only when premiums were extracted. Show «—» with "δεν διαβάστηκε" otherwise; never estimate.
7. **Backfill plan** for existing dev/staging data, and the empty-portfolio and all-expired states.
8. **Count reconciliation:** one definition for each count, its single source, and where it renders.

## Build (after approval + H4)
Migration + RLS → matching service → asset list (wallet) → asset detail (policies nested) → dashboard first-viewport "covered now" strip → count reconciliation everywhere counts render.

## Acceptance criteria
- Heavy fixture (23 policies): the wallet renders household assets, each identifiable by a human label. Row count and scroll height reduced vs baseline (record both).
- Every count instrumented with `data-count`. The count-consistency guard is green across all surfaces and the agent portfolio.
- "Covered now" status is never green for an asset whose dates were unreadable.
- Matching: zero silent merges in the fixture run. Every uncertain match produced a confirmation prompt.
- Agent portfolio view still works and shows the same assets.
- SECURITY.md and REVIEW.md: CRITICAL 0.

## Guards (fail first)
- Count consistency (extend the existing guard to asset counts).
- Absence-is-not-reassurance on asset status.
- An RLS test suite for `insured_assets` and the link table, run as every role.

## Out of scope
Household membership and shares (HOUSEHOLD-01). Business workspaces (BUSINESS-01). Any gap or severity display changes. `lib/gap-detection.ts`.

## Halt
Migration approval (H4). Any need to change gap detection. Any production row that can't be backfilled deterministically.

## /goal
```
/goal The asset model in the approved docs/series/PW-ASSET-01/STEP0.md is migrated and live behind its flag on preview, all acceptance criteria in docs/series/PW-ASSET-01.md are shown met in RESULT.md with before/after numbers, every guard's failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 80 turns and print what remains.
```
