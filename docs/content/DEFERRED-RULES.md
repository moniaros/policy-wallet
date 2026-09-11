# PW-CONTENT-01 — deferred rules and extraction requests

A candidate rule is authored only when (1) it is expressible in the engine's existing predicate vocabulary (Step 0 A1) and (2) it reads a field the extractor fills for that branch (Step 0 B4, `lib/gaps/field-inventory.ts`). Everything else is filed here, not accommodated: no new primitive, no evaluator change, `lib/gap-detection.ts` untouched.

## Deferred — needs a primitive the engine does not have

| candidate | branch | what it would need | why not now |
|---|---|---|---|
| Contents rules conditioned on `property.contentsVsStructure` (e.g. "contents-only policy without theft limit") | home, renters | A **not-applicable** outcome in the composition (`lib/gaps/composition.ts`): a conditional rule whose gate is false does not fire and today counts as `covered` when its inputs are present. Expressible in the engine (`AND [equals, missing]`), mis-composed on the surface. | Presentation-side change with its own acceptance; not a rule. Filed for the next series. |
| "Sum insured below X% of an agreed inventory value" | renters | A field for the declared inventory value (none in the schema) and a two-field comparison, which exists only as percentage drift. | Extraction request E1 below; then `value_drift` may fit. |
| "Single-article limit lower than the most valuable itemised item" | home, renters | Iteration over `insuredItems[]` comparing each `agreedValue` to a limit field (none). No array operator exists. | Extraction request E4; would still need an array primitive → deferred by design. |
| "Excess named" | renters, home | A top-level deductible list the schema exposes per policy (deductibles live per coverage entry; the rule vocabulary cannot address array members). | Deferred by design. |

## Extraction requests — the field is missing, not the rule

| id | branch | field wanted | rule it would unlock |
|---|---|---|---|
| E1 | renters, home | `property.declaredInventoryValue` (the schedule's stated contents/inventory value) | contents sum vs declared value (`value_drift`) |
| E2 | renters | `property.tenantLiabilityLimit` / `property.landlordLiabilityIncluded` | liability toward landlord or third parties present / limit not recorded |
| E3 | renters, home | `property.waterDamageIncluded`, `property.glassBreakageIncluded` | water-damage and glass cover presence (`is_false`) |
| E4 | renters, home | `property.singleArticleLimit` | valuables above the single-article limit |
| E5 | renters, home | `property.temporaryAccommodationIncluded` (+ limit) | temporary accommodation cover presence |

## Not a branch

`contents` is not a line of business in the taxonomy (Step 0 B4): it is the value `contents-only` of `property.contentsVsStructure`. Goal 5 therefore authored the contents questions on **home** and on the newly writable **renters** line, and filed the conditional variants above.
