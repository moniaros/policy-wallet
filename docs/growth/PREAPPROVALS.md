# PREAPPROVALS — PW-GROWTH-02

**This file is the point of Phase A.** A halt discovered here costs a paragraph; the same halt
discovered mid-loop stalls an item for hours.

**Phase B does not start until the DECISION column is filled for every item marked `OPEN`.**
Items marked `DECIDED` were answered during Phase A on 2026-08-29 and are recorded so Phase B does
not re-ask them.

---

## Decided in Phase A

### D1 — C2b rebuild-cost estimation · `DECIDED: build in full, gated on a source`

**The conflict:** `docs/growth/proposals/H1-rebuild-cost-estimation.md` (GD-03) recommends
**against** computing a rebuild cost "before underwriter sign-off covering six named items". The
brief's C2 mandates exactly that computation.

**Decision: build C2 in full as specified, superseding GD-03** — *but* the brief's own §5.2 rule
binds and is not waived: the €/τ.μ. figure must come from a `SOURCES.md` entry with `verified_at`
and `reverify_after`, never from model knowledge, and **if no source resolves the calculator does
not ship**.

**Consequence Phase B must respect:** GD-03 searched and found no such Greek source. C2b's first
task is therefore *source retrieval*, not code. See OPEN-1.

Two of GD-03's six items carry into the build unconditionally, because C2's own spec already
requires them: always a range, never a point estimate; the band and its source render beside the
number.

### D2 — `DocumentAnchor` · `DECIDED: extracted-text quote, no page number`

`DocumentAnchor` does not exist. `ExtractionSource {page?, snippet?}` is flag-gated behind
`EXTRACTION_CITATIONS=1` and covers 9 top-level scalars — not `coverages[]`, not `conditions[]`.
As specified, **C3 would return `cannot_determine` for every query it ever answered.**

**Decision:** `{ from:'extracted', fieldPath, quote, policyId }`. A pointer into extracted text.
No schema change, no extraction change, no §0.3 halt. UI shows the wording and links to the
document; it never claims a page it does not have.

### D3 — the two live statutory errors · `DECIDED: fix the amounts, leave the attribution`

Both sit in `/guides/prostimo-anasfalistou-oximatos`, the article H4 is to extend.

- **HALT-G04 — CORRECT NOW (item Z-01).** Published: €100/€150/€250 scaled by κυβισμός. ν.5113/2024
  άρ.23 §1α: €1,000 public-use bus/lorry, €500 passenger and all other, €250 two-wheeler — by
  **vehicle class**. A passenger car is understated by €350. Evidence is a verbatim ΦΕΚ excerpt with
  the amounts in words *and* digits.
- **HALT-G02 — LEAVE.** The ΑΑΔΕ attribution stays untouched. Its evidence is an inferential reading
  of which body holds the role, not a verbatim text, and getting a statutory attribution wrong a
  second time in a correction is worse than the original.

Split on evidence strength. **Standing consequence:** H4's extension will sit in an article
carrying a documented-wrong attribution. That is accepted, recorded, and remains OPEN-6.

### D4 — H2 / H7 / H8 · `DECIDED: one bounded retrieval retry, then the cut stands`

HALT-G01 cut all three for want of a verifiable ΦΕΚ. Nothing about et.gr has changed.

**Decision:** spend **one** item (S-04) attempting ν.2496/1997 and ν.4438/2016 via the only path
that has ever worked here — a signed PDF re-hosted by the responsible body (minfin.gov.gr,
elga.gr, pet.gov.gr). Resolves → H2 and the H7 *guide* return. Fails → the cut is final for this
run and C5 stays halted.

Independent of the outcome, **C1 ships in-app** — it needs no statute, only the user's own two
documents.

---

## Open — Phase B is blocked on these

### OPEN-1 · The €/τ.μ. construction-cost source for C2b — **blocks P-02b**

D1 says build; nobody has yet named a source that survives §6. It must be primary, deep-linkable,
datable, and carry a defensible `reverify_after`.

| option | consequence |
|---|---|
| **A. Name a source** *(recommended if one exists)* | C2b builds. Needs a specific URL, not an institution. |
| **B. Accept a range from a named non-primary body** | Weakens §6's standard for one figure. Must be an explicit, recorded exception, not a silent one. |
| **C. No source ⇒ C2b does not ship** | H1 keeps C2a only: "your policy contains an average clause, here is where it sits, here is your insured sum". Truthful and useful; no euro estimate. |

**Recommendation: C unless you can name a source.** C2a alone already answers the question H1's
guide raises, and it carries no estimate risk at all.

**DECISION:** _______________

### OPEN-2 · C1's synonym map — initial coverage set, and whether benefits count — **blocks P-01**

`coverage-synonyms.ts` is authored and versioned, never inferred. Two questions:

1. **Which families ship in v1?** Recommendation: health only (the H7 case), because
   «νοσοκομειακή περίθαλψη» / «νοσηλεία» is the motivating synonym pair and a narrow map is
   reviewable. Motor and home follow once the shape is proven.
2. **Does overlap span `insuredPersons[].benefits[]` as well as `coverages[]`?** Recommendation:
   **no, v1 is `coverages[]` only.** Person-level benefits raise a different question — the same
   person covered twice versus two people each covered once — and conflating them would produce
   exactly the false "paying twice" finding C1 exists to avoid.

**DECISION:** _______________

### OPEN-3 · C3 — may `explicitly_permitted` be shown at all? — **blocks P-03 copy**

The tri-state is `explicitly_permitted | explicitly_excluded | not_addressed`.

| option | consequence |
|---|---|
| **A. Show all three** | Most informative. Risk: "permitted" reads as clearance, and the reader acts on a wording we extracted rather than on their insurer's confirmation. |
| **B. Show excluded and not_addressed; route permitted to "check with your advisor"** *(recommended)* | Asymmetric on purpose. Being told cover may be **absent** prompts a check that costs nothing to be wrong about; being told it is **present** invites reliance. |
| **C. Every stance routes to "check with your advisor"** | Safest, nearly contentless. |

**Recommendation: B.** It matches §2.1 (a prompt to review, never advice to act) while keeping the
outcome that actually protects someone.

**Note whichever you pick:** `not_addressed` is the dangerous outcome and the one an ordinary
reader can never identify for themselves. Its copy must say the policy does not address it **and
that silence is not permission** (§2.3).

**DECISION:** _______________

### OPEN-4 · C5 — may an authority's requirement be quoted verbatim, and in which locales? — **blocks P-05, currently HALTED anyway**

Quoting is the most accurate rendering and the clearest provenance. It also reproduces third-party
text, and a Greek statutory quote has no official English version — a translation would be ours,
presented beside an authority's name.

**Recommendation:** quote verbatim in `el` only; in `en`, state the requirement in our own words
and label it explicitly as our translation, with the Greek original shown beneath. Never present a
translated quote as the authority's text.

**Moot until S-04 resolves.** Answer it anyway so C5 is not blocked twice.

**DECISION:** _______________

### OPEN-5 · X-01 — the H-010 schema decision — **blocks H17**

Insured-person name **and** the missing cyber / business / pension `AcordData` objects, decided as
one unit. Human item, pre-existing, unchanged by this run. Until it lands there is nothing for a
cyber conformance check to read.

**DECISION:** _______________

### OPEN-6 · HALT-G02 — who owns the ΦΕΚ read? — **does not block, but should not lapse**

D3 left the ΑΑΔΕ attribution in place. It is still, on the verified reading, wrong, and the article
currently tells readers to object to the wrong body. It needs someone accountable to read
ν.5113/2024 and settle which body holds the role under the operative text.

Not a Phase B blocker. Recorded so it does not quietly become permanent.

**DECISION / OWNER:** _______________

---

## Foreseeable halts Phase B may still hit

Written here so Phase B recognises them fast rather than treating them as novel:

- **C4's four valuation bases may not be extractable.** If real Greek motor wordings never yield a
  basis clause, C4 returns `cannot_determine` universally. Check against fixtures before writing
  the capability, not after.
- **A guide's claim resolving to no source.** §6: unverifiable → halt, ambiguous → CUT with the
  reason, never hedged.
- **Any reconciliation leaving two live URLs on one statutory claim.** The register's gate.
- **Any capability needing a schema migration, a new gap category, a severity change, or an engine
  change.** §0.3 — never auto-accept.
- **Any output that is a personal recommendation rather than a prompt to review.**
- **Any request for a microsite, geo-grid page, model-specific content, or a voice agent.** All
  struck by the brief; refuse and record.
