# PROGRESS-GROWTH — GROWTH-HOOKS-01

Track-boundary log. One entry per completed track hand-off, appended in order. Read
`SOURCES.md`, `HOOKS.md`, `HOOK_RECONCILIATION.md` and `HALTS-GROWTH.md` first — this file
records what was *done*, never what is *true*.

---

## Track A / GA-05 — guide bodies for the four live hooks

**Role:** Product-Truth. **Date:** 2026-08-26. **Files:** `lib/guides/content.ts`,
`tests/fixtures/greek-string-inventory.txt` (regenerated snapshot only).
**Corpus:** 12 articles → **15**.

### What shipped

| hook | action | slug | sources it rests on |
|---|---|---|---|
| H1 | CREATE | `analogikos-kanonas-ypasfalisi-katoikias` | SRC-001, SRC-002, SRC-003, SRC-004 |
| H3 | CREATE | `vraxychronia-misthosi-asfalisi-katoikias` | SRC-005, SRC-006, SRC-007, SRC-008 |
| H6 | CREATE | `elga-apozimiosi-kai-pragmatiko-kostos` | SRC-014, SRC-015, SRC-016 |
| H4 | EXTEND | `prostimo-anasfalistou-oximatos` | SRC-012 (objection window), SRC-009 (the check exists) |

Each new article follows §3.2: what the rule or clause is, sourced; why it goes unnoticed,
as mechanism; a checklist table naming the Greek term, the English term and where in the
document it sits; what PolicyWallet does with it, with **no accuracy figure**; an upload CTA;
a sources block. EL and EN are at **full parity** — every string, table cell, table note and
FAQ answer exists in both, and the checklist tables carry the **Greek** term in both locales
because the document an English reader is holding is in Greek.

Every citation is a **deep link to a document**, not an origin. The `sources-freshness`
legacy debt list (30 bare origins across the 12 pre-existing articles) is unchanged and did
not grow.

### The register decisions that shaped the copy

- **No prevalence claim anywhere.** H1 says in the body that how common underinsurance is in
  the Greek market is not measured by any source we can cite, so we do not claim it. Same
  reasoning as the removed trust metrics.
- **H3 never characterises short-term letting as an επίταση κινδύνου.** It states the
  criterion and the 14-day deadline the wording sets, and says in the body that no source
  behind the page characterises the letting either way. The consequence pair is kept
  asymmetric — negligence *reduces* in proportion to premium, fraud *releases* inside a
  one-month window — because flattening it to "you lose your cover" would be false.
- **H3 does not imply the product detects the letting.** Its §5 says outright that
  PolicyWallet cannot see how the property is used and does not detect short-term letting.
  `coverage_voiding_condition` stays a Track D proposal.
- **H6 carries no fear copy.** Factual and calm throughout: a closed peril list, an
  arithmetic table on the regulation's own percentages, and an explicit statement that
  PolicyWallet has no connection to ΕΛ.Γ.Α. and calculates no ΕΛ.Γ.Α. compensation. The
  headline percentages are stated as the rule, not as constants, because the same article
  lets the board vary the deductible.
- **H4 names no authority.** The extension says «η αρχή που επιβάλλει το αντίστοιχο
  πρόστιμο», which is true under either attribution. The existing ΑΑΔΕ sentences were **not
  touched** — HALT-G02 is not this track's to resolve.
- **No severity, no score, no colour, no plan qualifier, no testimonial, no user count.**

### H4 — what the extension adds, and what it deliberately does not

Adds exactly two things that were missing: **proving cover was in force on the check date**
(the reader's own dates, as a bullet list) and **the objection window** (electronic, 10
working days from service, decided within 30, fine or road tax written off on acceptance).
It states plainly that the statute sets the right and the deadlines and **does not enumerate
what proves cover** — SRC-012's caveat, honoured rather than filled in.

It does **not** restate the cross-check, the fines, δήλωση ακινησίας or "how do I check
whether my vehicle shows as insured": all four are already in the article, and two sections
making one claim is the same defect as two pages making it.

### Verification

`tsc --noEmit` clean · `vitest --run tests/unit` **496 files green** (baseline before this
track's change: 493 files / 5,582 tests, green — the three extra files are the concurrent
ticker track's, not this one's; this track added no test) · `lint:utf8` clean (2,507
tracked files) · `lint:encoding`
clean · `eslint lib/guides/content.ts` clean · all four cited URLs re-fetched and returning
200 on 2026-08-26.

The Greek copy freeze was regenerated deliberately and the diff reviewed: **+242 entry lines,
every one from `lib/guides/content.ts`, one changed header count line, zero deletions, zero
other file's per-file count changed.** No other agent's strings were swept in or out.

### Handed on, not absorbed

1. **A fine-amount contradiction inside `prostimo-anasfalistou-oximatos`, unresolved by
   design.** The published article states an administrative fee of €100 / €150 / €250 scaled
   by engine size. SRC-010 reads ν. 5113/2024 άρθρο 23 §1α as €1,000 for public-use buses and
   lorries, €500 for passenger cars and all other vehicles, €250 for two-wheelers — by
   **vehicle class**, not engine size. This is a second, separate defect in the same article
   as HALT-G02, on the same law, and it was outside this track's narrow H4 remit; correcting
   it inside the extension would also have contradicted the article's own §«Ποια πρόστιμα».
   It needs the same accountable ΦΕΚ read HALT-G02 needs.
2. **A mild seam left in place.** The pre-existing sentence says the objection is filed
   «με τη διαδικασία που περιγράφει η ΑΑΔΕ»; the new section says it is filed electronically
   on the Ενιαία Ψηφιακή Πύλη. Not a contradiction, and not repaired, for the HALT-G02 reason.
3. **H3's two citations are the same PDF, cited by part** (Γενικοί Όροι; Ειδικοί Όροι).
   All four of H3's verified claims come from one document, and `seo-metadata` requires two
   sources per guide. Labelling the two parts is truthful; padding with an uncited link would
   have been the defect the «Πηγές» block exists to avoid. Worth a second published wording
   whenever one is verified.
4. **Cross-link added per GA-04**: `checklist-ananeosis-asfalistiriou` now links to the H1
   article, which is the "the checklist gains a cross-link, not the content" decision in
   `HOOK_RECONCILIATION.md`. `kena-kalypsis-ti-einai-pos-ta-vriskete` §«Τι είναι ο αναλογικός
   κανόνας» is now the shallow sibling of a dedicated article; the register named only the
   checklist, so nothing else was moved.
5. **GB-04 is untouched and unchanged**, as scoped.

---
---

# PW-GROWTH-02 — a second run over the same ground

**Branch `feat/growth-hooks`, worktree `../pw-growth`.** Fast-forwarded to `NEW-UI` on
2026-08-29: the branch was a leftover from GROWTH-HOOKS-01, **0 commits ahead** (all its work had
already landed on `NEW-UI`) and 58 behind, so the fast-forward was lossless.

**Read for a cold start:** `PLAN.md` (order), `CAPABILITIES.md` (what exists), `PREAPPROVALS.md`
(all decisions, binding block at the foot), `HOOK_RECONCILIATION.md` (17 hooks),
`G07-CITATION-AUDIT.md`. This file records what was *done*.

## Phase A — the brief describes a codebase that does not exist

Thirteen assumptions wrong against the real tree. The four that changed the plan: H1/H3/H6/H11
already have published guides (three shipped by GA-05 under the previous register), so CREATE would
have put two URLs on one statutory claim; `ExtractedPolicy` is really `AcordData`; `DocumentAnchor`
did not exist at all; and Track C was unblocked by the Phase 4 design system completing that day.

**H6's §4.5 relevance test, which G-02 left open, now has an answer.** The taxonomy holds 43
branches and the only agricultural match is `truck` «Φορτηγό / Αγροτικό» — a farm vehicle, not
ΕΛΓΑ's crop-and-livestock scope. No fixture holds one. The guide stays; the mandatory in-app entry
point has **no surface to land on**. Recorded as an evidenced exception to §4.3.

## Z-01 — the defect was already fixed, and the halt file was the problem

Queued as item zero on the strength of HALT-G04. **Both G02 and G04 had been corrected between
2026-08-26 and 2026-08-29.** Verified in `lib/guides/content.ts` *and* on the live page, because
§0.2 requires it: 250/500/1.000 present ×4, «ΑΑΔΕ» ×0, Σ.Δ.Ο.Ε. ×3, and both `κυβισμ` hits are the
deliberate negation «όχι ανά κυβισμό». SRC-010 already carried the verbatim ΦΕΚ excerpt.

**Phase A read the halt file and not the code.** A halt that outlives its defect is a false
statement about the product, read by whoever has least context to doubt it. Both entries are now
CLOSED with evidence. **Close halts when they close.**

Shipped instead: `tests/unit/uninsured-vehicle-fines-fek-verified.test.ts`, a **REGRESSION-GUARD**
(labelled per §0.2 — it cannot fail on pre-change code). Its checker is a pure function so the
probe can run the verbatim pre-fix wording and assert four distinct failures plus a
right-figures-wrong-basis case. 8 tests. **H4 unblocked.**

## G-07 — 29 of 37 citations are unresolvable

| | |
|---|---|
| guides | 15 |
| citations | 37 |
| **UNRESOLVABLE** (bare origin) | **29 — 78%** |
| resolvable (fetched 200) | 8 |
| guides with no resolvable citation | **11 of 15** |
| fully clean | 3 — all created by GA-05 |

A bare origin cannot substantiate its claim *and* cannot go stale detectably — a homepage returns
200 for ever, so `sources-freshness` can never catch it. Same class as the removed trust metrics,
and indexed, because guides emit `Article`/`FAQPage` JSON-LD.

**Consequence, which the brief anticipated: new guides are HELD.** H5, H12, H16, H18 and H4's
extension. Track P and the in-app surfaces proceed — they add no citation surface. Releasing the
hold is GB-04's migration, deliberately not in this run's queue.

## OPEN-3b — additive, so C3 is not cut

`ExtractionSourcesSchema` is `z.record(z.string(), …)` and already accepts any key; citations
persist at `acordData.extraction.sources`, not a DB column; the schema fragment is a conditional
spread; `EXTRACTION_CITATIONS=1` was restored in prod in July. Widening to `conditions[]` /
`coverages[]` needs a key convention, a matcher instead of an exact `Set`, and wider prompt text.
**No schema change, no migration ⇒ C3-0 is buildable and C3 blocks on it.**

The real limit is **backfill**: policies already extracted carry no condition citation, so C3
returns `cannot_determine`/`no_evidence_anchor` for them. Correct, not a defect — but C3's answer
rate grows only as policies are re-analysed, and the copy must not imply otherwise.

## P-00 — the shared contract

`lib/insurance/capability-result.ts`. Two load-bearing choices: **the snippet is required and the
page is not** (the quote is what lets a reader find the sentence; no snippet ⇒ `cannot_determine`,
never a stance — the looser "pointer into extracted text" shape was proposed and overruled), and
**`assumptions` is required on a determined result**, because a number without its inputs is an
assertion. `type-check` clean.

## State at this checkpoint

| item | status |
|---|---|
| Z-01 | **done** — no-op + regression guard; halts closed |
| G-07 | **done** — reported; new guides held |
| OPEN-3b | **determined** — additive |
| P-00 | **done** |
| C3-0, C1, C2a, C4 | **next, in that order** |
| new guides (H5/H12/H16/H18), H4 extension | **held on G-07** |
| C2b | gated on a €/τ.μ. source — one search permitted, then closed |
| C5, H8, H11, H17 | **cut this run** (OPEN-4) |
| S-04 | not yet run |

**Nothing has been merged. Nothing has been deployed. No production data touched.**
