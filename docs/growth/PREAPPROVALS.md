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

### D2 — `DocumentAnchor` · ~~`DECIDED: extracted-text quote`~~ **SUPERSEDED BY OPEN-3b (2026-08-29)**

> **This decision was overturned by the owner before any code was written.** The relaxed
> extracted-text anchor is **not** to be used. C3 blocks on real citation coverage instead —
> see OPEN-3b. The reasoning below is kept because it explains the problem OPEN-3b solves
> differently, not because it is in force.

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

### OPEN-1 · The €/τ.μ. source for C2b — **DECIDED: C2a only; C2b stays GATED, not cut**

D1 says build; nobody has yet named a source that survives §6. It must be primary, deep-linkable,
datable, and carry a defensible `reverify_after`.

| option | consequence |
|---|---|
| **A. Name a source** *(recommended if one exists)* | C2b builds. Needs a specific URL, not an institution. |
| **B. Accept a range from a named non-primary body** | Weakens §6's standard for one figure. Must be an explicit, recorded exception, not a silent one. |
| **C. No source ⇒ C2b does not ship** | H1 keeps C2a only: "your policy contains an average clause, here is where it sits, here is your insured sum". Truthful and useful; no euro estimate. |

**Recommendation: C unless you can name a source.** C2a alone already answers the question H1's
guide raises, and it carries no estimate risk at all.

**DECISION:** see the binding block at the foot of this file.

### OPEN-2 · C1's synonym map — **DECIDED: health only, authored, narrow**

`coverage-synonyms.ts` is authored and versioned, never inferred. Two questions:

1. **Which families ship in v1?** Recommendation: health only (the H7 case), because
   «νοσοκομειακή περίθαλψη» / «νοσηλεία» is the motivating synonym pair and a narrow map is
   reviewable. Motor and home follow once the shape is proven.
2. **Does overlap span `insuredPersons[].benefits[]` as well as `coverages[]`?** Recommendation:
   **no, v1 is `coverages[]` only.** Person-level benefits raise a different question — the same
   person covered twice versus two people each covered once — and conflating them would produce
   exactly the false "paying twice" finding C1 exists to avoid.

**DECISION:** see the binding block at the foot of this file.

### OPEN-3 · C3 `explicitly_permitted` — **DECIDED: show it, anchor mandatory**

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

**DECISION:** see the binding block at the foot of this file.

### OPEN-4 · C5 quoting — **DECIDED: C5 HALTED this run; H8, H11, H17 CUT**

Quoting is the most accurate rendering and the clearest provenance. It also reproduces third-party
text, and a Greek statutory quote has no official English version — a translation would be ours,
presented beside an authority's name.

**Recommendation:** quote verbatim in `el` only; in `en`, state the requirement in our own words
and label it explicitly as our translation, with the Greek original shown beneath. Never present a
translated quote as the authority's text.

**Moot until S-04 resolves.** Answer it anyway so C5 is not blocked twice.

**DECISION:** see the binding block at the foot of this file.

### OPEN-5 · X-01 — **DECIDED: deferred; nothing in GROWTH-02 waits on it**

Insured-person name **and** the missing cyber / business / pension `AcordData` objects, decided as
one unit. Human item, pre-existing, unchanged by this run. Until it lands there is nothing for a
cyber conformance check to read.

**DECISION:** see the binding block at the foot of this file.

### OPEN-6 · HALT-G02 — **DECIDED: Product-Truth owns it, verbatim beats inferential**

D3 left the ΑΑΔΕ attribution in place. It is still, on the verified reading, wrong, and the article
currently tells readers to object to the wrong body. It needs someone accountable to read
ν.5113/2024 and settle which body holds the role under the operative text.

Not a Phase B blocker. Recorded so it does not quietly become permanent.

**DECISION:** see the binding block at the foot of this file.

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


---

# DECISIONS AS FILLED BY THE OWNER — 2026-08-29

Phase B is unblocked. These are binding and supersede anything above them.

## OPEN-1 · C2a only. C2b GATED, not cut.
No verified URL can be named, and asserting one would be the exact failure §6 forbids.
**One** search is permitted before closing — TEE published construction-cost figures; the ΑΑΔΕ
«ελάχιστο κόστος οικοδομικών εργασιών»; the ΕΛΣΤΑΤ construction cost index. If none resolves to a
current, citable €/τ.μ. with a date and a `reverify_after`, **C2b does not ship this run**.
GD-03 already searched once — **do not spend a second agent-hour on it**.
H1 ships on C2a alone. **Copy must not imply a shortfall figure is coming.**

## OPEN-2 · C1: health only, authored, narrow.
Seed **exactly** the benefit set appearing in the ομαδικό/ατομικό overlap. Nothing else, no other
branch. Render `unmapped` **prominently** — a long unmapped list is the signal the map is not
ready, and hiding it converts an honest gap into a silent one. Never infer a synonym at runtime.
Expanding the map is a later item with its own review, never opportunistic.

## OPEN-3 · C3: show `explicitly_permitted`, anchor mandatory.
Suppressing it makes the tri-state a bi-state and tells someone their policy is silent when it is
not — worse than the risk of showing it. Copy: *the policy addresses this and appears to permit it;
confirm with your insurer before relying on it.* **Never clearance to act.**

## OPEN-3b · C3 blocks on real citation coverage. **This supersedes D2.**
A capability returning `cannot_determine` for every query it will ever answer is shipped, correct
and useless. That finding must not be worked around.
- **Additive within the existing flag** → build it as **C3-0**; C3 blocks on it.
- **Requires a schema change** → **C3 does not ship this run.**
**Do not relax the anchor requirement to make it shippable.** A stance without evidence is an
assertion about someone's cover.

## OPEN-4 · C5 HALTED. H8, H11, H17 CUT from the queue.
Not blocked-and-open — that reads as pending work. **Cut, with the reason recorded.**
Rule for whenever C5 unblocks: short verbatim quotation of statutory or licensing text is
**permitted and preferred over paraphrase** — a paraphrased limit is how a number drifts — always
attributed, always beside its source link, both locales, **never re-expressed as a different
figure**.

## OPEN-5 · X-01 deferred.
No insured-person name, no cyber/business/pension `AcordData` this run. H17 is cut anyway.
Revisit when a real capture shows non-zero health duplicates, or a real cyber/business/pension
policy is uploaded.

## OPEN-6 · HALT-G02 owned by Product-Truth (Opus 5).
**One rule: a verbatim excerpt beats an inferential reading, always.** Where the two conflict and
the verbatim text does not settle the attribution, **CUT that specific claim** with the reason
recorded. Do not hedge. Do not carry both readings. Do not escalate.

## REGISTER CORRECTION · binding on the queue
H1, H3, H6, H11 convert from CREATE to **EXTEND or NO-OP** against their published guides.
**Any CREATE row whose slug already exists is a halt condition, not a judgement call.**
H11 is cut under OPEN-4 regardless.

## Z-01 · first item, ahead of every capability and every hook
Replace the figures with the ΦΕΚ-verified ones **and add the `SOURCES.md` entry with the verbatim
excerpt**. **Do not remove the numbers.** H4 blocks on it.
Then: the defect was published *under a sources heading*, so **G-07 is not queued debt** — run it
immediately after Z-01 and report the UNRESOLVABLE count **before any new guide ships**.
Fifteen guides, not twelve.

---

## OPEN-3b — DETERMINED 2026-08-29: **additive. C3-0 is buildable.**

Investigated before P-00 was written, because the answer defines `DocumentAnchor`.

**Evidence:**
- `ExtractionSourcesSchema` is `z.record(z.string(), {...})` (`lib/services/ai/extraction-citations.ts:48`) — it **already accepts any key**. No Zod response-schema change.
- Citations persist at **`acordData.extraction.sources`** (`lib/services/ai/extraction-enrichment.ts:193-194`) — inside the JSON. **Not a DB column** (`prisma/schema.prisma` has neither `fieldSources` nor `extractionSources`). **No migration.**
- The schema fragment is a conditional spread (`lib/services/ai/extraction-schema.ts:63`) — additive by construction.
- The flag is `envOnly`, `defaultValue: false` (`lib/flags/registry.ts:154-168`), and **`EXTRACTION_CITATIONS=1` was restored in production in July 2026** after the Gemini schema-budget incident (`docs/status-archive-2026-07.md:131`).

**So the extension needs only:** a key convention for array elements (`conditions[3]`, `coverages[0]`); `CITATION_FIELDS` to become a matcher rather than an exact-membership `Set`; the prompt section widened. **No schema change ⇒ C3 is not cut.**

### The real limit, which is a backfill problem and not a schema one

Widening the contract helps **future** extractions. Every policy already in the wallet was extracted under the narrow field set and carries no condition or coverage citation. For those, C3 returns `cannot_determine` with `no_evidence_anchor`.

**That is correct behaviour, not a defect** — it is precisely what the discriminant exists for, and it is the honest answer: we have the wording but cannot show the reader where in their document it sits. It does mean **C3's coverage grows only as policies are re-analysed**, and the in-app copy must not imply otherwise. Recorded so nobody later reads the low answer-rate as a bug.
