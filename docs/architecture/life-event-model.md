# The Life Event Model

**Status:** specification · **Date:** 2026-08-04
**Audience:** product, actuarial, engineering
**Companion documents:**
[risk-engine-context-awareness-2026-08.md](../audits/risk-engine-context-awareness-2026-08.md) ·
[risk-engine-validation-2026-08-04.md](../audits/risk-engine-validation-2026-08-04.md)

---

## 1. The one rule this model exists to protect

The engine was rebuilt this month around a single guarantee: **a risk that does
not apply is never examined for cover, and therefore can never become a
recommendation.** Applicability is decided before anything else, from the
customer's declared life.

A life-event model is the fastest way to lose that guarantee. "You got married →
buy life insurance" is a product trigger wearing a life-shaped costume. It is
exactly the pattern the July audit found and this year's work removed.

So the architecture rule is:

> **Life events write to context. They never write recommendations.**
>
> An event's only job is to change what we *know* about someone. The risk
> catalog then decides, unchanged, what that knowledge means.

Everything below follows from that. An event definition may not name a product,
may not set a severity, and may not reach the recommendation table. It names a
**context delta** and, at most, a **review window**.

The practical test: deleting the entire event system must leave the engine
producing correct — merely staler and less complete — answers. If removing it
would break a recommendation, the recommendation was coming from the wrong place.

---

## 2. Why events, and what they are actually worth

### 2.1 The engine models a state; life is a sequence of transitions

`LifeContext` is a **snapshot**: 24 factors describing a person now. It is
deliberately good at "what is true today" and structurally silent about three
things a snapshot cannot express:

| A snapshot cannot say | An event can |
|---|---|
| **When** something became true | `occurredAt`, so cover can be dated against exposure |
| That something **stopped** being true | disposal and reversal events, which *retire* risk |
| That now is an unusually good moment to ask | a bounded window of receptivity |

The third is the commercial asset. The first two are the correctness ones — and
the second is not optional: the brief asks every event to declare "existing risks
reduced", and **only a model with disposals can ever reduce anything.** An event
system that handles acquisitions alone can add risk forever and never remove it,
which is a ratchet, not a model of a life.

### 2.2 The behavioural case, and its discipline

Insurance is bought at transitions, not at random. Three well-evidenced effects
explain why, and each carries an obligation:

**Status-quo bias is at its weakest during transition.** Away from a life event,
the default is to do nothing, and no amount of accurate information moves it.
During one, the customer is already re-deciding — the mortgage is being signed,
the keys are changing hands — and the cost of adding one more decision is low.
*Obligation: concentrate the ask inside the window, and accept silence outside it.*

**Salience decays fast.** Attention to a new exposure falls off within weeks of
the event, not months. A correct message sent late is not a late message; it is a
different, worse message. *Obligation: every event carries an explicit window and
a decay, and we would rather miss a window than widen all of them.*

**Alert fatigue is the failure mode that destroys the asset.** The value of a
trigger is entirely reputational: it works because the product has previously
only spoken when it mattered. A model that fires on every detectable change
converts a scarce, trusted channel into noise, permanently. *Obligation: a nudge
budget (§8.3), enforced globally rather than per-event, because no event author
can see the others.*

There is a fourth effect worth naming because it cuts the other way. **Peak
receptivity and peak vulnerability often coincide.** A bereavement, a diagnosis
and a divorce are all moments of unusual openness to being sold to. That is
precisely why §9 exists: some events must lower the volume rather than raise it,
and the model has to be able to express that.

### 2.3 What already exists

`PolicyholderProfile.lifeEvents` is a `Json?` column holding `[{type, date}]`.
The wizard collects six types — `new_baby`, `marriage`, `home_purchase`,
`new_job`, `retirement`, `new_vehicle` — and **nothing reads them.** It is one of
the orphaned fields the audit named: collected, stored, inert.

This model's first delivery is therefore not new collection. It is making an
existing, already-consented signal load-bearing.

---

## 3. Entities

Five, deliberately.

```
LifeEventDefinition   the taxonomy — one row per kind of event that can happen
LifeEventInstance     it happened, to this person, on this date, told to us this way
ContextDelta          what the event asserts about LifeContext  (definition-level)
EventWindow           how long it stays actionable, and how it decays
EventEvidence         how we came to believe it, and how much
```

`LifeEventDefinition` is data, not code — the same discipline as the risk
catalog, and for the same reason: an event whose behaviour lives in a `switch`
statement cannot be reasoned about as a set.

### 3.1 `LifeEventDefinition`

| Field | Type | Notes |
|---|---|---|
| `id` | slug | stable, permanent, snake_case. Never reused, never renamed. |
| `domain` | enum | §4.1 |
| `kind` | enum | §4.2 |
| `label` | `{en, el}` | Greek is the product default |
| `contextDelta` | `ContextDelta[]` | the only channel to the engine |
| `introduces` | `RiskRef[]` | catalog ids that *may* become applicable — never a promise |
| `retires` | `RiskRef[]` | catalog ids that stop applying |
| `categories` | `ScoreCategory[]` | for the customer-facing framing only |
| `customerActions` | `Action[]` | what the person can do; never "buy X" |
| `advisorActions` | `Action[]` | what an advisor should do, under IDD |
| `urgency` | enum | `immediate \| high \| medium \| low \| informational` |
| `window` | `EventWindow` | §8 |
| `dependsOn` | `Dependency[]` | §7 |
| `detection` | `DetectionSpec[]` | §6 — each with its own confidence |
| `sensitivity` | enum | `standard \| sensitive \| special_category` — §9 |
| `reversedBy` | `id[]` | the events that undo this one |
| `supersedes` | `id[]` | e.g. `additional_child` supersedes `first_child` for framing |

### 3.2 `ContextDelta` — the only channel to the engine

```
{ factor: ContextFactorKey,
  operation: "set" | "increment" | "clear" | "mark_known",
  value?: literal,
  confidence: "declared" | "derived" | "inferred" }
```

Four constraints, each load-bearing:

1. **`factor` must be a real `CONTEXT_FACTORS` key.** The engine's vocabulary is
   closed; the event registry may not extend it by writing.
2. **`mark_known` is a first-class operation.** Learning that someone *has* a
   child settles the `children` factor even before we know how many. This is what
   moves a risk out of `needs_review` — the state the engine uses for "we have
   not asked".
3. **An `inferred` delta may never `set` a factor** that decides applicability
   for an `essential` risk. It may only `mark_known` or raise a review. Inference
   is allowed to make us ask; it is not allowed to make us conclude.
4. **A delta is an assertion about the world, not about a product.** `bought a
   car → vehicles += 1`, never `bought a car → needs motor cover`. The second is
   the risk catalog's call, and it already knows how to make it.

### 3.3 `LifeEventInstance`

| Field | Notes |
|---|---|
| `definitionId`, `userId` | |
| `occurredAt` | the event date — may precede discovery by months |
| `discoveredAt` | when *we* learned it; windows run from here, not from `occurredAt` |
| `source` | `customer_declared \| advisor_recorded \| profile_delta \| policy_derived \| document_inferred` |
| `confidence` | `high \| medium \| low` — §6 |
| `status` | `provisional \| confirmed \| applied \| superseded \| retracted` |
| `appliedDeltas` | which deltas were actually written, for reversal and audit |
| `windowClosesAt` | computed; null for `informational` |

**Windows run from `discoveredAt`.** A customer telling us in November about a
March marriage has a window opening in November: their attention is on it now.
Anchoring to `occurredAt` would open a window that has already closed.

**`retracted` must reverse cleanly.** People mistype. `appliedDeltas` exists so
that undoing an event restores the prior context rather than guessing at it —
and so that a corrected event does not leave a fossil in the profile.

---

## 4. The normalized taxonomy

### 4.1 Domains

Eight. A domain is a *sphere of life*, never a product line — the whole point is
that the taxonomy is not shaped like an insurance catalogue.

| Domain | Covers |
|---|---|
| `household` | partnership, children, dependants, bereavement |
| `residence` | where they live, and on what terms |
| `property` | property owned beyond the home they live in |
| `mobility` | vehicles, craft, licences |
| `work` | employment, self-employment, business, retirement |
| `money` | income, assets, debt, inheritance |
| `health` | diagnosis and health status |
| `lifestyle` | travel, pets, activities, study, valuables |

### 4.2 Kinds

Kind is what makes the taxonomy *normalized* rather than a list: it determines
the default shape of an event before its content is written.

| Kind | Meaning | Default urgency | Typically |
|---|---|---|---|
| `acquisition` | a new asset or responsibility | high | introduces |
| `disposal` | it is gone | low | retires |
| `status_change` | a relationship or role changed | medium | both |
| `threshold_crossing` | a quantity crossed a line that changes advice | medium | both |
| `shock` | unplanned, often adverse, usually irreversible | varies | both |
| `horizon` | a foreseeable future event, known in advance | informational | plans |

`horizon` is the one that earns its place commercially. A retirement three years
out, a mortgage maturing, a child approaching university — these are the only
events we can act on *before* the exposure exists, and they are the only ones
where advice can still change the price.

### 4.3 Reference schema (registry row)

```yaml
id: first_child
domain: household
kind: acquisition
label: { en: "First child", el: "Πρώτο παιδί" }
sensitivity: standard
contextDelta:
  - { factor: children,   operation: set,        value: 1, confidence: declared }
  - { factor: dependents, operation: increment,  value: 1, confidence: declared }
introduces: [life_dependents, income_interruption]
retires: []
categories: [life, income]
customerActions:
  - review_beneficiaries
  - review_sum_assured_against_income
  - check_employer_scheme_covers_dependants
advisorActions:
  - schedule_needs_review
  - document_demands_and_needs      # IDD art. 20
urgency: high
window: { opensOn: discoveredAt, days: 120, decay: linear }
dependsOn: []
reversedBy: []
detection:
  - { source: customer_declared, confidence: high }
  - { source: profile_delta, expression: "children 0 → ≥1", confidence: medium }
  - { source: policy_derived, expression: "beneficiary minor added", confidence: low }
```

---

## 5. The event catalog

Notation per event:

- **Δ** — context delta (the only thing written to the engine)
- **Introduces / Retires** — `RISK_CATALOG` ids. `⊕` marks a risk the catalog
  does **not** yet contain (§5.9 collects these).
- **Urgency · window** — see §8
- **Depends on** — §7
- **Confidence** — best achievable per detection source

Every "introduces" is conditional by construction: it means *this risk may now
become applicable*, and the catalog still decides. A marriage does not create a
life-cover need; a person who depends on your income does.

### 5.1 Household

##### `marriage` — Marriage or civil partnership · `status_change`
- **Δ** `maritalStatus → married|partnered`
- **Introduces** `life_dependents` — *only if the spouse depends on this income; the marriage alone does not establish that, and the catalog will not assume it*
- **Retires** — none
- **Categories** Life & Income
- **Customer** review beneficiaries · check whether each partner's cover assumes the other's income · consolidate duplicate cover (two single-person health or contents policies frequently overlap)
- **Advisor** schedule a joint needs review · document demands-and-needs for **both** parties
- **Urgency** medium · window 90d
- **Depends on** — · **Confidence** declared high · profile-delta medium
- *Note:* the most common real finding here is **duplication**, not a gap. Two households becoming one usually holds two of something.

##### `cohabitation_start` — Moving in together · `status_change`
- **Δ** `maritalStatus → partnered` (mark_known)
- **Introduces** `home_contents_tenant` (contents value roughly doubles) · `life_dependents` if financially interdependent
- **Retires** — · **Categories** Property, Life
- **Customer** confirm contents sum insured covers both people's belongings · check the policy names both occupants
- **Advisor** confirm insurable interest before advising on joint cover
- **Urgency** medium · window 90d · **Depends on** — · **Confidence** declared high only
- *Note:* legally weaker than marriage in Greece — cover written for one named occupant may exclude the other's property entirely.

##### `separation` — Separation · `status_change` · **sensitive**
- **Δ** `maritalStatus → single` (provisional) · `dependents` review
- **Introduces** `home_contents_tenant` (one party usually moves to rented)
- **Retires** — nothing yet; separation is not divorce and cover assignments persist
- **Categories** Property, Life · **Customer** none pushed — see §9
- **Advisor** do not act on a provisional separation; wait for confirmation
- **Urgency** informational · **Depends on** `marriage`|`cohabitation_start` · **Confidence** declared medium
- *Note:* deliberately near-inert. Acting early here is both commercially and ethically wrong, and the event exists mainly so a later `divorce` has a dated antecedent.

##### `divorce` — Divorce · `status_change` · **sensitive**
- **Δ** `maritalStatus → divorced` · `dependents` recount · `residence` review · `propertyOwnership` review
- **Introduces** `home_contents_tenant` · `life_dependents` *(maintenance obligations are a dependency even when the marriage is not)*
- **Retires** `life_dependents` **only** where the sole dependant was the former spouse and no maintenance is owed
- **Categories** Life, Property · **Customer** update beneficiaries — the single most-missed action after divorce · re-assess whose income the household now relies on
- **Advisor** re-run the needs review from scratch rather than amending; treat the prior profile as stale
- **Urgency** high · window 180d · **Depends on** `marriage` · **Confidence** declared high
- *Note:* the beneficiary point is the highest-value single action in this entire catalog. Policies routinely pay a former spouse years after a divorce because nobody changed the nomination.

##### `first_child` — First child · `acquisition`
- **Δ** `children → 1` · `dependents += 1`
- **Introduces** `life_dependents` · `income_interruption`
- **Retires** — · **Categories** Life, Income
- **Customer** review sum assured against years of income the household would need · check whether an employer scheme actually covers dependants
- **Advisor** needs review within the window; document demands and needs
- **Urgency** high · window 120d · **Depends on** — · **Confidence** declared high · profile-delta medium
- *Note:* peak receptivity in the whole model. Also peak *inertia* afterwards — cover bought here is rarely revisited, so sizing it correctly matters more than usual.

##### `additional_child` — Additional child · `acquisition`
- **Δ** `children += 1` · `dependents += 1`
- **Introduces** — (already applicable) · **Retires** —
- **Categories** Life, Income · **Customer** re-check sum assured against the new household size
- **Advisor** adequacy review, not a new-cover conversation
- **Urgency** medium · window 90d · **Depends on** `first_child` · **Confidence** declared high
- *Note:* this is an **adequacy** event, not a coverage event. Treating it as a fresh sale is how a product-led model would read it, and would be wrong.

##### `child_leaves_home` — Child becomes independent · `disposal`
- **Δ** `dependents -= 1` · `children` unchanged *(they are still your child)*
- **Introduces** ⊕`student_away` where the departure is for study (§5.9)
- **Retires** `life_dependents` when the last dependant goes and no debt remains
- **Categories** Life, Income · **Customer** consider reducing cover you no longer need
- **Advisor** proactively recommend a **reduction** where warranted
- **Urgency** low · window 365d · **Depends on** `first_child` · **Confidence** declared high · derived low
- *Note:* the model's credibility test. A system that only ever adds is a sales funnel. Advising someone to spend less is the cheapest trust the product can buy, and this is where it is available.

##### `death_of_spouse` — Death of a partner · `shock` · **sensitive**
- **Δ** `maritalStatus → widowed` · `dependents` recount · `income` review
- **Introduces** ⊕`bereavement_income` (§5.9) · `income_interruption` on the survivor
- **Retires** `life_dependents` *for the deceased* — cover on that life is now a claim, not a gap
- **Categories** Life, Income
- **Customer** **claims support first.** No product suggestion inside the grief window.
- **Advisor** claims assistance; a needs review only after the window closes, and only if invited
- **Urgency** immediate **for claims**, suppressed for everything else · window 365d
- **Depends on** `marriage`|`cohabitation_start` · **Confidence** declared high only — never inferred
- *Note:* the strongest suppression in the model (§9). A product recommendation surfaced here would be the single most damaging thing this platform could do.

##### `becoming_carer` — Taking on care of a relative · `status_change`
- **Δ** `dependents += 1` (mark_known)
- **Introduces** `life_dependents` · `income_interruption` *(caring reduces earning capacity)*
- **Retires** — · **Categories** Life, Income
- **Customer** record the dependant so cover reflects them
- **Advisor** ask; this is almost never volunteered
- **Urgency** medium · window 120d · **Depends on** — · **Confidence** declared high only
- *Note:* the most under-declared event in the set. Greek households absorb elder care informally and rarely think of it as an insurable dependency.

### 5.2 Residence

##### `renting_start` — Started renting · `status_change`
- **Δ** `residence → rented` · `tenancy → rented`
- **Introduces** `home_contents_tenant`
- **Retires** `home_building_damage` — the building is someone else's risk
- **Categories** Property · **Customer** contents plus tenant's liability — water damage to the flat below is the claim tenants in Greek apartment blocks actually meet
- **Advisor** confirm the landlord's policy does not extend to the tenant's property (it does not)
- **Urgency** medium · window 60d · **Depends on** — · **Confidence** declared high · policy-derived high
- *Note:* the `tenancy` factor exists precisely because "not an owner" ≠ "tenant". Only this event settles it.

##### `buying_property` — Bought the home they live in · `acquisition`
- **Δ** `residence → owned` · `propertyOwnership → ≥1`
- **Introduces** `home_building_damage` · `home_legal_disputes` (if it is a second property)
- **Retires** `home_contents_tenant`
- **Categories** Property · **Customer** insure to **rebuild** cost, not market value · confirm earthquake is included — in Greece it is usually a separate cover, and Greece is among the most seismically active countries in Europe
- **Advisor** check the lender's required policy and what it actually covers
- **Urgency** high · window 45d · **Depends on** — · **Confidence** declared high · policy-derived high
- *Note:* insuring a home against fire, earthquake and flood also earns an **ΕΝΦΙΑ** discount — a rare case where the tax code and good advice point the same way.

##### `moving_home` — Moved · `status_change`
- **Δ** `residence` re-assert · address change
- **Introduces** ⊕`goods_in_transit` (§5.9)
- **Retires** — · **Categories** Property
- **Customer** tell the insurer **before** moving — cover follows the address on the schedule, not the person
- **Advisor** re-rate; postcode, construction and floor level all move the premium
- **Urgency** high · window 30d · **Depends on** — · **Confidence** declared high
- *Note:* the shortest window in the model. A move announced afterwards is a gap that already happened.

##### `mortgage_taken` — Mortgage drawn down · `acquisition`
- **Δ** `mortgage → amount` · `loans` mark_known
- **Introduces** `life_debt` · `home_building_damage`
- **Retires** — · **Categories** Life, Property
- **Customer** **check what the bank already arranged before buying anything.** Greek lenders normally require fire cover on the security and commonly bundle assigned borrower's life cover.
- **Advisor** obtain the assigned policy; advise on the shortfall, not the whole need
- **Urgency** high · window 45d · **Depends on** `buying_property` · **Confidence** declared high · document-inferred medium
- *Note:* the state that most strongly triggers a life gap is also the state in which cover most often already exists. This is what `coverHeldElsewhere` was built for.

##### `mortgage_cleared` — Mortgage repaid · `disposal`
- **Δ** `mortgage → 0`
- **Introduces** — · **Retires** `life_debt` (when no other debt remains)
- **Categories** Life · **Customer** the assigned life policy may now be surplus — or may be worth keeping if replacing it would cost more at your age
- **Advisor** recommend release of assignment; advise on **keeping versus cancelling** honestly
- **Urgency** low · window 180d · **Depends on** `mortgage_taken` · **Confidence** derived high
- *Note:* cancelling is often the wrong advice for an older borrower, because the same cover cannot be re-bought at the original rate. Say so.

##### `investment_property` / `letting_start` — Property let to tenants · `acquisition`
- **Δ** `propertiesOwned += 1` · `rentsOutProperty → true`
- **Introduces** `landlord_letting` · `home_legal_disputes`
- **Retires** — · **Categories** Property, Liability
- **Customer** an owner-occupier policy usually does **not** cover a let property · loss of rent is a separate cover
- **Advisor** property-owner's liability; check the indemnity period against realistic re-letting time
- **Urgency** high · window 45d · **Depends on** `buying_property` · **Confidence** declared high
- *Note:* the highest-severity under-insurance in the residential book. Most landlords believe their existing home policy travels with them.

##### `holiday_home` — Second or holiday home · `acquisition`
- **Δ** `propertiesOwned += 1`
- **Introduces** `home_building_damage` (second exposure) · `home_legal_disputes`
- **Retires** — · **Categories** Property
- **Customer** **one policy does not cover two houses** · check the unoccupancy clause on each property separately
- **Advisor** most Greek home policies restrict or void cover after 30–60 consecutive unoccupied days — the normal state of a holiday home
- **Urgency** high · window 45d · **Depends on** `buying_property` · **Confidence** declared high
- *Note:* this is why the engine has `minPolicies`. Holding *a* home policy is not holding *enough*.

##### `home_renovation` — Significant works · `threshold_crossing`
- **Δ** none *(no factor changes; this is a temporary condition)*
- **Introduces** ⊕`renovation_works` (§5.9)
- **Retires** — · **Categories** Property, Liability
- **Customer** tell the insurer — works above a threshold commonly suspend cover · confirm the contractor carries liability
- **Advisor** check whether the sum insured still reflects rebuild cost afterwards
- **Urgency** high · window 30d · **Depends on** `buying_property`|`residence=owned` · **Confidence** declared high
- *Note:* one of the few events with **no context delta at all**. It changes a policy's validity without changing the life. The model must be able to express that.

##### `selling_property` — Sold · `disposal`
- **Δ** `propertiesOwned -= 1` · possible `rentsOutProperty → false`
- **Introduces** — · **Retires** `home_building_damage` · `landlord_letting` · `home_legal_disputes` (as applicable)
- **Categories** Property · **Customer** cancel cover from completion, not from listing
- **Advisor** confirm no assignment remains before cancelling
- **Urgency** medium · window 60d · **Depends on** `buying_property` · **Confidence** declared high

### 5.3 Mobility

##### `vehicle_purchase` — Bought a vehicle · `acquisition`
- **Δ** `vehicles += 1`
- **Introduces** `motor_liability`
- **Retires** — · **Categories** Property & Motor
- **Customer** third-party liability is **compulsory** for any vehicle in circulation in Greece — the cover must exist before the vehicle moves
- **Advisor** confirm cover is in force from the transfer date
- **Urgency** immediate · window 14d · **Depends on** — · **Confidence** declared high · policy-derived high
- *Note:* the only `immediate` non-claims event, because the exposure is legal as well as financial.

##### `motorcycle_purchase` — Bought a motorcycle · `acquisition`
- **Δ** `vehicles += 1`
- **Introduces** `motor_liability` · `activity_injury` *(rider injury severity is categorically different)*
- **Retires** — · **Categories** Property & Motor, Lifestyle
- **Customer** as above · consider personal accident separately — motor liability protects others, not the rider
- **Advisor** the taxonomy treats motorbike as a child of motor, so a motorbike policy satisfies the motor risk; the *injury* exposure is what is unaddressed
- **Urgency** immediate · window 14d · **Depends on** — · **Confidence** declared high
- *Note:* distinct from `vehicle_purchase` only because of the rider-injury profile. That difference is the entire reason it is its own event.

##### `boat_purchase` — Bought a boat · `acquisition`
- **Δ** `ownsBoat → true`
- **Introduces** `boat_liability`
- **Retires** — · **Categories** Property & Motor
- **Customer** third-party liability is compulsory for recreational craft, and the harbour authority can refuse to release a vessel without it · salvage and wreck removal are frequently the largest costs and are commonly excluded unless specifically insured
- **Advisor** compulsory limits depend on length and engine power; cover is normally suspended outside the stated navigation area and laying-up period
- **Urgency** high · window 30d · **Depends on** — · **Confidence** declared high
- *Note:* added to the engine on 2026-08-04 after validation found boat ownership entirely invisible.

##### `vehicle_disposal` — Sold or scrapped · `disposal`
- **Δ** `vehicles -= 1`
- **Introduces** — · **Retires** `motor_liability` (at zero) · `motor_legal_disputes`
- **Categories** Property & Motor · **Customer** cancel or transfer; if plates are deposited (**κατάθεση πινακίδων**) cover is not required while off the road
- **Advisor** check for a refundable unexpired premium
- **Urgency** low · window 60d · **Depends on** `vehicle_purchase` · **Confidence** declared high

##### `licence_gained` — First driving licence · `threshold_crossing`
- **Δ** none · **Introduces** — · **Retires** —
- **Categories** Property & Motor
- **Customer** being added to a household policy is usually cheaper than a standalone one, and the disclosure is obligatory either way
- **Advisor** non-disclosure of a new young driver is a common avoidance ground
- **Urgency** medium · window 60d · **Depends on** `age ≥ 18` · **Confidence** declared medium
- *Note:* affects **price and validity**, not applicability — which is exactly why it has no context delta.

### 5.4 Work

##### `job_change` — Changed employer · `status_change`
- **Δ** `employmentStatus` re-assert · `income` review
- **Introduces** — · **Retires** —
- **Categories** Income, Health
- **Customer** group cover rarely transfers · check whether the new employer's scheme covers dependants
- **Advisor** ask what the old scheme provided before replacing it
- **Urgency** medium · window 60d · **Depends on** — · **Confidence** declared high
- *Note:* the classic silent gap — leaving a job quietly cancels health and life cover the person had stopped noticing.

##### `job_loss` — Lost employment · `shock` · **sensitive**
- **Δ** `employmentStatus → unemployed` · `income → 0` (provisional)
- **Introduces** — · **Retires** `income_interruption` *(no income to interrupt)*
- **Categories** Income · **Customer** cover that lapses now may be expensive to re-buy later — check before cancelling
- **Advisor** **retention and affordability advice, not new business**
- **Urgency** medium · window 90d · **Depends on** — · **Confidence** declared high only
- *Note:* the model must be capable of advising someone to hold rather than buy. If it cannot, it is not an advice model.

##### `self_employment_start` — Became self-employed · `status_change`
- **Δ** `employmentStatus → self_employed` · `selfEmployed` mark_known
- **Introduces** `income_interruption` (escalated) · `professional_liability`
- **Retires** — · **Categories** Income, Liability
- **Customer** ΕΦΚΑ sickness cover for the self-employed begins after a waiting period and replaces a fraction of a working income · no employer sick pay behind you
- **Advisor** professional indemnity sized to contract values; the occupation decides how material it is
- **Urgency** high · window 90d · **Depends on** — · **Confidence** declared high

##### `starting_business` — Started a business · `acquisition`
- **Δ** `ownsBusiness → true`
- **Introduces** `business_assets_interruption` · `professional_liability`
- **Retires** — · **Categories** Liability
- **Customer** the lost trading period is usually a larger loss than the damage itself, and it is a separate cover
- **Advisor** set the indemnity period against realistic reopening time, not a default 12 months
- **Urgency** high · window 90d · **Depends on** — · **Confidence** declared high
- *Note:* onboarding already asks this (`onboardingSegment: small_business`) and discards it. Wiring that answer is free signal.

##### `hiring_employees` — First hire / headcount change · `threshold_crossing`
- **Δ** `businessEmployees → n`
- **Introduces** `employer_liability`
- **Retires** — · **Categories** Liability
- **Customer** an employee's claim for the part ΕΦΚΑ does not meet is personal to you as employer
- **Advisor** employer's liability alongside general business liability; re-rate on headcount
- **Urgency** high · window 45d · **Depends on** `starting_business`|`self_employment_start` · **Confidence** declared high
- *Note:* fires on **every** headcount change, not just the first — it is a threshold event, and the limit should track the payroll.

##### `business_closure` — Business ceased · `disposal`
- **Δ** `ownsBusiness → false` · `businessEmployees → 0`
- **Introduces** ⊕`professional_runoff` (§5.9)
- **Retires** `business_assets_interruption` · `employer_liability`
- **Categories** Liability · **Customer** claims can arrive years after you stop trading
- **Advisor** run-off cover before cancelling — the single most-missed action at closure
- **Urgency** medium · window 90d · **Depends on** `starting_business` · **Confidence** declared high

##### `retirement` — Retired · `status_change`
- **Δ** `employmentStatus → retired` · `income` re-assert · `retirementPlanning` mark_known
- **Introduces** `health_access_delay` (escalated with age)
- **Retires** `income_interruption` · `professional_liability` *(subject to run-off)* · `life_dependents` where it rested on earnings
- **Categories** Income, Health · **Customer** cover priced on a working income may now be the wrong size
- **Advisor** a **reduction** review; and be straight that new life cover is largely unavailable at this point
- **Urgency** medium · window 180d · **Depends on** — · **Confidence** declared high
- *Note:* most Greek insurers stop writing new life cover around 70, and premiums rise steeply well before. The honest conversation at retirement is about what to keep, not what to add.

##### `retirement_approaching` — Retirement within 3 years · `horizon`
- **Δ** none · **Introduces** `retirement_shortfall` (escalated)
- **Retires** — · **Categories** Income
- **Customer** the last window in which contributions still compound meaningfully
- **Advisor** projection against the state replacement rate
- **Urgency** informational · window 1095d · **Depends on** `age ≥ 57` · **Confidence** derived high
- *Note:* the clearest `horizon` case — everything useful must happen *before* the status change.

### 5.5 Money

##### `major_salary_increase` — Income step change · `threshold_crossing`
- **Δ** `income → amount`
- **Introduces** — · **Retires** —
- **Categories** Income, Life · **Customer** cover sized to your old income now replaces less of your life
- **Advisor** adequacy review; also the moment protection becomes affordable
- **Urgency** medium · window 120d · **Depends on** — · **Confidence** declared high · derived medium
- *Note:* purely an **adequacy** event. It changes no applicability at all, and a product-shaped model would have nothing to say about it — which is why it belongs here.

##### `inheritance` — Received an inheritance · `shock` · **sensitive**
- **Δ** `savings += amount` · possibly `propertiesOwned += 1`
- **Introduces** `home_building_damage` (inherited property) · `valuables_loss` · ⊕`estate_liquidity` (§5.9)
- **Retires** `income_interruption` where savings now cover a long absence — a real reduction, and worth saying
- **Categories** Property, Income · **Customer** an inherited property is often unoccupied and uninsured from the day of death
- **Advisor** in Greece, accepting an estate without benefit of inventory (**αποδοχή με το ευεργέτημα της απογραφής**) can transfer the deceased's debts — a legal question, not an insurance one; refer it
- **Urgency** medium · window 180d · **Depends on** — · **Confidence** declared high only
- *Note:* frequently co-occurs with `death_of_spouse` or a parent's death. Sensitivity inherits from the co-occurring event, not from the money.

##### `high_value_purchase` — Acquired a valuable item · `acquisition`
- **Δ** `valuablesValue += amount`
- **Introduces** `valuables_loss`
- **Retires** — · **Categories** Lifestyle
- **Customer** contents policies cap individual items at a low single-article limit and often exclude them away from the home
- **Advisor** specified-items cover; a valuation may be required
- **Urgency** medium · window 60d · **Depends on** — · **Confidence** declared high

### 5.6 Health

##### `health_diagnosis` — Diagnosis of an ongoing condition · `shock` · **special category**
- **Δ** `health` mark_known · `chronicConditions += id` — **explicit consent required**
- **Introduces** `chronic_condition_costs`
- **Retires** — · **Categories** Health
- **Customer** hospital cash pays a fixed daily amount regardless of cause and is usually obtainable where full medical cover is not
- **Advisor** **state the exclusion first.** Greek health insurers routinely exclude pre-existing conditions, often permanently — a new policy is unlikely to cover the condition just declared
- **Urgency** low · window 180d · **Depends on** — · **Confidence** declared high only — **never inferred**
- *Note:* GDPR Art. 9 throughout. The advisor questionnaire deliberately cannot write this field; only the consented B2C surface can. Detection from documents is forbidden outright, not merely low-confidence.

### 5.7 Lifestyle

##### `pet_adoption` — Adopted a pet · `acquisition`
- **Δ** `hasPets → true`
- **Introduces** `pet_costs`
- **Retires** — · **Categories** Lifestyle
- **Customer** emergency veterinary treatment is paid out of pocket, and a Greek owner is liable for injury their animal causes
- **Advisor** registration and liability cover are required by law for certain breeds
- **Urgency** low · window 90d · **Depends on** — · **Confidence** declared high
- *Note:* the model's canonical low-urgency case. It is a real risk and a small one, and the product should sound like it.

##### `pet_loss` — Pet died or rehomed · `disposal` · **sensitive**
- **Δ** `hasPets → false` (when none remain)
- **Introduces** — · **Retires** `pet_costs`
- **Categories** Lifestyle · **Customer** none pushed
- **Advisor** cancel quietly; do not use it as a contact opportunity
- **Urgency** low · window 30d · **Depends on** `pet_adoption` · **Confidence** declared high

##### `frequent_travel_start` — Travel became frequent · `threshold_crossing`
- **Δ** `travelFrequency → true`
- **Introduces** `travel_abroad`
- **Retires** — · **Categories** Lifestyle
- **Customer** inside the EU the **ΕΚΑΑ/EHIC** card covers state treatment; outside it you pay in full, and repatriation is covered by neither
- **Advisor** annual multi-trip is usually cheaper than three single trips
- **Urgency** medium · window 60d · **Depends on** — · **Confidence** declared medium
- *Note:* destination matters more than frequency. The model records frequency because that is what we can ask; the advice must qualify on EU versus non-EU.

##### `hazardous_activity_start` — Took up a high-risk activity · `acquisition`
- **Δ** `hobbies += id`
- **Introduces** `activity_injury`
- **Retires** — · **Categories** Lifestyle
- **Customer** life, health and income policies commonly exclude injury during hazardous pursuits, in the general terms
- **Advisor** check the exclusion in policies already held — an extension is usually cheaper than a standalone policy
- **Urgency** medium · window 90d · **Depends on** — · **Confidence** declared high
- *Note:* this event's value is mostly **defensive**: it protects existing cover from being void, rather than selling new cover.

##### `university_studies` — Entered higher education · `status_change`
- **Δ** `dependents` re-assert (still dependent) · possible `residence → rented`
- **Introduces** ⊕`student_away` (§5.9) · `home_contents_tenant` if living out
- **Retires** — · **Categories** Property, Health
- **Customer** the family home policy may cover a student's belongings away from home — check before buying separately
- **Advisor** for study abroad, confirm ΕΚΑΑ scope and whether the institution mandates cover
- **Urgency** medium · window 90d · **Depends on** `first_child` (parent's view) · **Confidence** declared high
- *Note:* dual-perspective — the same event sits on the parent's profile and the student's. §7.3.

##### `international_relocation` — Moved abroad · `status_change`
- **Δ** `residence` re-assert · country change · most factors → **re-verify**
- **Introduces** ⊕`expat_cover_gap` (§5.9)
- **Retires** — nothing automatically; territorial limits must be read, not assumed
- **Categories** all · **Customer** most Greek policies are territorially limited; ΕΦΚΑ entitlement and ΕΚΑΑ scope both change on relocation
- **Advisor** **do not amend — re-underwrite.** Treat the entire portfolio as out of scope until confirmed
- **Urgency** high · window 60d · **Depends on** — · **Confidence** declared high
- *Note:* the only event that invalidates the *whole* context rather than part of it. Everything the engine believes should drop to `needs_review`, because a Greek-market catalog no longer applies.

##### `cyber_exposure_increase` — Digital financial footprint grew · `threshold_crossing`
- **Δ** `cyberExposure → moderate|high`
- **Introduces** `cyber_fraud`
- **Retires** — · **Categories** Lifestyle
- **Customer** authorised push-payment fraud — where you are tricked into making the transfer yourself — is generally not refunded, unlike card fraud
- **Advisor** low priority; a genuine but survivable loss
- **Urgency** low · window 90d · **Depends on** — · **Confidence** declared medium
- *Note:* the hardest event to detect honestly, and the one most tempting to infer. It stays declaration-only for exactly that reason.

### 5.8 Coverage of the brief

All 27 named events are covered. Fifteen further events were added, and the
reason is structural rather than completionist: **without disposals and
reversals, "existing risks reduced" is unimplementable.** `renting`,
`mortgage`, `buying property`, `investment property` and `holiday home` are
modelled as distinct residence/property events because they carry different
risks; `birth` maps to `first_child`/`additional_child`.

| Brief | Event id |
|---|---|
| Birth | `first_child` / `additional_child` |
| Marriage | `marriage` |
| Divorce | `divorce` |
| Moving home | `moving_home` |
| Buying property | `buying_property` |
| Renting | `renting_start` |
| Mortgage | `mortgage_taken` |
| First / additional child | `first_child` / `additional_child` |
| Child leaves home | `child_leaves_home` |
| Pet adoption | `pet_adoption` |
| Vehicle / motorcycle / boat purchase | `vehicle_purchase` / `motorcycle_purchase` / `boat_purchase` |
| Starting a business | `starting_business` |
| Hiring employees | `hiring_employees` |
| Retirement | `retirement` (+ `retirement_approaching`) |
| Major salary increase | `major_salary_increase` |
| International relocation | `international_relocation` |
| Frequent travel | `frequent_travel_start` |
| High-value purchases | `high_value_purchase` |
| Health diagnosis | `health_diagnosis` |
| Inheritance | `inheritance` |
| Death of spouse | `death_of_spouse` |
| Investment property | `investment_property` |
| Holiday home | `holiday_home` |
| University studies | `university_studies` |

**Added:** `cohabitation_start`, `separation`, `becoming_carer`, `job_change`,
`job_loss`, `self_employment_start`, `business_closure`, `retirement_approaching`,
`mortgage_cleared`, `selling_property`, `home_renovation`, `vehicle_disposal`,
`licence_gained`, `pet_loss`, `hazardous_activity_start`,
`cyber_exposure_increase`.

### 5.9 Risks the catalog does not yet contain

Eight events introduce exposures with no home in `RISK_CATALOG`. Flagged rather
than assumed — each needs underwriting review before it is written.

| ⊕ Risk | Introduced by | Line | Note |
|---|---|---|---|
| `goods_in_transit` | `moving_home` | `home` extension | Usually an extension, possibly not a standalone risk |
| `renovation_works` | `home_renovation` | `home` / `liability` | Temporary condition; may belong as a policy state, not a risk |
| `professional_runoff` | `business_closure` | `liability` | Claims-made run-off; genuinely distinct |
| `estate_liquidity` | `inheritance` | `life` | Partly a legal matter — check IDD scope before advising |
| `bereavement_income` | `death_of_spouse` | `life` | May be a claims-support flow rather than a risk |
| `student_away` | `university_studies` | `renters` / `travel` | Possibly satisfiable by the family policy |
| `expat_cover_gap` | `international_relocation` | all | Likely a portfolio-wide re-verification, not one risk |
| `critical_illness` | `health_diagnosis`, family history | *(absent from taxonomy)* | Carried over from the July audit, R-20 |

---

## 6. Detection and confidence

### 6.1 Sources

| Source | Confidence ceiling | Notes |
|---|---|---|
| `customer_declared` | **high** | The wizard's `lifeEvents` field. Already collected; already consented. |
| `advisor_recorded` | **high** | Only where the client is the source; an advisor's inference is not a declaration |
| `profile_delta` | **medium** | `vehiclesCount 0 → 1` implies `vehicle_purchase`; it does not prove it |
| `policy_derived` | **medium** | A new motor policy implies a vehicle. Reliable, but it is a *product* signal, so it can only ever confirm a life event, never originate advice |
| `document_inferred` | **low** | Extraction found a beneficiary change. Enough to ask; never enough to conclude |
| `third_party` | — | Out of scope. No registry, credit or social feeds. |

### 6.2 What confidence controls

Confidence is not decoration; it gates behaviour:

| Confidence | May write a delta? | May open a window? | May notify? |
|---|---|---|---|
| high | yes | yes | yes |
| medium | `mark_known` only | yes | yes, phrased as a question |
| low | no | no | only inside an existing conversation |

Two rules carry the weight:

1. **A medium- or low-confidence event may never set a factor that decides
   applicability for an `essential` risk.** Inference makes us ask; it never makes
   us conclude. This is the same discipline as the engine's `needs_review`, and
   for the same reason: a confident wrong answer about someone's life is worse
   than an admitted gap.
2. **Event-detection confidence and risk-assessment confidence are separate
   numbers.** A high-confidence marriage can still yield a low-confidence life
   assessment because income is unknown. Collapsing them would let a well-detected
   event masquerade as a well-understood need.

### 6.3 Derived events must be reconcilable

Every `profile_delta` event must be confirmable or dismissible by the customer in
one tap. An unconfirmed derived event stays `provisional`: it may open a window
and prompt a question, and it may not change the profile. Without this, the
profile silently accumulates guesses and the whole knownness model — the thing
that separates "we never asked" from "no" — degrades back to what the audit found.

---

## 7. Dependencies

### 7.1 Kinds

| Kind | Meaning | Example |
|---|---|---|
| `requires_event` | a prior event must exist | `additional_child` requires `first_child` |
| `requires_factor` | a context precondition | `retirement_approaching` requires `age ≥ 57` |
| `conflicts_with` | cannot both be current | `renting_start` conflicts with `buying_property` |
| `reverses` | undoes a prior event | `vehicle_disposal` reverses `vehicle_purchase` |
| `co_occurs` | commonly arrives together; treat as one window | `buying_property` + `mortgage_taken` |

The graph must be **acyclic** on `requires_event`. `reverses` and `conflicts_with`
deliberately are not — that is how a life goes back and forth.

### 7.2 Backfill

A dependency arriving late must not be discarded. Someone declaring
`additional_child` with no `first_child` on record has one; the missing
antecedent is our gap, not theirs. Synthesise the prerequisite at
`confidence: derived`, with no window — it is a fact we should already have had,
not news.

### 7.3 Two-sided events

`university_studies`, `death_of_spouse`, `divorce` and `becoming_carer` exist on
more than one person's profile. Where both are customers, each gets its own
instance with its own window and its own sensitivity — a bereavement is not the
same event for a widow and for an adult child, and must not be treated as one.

### 7.4 Co-occurrence collapses windows

`buying_property`, `mortgage_taken` and `moving_home` normally arrive within
weeks. Three windows means three notification streams about one afternoon at a
notary. Co-occurring events **share a single window**, and the nudge budget is
charged once.

---

## 8. Urgency, windows and the nudge budget

### 8.1 Urgency

Urgency is a property of the **exposure**, not of the sales opportunity.

| Level | Meaning | Default window |
|---|---|---|
| `immediate` | Uninsured now, and legally or catastrophically so | 14d |
| `high` | A material uninsured exposure exists today | 30–90d |
| `medium` | Real, survivable, or an adequacy question | 60–120d |
| `low` | Worth knowing; no urgency implied | 90–365d |
| `informational` | Nothing to do yet; a horizon marker | up to 1095d |

`immediate` is reserved for `vehicle_purchase`, `motorcycle_purchase` and
bereavement **claims** support. If a fourth candidate appears, the bar has slipped.

### 8.2 Decay

`linear` (steady fade), `cliff` (fully actionable then closed — legal deadlines),
`none` (horizon events). A closed window is not a closed risk: the risk persists
in the assessment and simply stops being *newsworthy*.

### 8.3 The nudge budget

Enforced globally, not per event:

- at most **2** event-driven notifications per rolling 30 days
- at most **1** per window
- `immediate` may pre-empt; nothing else may
- suppression rules (§9) override everything, including `immediate`
- co-occurring events are charged once

A model without this ceiling degrades into exactly the thing that makes people
mute a product. No individual event author can see the aggregate, so the budget
cannot live in the event definitions.

---

## 9. Sensitive events

Three tiers. This section is a product requirement, not a courtesy.

| Tier | Events | Rule |
|---|---|---|
| `standard` | most | normal behaviour |
| `sensitive` | `separation`, `divorce`, `job_loss`, `pet_loss`, `inheritance` | no upsell in-window; factual and reduction advice only; softened tone; no push notifications |
| `special_category` | `health_diagnosis`, `death_of_spouse` | GDPR Art. 9 or bereavement. **All commercial messaging suppressed.** Claims and service only. Never inferred, only declared. Excluded from advisor prospecting lists. |

Two specifics worth stating plainly:

- **`death_of_spouse` suppresses everything commercial for the full window.** The
  only permitted contact is claims support. A protection recommendation surfaced
  to someone in the first weeks of bereavement is the single most damaging thing
  this platform could do, and no conversion rate justifies it.
- **`health_diagnosis` may never be inferred** — not from a document, not from a
  policy, not from a claim. Declaration only, on the consented surface, with the
  pre-existing-condition exclusion stated before any product is discussed.

---

## 10. Extensibility

The design goal is that **adding an event is a data change**. The contract that
makes that true:

### 10.1 Adding an event

1. Add a registry row (§4.3).
2. Every `contextDelta.factor` is an existing `CONTEXT_FACTORS` key.
3. Every `introduces`/`retires` id is an existing `RISK_CATALOG` id, or is
   explicitly listed as ⊕ pending.
4. Declare `dependsOn` and `reversedBy`.
5. Declare `sensitivity` — no default; an author must decide.
6. Declare `detection` per source with its own confidence.

No engine change. No new UI. No new notification code.

### 10.2 Invariants a CI check should enforce

Written as assertions because the risk-engine work showed that a design rule
without a test is a comment:

1. Every `contextDelta.factor` ∈ `CONTEXT_FACTORS`.
2. Every `introduces`/`retires` ∈ `RISK_CATALOG` ∪ the ⊕ pending list.
3. `requires_event` graph is acyclic.
4. Every `acquisition` with a `reversedBy` has that event defined, and its deltas
   are the inverse.
5. No definition references a product, insurer or price.
6. No `low`-confidence detection writes a `set` delta.
7. Every event has a `sensitivity` and a `window`.
8. At most three events carry `urgency: immediate`.
9. Every `retires` is reachable — some event or context change can trigger it.
10. Labels are bilingual and non-identical (the Greek-copy-leak check that already
    guards the risk catalog).

### 10.3 What must never enter the registry

A product name · a premium · a severity that bypasses the risk catalog · a
notification template · an insurer. Each is a route back to product-first
thinking, and the registry is exactly where that would be easiest to hide.

---

## 11. Data model sketch

Shape only — no migration is proposed here.

```
life_event_definitions      registry; seeded, admin-readable, versioned like gap_definitions
  id, domain, kind, label_json, sensitivity, urgency,
  window_json, context_delta_json, introduces[], retires[],
  depends_on_json, detection_json, version, is_active

life_event_instances
  id, user_id, definition_id,
  occurred_at, discovered_at, window_closes_at,
  source, confidence, status,
  applied_deltas_json,          -- for clean reversal
  correlation_id,               -- co-occurring events share one window
  created_at, updated_at
  INDEX (user_id, status), (user_id, window_closes_at), (definition_id)

life_event_notifications      -- enforces the nudge budget
  user_id, instance_id, sent_at, channel, suppressed_reason
```

Three notes carried from the existing engine:

- **`PolicyholderProfile.lifeEvents` is the migration path, not a competitor.**
  Its six declared types map onto `first_child`, `marriage`, `buying_property`,
  `job_change`, `retirement`, `vehicle_purchase`. Backfill as
  `source: customer_declared`, `status: confirmed`, windows already closed — they
  are history, not news.
- **`answeredFields` is how a delta becomes knowledge.** Writing a factor without
  recording that it was answered leaves the risk in `needs_review` and the event
  achieves nothing. Every applied delta must also mark its columns answered.
- **Instances are personal data** and must join the Art. 15 export and the erasure
  path from day one. The audit found the last two personal-data stores added
  without DSR wiring; this one should not repeat it.

---

## 12. How this composes with the engine

```
  Life event  ──▶  ContextDelta  ──▶  LifeContext  ──▶  assessRisks()  ──▶  recommendations
  (transition)     (assertion)        (state)           (unchanged)          (unchanged)
                                          │
                                          └──▶  EventWindow  ──▶  timing + framing only
```

The left half is new. The right half is untouched — and must stay that way. The
event system's only privileges are:

1. writing context deltas, subject to §3.2 and §6.2;
2. opening a window that affects **when and how** a finding is surfaced, never
   **whether** it exists;
3. supplying framing copy — *"because you told us you moved in March"*.

It has no privilege to create, rank or suppress a recommendation. Those remain
the risk catalog's, which is what keeps the guarantee in §1 true.

---

## 13. Non-goals and open questions

**Non-goals.** Predicting events before they are declared. Third-party data
feeds. Event-based pricing. Automatic policy changes — the model informs, the
customer decides. Replacing the risk catalog.

**Open, and genuinely undecided:**

1. **Should `retirement_approaching` be inferred from age alone?** It is the most
   valuable horizon event and the most presumptuous. Age is a fact; intent is not.
2. **Do policy-derived events belong at all?** A new motor policy implies a
   vehicle purchase — but building life inference on product data is precisely the
   direction of travel this document argues against. Currently allowed as
   *confirmation only*; worth revisiting.
3. **Who owns a two-sided event's window** when both parties are customers and
   their interests diverge (`divorce`)?
4. **How long does a life event stay part of someone's record?** Windows close in
   months; the retention question is separate and needs a decision alongside the
   GDPR erasure path.
5. **Is `international_relocation` an event or an exit?** If a Greek-market
   catalog no longer applies, the honest answer may be to stop assessing rather
   than to assess badly.
