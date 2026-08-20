# Phase 7 — The rule catalogue, and what code can do about Gate 3b
**2026-08-20 · Step 0 findings, written before any change**

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

## 2. Why the catalogue stops at five branches, and what would move it

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
