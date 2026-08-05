# Risk Assessment Engine — full validation

**Date:** 2026-08-04 · **Branch:** `qa/b2b-production-readiness`
**Subject:** the Life Context Risk Assessment Engine built against
[risk-engine-context-awareness-2026-08.md](risk-engine-context-awareness-2026-08.md)

**Reviewed as:** insurance underwriter · risk consultant · actuary · senior QA
engineer · product manager · UX researcher.

**Outcome: three consecutive complete assessment rounds, zero issues.**
17 issues were found and fixed before that streak; the counter was reset each
time one was discovered.

---

## 1. What a "round" is

A round is only meaningful if it can fail. Each one runs, in full, against the
current code:

| Step | What it proves |
|---|---|
| 355 risk-engine assertions | 24 customer scenarios × 11 invariant classes, catalog integrity, reachability sweep, mobile invariants, cross-surface consistency, intake boundary |
| Full unit suite, diffed against a pre-change baseline | no regression anywhere in the product (3,163 passing) |
| `audit:api-auth` · `lint` · `lint:i18n-changed` · `lint:utf8` · `lint:encoding` · `type-check` | the repo's own blocking CI gate |
| `NODE_ENV=production npm run build` | it ships |

Rounds were additionally preceded by **new** inspection each time — re-running
the same assertions is not an assessment. The angles inspected were: every
recommendation's rendered copy in both languages; the Opportunity Engine and
advisor playbook; the dashboard; the AI prompt; the recommendation lifecycle
across the engine switch; adversarial and degenerate inputs; a real browser
layout measurement; and a formal three-questions pass over the catalog.

---

## 2. Scenario matrix

24 profiles, covering every situation named in the brief plus the boundary cases
that break engines. Each declares what must **not** be recommended, what should
surface, and the protection-score band the situation deserves.

| Scenario | Score | Protection gaps | Opportunities | Explicitly *not applicable* |
|---|---|---|---|---|
| Single renter | 75 | income protection | health, renters, pension | 17 risks |
| Home owner + mortgage | 42 | home, life (debt), income | health, pension | 16 |
| Married, dependent spouse | 55 | life (dependants), income | health, renters, pension | 16 |
| Parents, mortgage, car | 31 | home, life ×2, motor, income | health, pension | 14 |
| Couple, no children | 75 | income protection | health, renters, pension | 17 |
| Pet owner | 76 | income protection | pet, health, renters, pension | 16 |
| No pets | 75 | income protection | health, renters, pension | 17 |
| Motorcycle owner (insured) | 76 | income protection | health, renters, pension | 16 — motor **covered** |
| No vehicles | 75 | income protection | health, renters, pension | 17 |
| Business owner, 4 staff | 60 | business, income, employer + professional liability | health, renters, pension | 14 |
| Employee, thin savings | 65 | income protection | health, renters, pension | 17 |
| Retired 70, home insured | 89 | — | health | 19 |
| Student, 21 | 90 | — | health, renters | 19 |
| Frequent traveller | 76 | income protection | travel, health, renters, pension | 16 |
| Boat owner | 63 | boat, income protection | health, renters, pension | 16 |
| Landlord | 47 | home, landlord, income | health, legal, pension | 15 |
| Holiday-home owner | 63 | income protection | health, legal, pension | 16 — home **needs review** |
| High-net-worth | 55 | life, home, income | cyber, valuables, health, legal, pension | 13 |
| Cyber exposed | 76 | income protection | cyber, health, renters, pension | 16 |
| **Nothing known** | **withheld** | **none** | health | 1 — 19 **need review** |
| Fully covered parents | 100 | — | — | 15 |
| Climber + skier | 64 | life, income | accident, health, renters, pension | 15 |
| Diabetic | 73 | income protection | chronic costs, health, renters, pension | 16 |
| Driver with accidents (insured) | 76 | income protection | legal, health, renters, pension | 15 |

The **"not applicable" column is the deliverable.** Those are risks the engine
examined and declined to raise, and it can say so per risk — the difference
between "we didn't mention pet cover" and "you have no pet, so this is not your
risk."

---

## 3. Issues found and fixed

Seventeen. Each was described, fixed, guarded by a regression test, and the
clean-round counter reset.

### Applicability — recommending what does not apply

| # | Issue | Fix |
|---|---|---|
| 1 | **Boat ownership was invisible.** A boat owner carries a *compulsory* third-party liability under the Greek recreational-craft regime, plus salvage and wreck removal — and the engine had no way to see a boat at all. | `boat` context factor + `boat_liability` risk, wired through intake, Art. 15 export and UI. |
| 16 | **A skipped question became a declaration.** The wizard reported every *rendered* field as answered. Leaving the residence select on "Επιλέξτε…" marked `residence` known-with-no-value, and both property risks resolved to *not applicable* — the engine asserting this person owns no home and rents nowhere, on a question they had skipped. | Only definite controls (checkboxes, multi-selects) count as answered by rendering; everything else needs a value. |
| 17 | **"Never asked about your health" read as "you have no chronic condition."** `chronic_condition_costs` had no `requires` gate. | New `health` factor; unanswered → `needs_review`. Now guarded structurally for the *whole* catalog: every risk must gate on a declared fact, with `health_access_delay` the one documented exception. |
| — | *Related:* "not an owner" was being read as "tenant". A family-owned or employer-provided home is neither. | Split `tenancy` from `residence`; the legacy `ownsHome` boolean can no longer settle a tenancy question. |

### Actuarial — the score not measuring what it claims

| # | Issue | Fix |
|---|---|---|
| 2 | **Score compression.** Every uncovered profile landed in 19–46. A single renter with one modest gap scored 35; a landlord with two uninsured properties scored 25. Each category was scored against *its own contents*, so one medium risk zeroed a category exactly as three critical ones did. | Normalise against an absolute severity ceiling. The same two now separate to 75 and 47. |
| 5 | **Fixed category weights ignored actual exposure.** A landlord's largest uncovered asset class counted for less than a low-severity treatment-speed preference, because Property is weighted 20 and Health 25. | Weight by the product's stated importance **×** the exposure mass the customer actually carries in that category. |
| 6 | **A confident verdict on a stranger.** A profile nobody had asked scored 90 "Excellent" — computed from the two or three risks that apply to everybody. | `assessmentCoverage` + `indeterminate`; below 50% assessed, every surface shows "not enough information yet". |
| 13 | **A convenience product outranked a compulsory one.** `health_access_delay` — treatment *speed*, when ΕΟΠΥΥ already covers the treatment — escalated to `high`, ranking level with an entirely uninsured business and above an employer's liability for four staff. | A `discretionary` risk can never enter the essential band. Enforced in `assessRisk`, not per-rule. |
| 4 | **A holiday home was falsely reassured.** Two properties plus one home policy read *already covered*. One policy does not cover two houses, and Greek wordings restrict cover after 30–60 days unoccupied. | `minPolicies`; short cover reports `needs_review`, with the unoccupancy clause on the card. False reassurance is worse than a false positive — it tells someone to stop looking. |

### Cross-surface — the same person described differently

| # | Issue | Fix |
|---|---|---|
| 8 | **Three definitions of "profile completeness".** The Opportunity Engine had its own six-field count that predated `answeredFields`, so a client who carefully answered "no" to every boolean read as 0% complete to their advisor and ~100% to themselves. | One definition: `contextCompleteness`. |
| 9 | **The advisor playbook read the legacy `ownsHome` boolean.** A client who declared "owned" via `residenceType` still looked like a non-owner to their advisor. | Playbook resolves through `toLifeContext`, like every other reader. |
| 14 | **The dashboard — the more-visited surface — still rendered a raw score** for a user we know nothing about, because the cached shape could not express indeterminacy. | `assessmentCoverage` persisted; `StatTiles` already knew how to render an unavailable score, so it is given `null` rather than a second empty state. |
| 15 | **Upgrading would resurrect dismissed cards.** Every rule id changed, so a customer who dismissed `mortgage_no_life` would meet it again as `risk:life_debt` — the product forgetting, on upgrade, the one thing they took the trouble to say. | Dismissals carry across the rename, but only where the new risk is the *same finding better expressed*. `no_health` is deliberately excluded: it was withdrawn as wrong, not renamed. |

### AI explanations

| # | Issue | Fix |
|---|---|---|
| 10 | **`null` and `[]` rendered identically.** "Chronic conditions: None reported" told the model the person had declared themselves free of chronic conditions when nobody had raised the subject. Same for life events and family history. | Three-state rendering: unknown / none / listed. |

### Copy and UX

| # | Issue | Fix |
|---|---|---|
| 3 | **The "Ζωή" (Life) tile showed a gap on 17 of 24 scenarios**, including every single person with no dependants, because `income_protection`'s parent branch is `life`. Same for `renters` → «Κατοικία». | A child-branch *expectation* no longer paints its parent's tile. A child-branch *policy* still counts as cover — that asymmetry is the point, and is now pinned by a test. |
| 7 | Greek copy read the customer's own answer back at them in English: «χρόνια πάθηση (diabetes)». | One bilingual condition vocabulary; the scenario suite fails on any Latin run in Greek copy. |
| 11 | `"roughly 2 month(s) of income"` — a programmer's plural in customer-facing copy. | Uses the existing `plural()` helper. |
| 12 | `"regular participation in climbing, diving."` — a comma-spliced list ending a sentence. | Proper "and" join, in both languages. |

### Not defects

Two candidates were chased to ground and found **not** to be product issues —
worth recording, because "fixing" either would have been the error:

- **The disclosure chevron appeared not to rotate.** It does. Tailwind 4 sets the
  `rotate` property rather than `transform`, and my probe was also reading
  mid-transition.
- **40 apparent "irrelevant recommendation" hits in the first pass.** My harness
  was comparing branch *families*, so a legitimate `renters` suggestion counted
  as a `home` suggestion. The harness was wrong, not the engine.

---

## 4. Validation results

### Automated, every round

- **355** risk-engine assertions — 24 scenarios × 11 invariant classes, plus
  catalog integrity, a **3,072-combination** reachability sweep, mobile
  invariants, cross-surface consistency and the intake boundary.
- **3,163** unit tests passing, **zero regressions** against a pre-change
  baseline. (224 failures are a pre-existing local jsdom breakage —
  `html-encoding-sniffer` requiring an ESM module — identical before and after,
  and unrelated to this work. They pass in CI.)
- Full guardrail gate green; **production build exits 0**.

### Manual and one-off

- **Every one of the 21 recommendations read end to end** in both languages,
  against a context where all of them fire, checked for Greek-market accuracy.
- **Real browser layout measurement** — the panel server-rendered with the
  production CSS, all 21 cards expanded, in Greek, measured in Chrome at
  **320 / 360 / 390 / 414 / 768 / 1024 / 1280**: zero horizontal overflow, zero
  sub-24px tap targets at every width.
- **14 adversarial input classes** — null, empty, wrong types, negatives, `NaN`,
  `Infinity`, `MAX_SAFE_INTEGER`, future and invalid dates, unknown enum ids,
  markup injection, unknown branches, a 500-policy portfolio. No crash, no
  broken interpolation, no out-of-range score.
- **Three-questions pass**: all 21 risks gate on a declared exposure, size the
  loss, and name a mitigation — 9 of them qualified with an explicit market
  caveat where the Greek market constrains what can actually be bought.
- **Two independent implementations agree.** The scratchpad harness and the
  committed repo suite were written separately and report the same result.

### Three consecutive clean rounds

| Round | Assertions | Unit suite | Guardrails | Build | Result |
|---|---|---|---|---|---|
| 1 | 355 pass | 3,163 pass, 0 regressions | all pass | exit 0 | **CLEAN** |
| 2 | 355 pass | 3,163 pass, 0 regressions | all pass | exit 0 | **CLEAN** |
| 3 | 355 pass | 3,163 pass, 0 regressions | all pass | exit 0 | **CLEAN** |

Round 3 was preceded by a full independent re-verification against the final
code: re-render, re-measure at seven widths, independent scenario harness,
adversarial suite and three-questions pass — all clean.

---

## 5. Remaining risks

Stated plainly; none is a defect in what was built.

1. **Two things must happen before merge.**
   - **The migration must be applied to prod and dev** via the Supabase MCP path
     (`20260804120000_life_context_risk_assessment`). Additive and idempotent.
     `verify:migrations` cannot run on this network by construction — the migrate
     engine takes a session-level advisory lock that transaction-mode pgbouncer
     cannot hold. Verified instead against
     `prisma migrate diff --from-empty --to-schema-datamodel`: **every column
     type, default and index matches Prisma's own DDL exactly.**
   - **Playwright E2E has not been run.** The local jsdom/vitest breakage is
     environmental. The component was measured in a real browser, but the
     assembled `/coverage-insights` and `/branches` pages were not.

2. **Adequacy is still not measured.** The score says how much of your exposure
   is *answered*, not whether the sums insured are *enough*. A €10,000 life
   policy against €300,000 of debt still reads as covered. This is disclosed in
   `scoreMethodologyLimits`, and it waits on the audit's F-05 `PolicyCoverage`
   projection — building it on `acordData` JSON would be the wrong foundation.

3. **The AI risk analysis still has no caller.** It is now safe to enable (the
   prompt no longer asserts defaults as facts and carries an applicability rule
   that outranks the rest), but it does not see the new context factors —
   business, boat, children, tenancy, valuables, cyber. Enabling it without
   extending `RiskProfileInput` would give the model a narrower view than the
   deterministic engine has.

4. **Score bands are calibrated judgement, not ground truth.** The 24 bands
   encode what each situation deserves as reviewed here. They are deliberately
   tight enough to catch compression and inversion; real customer data may argue
   for moving one or two.

5. **`critical_illness` is still absent from the taxonomy.** Adding a branch
   changes the policy Zod enum *and* the extraction prompt enum — a wider blast
   radius than the gating fix needed.

6. **No admin surface for the risk catalog.** It is code with tests, which is
   deliberate: an editable copy in the database is how the gap definitions grew
   an auto-mint feedback loop.

---

## 6. Confirmation

> **Three consecutive complete assessment rounds identified zero issues.**
> The counter was reset at each of the 17 discoveries and restarted from zero;
> the three clean rounds above were all run against the final code, with round 3
> additionally preceded by full independent re-verification.

All UI remains mobile-first and responsive, measured in a real browser at seven
widths, and the production build ships.
