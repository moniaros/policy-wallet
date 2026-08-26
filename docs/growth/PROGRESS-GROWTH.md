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
