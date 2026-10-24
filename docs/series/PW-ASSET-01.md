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
4. **Matching.** How a new policy attaches to an existing asset: a deterministic match on extracted identifiers first. When the match is uncertain, ask the user ("Ανήκει στο Yaris;" — copy superseded 2026-10-24 by «Αφορά: {label};», H-015). Never merge silently. The user can always split or re-assign.
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
- *(Added 2026-10-24, Eli.)* **DSR export and deletion cover `insured_assets`, `policy_insured_assets` and `asset_match_suggestions`**, proven on the fixture account (export contains them; erasure leaves none).
- *(Added 2026-10-24, Eli.)* **`asset.count` joins the count-consistency guard.** Counts render per type («2 οχήματα · 1 κατοικία»), never under an umbrella noun (H-015).
- *(Added 2026-10-24, Eli.)* **The staging seed includes the hard matching cases**: plate separator variants, homoglyphs, VIN-only, street-only address, pet name only. Each produces a confirmation prompt and no link.
- *(Replaces the RLS criterion, H-014 (a), 2026-10-24.)* **The new tables carry the same ENABLE-RLS posture** as `wallet_memberships`. `policy-authorization-single-path` enumerates the new server actions. `cross-tenant-authorization.spec.ts` gains the asset routes and proves denial over HTTP for a stranger agent and a stranger policyholder.

## Guards (fail first)
- Count consistency (extend the existing guard to asset counts, `asset.count` included).
- Absence-is-not-reassurance on asset status.
- ~~An RLS test suite for `insured_assets` and the link table, run as every role.~~ Replaced 2026-10-24 (H-014 (a)): the single-path authorization guard enumerates the asset server actions, and the HTTP cross-tenant spec covers the asset routes. Per-role RLS policies are deferred to PW-HOUSEHOLD-01.
- DSR coverage: the schema-derived `erasure-covers-personal-data` guard plus an export test, both red until the three tables are wired.

## Out of scope
Household membership and shares (HOUSEHOLD-01). Business workspaces (BUSINESS-01). Any gap or severity display changes. `lib/gap-detection.ts`. *(2026-10-24)* Insured-person / business extraction (H-010 → HOUSEHOLD-01): health, life and travel stay «Χωρίς αντικείμενο». Per-role RLS policies (H-014 → HOUSEHOLD-01). Any entitlement or price that reads asset counts (H-017).

## Halt
Migration approval (H4). Any need to change gap detection. Any production row that can't be backfilled deterministically.

**Step 0 approved 2026-10-24 (Eli, H-012..H-018).** H4: the migration is approved for staging only; production waits for the build review. Rows that can't be backfilled deterministically are left unlinked (H-012). The production profile has none. **The build waits for PW-STAGING-01.** Open: H-036.

## /goal
```
/goal The asset model in the approved docs/series/PW-ASSET-01/STEP0.md is migrated and live behind its flag on preview, all acceptance criteria in docs/series/PW-ASSET-01.md are shown met in RESULT.md with before/after numbers, every guard's failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 80 turns and print what remains.
```
