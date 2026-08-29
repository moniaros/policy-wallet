# CAPABILITIES — PW-GROWTH-02

The five §5 capabilities, each verified **absent or present against the real codebase** with
file:line evidence, and each build spec confirmed or corrected. Written in Phase A, 2026-08-29.

**Status vocabulary:** `ABSENT` (verified not to exist) · `SPEC-CORRECTED` (buildable, but the
brief's contract is wrong about something and the correction is recorded) · `BUILD` · `HALTED`
· `LIVE`. **No hook may ship copy promising a capability that is not `LIVE`** (§1).

None is `LIVE`. Nothing has been built.

---

## 0. The types the brief assumes — three of four do not exist

This is the finding that reshapes three of the five specs.

| brief's name | verdict | reality |
|---|---|---|
| `ExtractedPolicy` | **ABSENT** | The real type is **`AcordData`** — `lib/schemas/acord-data.ts:570`. Input shape `AcordDataInput` at `:579`. Every `(policy: ExtractedPolicy)` signature in §5 must read `(policy: AcordData)`. |
| `DocumentAnchor` | **ABSENT** | Nearest is `ExtractionSource { page?, snippet? }` — `lib/services/ai/extraction-citations.ts:32-37`. **Flag-gated behind `EXTRACTION_CITATIONS=1`** (`:41-43`) and covering only the 9 top-level scalars in `CITATION_FIELDS` (`:18-28`). **It does not cover `coverages[]` and does not cover `conditions[]`** — the two arrays C2, C3 and C4 need. |
| `LineOfBusiness` | **PRESENT** | `lib/validations/policy.ts:116`, `z.infer<typeof lineOfBusinessEnum>` over `WRITE_BRANCH_IDS` (`lib/insurance/taxonomy.ts:381-413`) — 31 write-enabled ids. |
| `KnownConditionId` | **ABSENT** | Conditions have no stable extracted identifier. `conditionId(condition, index)` (`lib/insurance/policy-conditions.ts:200`) synthesises an **index-based** id at runtime. The only fixed vocabulary is the `kind` enum (`lib/schemas/acord-data.ts:330-338`) — a category, not an identity. C3's registry must be authored from scratch. |

### The anchor problem, and the decision taken

C2's `detectAverageClause` returns `location: DocumentAnchor`. C3 requires an anchor for
`explicitly_permitted` and `explicitly_excluded`, and specifies that **no anchor ⇒
`cannot_determine`**. C4 returns `anchor: DocumentAnchor`.

With no anchor capability over conditions or coverages, **C3 as written would return
`cannot_determine` for every query it ever answered.** The capability would be shipped, correct,
and useless.

**Decision D2 (approved 2026-08-29):** redefine the anchor as a pointer into *extracted text*,
not into the PDF.

```ts
// lib/insurance/capability-result.ts
export type DocumentAnchor = {
  from: 'extracted'
  fieldPath: string   // e.g. 'acordData.conditions[3].text'
  quote: string       // the wording itself, verbatim
  policyId: string
}
```

No schema migration, no extraction-prompt change, no §0.3 halt. The UI renders «το ασφαλιστήριό
σας αναφέρει: «…»» beside a link to the source document, and **never** claims a page number it
does not have. If `EXTRACTION_CITATIONS` is later un-gated and widened, `from` gains a second
variant and nothing else changes.

---

## C1 — Cross-policy overlap detection · H7

**Status: ABSENT → BUILD (P-01).** No statutory source needed, so it is scheduled first.

- `lib/wallet/coverage-overlap.ts` — **ABSENT**. Nothing in `lib/wallet/` (27 files) does cross-policy work.
- `lib/insurance/coverage-synonyms.ts` — **ABSENT**.

**Feasible.** `AcordData.coverages` exists at `lib/schemas/acord-data.ts:267-303`, each entry
carrying `name`, optional `limits[]` / `deductibles[]` (`:52-79`) and a `status` enum
(`included | optional_taken | optional_not_taken | excluded`).

**Corrections to the spec:**
1. Signature takes `AcordData`, not `ExtractedPolicy`.
2. **The `status` enum must be honoured.** Two policies both listing a coverage where one is
   `optional_not_taken` or `excluded` is **not** an overlap. The brief's `bothPolicies` array has
   no notion of this and would report a false "paying twice".
3. **Scope question for pre-approval:** `insuredPersons[].benefits[]` is a *second*, narrower
   per-person benefits array. Whether overlap spans benefit level as well as coverage level is
   undecided — see PREAPPROVALS #2.
4. **Renders into `components/wallet/PolicyComparison.tsx`**, which already filters comparable
   policies by branch *family* via `branchFamilyId()` (`:53-58`) and renders sections from
   `lib/wallet/coverage-sections.ts`. It compares canonical structured sections today, **not**
   `coverages[]` — so this is new logic layered on an existing surface, not a new surface.

**Prior adjudication:** GD-02 recommended **against** — but against a *gap-engine* finding writing
`RecommendationInstance` rows. This design writes nothing and touches no engine. The objection does
not transfer; recorded so nobody re-litigates it.

---

## C2 — Sum-insured adequacy · H1

**Status: split. C2a ABSENT → BUILD. C2b ABSENT → BUILD, GATED.**

- `lib/insurance/average-clause.ts` — **ABSENT**
- `lib/insurance/underinsurance.ts` — **ABSENT**

**C2a `detectAverageClause` — a FACT read off the document.** No external source, no computation,
no liability beyond correct extraction. Builds unconditionally.

**C2b `estimateShortfall` — an ESTIMATE.** Decision D1: **build in full as specified**, superseding
GD-03's recommendation against — but the brief's own §5.2 rule binds: *"The €/τ.μ. figure comes from
a `SOURCES.md` entry with `verified_at` and `reverify_after`. Never from model knowledge. If no
source resolves, the calculator does not ship."*

**GD-03 searched and found no such Greek source.** So C2b's real first task is source retrieval,
not code, and it is a genuine gate — see PREAPPROVALS #1.

GD-03's six sign-off items are not void; they are the standard C2b's copy must meet. Two carry
directly into the build regardless: **always a range, never a point estimate**, and **the €/τ.μ.
band and its source render beside the number**.

---

## C3 — Condition query, tri-state · H3

**Status: ABSENT → BUILD (P-03), with a correction that matters.**

- `lib/insurance/condition-query.ts` — **ABSENT**
- **But `lib/insurance/policy-conditions.ts` EXISTS** and already turns `acordData.conditions`
  (`lib/schemas/acord-data.ts:329-361`) into condition gaps, prevention actions and compliance
  obligations. It carries `conditionSeverity()` (`:27`) and `conditionId()` (`:200`).

**C3 extends that module's vocabulary; it must not sit beside it.** A second reader of
`acordData.conditions` is the parallel-primitive failure this repo has a standing protocol against.

**Corrections:**
1. `KnownConditionId` must be authored — no extracted identity exists. Start at
   `short_term_letting`.
2. **`conditionSeverity()` already exists in the module C3 extends.** §2.2 forbids a
   certainty-implying ordering on capability output. C3 must not surface it, and the boundary needs
   stating in code so a later editor does not wire it through.
3. Anchors per D2.
4. **The H3 guide already says the product cannot detect short-term letting** (shipped by GA-05,
   its §5). C3 answers *what the policy says about a condition*, which is a different claim from
   *detecting the reader's use of their property*. If C3's copy blurs that, it contradicts a live
   published page. Product-Truth gate.

**Prior adjudication:** GD-01 recommended **against** — against a gap *category* and an engine
rule, on three grounds: model-decided detection, missing fields, no corpus. A pure query over
already-extracted terms is one of the "three cheaper things" that proposal pointed toward. The
objection does not transfer.

---

## C4 — Valuation basis · H12

**Status: ABSENT → BUILD (P-04).**

- `lib/insurance/valuation-basis.ts` — **ABSENT**.

The cleanest of the five: read a basis, explain what it means at claim time, optionally show the
difference against a value **the user supplies**. Sources no vehicle valuation, states no payout,
names no model.

**Corrections:** signature takes `AcordData`; anchors per D2. The four bases must be verified to
be extractable from real Greek motor wordings before the fixture set is written — if the extractor
never yields a basis clause, C4 returns `cannot_determine` universally and is C3's problem again.

---

## C5 — Requirement conformance · H8, H11, H17

**Status: ABSENT → HALTED.**

- `lib/insurance/requirements/registry.ts` — **ABSENT**; no `requirements/` directory exists.
- `lib/insurance/conformance.ts` — **ABSENT**.

**Halted, not deferred, and the reason is structural.** C5 is a sourced registry of statutory and
licensing requirements. Its entire content is ΦΕΚ. **HALT-G01 established that ΦΕΚ retrieval does
not work** — et.gr serves no document to a fetcher, and only ΦΕΚs re-hosted by a responsible body
were ever verified. H8 additionally needs per-profession minima: one source per licensing body.

A requirement whose source is unresolved **is not evaluated and renders as unavailable, never as a
pass** — so a C5 built today would render "unavailable" for every requirement in it.

Unblocks only if S-04's bounded retrieval attempt succeeds. H17 is blocked twice over: `AcordData`
carries no cyber object (H-010 / X-01), so there would be nothing to check against even with a
registry.

---

## Summary

| id | hook(s) | status | blocked by |
|---|---|---|---|
| C1 | H7 (in-app only) | **BUILD** — first, no source needed | — |
| C2a | H1 | **BUILD** | — |
| C2b | H1 | **BUILD, GATED** | a €/τ.μ. source that survives §6 |
| C3 | H3 | **BUILD** | — |
| C4 | H12 | **BUILD** | — |
| C5 | H8, H11, H17 | **HALTED** | ΦΕΚ retrieval (S-04); H17 also X-01 |

**Shared prerequisite: P-00** — `lib/insurance/capability-result.ts` carrying `CapabilityResult<T>`,
`UndeterminableReason`, `InputProvenance` and D2's `DocumentAnchor`. Every capability imports it.
Written once, never copied (§0.2).

**§2.8 holds:** none of the five requires `lib/gap-detection.ts`, and none may touch it.
