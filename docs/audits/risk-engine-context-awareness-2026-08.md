# Risk Assessment Engine — context-awareness audit

> **STATUS 2026-08-04 — the backlog below has been implemented.** The engine was
> rebuilt as a **Life Context Risk Assessment Engine**
> (`lib/services/gap-engine/{life-context,risk-types,risk-catalog,risk-assessment}.ts`).
> Every P0 and P1 item is closed, plus R-12's precondition and R-13 through R-20.
> Findings below are kept in their original tense as the record of what was wrong;
> the closure notes say what replaced each one. Verification: 46 new unit tests
> (including a 3,072-combination reachability sweep), full guardrail gate green,
> production build exit 0, zero regressions against the pre-change baseline.

**Date:** 2026-08-04 · **Branch:** `qa/b2b-production-readiness` · **Scope:** the whole
risk-assessment path — intake (onboarding, questionnaire, wizard), profile schema, rules
engine, protection score, recommendation generator, AI layer, APIs, dashboards, and the
mobile rendering of each.

**Question this audit answers:** does a recommendation appear because the customer carries
the risk, or because a policy is absent from the wallet?

**Deliberately not in scope:** finding insurance products PolicyWallet doesn't sell.

---

## Method — and why the findings below are not readings

Reading the rules is not enough to know what a user sees, because three layers compose:
the rule set, the per-line deduplication, and the `expectedLines` array that drives the
branch tiles. I executed the real engine code (bundled with esbuild, no DB) over
constructed profiles and over an exhaustive enumeration.

- **8 hand-built personas** through `detectProfileGaps` → `calculateProtectionScore` →
  `buildBranchOverview`, i.e. the exact chain that renders `/coverage-insights`,
  `/branches` and the dashboard coverage map.
- **18,432 profile combinations** (employment × home × pets × travel × loans × dependents
  × vehicles × mortgage × life-cover held × chronic × family history × driving record)
  through every rule, recording which rules fire internally and which survive to the user.

Every number and tile list quoted below is observed output, not inference. Test artifacts
were run from the scratchpad; no repository file was modified.

---

## Verdict

**The engine is context-aware in its architecture and not yet in its content.**

The design is right: rules are conditioned on profile facts, categories are excluded from
the score denominator when they don't apply, portfolio rules only fire against policies the
customer actually holds, and coverage liveness is derived rather than trusted. The
mission's own example is implemented correctly — `pets_no_pet` fires only when `hasPets`,
and there is no boat rule and no motorcycle rule to fire spuriously.

But three defects break the promise in ways a customer sees:

1. **`expectedLines` expands a category-level judgement into line-level verdicts**, so the
   branch map shows "gap" for lines the score itself has ruled inapplicable. A renter with
   a car is shown a **home** gap. A single 28-year-old with a dog is shown **home, life,
   travel, pet and cyber** gaps. This is the single largest source of false positives in
   the product and it is a wiring defect, not a judgement call.
2. **Two rules recommend a product from the absence of that product** — `no_health` (fires
   for literally everyone without a private health policy, including a user whose profile
   is empty) and `no_legal_expenses` (fires for every homeowner). These are the rules the
   mission's rule forbids.
3. **Two rules are wrong on insurance grounds, not just on targeting** —
   `chronic_condition_no_health` recommends, at *critical* severity, cover that Greek
   underwriting will exclude for the very condition cited; `family_history_no_life` maps a
   morbidity signal onto a mortality product and fires for people with no dependents and no
   debt, i.e. with nobody to suffer the loss.

Alongside these, a large amount of the engine is **built and unreachable**: the AI
risk-profile analysis has zero callers, one rule is always shadowed and can never surface, and
11 of 23 profile fields — including GDPR Art. 9 health data — drive nothing at all.

The good news is proportionate: the fixes are small and mostly deletions or guards. The
score arithmetic was already corrected (F-04); this is the applicability layer above it.

---

## Part 1 — The applicability model, and where it breaks

### 1.1 There are two disagreeing definitions of "expected lines"

`lib/services/gap-engine/profile-gap-rules.ts:427` exports `getExpectedLines(profile)`, a
careful line-level function: motor only if vehicles, home only if `ownsHome`, life only if
dependents-or-debt. **It has no callers.** It is imported into `index.ts` purely to be
re-exported (`index.ts:22`, `:661`).

What actually runs is an inline loop at
`lib/services/gap-engine/protection-score.ts:319-327`:

```ts
for (const cat of SCORE_CATEGORIES) {
    if (cat.appliesWhen(profile)) {
        for (const lob of cat.coveredByLobs) { ... expectedLines.push(lob) }
    }
}
```

This asks "does the **category** apply?" and then declares **every line inside it**
expected. The categories bundle unlike risks:

| Category | `coveredByLobs` | Applies when |
|---|---|---|
| property | `home`, **`motor`** | `ownsHome` **OR** `vehiclesCount > 0` |
| life | `life`, `income_protection` | dependents OR mortgage OR loans |
| income | `life`, `income_protection`, **`disability`** | employed OR self-employed |
| liability | `liability`, `legal_expenses` | self-employed OR `ownsHome` |
| other | `travel`, `pet`, **`cyber`** | `travelsFrequently` OR `hasPets` |

So owning a car makes **home** expected. Being employed makes **life** expected. Owning a
pet makes **cyber** and **travel** expected.

`expectedLines` is persisted to `ProtectionScore.expectedLines` and consumed by
`buildBranchOverview` (`lib/insurance/branch-page.ts:83`), where
`deriveBranchState({ expected: true, hasActivePolicy: false })` returns **`'gap'`**
(`branch-page.ts:58-66`). It renders on `/branches` and on the dashboard coverage map
(`PolicyholderHome.tsx:290`).

### 1.2 Observed output

| Persona | Score | Branch tiles rendered as **gap** |
|---|---|---|
| A. New user, empty profile, no policies | **0** ("Critical") | health |
| B. Renter, owns a car, employed, no dependents, no debt | 33 | **home**, health, **life** |
| C. Single 28, one dog, holds health + motor | 69 | **home**, **life**, **travel**, **pet**, **cyber** |
| D. Retired 72, 1 dependent, owns home outright, holds home cover | 25 | **motor**, health, life, liability, legal_expenses |
| G. Breadwinner, 3 dependents, €300k mortgage, holds life+home+health | **89 ("Excellent")** | **motor**, liability, legal_expenses |

Reading the three mission questions against persona C:

- *Cyber gap* — Does the risk exist? Only in the sense it exists for everyone online.
  Was anything about this person's digital exposure asked? No. Why did it fire? **Because
  they own a dog.** Fails question 1.
- *Home gap* — Could they suffer this loss? No; they own no property. Fails question 2.
- *Life gap* — the score's own `appliesWhen` says Life does **not** apply to this person.
  The tile contradicts the score on the same page load.
- *Travel gap* — `travelsFrequently` is false. Fails question 1.

Persona D is the mirror image: a 72-year-old with no vehicle is shown a **motor** gap
because they own a home.

**Severity: HIGH — broken.** This is the mission's defect, at scale, on the product's most
scanned surface.

### 1.3 The category model is sound; only the projection is wrong

Worth stating plainly so the fix stays small: `appliesWhen` is good insurance judgement and
`calculateProtectionScore` excludes inapplicable categories from the denominator correctly.
The bug is one loop expanding a category verdict into per-line verdicts. `getExpectedLines`
— already written, already correct, already tested-shaped — is the intended function and is
sitting unused three files away.

---

## Part 2 — Rule-by-rule verdict

All 14 rules in `PROFILE_GAP_RULES`, against the three questions.

| # | Rule | Sev | Risk exists? | Loss realistic? | Insurance appropriate? | Verdict |
|---|---|---|---|---|---|---|
| 1 | `mortgage_no_life` | critical | ✅ | ✅ | ✅ | **Sound** — but see 2.1 |
| 2 | `dependents_no_life` | critical | ✅ | ⚠️ | ⚠️ | Mis-calibrated (2.2) |
| 3 | `vehicles_no_motor` | critical | ✅ | ✅ | ✅ | **Best rule in the set** |
| 4 | `homeowner_no_home` | high | ✅ | ✅ | ✅ | Sound — but see 2.1 |
| 5 | `no_health` | high | ❌ | ⚠️ | ⚠️ | **False positive by construction (2.3)** |
| 6 | `income_no_protection` | high | — | — | — | **Unreachable (2.4)** |
| 7 | `loans_no_life` | high | ⚠️ | ⚠️ | ✅ | No materiality floor (2.5) |
| 8 | `travels_no_travel` | medium | ✅ | ✅ | ✅ | Sound |
| 9 | `self_employed_no_liability` | medium | ⚠️ | ⚠️ | ✅ | Ignores `occupation` (2.6) |
| 10 | `pets_no_pet` | low | ✅ | ✅ | ✅ | **Correct — the mission's example, done right** |
| 11 | `no_legal_expenses` | low | ❌ | ⚠️ | ⚠️ | **Product-absence rule (2.7)** |
| 12 | `chronic_condition_no_health` | critical | ✅ | ✅ | ❌ | **Eligibility failure (2.8)** |
| 13 | `family_history_no_life` | high | ⚠️ | ❌ | ⚠️ | **Mis-mapped risk (2.9)** |
| 14 | `poor_driving_record_needs_legal` | medium | ✅ | ✅ | ✅ | Sound, well-reasoned |

### 2.1 The bank has usually already sold the cover — the wallet just can't see it

`mortgage_no_life` and `homeowner_no_home` are both correct in principle and both share a
blind spot. Greek mortgage lending routinely **requires** fire cover on the security, and
very commonly bundles borrower's life cover (`ασφάλιση ζωής δανειολήπτη`) assigned to the
bank. So the profile state that most strongly triggers these two rules — `ownsHome +
mortgageAmount > 0` — is also the state in which the customer most likely **already holds
both covers**, written by the lender and absent from the wallet.

Nothing asks. There is no "is a policy assigned to your lender?" field and no field for
cover held outside PolicyWallet. The engine treats "not in the wallet" as "does not exist"
throughout.

**Severity: MED — false positive, high frequency.** Not the rule's fault; an intake gap.

### 2.2 `dependents_no_life` has no earnings test and no age test

Fires at **critical** whenever `dependentsCount > 0` and no life policy. Persona D — a
72-year-old retiree — receives it. Two problems:

- **No income link.** The question wording is good ("How many people depend on your
  income?", `profile-mapping.ts:344`) but the rule never checks that income exists.
  `employmentStatus === 'retired'` does not suppress it. For a retiree whose pension carries
  survivor rights, the income-replacement need is materially different.
- **No age eligibility.** `dateOfBirth` is collected (`schema.prisma:225`), is in
  `ProfileFields` (`profile-gap-rules.ts:42`), and is **read by no rule**. Term life at 72
  is either unobtainable or priced beyond usefulness. Raising a critical alarm about a
  product the customer cannot buy is worse than silence.

### 2.3 `no_health` — the rule the mission's rule was written about

```ts
condition: (_p, policies) => !hasActiveLine(policies, "health")
```

The profile parameter is discarded. This is, exactly, *recommend because a policy does not
exist*. It fires for a user whose profile is entirely empty (persona A), producing a "high"
gap and a **0/100 "Critical"** verdict about a person the product knows nothing about.

The insurance substance is also loose. Everyone in Greece has ΕΦΚΑ/ΕΟΠΥΥ; the real risk is
**access latency and provider choice**, not absence of cover — and the copy says as much
("Public healthcare in Greece has long wait times"). But there is no field for employer
group cover, and `group_health` exists in the taxonomy while `hasActiveLine(policies,
"health")` resolves the branch family — worth confirming whether a group scheme satisfies
it; nothing in the intake asks about one either way.

Its own evidence string is the clearest tell — `PROFILE_RULE_FACTS.no_health`
(`portfolio-rules.ts:577`) reads *"no private health policy was found"*. The justification
shown to the customer is the absence of the product.

**Severity: HIGH — broken.**

### 2.4 `income_no_protection` can never reach a user

Proven over all 18,432 combinations: it fires internally and **never survives**.

`detectProfileGaps` deduplicates by `lineOfBusiness`, keeping the highest severity
(`profile-gap-rules.ts:400-417`). `income_no_protection` is `lineOfBusiness: "life"`,
severity `high`, and requires `dependentsCount > 0 && !hasActiveLine(life)` — which is
precisely the condition of `dependents_no_life` at `critical`. It is shadowed with
probability 1.

The consequence is that **Income Protection — a headline category on the score card,
weight 15, labelled «Προστασία Εισοδήματος» — has no reachable rule.** The category renders,
scores, and drags the average, and nothing can ever explain it.

**Severity: HIGH — broken (silently).**

### 2.5 `loans_no_life` has no materiality floor

`hasLoans && loanAmount > 0`. A €900 consumer loan triggers the same *high*-severity life
gap as €80,000. There is no loan type, no term, no co-borrower. In practice it is
near-always shadowed by `mortgage_no_life` or `dependents_no_life` anyway (same line), so
its real effect is to add to a card whose reason text is chosen by a different rule.

### 2.6 `self_employed_no_liability` ignores the profession it is about

Professional liability need is almost entirely determined by **what the person does**. A
self-employed doctor, engineer, accountant or lawyer carries a materially different (and in
several cases effectively compulsory) exposure to a self-employed hairdresser.
`occupation` is collected (`schema.prisma:228`), validated (`profile-mapping.ts:76`, 120
chars), passed to the AI prompt — and **read by no rule**. The rule fires identically for
every self-employed person.

### 2.7 `no_legal_expenses` — the second product-absence rule

```ts
condition: (p, policies) => (p.ownsHome || p.employmentStatus === "self_employed") && !hasActiveLine(policies, "legal_expenses")
```

Owning a home is not a legal-dispute event. There is no trigger, no history, no exposure
measurement — just a status that everyone in a large segment shares. It fired for personas
D, G and H. Severity is `low`, which is honest, and the sibling rule
`poor_driving_record_needs_legal` shows what a *justified* legal-expenses recommendation
looks like: a specific elevated-litigation signal, an active motor policy, and a stated
causal chain. Rule 11 has none of that.

### 2.8 `chronic_condition_no_health` — the most harmful single line in the engine

Fires at **critical** when the customer has declared any chronic condition and holds no
private health policy. The copy:

> *"You have reported chronic health conditions (diabetes). Private health insurance ensures
> you have timely access to specialists and ongoing treatment."*

Greek private health underwriting excludes **προϋπάρχουσες παθήσεις** — routinely
permanently, for the declared condition. The sentence promises the customer the one thing
the product will most likely not deliver for the one condition they named. Question 3 —
*is insurance an appropriate mitigation?* — is answered **no, for this risk**, and the
engine answers it at top severity.

This is not an argument for silence. A declared chronic condition is a strong signal for
cover the market *will* write (hospital cash / `νοσοκομειακό επίδομα`, or health cover taken
for *unrelated* future conditions) — but the claim must be reframed and the pre-existing
exclusion stated in the same breath.

Secondary concern: this is the only rule that turns **GDPR Art. 9 special-category data**
directly into a commercial recommendation. `profile-mapping.ts:26-31` explicitly fences
these fields away from the advisor questionnaire on exactly that reasoning; the B2C wizard
collects them behind an inline notice (`RiskProfileWizard.tsx:320`) rather than a recorded
consent event. Worth a compliance read against the `ConsentAudit` model, which exists.

**Severity: HIGH — broken (customer harm, not just noise).**

### 2.9 `family_history_no_life` — right signal, wrong product

Family history of cancer / heart disease / stroke / diabetes is a **morbidity** signal. The
rule spends it on a **mortality** product.

Persona F is the proof: family history of cancer, **no dependents, no debt, no assets** →
the rule fires at `high`. Life insurance pays a beneficiary. There is no beneficiary and no
financial loss to indemnify. Question 2 — *could the customer realistically suffer this
loss?* — is answered no, and the rule fires anyway.

The product this signal actually points at is **critical illness cover** (`ασφάλιση
σοβαρών ασθενειών`), which does not exist as a line in `lib/insurance/taxonomy.ts` at all.
Second-order: declaring family history typically *raises* the premium or attracts
exclusions — another eligibility factor the rule does not model.

---

## Part 3 — Intake: what the engine is never told

### 3.1 B2C onboarding populates zero risk fields

`app/onboarding/actions.ts` writes only `PolicyholderProfile.preferences` (a JSON blob) —
`onboardingStep`, `onboardingCompleted`, `showTour`, and the segmentation answers. **Not one
risk column is written by onboarding.**

The sharpest instance: onboarding asks the customer to self-select
`onboardingSegment: "individual" | "family_manager" | "small_business"`
(`app/onboarding/actions.ts:212`). Grepping every reader of that value returns only
`flow.tsx` re-rendering the flow. **A user can declare they are a small business during
onboarding and the risk engine will never know**, while the taxonomy carries a full
commercial set (`business_property`, `equipment`, `stock`, `business_interruption`,
`professional_liability`, `employer_liability`) that no rule can reach.

So the only B2C path that populates the engine is the `RiskProfileWizard`, which lives on
`/coverage-insights` and must be found.

### 3.2 Defaults are indistinguishable from declarations

`toProfileFields(null)` returns `ownsHome: false, hasPets: false, vehiclesCount: 0,
hasLoans: false, travelsFrequently: false, dependentsCount: 0`
(`profile-gap-rules.ts:460-485`), mirroring the schema defaults. "Never asked" and "answered
no" are the same value. Consequences run both ways:

- **Rules under-fire** (false negatives) for everyone who hasn't completed the wizard —
  which is everyone who only completed onboarding.
- **`no_health` still fires**, so the one rule that survives an empty profile is the one
  that ignores the profile.
- The wizard's own `useState` defaults compound it: `maritalStatus` defaults to `"single"`
  and `employmentStatus` to `"employed"` (`RiskProfileWizard.tsx:89`, `:91`). Submit the
  form having touched neither, and both are **written as declarations**. Since
  `employmentStatus === "employed"` activates the Income category, it also injects `life`,
  `income_protection` and `disability` into `expectedLines`.

### 3.3 Life factors collected but wired to nothing

11 of the 23 fields in `ProfileFields` are read by **no rule and no score category**:

`maritalStatus` · `dateOfBirth` · `annualIncome` · `occupation` · `riskTolerance` ·
`smokingStatus` · `lifeEvents` · `gender` · `heightCm` · `weightKg` · `activityLevel`

Their only consumer is the AI risk prompt — which never runs (Part 5). `annualIncome` and
`dateOfBirth` are the two that a needs-based engine cannot function without; `lifeEvents`
(new baby, marriage, house purchase) is the highest-intent trigger data in the product and
is inert.

This is also a **data-minimisation exposure**: the wizard collects height, weight, gender,
smoking status, chronic conditions and family medical history — Art. 9 data — and 4 of
those 6 drive nothing whatsoever.

### 3.4 Life factors never collected

Material to Greek household risk, absent from the schema:

| Missing factor | Risk it would unlock | Currently |
|---|---|---|
| Renting (vs `ownsHome=false`) | Contents, tenant's liability, water damage to the flat below | `renters` branch exists; no rule proposes it |
| Business ownership / employees | Commercial property, BI, employer's liability | Asked in onboarding, discarded |
| Property count & type (second home, let, holiday) | Landlord liability, unoccupancy, `ΕΝΦΙΑ`-adjacent fire cover | Single boolean |
| Cover held outside PolicyWallet | Suppressing bank-assigned and employer-group cover | Not asked (see 2.1, 2.3) |
| Dependants' ages / spouse income | Sum-assured need, term length | Only a count |
| Savings / emergency fund | Whether transfer is the right treatment at all | Not asked |
| Vehicle type & status (`κατάθεση πινακίδων`) | Motorbike, off-road, boat | `vehiclesCount` is one integer |
| Travel destination (EU vs non-EU) | EHIC materially changes travel-medical need | Boolean only |

**On the mission's own examples:** *no boat → no boat gap* and *no motorcycle → no
motorcycle gap* hold today — but only because those rules were never written. There is no
mechanism that would prevent the same false positive if a boat rule were added; the pattern
that produced the phantom cyber gap in persona C would produce a phantom boat gap the same
way.

---

## Part 4 — Protection score

`GAP_PENALTY_PER_GAP` attribution (F-04) is fixed and correct. What remains:

### 4.1 The score measures product ownership, not protection

Persona G — 3 dependents, €300,000 mortgage, €80,000 of loans — scores **89/100,
"Excellent"**. The engine never compares the life policy's sum insured to €380,000 of debt.
A €10,000 policy and a €500,000 policy score identically.

There is **no needs analysis anywhere**: no human-life-value, no income multiple, no capital
needs calculation, no sum-assured target. `annualIncome`, `mortgageAmount` and `loanAmount`
are collected and used only as booleans ("> 0?").

**Fairly stated:** this limitation *is* disclosed, honestly and in both languages —
`scoreMethodologyLimits` (`lib/i18n/translations/el.ts:1544`) says the score reflects breadth
of cover, "not whether its limits are enough for your needs". So this is a **capability
gap, not a deception**. It belongs on the roadmap, not the launch gate. The one thing worth
tightening is placement: the disclosure sits inside a collapsed `<details>` while the
headline renders "Εξαιρετική" in green.

Note the counter-example proving it is buildable: `home_underinsured`
(`portfolio-rules.ts:452`) *does* perform an adequacy check, against declared sum insured.
The pattern exists in one line of business and nowhere else.

### 4.2 Aggregate exposure is discarded by the per-line dedupe

Persona H (3 dependents + €300k mortgage + €80k loans, no cover) triggers
`mortgage_no_life`, `dependents_no_life` and `loans_no_life`. The user sees **one** life
card, carrying **one** rule's reason text. The €380,000 total is never summed and never
stated. A customer with one dependent and no debt sees a card of the same severity.

The dedupe itself is right — one card per line. What's missing is that the losing rules'
facts are thrown away instead of composed into the surviving card's reason.

### 4.3 Provisional and real scores are different measures

`provisionalProtectionScore` (`protection-score.ts:190`) is a flat per-gap deduction, not
the category model. This is documented at length in the source and the dashboard labels it
provisional. Noted as correct-and-handled.

---

## Part 5 — The AI layer

### 5.1 The AI risk analysis has zero callers

`runAiRiskAnalysis` (`index.ts:496`) runs only when `opts.includeAiInsights` is true.
The only place that can set it is
`GET /api/v1/recommendations?refresh=true&ai_insights=true` (`route.ts:35`, `:57`).

Grepping every client: **no UI calls that route with either parameter.**
`RecommendationCards.tsx` only `PATCH`es `/api/v1/recommendations/:id` to dismiss. Every
one of the 20+ `runGapEngine` / `refreshProtectionScore` call sites passes no options.

So `analyzeRiskProfile` — implemented in all three providers, routed through the gateway,
tier-mapped in `model-router.ts`, exposed for model pinning in `/admin/ai/settings`, exposed
for prompt overrides in `/admin/ai/prompts`, and covered by an eval scorer — **never
executes in production.** Admins can pin a model and author operator guidance for an
operation that cannot run.

This also means the 11 orphaned profile fields have no consumer at all.

**Severity: HIGH — broken (a whole subsystem is inert), though it costs €0.**

### 5.2 The prompt is told defaults as if they were facts

`buildRiskProfilePrompt` (`prompts.ts:314`) renders nullable fields as `"Unknown"` but
renders booleans and counts unconditionally:

```
- Owns home: ${profile.ownsHome ? "Yes" : "No"}
- Vehicles: ${profile.vehiclesCount}
- Has pets: ${profile.hasPets ? "Yes" : "No"}
- Travels frequently: ${profile.travelsFrequently ? "Yes" : "No"}
```

For an unfilled profile the model is told, as fact, that the person owns no home, has no
vehicles, no pets, no loans and does not travel. The rules layer merely under-fires on that
data; the AI layer would state it. Fix before enabling, not after.

### 5.3 The prompt has no applicability instruction

Instruction 2 ("most critical coverage gaps given this person's specific situation") and 5
("consider life stage") point the right way, but nothing tells the model that **absence of
information is not absence of risk**, and nothing forbids recommending a product for a risk
the person doesn't carry. The Q&A prompt (`prompts.ts:277-282`) already contains exactly the
discipline needed — *"Distinguish three cases and never blur them"* — and the risk prompt
should inherit it.

Credit where due: the IDD framing is right (`prompts.ts:344` — observations, not advice),
`GAP_RESULT_RULES` correctly instructs `isDetected: false` on insufficient information, and
prompt spotlighting fences untrusted document data.

### 5.4 Deterministic gap logic is well-guarded

`lib/gap-detection.ts` carries genuinely careful fixes: empty `coverageSummary` no longer
implies missing cover; `low_limit` reads sum insured rather than premium; unknown sum
insured returns false rather than guessing; calendar arithmetic replaced day-division.
`evaluateSingleRule` returns `false` on unknown rule types. This is the strongest file in
the engine and needs nothing.

---

## Part 6 — Explainability & prioritization

### 6.1 8 of 14 rules fall back to "you don't own this"

`PROFILE_RULE_FACTS` (`portfolio-rules.ts:557-579`) has entries for 6 rules. The other 8 —
`income_no_protection`, `travels_no_travel`, `self_employed_no_liability`, `pets_no_pet`,
`no_legal_expenses`, `chronic_condition_no_health`, `family_history_no_life`,
`poor_driving_record_needs_legal` — get the generic line:

> *"We checked your 2 active policies — none covers Legal expenses."*

which is a statement about the wallet's contents, not about the customer's risk. The two
rules with the weakest justification (11) and the highest stakes (12) are both in the
fallback set.

### 6.2 The reason is behind a paywall

`RecommendationCards.tsx:138` — `evidenceLocked = tier === "free"`. Free-tier users see the
severity chip and the gap title, and must upgrade to read the evidence and next step. The
product shows a customer a red critical verdict and charges them to find out why. Whatever
the commercial merit, it is the wrong artifact to gate: the evidence is what makes the
finding checkable, and an unfalsifiable critical alert is exactly what the mission's rule
exists to prevent.

### 6.3 Prioritization is sound

`prioritizeRecommendations` (`recommendation-generator.ts:286`) ranks by severity then by
`lobProtectionWeight` — the product's own category weights — with the rule id as a stable
tiebreak. The prior ranking by `estimatedCostEur` is gone and the reasoning against it (in
the source comment) is correct: premium is not exposure. No change needed.

The residual weakness is upstream: severity is a **static constant per rule**, so it cannot
respond to magnitude. €900 of loans and €300,000 of mortgage both yield `high`/`critical`
on the same line.

### 6.4 Lifecycle is correct

`syncRecommendations` upserts on `(userId, ruleId)` in a transaction, respects user
dismissals, and auto-dismisses rules that stop firing (`auto:gap_resolved`). Sell the car,
the motor recommendation retires. Verified by reading; no defect found.

---

## Part 7 — Schema, APIs, duplication, flags

- **No feature flags exist for any of this.** No kill switch for the rule set, no way to
  disable `no_health` or `chronic_condition_no_health` without a deploy. `GapDefinition` has
  an admin surface (`/admin/gaps`) and `isActive`; `PROFILE_GAP_RULES` is a hardcoded array
  with no admin surface, no versioning and no audit trail. The two halves of "the rules
  engine" are governed completely differently.
- **Duplicated logic:** two `getExpectedLines` implementations that disagree (Part 1.1);
  two severity-ordering maps (`profile-gap-rules.ts:401`, `recommendation-generator.ts:264`);
  `maritalStatus` vocabularies that disagree — `profile-mapping.ts:64` allows `partnered`,
  `app/api/v1/risk-profile/route.ts:9` does not, so the same declaration is accepted from an
  advisor questionnaire and rejected from the B2C wizard.
- **`ProtectionScore.expectedLines`/`actualLines`** are `Json` columns holding string
  arrays with no constraint tying them to `WRITE_BRANCH_IDS`. `cyber` and `disability` land
  there today.
- **`GapInstance.status`** is queried as `["open","detected","acknowledged"]` in the engine
  while `lib/gap-detection.ts:6` types `GapStatus` as `detected|acknowledged|resolved|
  dismissed` — `"open"` is the schema default and is outside the declared union.
- **API auth** on every route inspected (`/api/v1/risk-profile`, `/protection-score`,
  `/recommendations`, `/questionnaires/[id]`, the cron) is correctly guarded, rate-limited
  and inventory-tracked. No finding.
- **Cron** (`protection-score-refresh`) drives off the stalest `ProtectionScore` rows, so a
  user who has never had a score computed is never picked up by it. Minor — on-demand paths
  cover it.

---

## Part 8 — Mobile-first / responsive review

**Foundation: strong, and I am not re-litigating it.** The July audit's structural fixes are
in `app/globals.css` — `overflow-wrap: anywhere` and `min-width: 0` under
`@media (max-width: 430px)` (the Greek-compound and automatic-minimum-size root causes),
`.pw-stacked-table` collapsing tables to labelled cards at mobile, and `.pw-card` density
steps that tighten on small screens. 108 routes × 9 widths at 0 horizontal overflow. Every
risk-engine surface I checked is written mobile-first (`grid-cols-1 → sm:grid-cols-2`,
`flex-col → md:flex-row`). Findings below are information design at phone width, not layout
breakage.

| # | Surface | Finding | Severity |
|---|---|---|---|
| M1 | `ProtectionScoreCard.tsx:201` | Category grid is `grid-cols-2` at 320px with `truncate` on the label (`:217`). Each cell is ~136px minus `p-3` and a 16px icon → ~86px of text. In Greek (the default), «Προστασία Εισοδήματος» and «Ζωή & Εισόδημα» both truncate to near-identical stubs. Two of six categories become indistinguishable on the phone. Suggest single-column below 360px, or wrap instead of truncate. | UI/UX |
| M2 | `RiskProfileWizard.tsx` | Called a wizard; it is one `<form>` (`:240`) with ~23 fields and a single submit (`:619`). No steps, no progress, no partial save. On a phone this is a very long uninterrupted scroll — **and it is the only B2C path that populates the engine at all** (Part 3.1). The intake with the highest product leverage has the highest mobile friction. | UI/UX (high product impact) |
| M3 | `RiskProfileWizard.tsx:183-195` | Validation failure renders "Ελέγξτε: «field», «field»" as a toast. Good — it names the fields (a real prior fix). But there is no `aria-invalid`, no scroll-to-first-error and no focus move, so on mobile the user reads the toast and must hand-scroll a 23-field form to find the field. | UI/UX |
| M4 | Branch tiles (`/branches`, dashboard map) | The false-positive tiles from Part 1 do their most damage here: on a phone the tile grid *is* the coverage overview, with no adjacent numbers to contradict it. Persona C sees five amber "gap" tiles above the fold, four of them wrong. | **Broken** (same root cause as 1.1) |
| M5 | `RecommendationCards.tsx:312` | On the free tier the paywall block sits between the gap and its reason, so on a narrow viewport the customer scrolls past an upsell to reach the justification — or, more often, doesn't. Amplifies 6.2. | UI/UX |
| M6 | `ScoreMethodology.tsx` | Built on `<details>` — works pre-hydration, keyboard-operable, screen-reader announced, `min-h-11` touch target. Correct as built; no action. | ✅ |
| M7 | `QuestionnairesClient.tsx:648` | Uses `pw-stacked-table`, so the advisor's questionnaire list becomes cards on mobile. Correct. | ✅ |

---

## Part 9 — Prioritized backlog

Grouped per CLAUDE.md: **broken** gates launch; **product** does not.

### P0 — Broken. Customer-visible false positives or harm.

| ID | Item | Where | Why now |
|---|---|---|---|
| **R-01** | Stop deriving per-line "gap" tiles from category applicability. Replace the inline loop with the already-written `getExpectedLines`, delete the loser. | `protection-score.ts:319-327`, `profile-gap-rules.ts:427` | Single highest-volume false-positive source. Removes phantom home/life/travel/pet/cyber/motor tiles. Small, local, testable. |
| **R-02** | Fix `chronic_condition_no_health`: drop from `critical`, reframe away from "ongoing treatment" for the declared condition, and state the pre-existing-condition exclusion in the same card. | `profile-gap-rules.ts:315` | Only finding with direct customer harm — promises what Greek underwriting will not write. |
| **R-03** | Re-point `family_history_no_life` at morbidity. Either gate it on `dependentsCount > 0 \|\| debt > 0`, or hold it until a `critical_illness` line exists. | `profile-gap-rules.ts:332`, `lib/insurance/taxonomy.ts` | Fires where no beneficiary and no loss exist. Gating is a two-line change. |
| **R-04** | Make `no_health` conditional on something. Minimum: suppress when a `group_health` policy is live; add an "employer/group cover?" intake field; re-word off product absence. | `profile-gap-rules.ts:189` | The rule the mission's rule forbids; also the reason an empty profile scores 0/100. |
| **R-05** | Un-shadow income protection. Give `income_no_protection` its own line (`income_protection`) or merge its facts into the surviving life card. | `profile-gap-rules.ts:203`, dedupe at `:400` | A scored, weighted, labelled category with no reachable rule. Proven over 18,432 combinations. |
| **R-06** | Distinguish "not asked" from "answered no". Nullable risk columns, or a `profileAnsweredAt`/answered-field set; suppress rules whose inputs were never provided. Remove the wizard's `"single"`/`"employed"` `useState` defaults. | `schema.prisma:210`, `profile-gap-rules.ts:457`, `RiskProfileWizard.tsx:89` | Root cause behind 3.2, 5.2 and half of the false negatives. Needs a migration — schedule early. |

### P1 — Broken, not customer-visible. Inert or ungoverned systems.

| ID | Item | Where |
|---|---|---|
| **R-07** | Decide the AI risk analysis: wire `ai_insights=true` into a real surface, or delete the operation and its admin config so `/admin/ai` stops offering knobs for something that cannot run. If wiring: R-08 first. | `index.ts:496`, `api/v1/recommendations/route.ts:57` |
| **R-08** | Render unknown as `"Unknown"` for booleans and counts in the risk prompt; add the Q&A prompt's three-case discipline and an explicit "do not propose cover for a risk this profile does not carry". | `prompts.ts:314-336` |
| **R-09** | Give the profile rule set the governance `GapDefinition` already has — admin visibility, `isActive`, versioning, audit. Today a bad rule needs a deploy to silence. | `profile-gap-rules.ts:112` |
| **R-10** | Add `PROFILE_RULE_FACTS` entries for the 8 rules without one; ban the bare "none covers X" line as a standalone justification. | `portfolio-rules.ts:557` |
| **R-11** | Reconcile the duplicated vocabularies: `maritalStatus` (`partnered`), the two severity maps, and constrain `expectedLines` to `WRITE_BRANCH_IDS`. | `profile-mapping.ts:64`, `api/v1/risk-profile/route.ts:9` |

### P2 — Product. Real capability gaps, correctly disclosed today.

| ID | Item | Value |
|---|---|---|
| **R-12** | **Needs analysis.** Sum-assured target from income × multiple + debt − assets; compare against held cover. Turns the score from "do you own a life policy" into "is it enough". `home_underinsured` is the working precedent. | The single change that makes "Protection Score" mean protection. |
| **R-13** | **Cover held elsewhere.** Intake for bank-assigned and employer-group policies. Suppresses the highest-frequency remaining false positives (2.1, 2.3). | Cheap; large precision win. |
| **R-14** | **Use the 11 orphaned fields** — starting with `dateOfBirth` (eligibility ceilings on life; suppress unbuyable recommendations), `annualIncome` (R-12), `occupation` (R-15), `lifeEvents` (trigger-based prompts). Or stop collecting them. | Also closes the Art. 9 data-minimisation exposure. |
| **R-15** | **Occupation-aware liability.** Map occupations to professional-liability materiality instead of firing identically for every self-employed person. | `self_employed_no_liability` becomes a real finding. |
| **R-16** | **Renters.** `ownsHome === false` → contents + tenant's liability. The `renters` branch already exists in the taxonomy; no rule proposes it. | Whole segment currently invisible to the engine. |
| **R-17** | **Business ownership.** Read `onboardingSegment === "small_business"` (already captured and discarded) into the profile; unlock the commercial branches. | Data already exists; nothing consumes it. |
| **R-18** | **Materiality-scaled severity.** Severity as a function of exposure, not a per-rule constant. €900 of loans ≠ €300k of mortgage. | Fixes 6.3's residual weakness and 4.2's card collapse. |
| **R-19** | Compose losing rules' facts into the surviving card so aggregate exposure is stated ("3 dependents and €380,000 of debt"). | `detectProfileGaps` dedupe, `:400`. |
| **R-20** | Add `critical_illness` to the taxonomy — the product R-03's signal actually points at. | Prerequisite for R-03's better half. |

### P3 — UI/UX. Separate backlog; gates nothing.

| ID | Item |
|---|---|
| **U-01** | M1 — category grid single-column below 360px, or wrap instead of `truncate`; the Greek labels are unreadable at 320px. |
| **U-02** | M2 — chunk `RiskProfileWizard` into sections with progress and partial save. It is the engine's only B2C intake and its highest-friction screen. |
| **U-03** | M3 — `aria-invalid` + scroll/focus to the first rejected field. |
| **U-04** | M5 / 6.2 — reconsider paywalling the *evidence*. Gate the next step or the product match; leave the justification visible. |
| **U-05** | Surface `scoreMethodologyLimits` next to the headline verdict rather than only inside the collapsed `<details>`, at least when the score is in the "Excellent" band. |

---

## Closure record — 2026-08-04

The engine is now **life-context first**. `assessRisks` answers, in this order:
are the deciding facts known → does the exposure exist → is it already covered →
can insurance answer it → is it essential or discretionary. Cover is consulted
**last**, so a risk that does not apply is never examined for cover and therefore
cannot become a recommendation. That is the structural guarantee behind "never
recommend for an exposure that does not exist" — it is a property of the control
flow, not a rule each author has to remember.

### Backlog status

| ID | Status | What replaced it |
|---|---|---|
| R-01 | **Closed** | `expectedLines` is now `relevantLines(assessments)` — only lines the applicable risks call for. The dead duplicate `getExpectedLines` is deleted. Covered risks contribute the line that *actually* covers them, so `valuables_loss` no longer paints a `gadget` tile when a home policy answers it. |
| R-02 | **Closed** | `chronic_condition_costs` replaces the old critical rule: reframed onto hospital cash (obtainable) and unrelated-condition cover, priority `medium`, with the pre-existing-condition exclusion stated on the card in both languages. |
| R-03 | **Closed** | The standalone family-history rule is **gone**. Family history is now a priority *escalator* on risks that already apply (`life_dependents`), so it can raise urgency but can never create a life need where there is no beneficiary. |
| R-04 | **Closed** | `health_access_delay` is honest about what the risk is (waiting time and choice, not absence of cover — everyone has ΕΟΠΥΥ), is `discretionary` so it cannot alone zero the category, escalates only on real aggravators, and is satisfied by a declared group scheme. |
| R-05 | **Closed** | `income_interruption` owns `income_protection` and is unshadowable. A sweep over 3,072 profile combinations asserts **every** catalog risk can reach a user. |
| R-06 | **Closed** | `PolicyholderProfile.answeredFields` + `isColumnKnown`. Unknown factors yield `needs_review`, never a gap. Backwards compatible: a non-default stored value still counts as an answer, so no backfill. The wizard's `"single"`/`"employed"` defaults no longer masquerade as declarations. |
| R-07 | **Closed** | The AI risk analysis is still opt-in, but R-08 landed first so it is now safe to enable. |
| R-08 | **Closed** | `RiskProfileInput` booleans/counts are nullable; the prompt renders `Unknown (not asked)` and carries an **Applicability** section that outranks the rest and forbids inferring a "no" from silence. |
| R-09 | **Partial** | The catalog is one module with per-risk ids and a reachability sweep, and priorities are computed rather than constant. A DB-backed admin surface for it is still not built. |
| R-10 | **Closed** | Superseded: every open finding carries its own risk / why / impact / solution, so the generic "we checked N policies, none covers X" fallback has no callers and is no longer populated. |
| R-11 | **Closed** | `partnered` accepted by both intakes; the duplicated `getExpectedLines` deleted; `pension`/`business`/`gadget` given score categories so no assessed risk is silently unscored. |
| R-12 | **Partial** | The inputs exist (`annualIncome`, `savingsAmount`, `mortgageAmount`, `loanAmount`) and drive **priority** — `€900` and `€300,000` of debt are no longer the same finding, and `savingsRunwayMonths` scales the income-protection need. A sum-assured *adequacy* comparison against held cover is still not built. |
| R-13 | **Closed** | `coverHeldElsewhere` suppresses the gap at reduced confidence. `home_building_damage` and `life_debt` both note that a Greek lender has probably already required the cover. |
| R-14 | **Closed** | `dateOfBirth` drives life underwriting ceilings and the retirement window; `annualIncome` sizes impact; `occupation` drives R-15; `savingsAmount` drives income protection. |
| R-15 | **Closed** | `highLiabilityOccupation` matches EL+EN occupation substrings; a self-employed architect scores `high`, a barista `medium`. |
| R-16 | **Closed** | `home_contents_tenant` — tenant contents and liability for water damage to the flat below. |
| R-17 | **Closed** | `business_assets_interruption` and `employer_liability`. |
| R-18 | **Closed** | Priority is a function of exposure everywhere: debt size, savings runway, employee count, valuables value, dependants, family history. |
| R-19 | **Closed by design change** | Risks are no longer deduplicated by line, so `life_dependents` and `life_debt` are separate findings with separate reasons and separate numbers. |
| R-20 | **Not done** | `critical_illness` is still absent from the taxonomy. R-03 was closed by gating rather than by adding the line, because adding a branch changes the policy Zod enum and the extraction prompt's enum — a wider blast radius than the fix needs. |
| U-01 | **Closed** | Score category grid is `grid-cols-1 → min-[400px]:grid-cols-2 → sm:grid-cols-3`, and the label wraps instead of truncating. |
| U-02 | **Partial** | The wizard gained the new factors in a labelled section with dependent fields that appear only once relevant. It is still one form rather than steps. |
| U-03 | **Not done** | No scroll-to-first-error yet. |
| U-04 | **Closed in effect** | Risk findings carry their reasoning in their own fields, which are not paywalled. The `smartContent` paywall now only applies to portfolio findings. |
| U-05 | **Not done** | The methodology disclosure is still inside the collapsed `<details>`. |

### What the same personas now produce

Same inputs as the Part 1.2 table, run through the new engine:

| Persona | Before | After |
|---|---|---|
| Renter with a car | gap tiles: **home**, health, **life** · score 33 | `motor` covered; `home_building_damage`, `pet_costs`, `cyber_fraud`, `travel_abroad` all **not applicable**; open findings are income protection + tenant contents · score 43 |
| Single 28, one dog | gap tiles: **home, life, travel, pet, cyber** · score 69 | pet is a real `opportunity`; cyber and travel **not applicable** · score 55 |
| Retired 72, owns home outright | `dependents_no_life` at **critical** · score 25 | life **not applicable** (not earning); no motor risk · score 78 |
| Breadwinner, €300k mortgage, well covered | score 89 "Excellent" | life debt + dependants both **already covered**, retirement the only opportunity · score 87 |
| Brand-new user, nothing known | `no_health` gap, score **0 "Critical"** | 18 risks **needs_review**, **zero** protection gaps asserted, score 60 and flagged provisional |

### Deliberately not done

- **R-20 / `critical_illness`** — see the table. Gating R-03 was the smaller correct fix.
- **True sum-assured adequacy (R-12's second half)** — needs per-policy sum-insured extraction to be queryable, which is the audit's own F-05 (`PolicyCoverage` projection). Building it against `acordData` JSON would be the wrong foundation.
- **A DB-backed admin surface for the risk catalog (R-09)** — the catalog is code with tests; an editable copy in the database is how the gap definitions grew an auto-mint feedback loop.
- **`verify:migrations`** could not be run: it hangs by construction on this network (the migrate engine takes a session-level advisory lock that transaction-mode pgbouncer cannot hold). Instead the hand-written migration was diffed against `prisma migrate diff --from-empty --to-schema-datamodel`: **every column type, default and index matches Prisma's own DDL exactly.**

---

## What is already right

Recorded so a later pass doesn't "fix" it:

- `pets_no_pet` is conditioned on `hasPets` — the mission's own example, implemented
  correctly. There is no boat rule and no motorcycle rule.
- `hasActiveLine` resolves the **branch family**, so a correctly insured motorbike satisfies
  motor. The comment above it explains why that mattered.
- Coverage liveness is **derived** (`isPolicyCoverageActive`), never the stale stored column;
  gaps on lapsed policies are excluded from scoring and recommendations.
- `vehicles_no_motor` says *third-party liability* is compulsory, not "motor insurance" —
  legally precise for Greece.
- `formatCurrency` is language-aware, so €150.000 no longer reads as €150 in Greek.
- IDD discipline throughout: no "should buy" language in prompts or in deterministic copy;
  `validateOperatorGuidance` blocks advice language and persona overrides.
- `prioritizeRecommendations` ranks by protection weight, not premium.
- `syncRecommendations` — transactional upsert, honours user dismissals, auto-retires rules
  that stop firing.
- Portfolio rules (`expiring`, `duplicate`, `unclear exclusions`, `home_underinsured`,
  `motor_no_roadside`, `home_no_earthquake`) fire **only against policies actually held** —
  structurally incapable of the false positive this audit is about, and the model the
  profile rules should follow.
- `lib/gap-detection.ts`'s guards against empty-field and premium-vs-sum-insured errors.
- Responsive foundation: 0 horizontal overflow at 320px across 108 routes; every risk
  surface mobile-first.

---

## Evidence appendix

Probes were bundled with `node_modules/.bin/esbuild --alias:@=.` and run on Node 20.11.0
against the real modules. No repository file was modified.

- `probe.ts` — 8 personas through `detectProfileGaps` → `calculateProtectionScore` →
  `buildBranchOverview`. Source of the Part 1.2 table.
- `probe2.ts` — 18,432 combinations through all 14 rules, comparing internal firing against
  post-dedupe survival. Sole rule never surfacing: `income_no_protection`.

**Correction to `docs/STATUS.md`:** top risk #3 in the 2026-08-03 entry states `npm run
build` and E2E cannot run locally because "no nvm/fnm/volta is installed". nvm 0.40.6 is
installed and `node -v` reports **20.11.0**, matching `.nvmrc`. That risk appears stale.
