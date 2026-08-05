# The Personal Risk Graph

**Status:** specification · **Date:** 2026-08-04
**Audience:** product, actuarial, engineering
**Companion documents:**
[life-event-model.md](life-event-model.md) ·
[risk-engine-context-awareness-2026-08.md](../audits/risk-engine-context-awareness-2026-08.md) ·
[risk-engine-validation-2026-08-04.md](../audits/risk-engine-validation-2026-08-04.md)

---

## 1. Why a graph, argued from things that actually broke

The engine models a person as **24 flat scalars** (`LifeContext`). That model was
a large improvement on what came before it, and its ceiling is now visible in
specific, dated ways.

`propertiesOwned: 2` records that someone owns two properties. It cannot record
**which** one carries the mortgage, **which** is let, **which** stands empty for
nine months a year, or **which** the home policy is actually written against.

Three consequences, all real:

| Symptom | Where it showed up | Root cause |
|---|---|---|
| `minPolicies` — a **count** of policies compared against a **count** of properties | Added 2026-08-04 after validation found a holiday-home owner reported `already_covered` on the strength of one policy for two houses | No identity to attach a policy *to* |
| Coverage scope unreadable — sum insured, perils and territory buried in `acordData` JSON | Audit finding F-05; `evaluateSingleRule` reaches through four fallback paths for one number | Coverage has no structure to attach *to* |
| Portfolio rules are a parallel engine — `duplicate_coverage`, `home_underinsured`, `home_no_earthquake` sit outside the risk catalog | `portfolio-rules.ts`, 7 rules | They are graph questions ("two policies, one object") forced into a flat world |

`minPolicies` is the tell. It is arithmetic standing in for a relationship, and
it only works while the counts are small and the objects are interchangeable.
They are not: a €400,000 apartment in Athens and a €90,000 village house are not
two of the same thing, and one policy naming one of them says nothing about the
other.

**The graph is not a richer profile. It is the identity layer that lets a policy
point at a thing.**

### 1.1 What the flat model cannot express at all

Not "expresses badly" — cannot represent:

- **Third-party property you are liable for.** A leased car, a company car, a
  rented flat's fixtures, a friend's boat you skipper. You own nothing and carry
  real liability. `vehiclesCount` has no way to say this.
- **Shared exposure with split liability.** One household car, three drivers, one
  of them a new licence holder. The property risk is the household's; the
  liability and the rating are the driver's.
- **Accumulation.** The boat moored at the holiday home in a seismic zone: one
  earthquake, three claims, one aggregate loss. A flat model sees three unrelated
  numbers.
- **Chains.** Mortgage → secures → property → houses → household → depends on →
  income. That chain is why a life-cover shortfall becomes a housing loss, and it
  is the single most useful sentence an advisor can say. It cannot be derived
  from scalars.

---

## 2. The three rules this design is built to protect

The engine's guarantee — *a risk that does not apply is never examined for cover,
and therefore can never become a recommendation* — survives three months of
audit and validation. A graph is the easiest place to lose it, because a graph
invites you to store convenient answers as data.

**Rule 1 — The graph models the world, never the product.**
Nodes are things that exist in someone's life. No node type may be an insurance
concept. `Policy` exists only as a satellite that *points into* the graph; it is
never a node the risk derivation reads from.

**Rule 2 — Risk is derived, never authored.**
`RiskInstance` is materialised by rules over node-and-edge patterns. Nobody types
a risk in. This is what stops the graph becoming a wishlist, and it preserves the
catalog as the single place applicability is decided.

**Rule 3 — Coverage state is computed, never set.**
Uninsured / Partially / Fully / Unknown are not an enum somebody maintains. They
fall out of comparing a policy's real scope against a risk's dimensions (§7).
An enum would drift the moment a policy renewed, and would be wrong silently.

The test, as before: deleting the graph must leave the engine producing correct —
coarser — answers. If removing it would *change* a verdict rather than blur it,
the verdict was coming from the wrong place.

---

## 3. Entities

### 3.1 The node type hierarchy

Inheritance is real here, not decorative: **risk rules attach at a level and are
inherited downward**, so a new subtype gets its parent's risks for free and adds
only what is genuinely different.

```
Node
├── Party
│   ├── Person                 the subject, and every other named human
│   │   └── Dependent          a Person in a dependency relationship (role, not a separate thing)
│   ├── Household              a co-residing economic unit
│   ├── Organisation
│   │   ├── Employer           someone else's business that pays this Person
│   │   └── Business           a business this Person owns
│   └── Animal
│       └── Pet
├── Asset
│   ├── RealProperty
│   │   ├── Residence          where a Person lives
│   │   ├── InvestmentProperty let to tenants
│   │   └── HolidayHome        owned, intermittently occupied
│   ├── Vehicle
│   │   ├── Car
│   │   ├── Motorcycle
│   │   ├── Commercial         van, truck, plant
│   │   └── Bicycle
│   ├── Vessel                 boat, jet-ski
│   ├── Valuable               jewellery, art, instrument, watch
│   ├── Equipment              business plant, tools, stock
│   └── DigitalAsset           accounts, wallets, identity
├── Obligation
│   ├── Mortgage               secured on RealProperty
│   ├── Loan                   unsecured
│   ├── Lease                  tenancy or vehicle lease
│   └── Guarantee              debt guaranteed for another
├── Flow
│   ├── Income                 employment, self-employment, rental, pension
│   ├── Savings                liquid reserve
│   └── Expense                recurring commitment
├── Condition                  a state, not a thing
│   ├── HealthCondition        special category (GDPR Art. 9)
│   ├── Occupation
│   └── Activity               sport, hobby
└── Exposure                   a pattern of behaviour
    ├── Travel
    └── CyberExposure
```

Six abstract roots — `Party`, `Asset`, `Obligation`, `Flow`, `Condition`,
`Exposure` — chosen because they behave differently, not because they read
tidily:

| Root | Distinguishing behaviour |
|---|---|
| `Party` | can bear liability and can be a beneficiary |
| `Asset` | has a value that can be lost, and an owner who is not always the subject |
| `Obligation` | survives the subject's death — the reason `life_debt` exists |
| `Flow` | is a rate, not a stock; interruptible rather than destructible |
| `Condition` | modifies other nodes' risks; generates few of its own |
| `Exposure` | has no location and no value; frequency is its only dimension |

`Dependent` is deliberately **not** a node type. It is a `Person` with a
`DEPENDS_ON` edge. Modelling it as a type would make a child who becomes
independent a different object, and would lose their identity across the
transition — precisely what `child_leaves_home` needs to preserve.

### 3.2 Common node attributes

| Field | Notes |
|---|---|
| `id`, `type` | type is a leaf of the hierarchy |
| `ownerId` | the subject whose graph this is |
| `label` | user-facing; never required |
| `attributes` | type-specific, schema-validated per type |
| `confidence` | `declared \| derived \| inferred` — §9 |
| `source` | how it entered the graph |
| `status` | §10 |
| `validFrom` / `validTo` | bitemporal — §10.4 |
| `locationId` | optional edge to a place; the basis of accumulation (§8.4) |
| `sensitivity` | `standard \| sensitive \| special_category` |

### 3.3 Type-specific attributes, where they carry weight

Only the ones that change a risk. Everything else is decoration.

- **`RealProperty`** — `rebuildCost` (not market value — the sum insured that
  matters), `constructionType`, `seismicZone`, `occupancyPattern`
  (`owner_occupied | let | intermittent | vacant`), `floor`.
  *`occupancyPattern` is the attribute that makes a holiday home a distinct risk
  rather than a second house: most Greek wordings restrict cover after 30–60
  consecutive unoccupied days.*
- **`Vehicle`** — `useType` (`private | commuting | business | hire`),
  `inCirculation` (false when plates are deposited — **κατάθεση πινακίδων**),
  `ownership` (`owned | leased | company | other`).
- **`Vessel`** — `lengthM`, `enginePowerHp` (these set the compulsory liability
  limits), `navigationArea`, `layUpPeriod`, `mooringLocationId`.
- **`Mortgage`** — `outstanding`, `securedOnNodeId`, `assignedPolicyRequired`,
  `lenderRequiredCovers[]`. *The last two are how the graph knows a Greek lender
  has probably already arranged fire and borrower's life cover.*
- **`Income`** — `kind`, `annualAmount`, `dependantCount`, `replaceable`
  (a pension with survivor rights is not the same exposure as a salary).
- **`HealthCondition`** — `conditionId`, `diagnosedAt`, `consentId`. **Never
  inferred.** Presence requires an explicit consent record.

---

## 4. Relationships

Edges are typed, directional and attributed. The attributes are where most of the
useful information lives — `OWNS` with `share: 0.5` is a different risk from
`OWNS` outright.

### 4.1 Edge catalog

| Edge | From → To | Key attributes | Why it matters |
|---|---|---|---|
| `MEMBER_OF` | Person → Household | `role`, `since` | scopes shared assets |
| `DEPENDS_ON` | Person → Person\|Income | `kind` (`financial \| care`), `untilAge` | the *only* source of a life-cover need |
| `OWNS` | Party → Asset | `share`, `since` | partial ownership is partial exposure |
| `USES` | Person → Asset | `frequency`, `primary` | liability follows the user, not the owner |
| `CUSTODIAN_OF` | Person → Asset | `basis` (`lease \| loan \| employer`) | **liability without ownership** |
| `HOUSES` | RealProperty → Asset\|Household | | contents-in-property; accumulation |
| `SECURED_ON` | Mortgage → RealProperty | `lenderRequiredCovers[]` | lender-mandated cover |
| `OWES` | Party → Obligation | `share`, `jointAndSeveral` | joint debt survives differently |
| `GUARANTEES` | Person → Obligation | | someone else's debt, your exposure |
| `EARNS` | Person → Income | | |
| `EMPLOYED_BY` | Person → Employer | `groupSchemes[]` | cover held outside the wallet |
| `EMPLOYS` | Business → Person | `count` | employer's liability |
| `OPERATES` | Person → Business | `role` | |
| `LOCATED_AT` | Asset → Location | | accumulation (§8.4) |
| `HAS_CONDITION` | Person → Condition | `since` | special category |
| `ENGAGES_IN` | Person → Activity\|Travel | `frequency`, `region` | policy-exclusion triggers |
| `SUCCEEDS` | Node → Node | `reason` | replacement preserves history |

### 4.2 Two edges that pay for the whole design

**`CUSTODIAN_OF`** — the flat model has no way to say "I am responsible for
something I do not own." A leased car, a company laptop, a rented flat's
fixtures, a boat borrowed for the weekend. These carry real, frequently
uninsured liability, and today they are invisible because the only question we
ask is *how many vehicles do you own*.

**`USES` versus `OWNS`** — one household car driven by three people. The damage
risk belongs to the household; the liability and the rating belong to whoever is
driving. A new licence holder in the household changes the premium and, if
undisclosed, the validity — without changing ownership at all. Flat counts
cannot express this and so cannot warn about it.

### 4.3 Edge constraints

1. Edges are typed at both ends; `OWNS: Person → Mortgage` is rejected (a
   mortgage is owed, not owned).
2. `SECURED_ON` requires the target to be `RealProperty`.
3. `DEPENDS_ON` may not be reflexive, and cycles are rejected — mutual dependency
   is modelled as two `DEPENDS_ON` edges into a shared `Income`, which is what it
   actually is.
4. Deleting a node soft-deletes its edges; edges are never orphaned, because a
   claim may need the shape of the graph as it stood last year (§10.4).

---

## 5. Risk derivation

### 5.1 Risks are patterns, not properties

A `RiskDefinition` is a **graph pattern plus a predicate**. It matches subgraphs;
each match materialises one `RiskInstance` bound to the specific nodes that
matched.

```yaml
id: home_building_damage
matches:
  pattern: (p:RealProperty)<-[:OWNS]-(s:Person {subject: true})
  where:   p.status = 'active'
anchors: [p]                      # identity: one instance PER PROPERTY
introduces:
  perils: [fire, earthquake, flood, theft]
  measure: p.rebuildCost
categories: [property]
lines: [home]
```

`anchors` is the load-bearing field. It is what `minPolicies` was simulating:
two properties produce **two instances**, each independently coverable, and a
policy naming one of them tells us nothing about the other. The workaround
disappears because the question it approximated can now be asked directly.

### 5.2 Instance identity and cardinality

| Cardinality | Meaning | Example |
|---|---|---|
| `per_node` | one instance per matched node | building damage, per property |
| `per_subject` | one for the person regardless of count | retirement shortfall |
| `per_pair` | one per relationship | employer's liability per business |
| `aggregate` | one instance over a *set*, sized by the whole set | life cover against total debt |

`aggregate` is what stops the graph double-counting. Three loans do not create
three life-cover needs; they create one need sized at their sum. The current
engine gets this right by accident because it holds one scalar; the graph must
get it right on purpose.

### 5.3 Every node type produces risk

As the brief requires. `⊕` marks a risk the catalog does not yet contain.

| Node | Risks | Cardinality |
|---|---|---|
| `Person` (subject) | `health_access_delay`, `income_interruption` | per_subject |
| `Person` (dependent) | `life_dependents` | aggregate |
| `Household` | ⊕`household_liability` (third-party injury at home) | per_node |
| `Pet` | `pet_costs` (vet + owner's liability) | per_node |
| `Car` / `Commercial` | `motor_liability`, `motor_legal_disputes` | per_node |
| `Motorcycle` | `motor_liability`, `activity_injury` | per_node |
| `Bicycle` | `valuables_loss`, ⊕`cyclist_liability` | per_node |
| `Residence` (owned) | `home_building_damage`, ⊕`household_liability` | per_node |
| `Residence` (rented) | `home_contents_tenant` | per_node |
| `InvestmentProperty` | `landlord_letting`, `home_legal_disputes` | per_node |
| `HolidayHome` | `home_building_damage` + ⊕`unoccupancy_exclusion` | per_node |
| `Vessel` | `boat_liability` | per_node |
| `Valuable` | `valuables_loss` | per_node (specified) |
| `Equipment` | `business_assets_interruption` | per_pair (business) |
| `DigitalAsset` | `cyber_fraud` | per_subject |
| `Mortgage` | `life_debt`, plus lender-mandated `home_building_damage` | aggregate / per_pair |
| `Loan` | `life_debt` | aggregate |
| `Guarantee` | ⊕`guarantor_liability` | per_node |
| `Lease` | ⊕`lease_residual` (early-termination / GAP) | per_node |
| `Employer` | *reduces* risk — group schemes are cover, not exposure | — |
| `Business` | `business_assets_interruption`, `professional_liability` | per_node |
| `Business` + `EMPLOYS` | `employer_liability` | per_pair |
| `Income` | `income_interruption`, `retirement_shortfall` | per_node |
| `Savings` | *reduces* risk — modulates income-interruption severity | — |
| `HealthCondition` | `chronic_condition_costs` | per_node |
| `Occupation` | modifies `professional_liability` priority | modifier |
| `Activity` | `activity_injury` | aggregate |
| `Travel` | `travel_abroad` | per_subject |
| `CyberExposure` | `cyber_fraud` | per_subject |

**`Employer` and `Savings` are the interesting rows.** Both *reduce* exposure —
a group scheme is cover held outside the wallet, and savings are self-insurance
that genuinely lowers the severity of an income interruption. A graph that only
adds risk is a sales funnel with extra steps; these two nodes are how it stays
honest.

---

## 6. Insurance category map

Every risk, mapped to score category and line of business. Score category weights
are the product's existing statement of what matters (health 25, life 25,
property 20, income 15, liability 10, lifestyle 5).

| Risk | Node pattern | Score category | Lines |
|---|---|---|---|
| `life_dependents` | Person ←DEPENDS_ON— Person, + Income | life, income | `life`, `income_protection`, `personal_accident` |
| `life_debt` | Person —OWES→ Obligation | life | `life`, `personal_accident` |
| `income_interruption` | Person —EARNS→ Income | life, income | `income_protection`, `disability`, `personal_accident` |
| `retirement_shortfall` | Person + Income, age window | income | `pension` |
| `motor_liability` | Person —OWNS\|USES→ Vehicle | property | `motor`, `motorbike`, `truck` |
| `motor_legal_disputes` | Vehicle + claims history | liability | `legal_expenses` |
| `home_building_damage` | Person —OWNS→ RealProperty | property | `home` |
| `home_contents_tenant` | Person —MEMBER_OF→ Household —HOUSES← rented Residence | property | `renters`, `home`, `liability` |
| `landlord_letting` | Person —OWNS→ InvestmentProperty | property | `home`, `liability` |
| `home_legal_disputes` | ≥2 RealProperty, or let property | liability | `legal_expenses` |
| `boat_liability` | Person —OWNS→ Vessel | property | `boat` |
| `valuables_loss` | Person —OWNS→ Valuable | lifestyle | `gadget`, `home`, `renters` |
| `health_access_delay` | Person (subject) | health | `health`, `group_health` |
| `chronic_condition_costs` | Person —HAS_CONDITION→ HealthCondition | health | `health`, `personal_accident` |
| `professional_liability` | Person —OPERATES→ Business, + Occupation | liability | `liability`, `professional_liability`, `business` |
| `employer_liability` | Business —EMPLOYS→ Person | liability | `liability`, `employer_liability`, `business` |
| `business_assets_interruption` | Business —OWNS→ Equipment\|RealProperty | liability | `business`, `business_property`, `business_interruption` |
| `travel_abroad` | Person —ENGAGES_IN→ Travel | lifestyle | `travel` |
| `activity_injury` | Person —ENGAGES_IN→ Activity | lifestyle | `personal_accident` |
| `pet_costs` | Person —OWNS→ Pet | lifestyle | `pet`, `liability` |
| `cyber_fraud` | Person —OWNS→ DigitalAsset | lifestyle | `cyber` |
| ⊕`household_liability` | Household —HOUSES← Residence | liability | `liability`, `home` |
| ⊕`unoccupancy_exclusion` | RealProperty, `occupancyPattern=intermittent` | property | `home` |
| ⊕`guarantor_liability` | Person —GUARANTEES→ Obligation | life, liability | `life`, `legal_expenses` |
| ⊕`lease_residual` | Person —CUSTODIAN_OF→ Vehicle (leased) | property | `motor` |
| ⊕`cyclist_liability` | Person —OWNS→ Bicycle | liability | `liability`, `bicycle` |
| ⊕`third_party_custody` | Person —CUSTODIAN_OF→ Asset | liability | `liability` |

Seven `⊕` risks are enabled purely by having a graph. Each needs underwriting
review before it is written — flagged, not assumed.

---

## 7. Coverage: why "partially insured" is computed

### 7.1 Coverage is an edge, and it is not boolean

```
(Policy) --[:COVERS {perils, limit, deductible, territory, period, namedInsureds}]--> (RiskInstance)
```

`Policy` is a satellite. It attaches to the graph and is read *only* by the
coverage evaluator — never by risk derivation. That separation is Rule 1: what a
person owns must not be inferred from what they bought.

### 7.2 The four dimensions

A risk is only fully insured when a policy satisfies **all four**:

| Dimension | Question | Typical failure |
|---|---|---|
| **Peril** | Are the loss causes covered? | Fire yes, **earthquake no** — in Greece, usually a separate cover |
| **Limit** | Is the sum insured enough? | Insured at market value, not rebuild cost |
| **Territory** | Does cover apply where the risk is? | Vessel outside its navigation area; policy outside Greece |
| **Period** | Was it in force when the loss occurred? | Lapsed; or unoccupancy voided it |

### 7.3 The four states fall out

| State | Condition |
|---|---|
| **Fully insured** | all four dimensions satisfied, all with known values |
| **Partially insured** | ≥1 dimension satisfied, ≥1 demonstrably not |
| **Uninsured** | no `COVERS` edge, or every edge fails on peril |
| **Unknown** | a `COVERS` edge exists but a dimension cannot be evaluated |

**Unknown is a first-class answer and must never collapse to either neighbour.**
Today, sum insured lives in `acordData` JSON behind four fallback lookups
(`gap-detection.ts:118-124`); when it is absent, the honest answer is *we cannot
tell*, and the engine already refuses to guess (`low_limit` returns false on an
unknown sum insured). The graph keeps that discipline and makes it visible
instead of silent. It maps to the engine's existing `needs_review`.

### 7.4 Aggregation across policies

Two policies may jointly cover one risk (a home policy plus a specified-items
extension). Coverage is evaluated over the **union** of `COVERS` edges, per
dimension. This is also how duplication is detected precisely: two policies whose
peril sets and named object fully overlap is `duplicate_coverage` — today a
portfolio heuristic, in the graph a set comparison.

### 7.5 What this replaces

All seven `portfolio-rules.ts` findings become graph queries, and stop being a
parallel engine with its own vocabulary:

| Today | In the graph |
|---|---|
| `home_underinsured` | limit dimension vs `rebuildCost` |
| `home_no_earthquake` | peril dimension |
| `motor_expiring_soon` | period dimension |
| `duplicate_coverage_*` | overlapping `COVERS` edges on one anchor |
| `health_low_coverage` | limit dimension |
| `unclear_exclusions` | dimension evaluable = false → **Unknown** |
| `motor_no_roadside` | peril dimension |

---

## 8. Inheritance and dependencies

### 8.1 Three kinds of inheritance

**Type inheritance.** A risk rule attached to `Vehicle` applies to `Car`,
`Motorcycle`, `Commercial`. A subtype may add risks and may narrow a predicate;
it may **never** remove an inherited risk — removal must be expressed as a
predicate that does not match, so the reason stays visible and testable.

**Attribute inheritance.** Attributes flow along edges by declared rules:
`Household.location` → members' default location; `RealProperty.seismicZone` →
assets it `HOUSES`. Inherited values carry the source node's confidence, never a
higher one.

**Coverage inheritance.** A policy on a container may cover its contents — a home
policy over `HOUSES`-ed valuables, up to a single-article limit. This is the
mechanism behind `valuables_loss` reading `already_covered` from a home policy,
which the current engine handles with an `alsoCoveredBy` list.

### 8.2 Risk dependencies

| Kind | Meaning | Example |
|---|---|---|
| `requires` | risk B only exists if A does | `employer_liability` requires a Business |
| `aggregates_into` | several nodes, one sized risk | Loans + Mortgage → one `life_debt` |
| `mutually_exclusive` | both cannot apply to one anchor | `home_building_damage` ⊻ `home_contents_tenant` per residence |
| `escalates` | A raises B's priority | `HealthCondition` → `health_access_delay` |
| `mitigates` | A reduces B's severity | `Savings` → `income_interruption`; `Employer.groupSchemes` → `health_access_delay` |

`mitigates` deserves emphasis. It is how the graph earns the right to say *"you
need less than you think"* — six months of savings genuinely reduce an
income-protection need, and a group scheme genuinely answers a health risk. A
model without `mitigates` can only ever recommend more.

### 8.3 Derivation must be acyclic

`requires` and `aggregates_into` form a DAG. `mitigates` and `escalates` are
modifiers applied after materialisation, so they cannot create cycles.

### 8.4 Accumulation — the actuarial reason for a graph

Assets sharing a `LOCATED_AT` share a fate. A boat moored at the holiday home,
the holiday home itself, and the valuables inside it are three risks and **one
earthquake**. Two consequences:

1. **Correlated severity.** The household's worst realistic single loss is not
   the largest risk; it is the largest *cluster*. That is the number worth
   telling someone.
2. **Correlated gaps.** If the cluster is uninsured for one peril, it is usually
   uninsured for that peril across all of it — a single conversation, not three.

No flat model can compute this. It is the clearest thing the graph buys that
nothing else can.

---

## 9. Confidence

### 9.1 Three levels, on every node, edge and risk

`declared` (the person said so) · `derived` (computed from other declared facts) ·
`inferred` (guessed from a document or a policy).

### 9.2 Composition — the weakest link

> **A `RiskInstance`'s confidence is the minimum confidence along the path that
> derived it.**

A declared property plus an inferred ownership edge yields an inferred risk. This
is deliberately pessimistic: a chain of plausible steps is not a fact, and the
one failure mode worth engineering against is a confident wrong answer about a
real person's life.

### 9.3 What confidence gates

| Confidence | May materialise a risk? | May become a gap? | May notify? |
|---|---|---|---|
| `declared` | yes | yes | yes |
| `derived` | yes | yes, if every `essential`-deciding input is declared | yes |
| `inferred` | yes, as `needs_review` | **no** | only as a question |

**An `inferred` node may never make an `essential` risk applicable.** Inference
earns the right to ask; never the right to conclude. This is the same rule the
engine already enforces through `needs_review`, carried into the graph unchanged
— and it is the rule that the validation round found broken twice (a skipped
select becoming a declaration; an unasked health question becoming "no
condition"). It survives here only because it is stated at the layer that can
enforce it.

### 9.4 Absence is not evidence

A node's non-existence never proves the thing does not exist. No `Vessel` node
means *we have not established a boat*, not *there is no boat*. The distinction
is the `answeredFields` mechanic generalised: the graph needs a
**`Coverage-of-enquiry`** record — which node types have actually been asked
about — or every empty graph reads as a person who owns nothing, which is exactly
the defect the July audit found.

---

## 10. Lifecycle

### 10.1 Nodes

```
provisional ──confirm──▶ active ──▶ dormant ──▶ disposed ──▶ archived
     │                      │                       ▲
     └────retract───────────┴───────────────────────┘
```

- **provisional** — derived or inferred, unconfirmed. Materialises risks as
  `needs_review` only.
- **dormant** — exists but generates no current risk. A car with plates deposited
  (**κατάθεση πινακίδων**) is dormant, not disposed: no compulsory cover while off
  the road, and it returns.
- **disposed** — sold, died, ended. Risks retire; history is retained.
- **retracted** — never happened; entered in error. Distinct from disposed, and
  the distinction matters for a claim.

### 10.2 Risk instances

```
derived ──▶ open ──evaluate coverage──▶ { uninsured | partial | covered | unknown }
   └──▶ retired   (anchor node disposed)
   └──▶ superseded (a better-anchored instance replaced it)
```

A retired risk is never deleted. "You used to be exposed to this and no longer
are" is a true and useful statement, and it is the evidence that the product ever
advised a reduction.

### 10.3 Coverage edges

`quoted → bound → in_force → { lapsed | expired | cancelled } → historic`.
Period evaluation reads this; a lapsed policy is not cover, which the engine
already enforces by deriving liveness from the real end date rather than the
stale stored column.

### 10.4 Bitemporality, and why it is not over-engineering

Every node and edge carries `validFrom`/`validTo` (when it was true in the world)
alongside `recordedAt` (when we learned it). Claims are retrospective: the
question is never *are you covered* but *were you covered on the day of the loss*.
Without the first pair that question is unanswerable; without the second we
cannot distinguish a customer who failed to disclose from one we failed to ask.

This also gives the Life Event Model its substrate: an event is a dated
transition between two graph states, and `SUCCEEDS` edges preserve identity
across replacement (this car replaced that car) so history survives.

---

## 11. Extensibility

Adding a node type is a **registry change**, not an engine change.

### 11.1 Adding a node type

1. Place it in the hierarchy — it inherits its parent's risks.
2. Declare its attribute schema.
3. Declare permitted edges at both ends.
4. Add risk rules for what is genuinely new; inherit the rest.
5. Map every new risk to score category and lines (§6).
6. Declare `sensitivity`.

No change to risk derivation, coverage evaluation, scoring or UI.

### 11.2 Invariants a CI check should enforce

Written as assertions, because the risk-engine work established that a design
rule without a test is a comment:

1. Every node type has a place in the hierarchy and an attribute schema.
2. Every risk rule's pattern references only declared node and edge types.
3. Every risk maps to ≥1 score category and ≥1 line in `WRITE_BRANCH_IDS`.
4. No node type is an insurance concept — `Policy`, `Cover`, `Claim` are rejected
   as node types by name (Rule 1, mechanised).
5. Risk derivation touches no `Policy` node (Rule 2, mechanised).
6. `requires` / `aggregates_into` graphs are acyclic.
7. Every `per_node` risk declares `anchors`.
8. No `inferred` node can make an `essential` risk applicable (Rule §9.3).
9. Every risk with an `⊕` marker is either in the catalog or on the pending list.
10. Every node type reachable by the intake can be *asked about* — otherwise its
    absence is unfalsifiable (§9.4).
11. Coverage state is computed nowhere but the evaluator (Rule 3, mechanised).

### 11.3 What must never become a node type

`Policy`, `Cover`, `Claim`, `Quote`, `Product`, `Insurer`, `Premium`. Each is a
route back to product-first modelling, and a node type is where it would be
easiest to hide. Policies attach to the graph; they are not part of it.

---

## 12. Relationship to what exists

The graph is a **superset projection**, not a replacement. `LifeContext` becomes
a derived view — which keeps every one of the 355 validated assertions meaningful
during and after migration.

| `LifeContext` factor | Graph projection |
|---|---|
| `vehicles` | `count(Person -OWNS|USES-> Vehicle WHERE inCirculation)` |
| `propertyOwnership` | `count(Person -OWNS-> RealProperty)` |
| `residence` / `tenancy` | `Residence` where the subject's Household is `HOUSES`-ed, by tenure |
| `tenants` | `exists(InvestmentProperty)` |
| `boat` | `exists(Vessel)` |
| `dependents` / `children` | `count(-DEPENDS_ON->)`, by kind |
| `mortgage` / `loans` | `sum(Obligation.outstanding)` by type |
| `income` / `savings` | `Flow` amounts |
| `businessOwnership` / `employees` | `Business`, `EMPLOYS.count` |
| `health` | `exists(HealthCondition)` — **with consent** |
| `valuables` | `sum(Valuable.value)` |
| `hobbies` / `travelFrequency` / `cyberExposure` | `ENGAGES_IN` / `Exposure` nodes |

**Migration is additive and reversible.** Phase 1 derives the graph from existing
profiles (low confidence, `provisional`) and projects `LifeContext` back out,
asserting the projection is byte-identical to today's. Phase 2 lets intake write
graph nodes directly and raises confidence. Phase 3 moves risk derivation onto
patterns, one risk at a time, with the scenario matrix as the equivalence
harness. Phase 4 retires `minPolicies` and folds `portfolio-rules.ts` into
coverage evaluation.

At no point does the flat model need to be removed for the graph to be useful,
and at every point the existing suite is the regression test.

---

## 13. Storage

Shape only — no migration proposed.

```
risk_graph_nodes      id, owner_user_id, type, attributes_json, location_id,
                      confidence, source, status, sensitivity,
                      valid_from, valid_to, recorded_at
                      INDEX (owner_user_id, type, status), (location_id)

risk_graph_edges      id, owner_user_id, type, from_node_id, to_node_id,
                      attributes_json, confidence, valid_from, valid_to
                      INDEX (from_node_id, type), (to_node_id, type)

risk_instances        id, owner_user_id, definition_id, anchor_node_ids[],
                      confidence, status, coverage_state, coverage_detail_json,
                      derived_at
                      UNIQUE (owner_user_id, definition_id, anchor_fingerprint)

risk_coverage_edges   policy_id, risk_instance_id,
                      perils[], limit_amount, deductible, territory, period,
                      evaluable_dimensions[], evaluated_at

enquiry_coverage      owner_user_id, node_type, asked_at, answered   -- §9.4
```

Notes carried from the existing engine:

- **`anchor_fingerprint`** gives instances stable identity across re-derivation,
  so a dismissal survives — the same problem `LEGACY_RULE_REPLACEMENTS` solved for
  rule ids, solved once and structurally.
- **`evaluable_dimensions`** is what makes **Unknown** honest rather than absent.
- **Nodes are personal data.** Art. 15 export and erasure from day one; the audit
  found two consecutive personal-data stores added without DSR wiring, and
  `HealthCondition` is Art. 9.

---

## 14. Non-goals and open questions

**Non-goals.** A general-purpose graph database. Modelling insurer products.
Storing claims history as graph structure. Replacing `LifeContext` (it becomes a
projection). Inferring nodes from third-party data.

**Open, and genuinely undecided:**

1. **Does `Household` earn its place, or is it a `Person` set?** It simplifies
   contents and liability, and it complicates every ownership question when a
   household dissolves. I lean toward keeping it and treating dissolution as
   `SUCCEEDS`, but it is not settled.
2. **How is `rebuildCost` obtained?** The limit dimension is the difference
   between a real adequacy check and another proxy, and customers do not know
   this number. Without a credible source, `home_underinsured` stays a heuristic
   whatever the model looks like.
3. **Should `Policy` attach to nodes as well as risks?** Attaching to the risk is
   cleaner; attaching to the node is closer to how a schedule is actually written.
4. **Where does accumulation surface?** It is the most sophisticated output here
   and the easiest to render as alarming noise.
5. **Does the graph make intake heavier?** The graph wants per-object detail; the
   validated finding is that people abandon long forms. The events model is the
   likely answer — grow the graph one transition at a time — but that is an
   assumption, not a result.
6. **Is `Unknown` acceptable at scale?** With coverage scope trapped in
   `acordData` (F-05), most limit dimensions will read Unknown on day one. That is
   honest, and a screen full of "we cannot tell" is its own failure. F-05 is
   therefore a prerequisite for this to be useful, not a parallel workstream.

---

## 15. What shipped, and where it differs from this spec

Implemented 2026-08-04. This section records the built system honestly, including
the places it is narrower than the design above. The spec stays as written — it
is the target — and this section is the delta.

### 15.1 Where it lives

| Concern | Module |
| --- | --- |
| Vocabulary (node types, edges, states, evidence) | `lib/services/risk-graph/types.ts` |
| Projection from `LifeContext` | `lib/services/risk-graph/projection.ts` |
| Risk binding + protection dimensions | `lib/services/risk-graph/protection.ts` |
| One verdict per risk across surfaces | `lib/services/risk-graph/reconcile.ts` |
| View model (labels, ordering) | `lib/services/risk-graph/present.ts` |
| Assembly | `lib/services/risk-graph/service.ts` |
| UI | `components/coverage/RiskGraphPanel.tsx` |
| Guards | `tests/unit/risk-graph.test.ts` (69 cases) |

**Derived, not stored.** There is no graph table and no migration. The graph is
projected from the profile and the wallet on every read, which is what makes it
additive: every existing surface still reads `LifeContext` unchanged, nothing
needs backfilling, and deleting the module returns the engine to exactly what it
did before.

### 15.2 Delivered as specified

- Node vocabulary and the six roots (§3), with `Policy`/`Cover`/`Claim`
  deliberately absent — pinned by a test, since one insurance node type is all it
  takes for a life model to become a product model again.
- Instance identity (§5.2): counts become ordinal nodes, so a risk anchors to
  `property:1` and `property:2` independently. This replaces the `minPolicies`
  count comparison, and one policy across two properties now resolves to
  `partially_protected` **with evidence saying why** rather than a bare badge.
- The four states (§7.3), all four reachable through the real pipeline — asserted
  as a test, because two of them were unreachable when first built.
- Evidence on every risk (§9), structured rather than prose, naming the node and
  the policy each verdict rests on.
- Confidence per node and per evidence item (`declared` / `derived` /
  `inferred`).

### 15.3 Narrower than the spec, deliberately

- **Coverage dimensions are emitted only when answerable.** The spec describes
  four dimensions always evaluated (§7.2). In practice a dimension that is
  permanently unevaluable is worse than an absent one: it reads as "we checked
  and could not tell" when there was never a question, it makes states
  unreachable, and — since these verdicts feed the protection score — it docks
  customers for our own missing extraction. Territory taught this twice, and is
  now emitted only when a policy actually carries territorial data. Nothing
  populates that yet, which is precisely why it must not count against anyone.
- **The limit dimension compares only against debt.** Where a mortgage or loan
  gives an unarguable floor, the sum insured is checked against it. There is no
  `rebuildCost`, so for everything else the honest report is "a sum insured is
  recorded" — open question §14.2 stands.
- **No bitemporality (§10.4).** The graph is recomputed, not versioned. Risk
  profile history is captured separately by `RiskProfileVersion` from the life
  event engine.
- **No accumulation modelling (§8.4)** and **no risk-level confidence
  composition (§9.2).** Both remain designed and unbuilt.
- **Synthetic nodes carry no per-object identity.** The profile stores counts, so
  `property:2` is an ordinal, not an address, and every generated node is marked
  `synthetic: true` so no surface can mistake it for a described one. The
  consequence worth naming: with two properties and two policies, peril and limit
  are evaluated against the *union* of both policies — the model cannot yet say
  which policy covers which building. Per-object intake is the prerequisite.

### 15.4 One consequence worth stating plainly

The graph now feeds the protection score. `already_covered` is downgraded to
`needs_review` wherever the graph finds the cover partial or unreadable, on both
engine paths, so the score, the risk list and the graph panel cannot disagree.
The direction is one-way by construction: the graph may lower a coverage claim,
never invent one.

That means scores move. A wallet of policies whose contents we cannot read now
scores lower than it did — not because protection got worse, but because the old
number was counting an unread PDF as cover.
