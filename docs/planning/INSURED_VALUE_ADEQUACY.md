# Insured-value adequacy — what shipped, and what deliberately did not

**Status:** shipped 2026-08-21, two definitions, both document-grounded.
**Engine:** `value_drift` operator in `lib/gap-detection.ts`, same mechanism as
every other rule. No new architecture.

## The problem

A sum insured is agreed once and then left alone while the asset moves. Both
directions cost the customer, asymmetrically:

- **Over-insurance** — a car insured near list price years later. You are never
  paid more than the loss, so the extra premium buys nothing.
- **Under-insurance** — a home insured below its rebuild cost. This triggers the
  proportional-payout term (**όρος αναλογίας**): the insurer settles in the same
  ratio the sum insured bears to the true value, so a home covered for half its
  value is paid half of a *partial* loss too. This is the direction with teeth,
  and the one customers discover at the worst possible moment.

## What shipped

| slug | LoB | direction | compares | against |
|---|---|---|---|---|
| `insured_value_above_declared` | motor | above | `policy.sumInsured` | `vehicle.estimatedMarketValue` |
| `insured_value_below_rebuild_cost` | home | below | `property.insuredValue` | `property.estimatedRebuildCost` |

Threshold: `DEFAULT_DRIFT_THRESHOLD_PCT = 20`, a named constant, overridable per
definition. 20% is wide on purpose — a sum insured is a rounded, negotiated
figure and a declared value is an estimate. Flagging 5% would put a finding on
almost every motor policy in the book and teach people to ignore the class.

Provenance is persisted on `gap_instances` (`rule_id`, `engine_version`,
`rule_inputs`). `rule_inputs` records both operands **and the computed
`driftPct`**, because the finding quotes a percentage and a row that cannot
reproduce the number the customer saw is not provenance.

## What deliberately did NOT ship

**The age-based depreciation arm.** The brief asked for motor over-insurance
detected via a depreciation curve by vehicle age, and property under-insurance
against rebuild-cost €/m² bands by construction type. Both were dropped, for the
same reason:

> A check whose output is «η εκτιμώμενη τρέχουσα αξία είναι €Y» must be able to
> say where €Y came from.

The available depreciation data is US-market (iSeeCars, BLS, Progressive: ~12.5%
first year, ~15%/yr thereafter, ~58% retained at five years). Greek residual
values differ — different fleet mix, different tax treatment, different import
history — and no verified Greek table was sourced in this session. Publishing a
euro valuation derived from US curves would be a number the code cannot defend,
to a consumer, about their own money.

Likewise, contents under-insurance was excluded: the brief lists it as
bidirectional, but there is no defensible €/m² contents benchmark, and the
schema has no contents sum insured distinct from `theftCoverageLimit`.

Health, liability and pension are excluded because there is no asset value to
drift against — the sum insured *is* the product, not a proxy for something
whose worth changes independently.

**The operator already supports the missing arm.** `value_drift` takes any
`referenceField`. The day a versioned, cited, underwriter-validated Greek
reference table exists, it becomes a computed field on the extraction and the
rule ships as data — no engine change.

## Wording (IDD)

Findings are a prompt to review, never advice to act. PolicyWallet is not an
intermediary and gives no recommendation:

> Η ασφαλισμένη αξία απέχει σημαντικά από … Αξίζει να το συζητήσετε στην επόμενη
> ανανέωση.

Never «μειώστε την κάλυψη», never a euro-savings promise, never «αλλάξτε
ασφαλιστική». `tests/unit/insured-value-drift.test.ts` scans the repository for
those phrasings. The patterns match **directives, not topics** — an earlier
draft banned `/switch insurer/` and caught two innocents: a neutrality statement
("we earn nothing if you switch insurer") and an FAQ heading.

Severity on both definitions is a **proposal**, not a verdict: 0 of 68 are
underwriter-validated (Gate 3b), and the UI shows the caveat accordingly.

## Dev/prod definition divergence

Prod holds 68 definitions (27 active); dev holds 9. That gap predates this work
and is **not** resolved here: the authored catalogue is the source, and syncing
dev to prod's full set is a separate, reviewable operation. The two new
definitions are in the catalogue and reach a database through the same path as
every other one.
