# H1 — Computing a rebuild cost, as against displaying one

**To:** whoever decides what numbers this product is willing to author.
**From:** Product-Truth, GROWTH-HOOKS-01 Track D (GD-03). Written 2026-08-26.
**Status:** proposal. No code written. `lib/gap-detection.ts` untouched (sha256 `69d2c946…1259b859`).

## The question

If the app ever **computes** a rebuild figure — €/m² × floor area, adjusted for region and
construction class — rather than displaying one someone gave it, it is making a valuation
claim about a specific building. Should it?

**Recommendation: no, and not before underwriter sign-off covering six named items.** The
sign-off list is at the end, and it is the point of this document. The rest is why the line
matters and where it already sits.

## Display and compute are different products, and this repo has already drawn the line once

Track C proposes showing a **user-entered** rebuild figure beside the **extracted** sum
insured. That keeps authorship where it belongs: the customer owns the number, we own the
subtraction and the sentence about όρος αναλογίας. If the figure is wrong, it is wrong because
they entered it, and the app's contribution — "these two numbers are 40% apart" — is still
true.

Computing one moves authorship to us. The app stops answering *"here is what your policy says,
and here is what you told us"* and starts answering *"what is your house worth to rebuild"*.
That is a valuation, and a valuation is a claim, not an arithmetic.

The codebase has drawn this line explicitly, more than once, and it holds today:

- `lib/schemas/acord-data.ts:96-97`, on `vehicle.estimatedMarketValue`: *"Extract the number as
  printed; **never estimate or infer a value**."*
- `lib/gap-detection.ts`, in the `value_drift` operator's comment: *"no market table, no
  depreciation curve, no model estimate. A check that tells someone their car is worth €Y had
  better be able to say where €Y came from, and 'the value your own policy declares' is the
  only answer available that cannot be argued with."*
- `docs/planning/INSURED_VALUE_ADEQUACY.md` records the depreciation arm as **deliberately not
  shipped**, on the same reasoning, and gives the disqualifying detail: the available data was
  US-market (iSeeCars, BLS, Progressive), Greek residual values differ, and *"publishing a euro
  valuation derived from US curves would be a number the code cannot defend, to a consumer,
  about their own money."*

`insured_value_below_rebuild_cost` ships today because **both** its figures come off the
document — `property.insuredValue` against `property.estimatedRebuildCost`. That is why it
needs no reference data and no sign-off beyond severity. A computed arm has neither property.

The guide copy already handles the customer-facing half correctly and for free:
`lib/guides/content.ts:155-156` — *"AADE sets a minimum value per square meter — confirm the
current threshold at aade.gr."* It names the authority, states a figure exists, and sends the
reader to the source. **That is the pattern to keep.**

## What a defensible computation would require

Four things. The fourth is the one that cannot be bought.

### 1. Source data with real provenance

A €/m² table by region (or ΤΖ zone) and construction class. Candidates, and what is wrong with
each:

- **ΑΑΔΕ αντικειμενικές αξίες.** A **tax** base. It includes land value and is set
  administratively, not by construction cost. Using it as a rebuild proxy is a category error
  of exactly the kind the catalogue has already had to correct once — `missing_enfia_components`
  carries the comment *"ENFIA is a tax, not an insurance requirement; it mandates no cover"*
  because the product had previously conflated the two.
- **ΤΕΕ / professional construction cost indices**, **ΕΛΣΤΑΤ construction cost index.** Closer
  to the right quantity, but I have **not** verified currency, granularity, or licence terms for
  commercial redistribution. Stated as unknown, not as available.

None of these is in the repository. Nothing in `lib/` holds a €/m² figure today — I checked.

### 2. Provenance carried into the finding

The `value_drift` standard, applied: `rule_inputs` must record the **table version, the zone,
the construction class, the €/m², the m², and the product** — not just the two numbers being
compared. The rule that produced `driftPct` had to store `driftPct` because *"a row that cannot
reproduce the number the customer saw is not provenance"*. A computed reference is three more
inputs deep and needs all of them.

`GAP_ENGINE_VERSION` is `"rules-1"`. A computed-valuation arm changes rule semantics and must
bump it, so old findings remain identifiable as pre-valuation.

### 3. An update cadence, and a refusal when stale

Greek construction costs moved materially in 2021–2023. A table two years stale does not add
noise — it adds **bias**, in one direction, for every customer at once. So staleness must make
the surface **refuse to render**, not silently serve last year's number.

This is the same shape as the standing pricing task in CLAUDE.md — *"make the public pricing
surface refuse to render any plan whose stripe_price_id does not resolve in LIVE mode"* — and
it is unbuilt there too. Two fail-open surfaces is one more than the product can afford.

### 4. Someone accountable when it is wrong

There is no such person today. Gate 3b — underwriter sign-off on **severity**, which is a much
easier signature than a valuation — has been open since the catalogue was authored and stands
at **0 of 29 active definitions validated, in both dev and prod** (verified 2026-08-26). The
schema even provides the fields to record it (`severityValidatedAt`, `severityValidatedBy`,
`severityRationale`) with the comment *"a named person with the standing to. Not a deploying
developer."* They are empty.

A product that has not been able to get a severity signed off cannot get a valuation signed
off, and the valuation is the harder signature by a wide margin.

## The liability shape: both directions are actionable harms

This is what makes computing different in kind from displaying, rather than different in
degree.

**Under-estimate → the customer insures to our number → όρος αναλογίας applies at claim.** The
repo's own guide gives the arithmetic (`lib/guides/content.ts:1121`): a €200,000 rebuild
insured for €100,000 collects 50% of *every* loss, partial ones included — €10,000 on a
€20,000 claim, after the deductible. If our figure caused the €100,000, the loss is traceable
to us and quantifiable to the euro, on a document trail we generated and stored.

**Over-estimate → the customer over-insures.** Smaller per year, continuous, and equally
traceable. `insured_value_above_declared`'s own description states the mechanism: *«Δεν
αποζημιώνεστε ποτέ πάνω από την πραγματική αξία»* — the extra premium buys nothing.

**A user-entered figure has neither shape.** The customer authored the number; the app
subtracted. There is no claim of ours for them to have relied on. That is the whole difference,
and it is why Track C is a different product rather than a smaller version of this one.

## Is it regulated advice under IDD?

Stated as uncertainty, because that is what it is.

**I am not qualified to answer this, and this repository has not answered it.** What the repo
does establish is a **live public commitment** that constrains the answer either way
(`lib/guides/content.ts:2126-2127`, published):

> PolicyWallet specifically is not an insurance undertaking and does not distribute insurance
> products: it does not intermediate in the conclusion or management of insurance contracts, as
> the distribution framework (IDD, Greek Law 4583/2018) defines it.

Two things follow regardless of how the IDD question resolves:

1. **The existing wording discipline fails by construction.** Findings are prompts to review,
   never directives — *«Αξίζει να το συζητήσετε στην επόμενη ανανέωση»*, never «μειώστε την
   κάλυψη» — and `tests/unit/insured-value-drift.test.ts` scans the repository for the
   phrasings that cross that line. A computed figure is only useful next to a sentence of the
   form *"insure for about €X"*. That sentence is the directive the guard exists to catch. A
   computed figure presented **without** it is a number with no purpose.
2. **"Not IDD" would not make it safe.** Publishing a valuation to a consumer who relies on it
   is capable of being a professional-negligence exposure in its own right, entirely
   independent of insurance-distribution regulation. The IDD question is necessary to answer
   and not sufficient.

## Recommendation: do not build this before underwriter sign-off

**Recommend AGAINST.** Sign-off must cover these six items, all of them, in writing:

1. **The source table is named, versioned, licensed for this use, and is a
   rebuild/reinstatement cost** — not an objective tax value, not a market value, not a
   transaction price.
2. **The mapping is stated** from what we can actually extract — `property.squareMeters`,
   `property.yearBuilt`, `property.address`, `property.type`, `property.contentsVsStructure` —
   to the table's zone and construction class, **including what happens when any input is
   missing.** The answer must be *no figure*, never a default. (Every operator in
   `evaluateAcordFieldCheck` already refuses on unknown inputs; a computed field must inherit
   that.)
3. **The stated tolerance**, and the drift threshold that follows from it. Today
   `DEFAULT_DRIFT_THRESHOLD_PCT = 20` is justified against a **document-stated** reference — a
   negotiated round number against a declared estimate. Against a **modelled** reference the
   justification is different arithmetic and must be redone from scratch; a threshold narrower
   than the model's own error bar manufactures findings.
4. **The refresh cadence, and the fail-closed behaviour when the table is stale.** Refuse to
   render. Not last year's number, and not a silently widened threshold.
5. **The exact EL and EN wording, approved**, including what the number is **not**: not a
   valuation, not a survey, not advice on what to insure for — and how it coexists with the
   published IDD statement above.
6. **A named signatory**, recorded the way `severityValidatedBy` records one: a person with
   standing, not a deploying developer, with a dated rationale.

**Until all six exist: display, do not compute.** Track C's user-entered figure beside the
extracted sum insured is the correct product, it is already the plan, and it delivers most of
the customer value — the customer learns their sum insured is 40% below what they believe the
rebuild costs — without the app authoring the belief.

## Cost, and where it actually sits

The engineering is the small part, and it is nearly zero:

> **The operator already supports the missing arm.** `value_drift` takes any `referenceField`.
> The day a versioned, cited, underwriter-validated Greek reference table exists, it becomes a
> computed field on the extraction and the rule ships as data — no engine change.
> — `docs/planning/INSURED_VALUE_ADEQUACY.md`

That is still true. The cost is **data licensing, a maintained table with a refresh owner, and
a person who signs.** None of the three is an engineering task, and the third has been open on
a much easier question for months.

That asymmetry is itself the argument. When the only expensive parts of a feature are the parts
that make it defensible, building the cheap part first produces exactly the failure this
repository has documented three times over: a check that reports a confident answer when it
could not actually run.

## Uncertainties I did not resolve

- Licence terms and update cadence for ΤΕΕ and ΕΛΣΤΑΤ construction cost data. Named as
  candidates, not as available.
- Whether the ΑΑΔΕ minimum-value-per-m² figure the guide cites is a rebuild proxy at all, or
  purely a tax floor. My reading is the latter, which is why the guide's "confirm at aade.gr"
  is the right treatment and a computation reading the same figure would not be.
- Whether Greek property schedules state `estimatedRebuildCost` often enough for the existing
  document-grounded rule to fire in practice. Dev holds 52 policies and prod 4 (branches:
  health, money, motor) — **no home policy in prod at all** — so the shipped rule's real-world
  hit rate is currently unmeasurable. That is a reason to improve extraction coverage, not a
  reason to compute.
