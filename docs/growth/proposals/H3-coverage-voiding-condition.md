# H3 — A `coverage_voiding_condition` gap category

**To:** whoever decides what the gap engine is allowed to assert.
**From:** Product-Truth, GROWTH-HOOKS-01 Track D (GD-01). Written 2026-08-26.
**Status:** proposal. No code written. `lib/gap-detection.ts` untouched (sha256 `69d2c946…1259b859`).

## The question

Hook H3 wants the product to surface clauses that **void** cover rather than limit it —
undeclared short-term letting, undeclared change of use or occupancy. Should that become a
new gap category with rules that fire on it?

**Recommendation: no — not as a gap category, and not yet as a rule.** Three cheaper things
come first, and one of them is the only way to ever answer this question with evidence.
Details at the end.

## Why it is a different class from a gap, and why that is not a wording problem

A gap says: *you are not covered for X.* It is a statement about the contract, and the
contract is the thing we read.

A voiding condition says: *you believe you are covered, and a condition you may already have
breached means you are not.* It is a statement about the contract **and about the customer's
conduct** — and we can only ever see the first half. Even a perfectly extracted clause tells
you the policy requires the flat not to be let short-term. It never tells you whether it is
being let.

That asymmetry is not decoration. It decides what the finding may say:

> This policy requires X. Confirm X is true.

and never

> Your cover is void.

The repo already reached this conclusion once, in a place worth reusing rather than
re-deriving. `lib/insurance/policy-conditions.ts:100` calls the reason `'unverified'` and
comments: *"we can see the requirement and cannot see whether it is met — which is a question
for the customer, not an accusation."* That is the right sentence and it already exists.

## Half of this is already built — outside the gap engine

This is the finding that changes the shape of the decision.

| Piece | Where | State |
|---|---|---|
| The data model | `lib/schemas/acord-data.ts:316-350` — `conditions[]` with `kind`, `text`, `recurrence`, `dueBy`, `breachEffect` (`voids_cover \| suspends_cover \| reduces_claim \| unknown`), `verifiable`, `dependsOnOtherPolicy` | **exists**, v3 |
| The derivation | `lib/insurance/policy-conditions.ts` — `conditionGaps()`, `preventionActions()`, `complianceObligations()` | **exists** |
| The notification | `lib/services/compliance/obligation-scan.ts` → `obligation_due` | **exists** |
| The UI | `components/wallet/coverage-details/PolicyConditionsCard.tsx`, plus counts on `PolicyholderHome.tsx:538` and `PolicyDetailsClientView.tsx:386` | **exists** |
| A `GapDefinition` / `GapInstance` for any of it | — | **does not exist** |

So the proposal is not "build a category". It is: **does the existing condition path become a
gap category, or does it stay a parallel, separately-rendered thing?** Stated that way, the
answer is easier, because three of the reasons to fold it into the engine (provenance,
severity discipline, one place a finding is decided) are also the three reasons it cannot be
folded in as it stands.

## The category definition, and the operator it would need

If it were built, this is the honest shape:

```
category:   coverage_voiding_condition
scope:      document
claim:      "this policy makes cover conditional on <X>; we cannot see whether <X> holds"
never:      "you are not covered" / "your cover is void"
```

`detectionLogic` would have to say *"some element of `conditions[]` matches a predicate"* —
and **no existing operator can express that.** `getNestedField` (`lib/gap-detection.ts`)
reduces a dot path over objects; it cannot iterate an array. `all_false` and `all_missing`
take a list of *paths*, not an array predicate. So this needs one new operator, e.g.:

```jsonc
{
  "type": "acord_field_check",
  "field": "conditions",
  "operator": "array_any",          // ← the new one
  "match": { "kind": "condition_precedent", "breachEffect": "voids_cover" }
}
```

That is exactly the `value_drift` shape from `docs/planning/INSURED_VALUE_ADEQUACY.md`: one
operator, rows in `lib/gaps/authored-catalogue.ts`, trace cases in
`gap-rule-catalogue-trace.test.ts`, provenance on `GapInstance`. And it carries the same
provenance obligation, sharpened: `rule_inputs` must record **which element fired** — its
`conditionId(...)` and its verbatim `text` — not a boolean. The `value_drift` lesson was that
a finding quoting a number must store the number; a finding quoting a clause must store the
clause.

## The three reasons it cannot fire today

### 1. Detection would be model-decided. The invariant forbids exactly this.

`breachEffect` is an AI output with `.default("unknown")`. A rule reading
`breachEffect === "voids_cover"` means **the model decided the gap** — the shape CLAUDE.md
names first: *"Rules decide a coverage gap; the model only describes one."* The AI contract had
`isDetected` and `severity` **deleted, not ignored**, precisely so this could not happen by
accident. Reading a model-authored enum as a detection signal re-introduces the deleted field
under a different name.

Severity compounds it. `conditionSeverity()` (`policy-conditions.ts:36-47`) maps
`voids_cover → critical` — a hand-rolled severity map keyed off a model field. That is
severity decided by the model in two hops, on a surface where **0 of 29 active definitions are
underwriter-validated** (verified against both databases, 2026-08-26:
`severity_validated_at IS NOT NULL` → 0, dev and prod).

There is a defensible version: the rule fires on the **presence of a condition of a named
kind**, and `breachEffect` is rendered as *what the document says the consequence is*, quoted,
not used as the trigger. That keeps the model describing and the rule deciding. It also means
the category is narrower and duller than the hook implies — which is the correct outcome.

The extraction prompt already models the right instinct, in one branch:
`lib/services/ai/lob-packs/index.ts:42` — *"Where a warranty states a consequence ('no claim
shall be allowed'), set breachEffect to voids_cover. Where it does not, leave breachEffect
unknown — do not assume severity."*

### 2. The fields for the two named examples do not exist, and nothing asks for them

`property` (`acord-data.ts:116-135`) has address, type, `squareMeters`, `yearBuilt`, the three
peril booleans, `theftCoverageLimit`, `insuredValue`, `replacementValue`,
`contentsVsStructure`. There is **no** `occupancy`, no `usage`, no
`shortTermLettingDeclared`. (`vehicle.usage` exists — `personal | commercial | rideshare` — so
the *motor* change-of-use analogue is closer to reachable than the home one.)

Worse for H3 specifically: **`conditions[]` extraction is prompted on six specialty branches
only.** The pack registry (`lib/services/ai/lob-packs/index.ts`) covers `marine_hull`,
`marine_cargo`, `marine_crew`/`employer_liability`, `money`/`fidelity`/`fine_art`, `cyber`,
`liability`/`boat_tpl`/`professional_liability`. **There is no home pack and no motor pack.**
The two examples the hook names — undeclared letting, change of use — live on exactly the
branches that get no instruction to look for ΑΠΑΡΑΒΑΤΟΙ ΟΡΟΙ or ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ.

### 3. There is no corpus. At all.

| | policies | with a non-empty `conditions[]` |
|---|---|---|
| dev | 52 | **0** |
| prod | 4 | 1 |

(Measured 2026-08-26.) You cannot tune a threshold, write a trace test against a real
document, or take a rule to an underwriter on the strength of one row. Anything authored now
would be authored against imagination.

## The `missing`-operator trap, in the form it takes here

The standing rule is that only an explicit `false` is evidence of absence, and that the
`missing` operator — which fires *on* silence — must produce findings worded "not recorded",
never "not covered". This class breaks the rule in **both** directions, which is why it needs
saying separately:

- **Silence read as "no voiding condition"** is a reassurance the check could not support.
  This is the failure this repository has now shipped three times — the protection score over
  an unanalysed wallet, the monitoring card's «Εντάξει» over entirely expired cover,
  `resolveGapContent` titling a card with model prose. A conditions panel that renders an
  all-clear over a policy whose warranty section was never extracted would be the fourth, and
  the most damaging, because it is the one a customer would rely on.
  *Current state is safe by accident:* `PolicyConditionsCard.tsx:32` returns `null` on an
  empty list. It shows nothing rather than "nothing found". Keep that, and make it explicit.
- **Silence read as "you may have breached something"** is an accusation about conduct we
  cannot observe. `reason: 'unverified'` is the wording that survives.

A third form, unique to this class: even a **populated** `conditions[]` entry is silence about
the customer. The clause is a fact; the breach is not. No operator can close that, ever.

## The severity problem: this class is binary and the scale is not

`GapSeverity` is `critical | high | medium | low` with a `rank` and a `tone`
(`lib/gaps/severity-display.ts`) — a graduated scale answering *"what should I look at
first?"*, carrying a caveat because Gate 3b is open.

"Voids cover" is not a point on that scale. Mapping it to `critical` puts *"a clause here may
mean you have no cover at all"* in the same visual bucket as *"no leishmaniasis rider"*. And
the caveat currently attached to every severity — *"not a definitive risk assessment"* — reads
as softening a claim we are **not making**, which makes it actively misleading here.

Two options:

- **(a)** Reuse `critical`, accept the flattening. Cheapest; wrong for the reason above.
- **(b)** Add a **finding kind** (`gap | condition`) as a *display* dimension, and do not ask
  `describeSeverity()` to express it. A condition renders as *conditional*, with the
  document's own stated consequence quoted, and no severity badge at all.

**(b)**, and note it is a display change, not an engine change — no new severity enum value,
so `gap-severity-display-single-source.test.ts` stays whole.

## What underwriter validation would have to cover

Not "is `critical` right". Four questions, none of which is a UI question:

1. Do Greek wordings actually draw the `voids / suspends / reduces` distinction the enum
   assumes, reliably enough that an extractor can be scored against it?
2. Which clause families genuinely void cover under Greek insurance-contract law
   (ν. 2496/1997 and the aggravation-of-risk / non-disclosure provisions), as against those
   that give the insurer a right to act? **I am not qualified to answer this and this
   repository has not answered it.** It is a legal question before it is an underwriting one.
3. Is "undeclared" determinable from the policy alone? My reading is no — it is a fact about
   the customer's conduct — which caps what any rule may say.
4. The exact EL/EN wording, against the IDD boundary already enforced by
   `tests/unit/insured-value-drift.test.ts`: a prompt to review, never a directive.

## Cost

| Item | Rough |
|---|---|
| `array_any` operator + catalogue rows + trace tests + provenance | ~1 engineer-week (the `value_drift` shape, and that one shipped) |
| Home + motor lob-packs for `conditions[]` | ~2 days; **no engine change**; independently valuable |
| `property.occupancy` / usage fields + prompt + backfill semantics | ~3 days |
| Corpus of real Greek home schedules carrying letting/occupancy clauses | not engineering; weeks; the real gate |
| Legal + underwriter sign-off on the four questions | not engineering; the actual blocker |

## Recommendation

**Do not add a `coverage_voiding_condition` gap category now.** Do these three, in order:

1. **Author the home and motor `conditions[]` extraction hints** (ΑΠΑΡΑΒΑΤΟΙ ΟΡΟΙ,
   ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ, βραχυχρόνια μίσθωση, αλλαγή χρήσης, όρος μη κατοίκησης). No engine
   change, no new category, no new claim — and it is the **only** way to get the corpus that
   makes the rest of this decidable. It also makes the existing, already-shipped conditions
   card useful on the two branches most customers actually hold.
2. **Make the existing condition surface explicitly honest about coverage.** Today it renders
   nothing when `conditions[]` is empty, which is right but indistinguishable from "we
   checked and found none". Add the state that says *we did not read a conditions section on
   this policy* — and never an all-clear. This closes a live reassurance risk **today**, at 0
   dev rows and 1 prod row, and it costs a day.
3. **Revisit the category** only when (a) a meaningful number of home policies carry an
   extracted condition, and (b) questions 1–4 above have named answers from someone with
   standing to give them.

One thing to be careful of meanwhile: the public `/platform` page cites
`acord-data.ts` `breachEffect` as part of what the envelope captures
(`app/(public)/platform/PlatformSections.tsx:28-29`). That is true of the *schema*. With six
specialty packs and zero home coverage, a reader could fairly take it as "we read the voiding
conditions of your home policy". The file's own header is unusually careful about exactly this
kind of over-claim; this line deserves the same treatment.

## Uncertainties I did not resolve

- Whether the prod policy carrying `conditions[]` has any entry with
  `breachEffect = voids_cover`. One row either way does not change the recommendation.
- Whether ν. 2496/1997 treats undeclared change of use as voiding or as giving a right to
  terminate. Named as a question for counsel, not asserted.
- Whether `PolicyholderHome.tsx` / `PolicyDetailsClientView.tsx` obligation counts render a
  zero state that reads as an all-clear. Worth checking as part of item 2; I read the card,
  not the two counters.
