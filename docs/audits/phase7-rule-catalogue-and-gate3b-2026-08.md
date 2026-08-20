# Phase 7 — The rule catalogue, and what code can do about Gate 3b
**2026-08-20 · Step 0 findings, then results**

Closing the two items Phase 6 handed to humans, as far as code honestly can:

1. **Gate 3b** — underwriter validation of severity thresholds and labels.
2. **The rule catalogue** — four rules covering four of sixteen branches.

---

## 0. The distinction everything here rests on

**Detection is factual. Severity is an underwriting judgement.**

*"Does this policy record a green-card expiry?"* is a question about a document. *"Is its
absence `high` or `medium`?"* is a question about risk, and answering it is what an
underwriter is for.

So this phase can legitimately author **detection** rules, and must not author
**severity**. Every new definition carries a severity because the column is `NOT NULL` —
so §3 builds the apparatus that records those severities as *proposed and unvalidated*,
rather than letting a `NOT NULL` constraint silently manufacture a verdict.

---

## 1. What the rule engine can actually evaluate

`lib/gap-detection.ts` supports nine rule types. They are not equally usable:

| Rule type | Reads | Verdict for authoring |
|---|---|---|
| `acord_field_check` | `AcordData` by explicit dot path | **Primary.** Precise, traceable, records its inputs |
| `date_within_days` | an ISO date field in `AcordData` | **Usable** — drives the existing green-card rule |
| `missing_coverage` | `policy.coverageSummary`, a nullable **free-text** column | **Avoid.** Its own code comment records that an unpopulated column once made every such rule fire at once |
| `low_limit` | a numeric field vs a `threshold` | **Avoid for now.** The threshold *is* an underwriting judgement — precisely what Gate 3b exists to validate. Authoring one here would smuggle a verdict in as a rule |
| `insurer_match`, `duration_short`, `payment_frequency_check`, `always` | policy columns | Narrow or judgement-laden |

Operators available to `acord_field_check`: `equals`, `not_equals`, `is_false`, `falsy`,
`is_true`, `truthy`, `missing`, `less_than`, `all_false`.

### The authoring rule I am adopting: prefer `is_false` over `missing`

`is_false` fires only when the document **says** a cover is absent. `missing` fires on
**silence**, and the extractor is silent about most fields — so a `missing` rule on a field
Greek policies do not routinely print would fire on nearly every policy and say nothing.

A `missing` rule is therefore only justified where the field is one that policies **of that
branch routinely state**, so its absence is genuinely informative. Three of the new rules
qualify (accident-declaration phone, hospital class, microchip number); the rest use
`is_false`. Every `missing` finding is worded *"not recorded"*, never *"not covered"* —
the invariant recorded in CLAUDE.md.

---

## 2. What limits the catalogue, and what would move it

**The binding constraint is the extraction schema, not the rule engine.**

`AcordDataSchema` (v3) has dedicated, structured sections for exactly five lines:
`vehicle`, `property`, `health`, `lifeAndInvestment`, `pet`. The other eleven — travel,
cyber, legal expenses, liability, business, the three group lines, pension, boat, fine art
and the marine/specialty set — have **no structured fields at all**. Their data lands in
the free-text `coverages[]` array and the generic `policy.*` envelope.

A rule for those branches could only be one of:

- a `missing` check on a generic field like `policy.renewalDate` — which would fire on
  almost every policy and tell the reader nothing;
- a `missing_coverage` text match against a free-text column — the rule type whose own
  history is a bug comment;
- or an invented threshold — a severity verdict wearing a rule's clothes.

None of those is a coverage finding. **Extending coverage to a sixth branch requires
adding a section to `AcordDataSchema` first**, so the extractor has somewhere truthful to
put the answer. That is real work with a clear shape, and it is the honest next step — not
something to fake by authoring rules against fields that do not exist.

> **Superseded in part — see §5.** Two of the eleven turned out to be reachable. **Travel**
> got the schema section this paragraph asks for, so the work was done rather than deferred.
> **group_health** needed nothing at all: it reuses `AcordDataSchema.health`, which
> `lib/insurance/content/group-health.ts` had recorded all along — this section's own
> premise was wrong about it, because I counted schema sections instead of checking which
> branches map onto one. Nine branches remain, and for them the paragraph still holds.

Production today (verified by query, 2026-08-20):

| Branch | Active | Inactive (AI-authored, deactivated in Phase 3) |
|---|---|---|
| health | 1 | 13 |
| home | 1 | 0 |
| motor | 1 | 10 |
| pet | 1 | 0 |
| group_health | 0 | 3 |
| liability | 0 | 15 |
| *(ten other branches)* | 0 | 0 |

---

## 3. Gate 3b: what code can close, and what it cannot

**It cannot close the gate.** An underwriter has to read the thresholds and labels and say
they are right. No amount of engineering substitutes for that.

What is missing is not the sign-off — it is everything that would make sign-off *possible
and recordable*:

1. **There is no artifact to sign.** Nothing renders "here is every severity this product
   asserts, the rule that triggers it, the fields it reads, and the words the customer
   sees." An underwriter cannot validate a database.
2. **There is nowhere to record a decision.** `SEVERITY_UNDERWRITER_VALIDATED` is a single
   global boolean. It cannot express "the four motor rules are signed off, the health ones
   are not" — so sign-off is all-or-nothing, which in practice means never.
3. **The caveat is therefore all-or-nothing too**, and will keep apologising for rules that
   have been validated.

**Plan:** add per-definition validation columns (`severityValidatedAt`,
`severityValidatedBy`, `severityRationale`), derive the caveat per definition rather than
globally, and generate the review packet from the live catalogue so it can never drift from
what the product actually does.

That converts Gate 3b from *"blocked, indefinitely"* into *"one document away from a
decision"* — which is the whole of what code can do here, and it is not nothing.

---

## 4. Plan

1. Add an `all_missing` operator (needed for the life-beneficiaries rule, which must
   require **both** beneficiary paths to be absent before it says anything).
2. Author **13** new detection rules across the five sectioned branches, in `prisma/seed.ts`
   — the human-authored source of truth. Catalogue 4 → 17.
3. Trace **every** rule against purpose-built fixtures, including the unknown-is-not-absence
   cases, before anything is seeded.
4. Migration for the per-definition validation columns; per-definition caveat.
5. Generate the underwriter review packet from the live catalogue.
6. Seed to production; re-verify by query.

**Acceptance:** every new rule is evaluable, traced, and produces nothing on silence unless
its `missing` operator is justified above; no severity is presented as validated; the packet
lists every active definition with no hand-maintained list in between.


---

## 5. Results

### Item 2 — the catalogue: 4 → 23 rules, 4 → 7 branches

| Branch | Rules | How it became possible |
|---|---:|---|
| motor | 5 | existing `vehicle` section |
| home | 4 | existing `property` section |
| health | 4 | existing `health` section |
| pet | 3 | existing `pet` section |
| group_health | 3 | **already possible** — reuses `AcordDataSchema.health`; nobody had asked |
| travel | 3 | **new `travel` section** — the blocker in §2, removed rather than worked around |
| life | 1 | existing `lifeAndInvestment` + top-level `beneficiaries` |

All 23 are rule-bearing and live in production (verified by query through two
independent connection paths). **100 fixture cases** trace them, and every rule
must prove it stays silent on a field nobody extracted.

Four rules use `missing` and fire on silence: accident-declaration number,
hospital class, microchip number, 24-hour assistance number — each justified in
§1, each worded *"not recorded"*. A test fails if any silence-firing rule is ever
worded as absence of cover.

**One operator added:** `all_missing`, so the life rule requires **both**
beneficiary paths to be empty before it says anything. An empty array counts as
absent — a list with nobody on it names nobody.

**Deliberately not authored:** a rule on `medicalExpensesLimit < 30000`. The
€30,000 Schengen minimum is a genuine regulatory figure, but it is an external
fact this repository cannot verify, and a threshold inside detection logic is a
severity verdict wearing a rule's clothes.

**Found on the way:** four `ai_check` definitions were still `isActive: true` in
`prisma/seed.ts` after Phase 3 deactivated them in production. The next
`db seed` would have switched them back on — four "active" definitions that can
never fire. One was `home-earthquake`, which is why an audit reported earthquake
had no authored rule. It has a real one now (`no_earthquake_cover`).

### Item 1 — Gate 3b: still open, and now openable

The gate needs an underwriter and still does. What is delivered is everything
that makes signing off possible and recordable:

- **Per-definition columns** (`severity_validated_at/_by`, `severity_rationale`),
  applied to dev and prod. Sign-off arrives a branch at a time; a single global
  boolean could only ever say "none of it".
- **Per-definition caveat** — `describeSeverityForDefinition()` and
  `isSeverityValidated()`, failing safe: no definition, or one it cannot read,
  still gets the caveat.
- **A real consumer**, so this is not a reserved API: `GET /api/v1/policies/[id]/gaps`
  now returns `severity_validated` and `severity_caveat_key` alongside every
  severity, telling any integration that the number is not a verdict.
- **The packet** — `scripts/gen-severity-review-packet.ts`, generated from the
  LIVE catalogue rather than the seed, so it always describes what is running. It
  states what each rule asks, which fields it reads, the severity proposed and the
  exact words the customer sees, and flags silence-firing rules for extra scrutiny
  by itself. Current state: **23 pending, 0 validated.**

### Status

**Item 2: COMPLETE** to the limit of what the extraction schema supports. Nine
branches still have no rules, and the reason is unchanged and stated in §2 — they
need a typed section before a rule about them can be anything but a guess. Travel
shows what that costs: one schema section, three rules, and the branch is real.

**Item 1: BLOCKED ON A HUMAN, by design.** Owner: a licensed underwriter or the
ΕΙΑΣ-qualified intermediary. The deliverable is
`docs/reviews/severity-review-packet.md`. Recording an answer is one UPDATE per
definition; the caveat then disappears for that rule and no other.
