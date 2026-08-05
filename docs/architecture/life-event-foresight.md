# Life Event Foresight — architecture

**Status:** architecture specification · **Date:** 2026-08-04
**Audience:** engineering, actuarial, product, compliance
**Companion documents:**
[life-event-model.md](life-event-model.md) ·
[personal-risk-graph.md](personal-risk-graph.md) ·
[risk-dna.md](risk-dna.md) ·
[personal-life-timeline.md](personal-life-timeline.md)

---

## 1. The distinction that makes "never assume" implementable

The brief's instruction — *never assume, calculate probability from available
data* — contains the whole design problem, because **a probability computed from
age alone is an assumption.** It is a population base rate wearing a personal
pronoun.

"Age 31 → likely marriage" is a true statement about Greek demographics and says
nothing whatsoever about the person reading it. Rendering it as a prediction
about them is the definition of assuming.

So the architecture rests on separating three epistemic objects that a naïve
system blurs into one number:

| Object | Statement | Example |
|---|---|---|
| **Base rate** | about a *population* | "Most people in Greece buy their first home in their thirties" |
| **Personal likelihood** | about *this person*, from *their* signals | "Your savings have risen for six consecutive months while you rent" |
| **Declared intent** | *their own* statement | "I plan to buy within two years" |

> **The engine may compute all three. It may never present a base rate as a
> personal likelihood.**

That single rule is what makes "never assume" enforceable rather than
aspirational, and §4 makes it structural: the tier is carried on the prediction
itself, and the copy layer cannot render a base rate in personal language.

### 1.1 The uncomfortable corollary

Most of the brief's examples are base rates. "Age 29 → likely first home
purchase" has enormous variance and near-zero actionability for an individual.

**The highest-value foresight is not statistical at all.** It is scheduled:

- A policy expiring in 45 days.
- A mortgage maturing in 2031.
- A child turning 18 in fourteen months.
- A customer turning 60 — retirement, the brief's own fourth example, is nearly
  deterministic given a birthdate.

These are not predictions. They are **facts about the future**, already in the
data, and today nothing surfaces them. An architecture that reaches for a
learned model before exhausting the calendar is solving the wrong problem
first — so §3 tiers the work deliberately toward certainty.

---

## 2. What may not be predicted

Before any pipeline: the suppression list. Some events must never be predicted,
however good the signal, because prediction is either unreliable, harmful, or
both.

| Never predicted | Why |
|---|---|
| Death | Mortality tables price policies; they do not address individuals |
| Divorce, separation | *"We think you may divorce"* is unshippable at any confidence |
| Job loss | Reliably predicting it would require data we must not hold |
| Health diagnosis | GDPR Art. 9; also the clearest case of harm from a false positive |
| Bereavement | — |
| Pregnancy | Inference here is notorious, intrusive, and frequently wrong |
| Business failure | — |

These map exactly onto the Life Event Model's `sensitive` and
`special_category` tiers, which is not a coincidence: **an event too sensitive
to notify about is too sensitive to predict.**

A prediction is permitted only for events in the `standard` tier that a customer
plans and controls: home purchase, marriage, a child, retirement, a vehicle, a
business start, relocation, study.

**This list is a hard gate in code, not editorial guidance** — the registry
carries `predictable: false` and the pipeline drops those candidates before any
model runs (§5).

---

## 3. Evidence tiers

Every prediction declares which tier produced it. The tier determines the
language, the confidence ceiling, and whether it may drive an advisor
opportunity at all.

| Tier | Source | Confidence ceiling | Personal language? |
|---|---|---|---|
| **T1 Scheduled** | A date already in the data | ~certain | Yes — it is their fact |
| **T2 Declared** | The customer said so | high | Yes |
| **T3 Precursor** | Observed change in *their* graph | medium | Yes, hedged |
| **T4 Base rate** | Population statistics | **low, capped** | **No** — must be phrased about people, not about them |

### 3.1 T1 — Scheduled

Deterministic, derived from dates already held. No model.

| Prediction | Derived from |
|---|---|
| Policy renewal due | `Policy.endDate` |
| Mortgage matures | `Mortgage.term` |
| Child reaches 18 / leaves education | `childrenCount` + declared ages |
| Retirement eligibility | `dateOfBirth` + `employmentStatus` |
| Vehicle roadworthiness (ΚΤΕΟ) due | vehicle first-registration date |
| Cover lapses under an unoccupancy clause | `occupancyPattern` + policy terms |

**This tier alone would deliver most of the product value**, requires no AI, no
training data and no regulatory exposure, and is fully available today.

### 3.2 T2 — Declared

The customer told us. A foresight engine that never *asks* is doing hard work to
avoid an easy question.

One optional intake question per horizon —
*"Anything you're planning in the next two years?"* with a short chip list — is
worth more than any inference over the data we hold, and it is the only tier that
can reach high confidence about an individual.

### 3.3 T3 — Precursor signals

Observed change in **this person's** graph. Not demographics.

| Signal | Suggests | Caveat |
|---|---|---|
| Savings rising steadily while renting | Deposit accumulation | Could be anything |
| A second earner added to the household | Cohabitation, partnership | |
| Vehicle upgraded to a family car | Household growth | Weak on its own |
| A business node with rising equipment | Hiring | |
| Occupation change to self-employed | Business formation | Often the same event |
| Repeated travel entries to one country | Relocation | Very weak |

Precursors are **conjunctive**: no single one is actionable. The pipeline
requires ≥2 independent precursors before a T3 candidate is emitted, because one
signal is a coincidence and this tier is where over-reach would begin.

### 3.4 T4 — Base rates

Public demographic data — ELSTAT (Hellenic Statistical Authority) publishes mean
age at first marriage, fertility by age band, and homeownership by age.

Permitted, useful for framing, and **structurally prevented from speaking in the
second person.** T4 renders as *"most people in Greece do X around this age"*,
never *"you are likely to do X"*.

---

## 4. Pipeline

```
                      ┌──────────────────────────────────────┐
                      │  Candidate generation                │
                      │  T1 scheduler · T2 declared          │
                      │  T3 precursor · T4 base rate         │
                      └──────────────┬───────────────────────┘
                                     ▼
                      ┌──────────────────────────────────────┐
   registry ─────────▶│  Eligibility gate                    │
   (predictable:      │  drop non-predictable                │
    true/false)       │  drop suppressed-tier events         │
                      │  drop where the event already happened│
                      └──────────────┬───────────────────────┘
                                     ▼
                      ┌──────────────────────────────────────┐
   fairness ─────────▶│  Feature guard                       │
   policy             │  reject protected features (§7)      │
                      └──────────────┬───────────────────────┘
                                     ▼
                      ┌──────────────────────────────────────┐
                      │  Likelihood estimation               │
                      │  T1 deterministic · T2 stated        │
                      │  T3 hazard model · T4 lookup         │
                      └──────────────┬───────────────────────┘
                                     ▼
                      ┌──────────────────────────────────────┐
   calibration ──────▶│  Calibration gate                    │
   store              │  suppress uncalibrated predictors    │
                      └──────────────┬───────────────────────┘
                                     ▼
                      ┌──────────────────────────────────────┐
                      │  Consequence projection              │
                      │  simulate ContextDelta → assessRisks │
                      │  → risks, gaps, DNA delta            │
                      └──────────────┬───────────────────────┘
                                     ▼
                      ┌──────────────────────────────────────┐
                      │  Output assembly + tier-locked copy  │
                      └──────────────────────────────────────┘
```

### 4.1 Consequence projection is the interesting component

The five outputs the brief asks for — new risks, protection gaps, preparation,
advisor opportunities — are **not** things the foresight engine computes. It
would be a second risk engine if they were, and this codebase has already shipped
that mistake three times (two `getExpectedLines`, three "profile completeness"
definitions, a parallel portfolio rule set).

Instead: a predicted event carries a `ContextDelta` (it is the same registry
entry the Life Event Model defines). Projection **applies that delta to a copy of
the LifeContext and re-runs the existing assessment**, unmodified.

```
  ctx        = toLifeContext(profile)
  ctxFuture  = applyDelta(ctx, predictedEvent.contextDelta)

  today      = assessRisks(ctx,       policies)
  projected  = assessRisks(ctxFuture, policies)

  newRisks   = projected \ today          // what becomes applicable
  newGaps    = openFindings(projected) \ openFindings(today)
  dnaDelta   = project(projected) - project(today)
```

Three properties fall out for free, which is the point:

- **One risk catalog.** The future is assessed by the same 21 risks, the same
  applicability gates, the same discretionary cap.
- **The "never recommend for an exposure that does not exist" guarantee holds
  in the future tense.** A projected risk that would not apply cannot become a
  projected gap.
- **Deleting the foresight engine leaves the assessment untouched.** The same
  test applied to every other layer in this architecture.

---

## 5. The registry

Foresight adds fields to the existing `LifeEventDefinition` rather than a new
catalog. One definition of an event, whatever tense it is in.

```yaml
id: buying_property
predictable: true                    # hard gate — false for every suppressed event
horizonMonths: [6, 36]               # the window worth speaking about
precursors:
  - { signal: savings_trend_up, weight: 0.35, requires: [savings, residence] }
  - { signal: renting_and_earning, weight: 0.20 }
  - { signal: partnership_formed, weight: 0.15 }
baseRate:
  source: elstat_homeownership_by_age_2024
  cohortBy: [ageBand]                # NEVER gender — see §7
preparation:
  - check_deposit_vs_lender_requirements
  - understand_lender_mandated_covers
advisorPlay:
  timing: pre_event                  # the only window where advice changes the price
  requiresConsent: true
```

`horizonMonths` matters more than it looks. A prediction outside its useful
horizon is noise: telling a 29-year-old they will retire is true, useless, and
erodes the channel that a genuinely timely prediction depends on.

---

## 6. Probability, calibration, and the cold start

### 6.1 There is no training data

Verified against the schema, not assumed: **`ProtectionScoreHistory` does not
exist**, there is no claims model, no coverage-change history, and the life-event
store is a `Json?` column nothing reads. Production has effectively no outcome
history and sparse traffic.

**You cannot train a personalised model on a dataset you do not have**, and you
cannot honestly emit a calibrated probability you have never measured.

So the phasing is forced, not chosen:

| Phase | Method | Needs |
|---|---|---|
| **1** | T1 scheduled + T2 declared only. No probabilities beyond "scheduled" and "stated". | Nothing new |
| **2** | T4 base rates, labelled as population statistics, never personalised | Public ELSTAT data |
| **3** | T3 precursors as a **hand-specified hazard model** with published weights | Event store (spec 2) |
| **4** | Learned model — *only* once outcome volume supports calibration | ≥1,000 observed outcomes per event type |

Phase 4 is a destination, not a plan. Phases 1–2 are shippable now and deliver
most of the value.

### 6.2 Calibration is a gate, not a report

If the system emits "70% likely", then across all such predictions the event
should occur about 70% of the time. Otherwise the number is decoration, and worse
than no number because it invites reliance.

```
calibration_outcomes
  prediction_id, event_id, tier,
  predicted_probability, horizon_end,
  outcome            -- occurred | did_not_occur | unknowable
  observed_at
```

- **Brier score** and reliability curves per event type and per tier.
- **Suppression rule:** a predictor whose Brier score is worse than the base rate
  it replaced is **automatically disabled**. A predictor that cannot beat "assume
  the population average" has negative value, because it costs trust that the
  base rate does not.
- `unknowable` is a first-class outcome. Most non-events are unobservable — we
  cannot know someone *didn't* consider buying a house — and treating unobserved
  as `did_not_occur` would silently bias every model downward.

### 6.3 Confidence is not probability

Two numbers, deliberately distinct, and conflating them is the most common
failure in systems like this:

- **Probability** — how likely the event is.
- **Confidence** — how much we trust our own estimate.

A T4 base rate can carry probability 0.6 and confidence `low`. A T1 scheduled
renewal carries probability ~1.0 and confidence `high`. **Only confidence gates
behaviour** (§8) — a high-probability, low-confidence prediction may inform, and
may not drive an advisor action.

---

## 7. Fairness — features that are forbidden

**`gender` must never be a predictive feature.** Three independent reasons:

1. **EU law.** The *Test-Achats* ruling (CJEU C-236/09, effective 2012) prohibits
   gender-differentiated pricing in insurance across the EU. A gender-conditioned
   prediction that flows into a recommendation or an advisor opportunity walks
   straight into that.
2. **It is where discrimination would be most obvious.** Predicting "likely first
   child" for a woman at 33 and not a man at 33 is indefensible whatever the
   demographic data says.
3. **The product already stores it and uses it for nothing.** The July audit
   listed `gender` among eleven collected-but-unused fields. Making it a predictor
   would be a regression into a liability the product currently does not carry.

| Forbidden as a feature | Also forbidden as a proxy |
|---|---|
| `gender` | first name, title, occupation-gender skew |
| `chronicConditions`, `familyMedicalHistory` (Art. 9) | pharmacy spend, claim patterns |
| nationality, ethnicity, religion | postcode at fine granularity, surname |
| sexual orientation | household composition inference |

The **feature guard** in the pipeline is a hard component, not a review step: a
model or rule referencing a forbidden feature fails at load, and a CI check
enumerates every feature every predictor reads.

**Postcode deserves specific care.** It is genuinely predictive for property
events and a well-known ethnicity proxy at fine granularity. Permitted at
region level for base rates; forbidden below that.

---

## 8. Output contract

Per predicted event, matching the brief's five requirements.

```
PredictedEvent
  eventId              buying_property
  tier                 T1 | T2 | T3 | T4
  probability          0..1              -- meaningless without ↓
  confidence           high | medium | low
  horizon              { from, to }       -- a window, never a date
  basis                Basis[]            -- every signal, its weight, its value
  suppressedReasons    string[]

  // the five required outputs, all from the EXISTING engine
  projectedRisks       RiskAssessment[]   -- assessRisks(ctxFuture)
  projectedGaps        RiskAssessment[]   -- those that would be open
  dnaDelta             DimensionDelta[]   -- risk-dna.md §5
  preparation          Mitigation[]       -- pre-event actions from the ladder
  advisorPlay          AdvisorPlay | null -- null unless §8.1 is satisfied
```

`basis` is not diagnostics. GDPR Art. 13–15 require meaningful information about
the logic involved; `basis` is that information, and it must be renderable to the
customer, not merely logged.

**`horizon` is a window, never a date.** "Around age 31" is honest; "in March
2027" is a fabrication of precision the model does not have.

### 8.1 When a prediction may reach an advisor

All four:

1. `confidence` is `medium` or better — **never** on a T4 base rate alone.
2. The event is `predictable: true`.
3. The customer has consented to advisor visibility.
4. `advisorPlay.timing = pre_event` — advice that changes the outcome, not a
   prompt to be first in the queue.

**A base-rate prospecting list is explicitly out of scope.** "Customers turning
31 this quarter" is a marketing segment, not foresight, and shipping it under
this engine's name would launder one as the other.

---

## 9. Regulatory posture

Designed to stay *out* of the heaviest classifications by construction rather
than by argument afterwards.

| Regime | Exposure | Design response |
|---|---|---|
| **GDPR Art. 22** — automated decisions with significant effect | Triggered if a prediction affects pricing or eligibility | **Predictions never reach pricing or eligibility.** They surface preparation advice only. This keeps the system out of Art. 22 rather than defending it under an exception |
| **GDPR Art. 9** | Predicting health events | Suppressed entirely (§2) |
| **GDPR Art. 13–15** | Transparency about logic | `basis` is customer-renderable |
| **EU AI Act, Annex III** | Risk assessment and pricing in life/health insurance is **high-risk** | Prediction feeds customer-facing preparation only. Wiring it to pricing would reclassify the system — that is the fork to defend |
| **IDD / Law 4583/2018** | A prediction driving a recommendation is still advice | Consequence projection runs the existing catalog, which already carries the informational-not-advice framing |
| **Test-Achats (C-236/09)** | Gender in insurance | `gender` forbidden as a feature (§7) |

The single most important line: **predictions inform preparation; they never
touch price or eligibility.** Every regulatory answer above depends on that
holding, so it belongs in the feature guard as a hard boundary, not in a policy
document.

---

## 10. Integration

```
Life Event Model ──▶ registry (same definitions, + predictable/horizon/precursors)
Personal Risk Graph ─▶ precursor signals (trends over nodes and edges)
Risk Engine ─────────▶ consequence projection (unmodified, run on a future context)
Risk DNA ────────────▶ projected dimension deltas
Timeline ────────────▶ predictions as forward-dated, provisional entries
```

**Predictions appear on the timeline below the present**, visually distinct, and
are **never** written into the risk graph. A predicted home purchase does not
create a property node — that is the difference between foresight and fabrication,
and it is what stops a wrong prediction quietly poisoning the profile.

When a prediction resolves, the calibration store records the outcome and the
timeline gets a real entry. When it expires unfulfilled, it disappears silently:
**a missed prediction is never surfaced to the customer.** They did not make us a
promise.

---

## 11. Delivery

| Phase | Ships | Depends on |
|---|---|---|
| **1** | T1 scheduled — renewals, mortgage maturity, retirement eligibility, ΚΤΕΟ, child milestones | Nothing. Available today |
| **2** | Consequence projection over T1 | Phase 1 |
| **3** | T2 declared intent — one intake question | Life Event Model |
| **4** | T4 base rates, population-framed | ELSTAT ingestion |
| **5** | Calibration store, from phase 1 onward | Phase 1 |
| **6** | T3 precursors, hand-weighted | Risk graph + event store |
| **7** | Learned model | ≥1,000 outcomes per event type |

**Phase 1 has no AI in it and is the highest-value phase.** That is the honest
shape of this problem: the calendar knows more about the next two years than any
model trained on data we do not have.

---

## 12. Non-goals and open questions

**Non-goals.** Predicting suppressed events (§2). Predictions affecting price or
eligibility. Base-rate prospecting lists. Third-party data enrichment. Precision
dates. Predicting for advisors what a customer has not consented to share.

**Open, and genuinely undecided:**

1. **Does T4 earn its place at all?** A population statistic phrased impersonally
   is honest but weak, and it carries the constant risk of being reworded into a
   personal claim by a well-meaning copy edit. There is a real case for shipping
   only T1–T3.
2. **What is the minimum cohort size for a base rate?** ELSTAT publishes national
   figures; regional cells thin quickly, and a thin cell is where a base rate
   becomes an inference about a small group.
3. **How is `unknowable` bounded?** If most non-events are unobservable,
   calibration rests on a biased sample, and a Brier score computed on it may
   flatter every predictor.
4. **Who owns a wrong prediction?** If a customer prepares for a home purchase
   that does not happen and buys cover accordingly, the product influenced a
   financial decision on a probability. §8.1's `pre_event` requirement mitigates
   this; it does not settle it.
5. **Is retirement a prediction or a fact?** Given a birthdate it is nearly
   deterministic, and it may belong wholly in T1 — which would remove the brief's
   strongest example from the predictive engine entirely, and be the right answer.
