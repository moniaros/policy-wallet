# HALTS-GROWTH — GROWTH-HOOKS-01

## HALT-G01 — Six of ten hooks cannot ship. Four can.

§4: *"Where a rule is genuinely uncertain or contested, the hook is **cut**, not softened."*
§10: *"Any hook whose statutory basis cannot be verified against a primary source."*

Track B verified **16 claims across 5 hooks** against primary sources. The rest are cut.

| hook | status | basis |
|---|---|---|
| **H1** underinsurance / αναλογικός κανόνας | **SHIPS** | 4 claims. Two real published wordings (home + a gov-hosted motor wording); building value = rebuild cost, average clause, explicit motor formula, all citing άρθρο 17 ν.2496/1997 |
| **H3** short-term letting / change of risk | **SHIPS** | 4 claims from a home wording: inception disclosure duty, negligence *reduces* vs fraud *releases*, 14-day επίταση duty, theft cover lapsing after 30 days unoccupied |
| **H4** uninsured-vehicle cross-check | **SHIPS, RETITLED** | 4 claims from **ν. 5113/2024, ΦΕΚ Α΄ 96** — half-yearly cross-check, €1,000/€500/€250, 3-month re-check then plates removed, 10-working-day objection. **But see HALT-G02.** |
| **H6** ΕΛΓΑ vs replacement cost | **SHIPS** | 3 claims from **ΚΥΑ 157502/2011, ΦΕΚ Β΄ 1668** — closed peril list, ≤20% pays nothing / 88% of the part above 15%, administratively fixed unit value |
| **H5** mandatory dog-owner liability | **CUT — premise false** | See HALT-G03 |
| **H2** bank-mandated fire policy | **CUT** | Depends on ν.2496/1997 / ν.4438/2016; no public body re-hosts them and et.gr serves no document to a fetcher |
| **H7** group vs individual health | **CUT** | Same. (Already an EXTEND, not a new article — so nothing is lost from the live corpus.) |
| **H8** PI limits vs licensing minima | **CUT** | Same, plus per-profession minima that would need one source per body |
| **H9**, **H10** | **CUT (G-02)** | Already cut before Track B: not checkable statutory facts about the reader's own policy |

**Four hooks proceed: H1, H3, H4, H6.** Against the G-02 register that is three CREATEs and one
EXTEND — a coherent subset, not a fragment.

**What would clear H2/H7/H8:** a working ΦΕΚ retrieval path. **et.gr serves no document to a
fetcher** — its download endpoints 301→404 and its search is a JS shell — so every ΦΕΚ that *was*
verified came from an official signed PDF **re-hosted by the responsible body**
(minfin.gov.gr, elga.gr, pet.gov.gr). Three hooks have sources for exactly that reason and three do
not. Tractable, not open-ended.

---

## HALT-G02 — ~~A misattributed statutory claim is LIVE on our own site~~ · **CLOSED 2026-08-29**

> **CLOSED — corrected between 2026-08-26 and 2026-08-29, verified on the live page.**
> `/guides/prostimo-anasfalistou-oximatos` now contains **zero** occurrences of «ΑΑΔΕ» and
> attributes the fine to «Γενική Διεύθυνση Σώματος Δίωξης Οικονομικού Εγκλήματος (Γ.Δ. Σ.Δ.Ο.Ε.)»
> in three places. Confirmed in `lib/guides/content.ts` **and** by fetching
> `https://www.policywallet.gr/guides/prostimo-anasfalistou-oximatos` — the source check alone
> would not have been enough, per §0.2.
> Pinned by `tests/unit/uninsured-vehicle-fines-fek-verified.test.ts`.
>
> **This entry was stale for three days and it cost real work.** PW-GROWTH-02's Phase A read the
> halt, not the code, and planned an item to fix a defect that no longer existed. A halt file that
> outlives its defect is not a neutral leftover — it is a false statement about the product, and it
> is read by exactly the people with the least context to doubt it. **Close halts when they close.**

### Original entry, kept for the record

**Not raised by this goal. Found by it, and it is the most actionable thing in this report.**

Track B's reading of ν. 5113/2024 (ΦΕΚ Α΄ 96) assigns the uninsured-vehicle cross-check to
**Γ.Γ.Π.Σ.Ψ.Δ.** and the fine to **Σ.Δ.Ο.Ε.** ΑΑΔΕ's role is road tax.

Our published guide says otherwise, **right now**, at
`https://www.policywallet.gr/guides/prostimo-anasfalistou-oximatos` — fetched 2026-08-26:

> «…με ηλεκτρονικές διασταυρώσεις της **ΑΑΔΕ** και ελέγχους της Τροχαίας»
> «η **ΑΑΔΕ** διασταυρώνει περιοδικά το μητρώο οχημάτων…»
> «…στην **ΑΑΔΕ**, με αποδεικτικό ασφάλισης για την επίμαχη περίοδο»

That is a statutory attribution, published, indexed, and — on the verified reading — wrong. It is
also the article H4 was going to EXTEND, so it is inside this goal's boundary.

**Not corrected on the agent's own authority**, for one reason worth stating: administrative
reorganisation means ΑΑΔΕ may well have run this cross-check when the article was written. The
question is not "was this ever true" but "which body does the *operative* law name" — and getting a
statutory attribution wrong a second time, in a correction, is worse than the original. This needs
the ΦΕΚ read by someone who can be accountable for it.

**Recommended:** correct the attribution and the reader instruction together, since the article
currently tells people to object *to the wrong body*.

---

## HALT-G03 — H5's premise is false. There is no mandatory dog-owner liability insurance.

The hook as briefed asserts a legal obligation that does not exist. Track B read ν. 4830/2021 in
full: its only insurance reference concerns **stray** animals, relieving the registered keeper where
compensation is paid «από άλλον φορέα, όπως ασφαλιστική εταιρεία». What ν. 4830/2021 άρ. 9 §2 *does*
establish is that the owner is **liable** under ΑΚ 924 — liability, not a duty to insure.

This is a different and more serious failure than "unverifiable". An unverifiable hook might be
true. **This one is false**, and had it shipped it would have told Greek consumers they were legally
required to buy a product they are not required to buy — on a site that does not sell insurance and
whose entire positioning is that it does not.

The *underlying* fact survives and is verified: you are liable, and a home policy's αστική ευθύνη
section may already respond. That is a legitimate hook. **It is not the hook that was briefed**, so
it is recorded as a cut and a rewrite, not as a softening.


---

## HALT-G04 — ~~The published fine amounts are wrong~~ · **CLOSED 2026-08-29**

> **CLOSED — corrected between 2026-08-26 and 2026-08-29, verified on the live page.**
> The article now reads «κλιμακούμενο **ανά κατηγορία οχήματος και όχι ανά κυβισμό**: 250 ευρώ για
> τα δίκυκλα, 500 ευρώ για τα επιβατηγά και κάθε άλλο όχημα, και 1.000 ευρώ για τα λεωφορεία και τα
> φορτηγά δημόσιας χρήσης», citing άρθρο 23 του ν. 5113/2024. The live page carries the three
> figures four times over and neither retired figure (€100, €150) appears anywhere in it.
> SRC-010 already carried the verbatim ΦΕΚ excerpt, so no source work was owed.
>
> Pinned by `tests/unit/uninsured-vehicle-fines-fek-verified.test.ts`, which is a
> **REGRESSION-GUARD** — it could not fail on pre-change code and is reported as such. Its probe
> block runs the checker against the wording quoted below and asserts it red, which is the only way
> a guard over an already-correct corpus can be shown to work.
>
> **H4 is unblocked.**

### Original entry, kept for the record

**Found while writing H4's extension. Second defect in the same article as HALT-G02, verified from a
verbatim ΦΕΚ excerpt rather than by inference — so the evidence here is stronger than G02's.**

Live at `/guides/prostimo-anasfalistou-oximatos`, fetched 2026-08-26:

> «παράβολο κλιμακούμενο **με τον κυβισμό** — ενδεικτικά **100 ευρώ** για δίκυκλα, **150 ευρώ** για
> επιβατικά μικρά … **250 ευρώ** για μεγαλύτερα»

ν. 5113/2024, άρθρο 23 §1α, verbatim (SRC-010):

> «πρόστιμο **χιλίων (1.000)** ευρώ για τα λεωφορεία και φορτηγά δημόσιας χρήσης, **πεντακοσίων
> (500)** ευρώ για τα επιβατηγά και άλλα οχήματα κάθε φύσης και **διακοσίων πενήντα (250)** ευρώ για
> τα δίκυκλα»

Two errors compounded:

| | published | law |
|---|---|---|
| basis | engine size (κυβισμός) | **vehicle class** |
| passenger car | €150 | **€500** |
| bus / public-use lorry | (not covered; implies ≤€250) | **€1,000** |
| two-wheeler | €100 | **€250** |

**Every figure understates the liability**, a passenger car by €350. The article hedges with
«ενδεικτικά», but an indicative figure three times too low is not a hedge — it is a wrong number
with a disclaimer attached. A reader who budgets from this page is short.

This ranks **above HALT-G02** for urgency. The attribution error sends someone to the wrong office;
this one tells them the wrong amount, and money is the thing a reader of this page came for.

**Not corrected on agent authority**, for the same reason as G02 and no other: it is a statutory
figure, and the accountable read must confirm that άρ. 23 has not itself been amended since. But
unlike G02 there is no ambiguity about *what the text says* — the excerpt is verbatim and the
amounts are spelled out in words as well as digits, which is how ΦΕΚ guards against exactly this.

**Recommended, and cheap:** correct the three figures and the basis, in the same pass as G02's
attribution, since both sit in the same article and the same read of the same law resolves both.

---

## Two method findings worth keeping

**1. Publication by the responsible body is not evidence of being in force.** ΕΛΓΑ's own site serves
the **1998** ΚΥΑ as though current; the operative text is the **2011** ΚΥΑ, amended through
2025-06-20, and the peril lists **differ** — the 1998 version omits ηλιακή ακτινοβολία. A hook built
on the page that ranks would have *understated* cover. The page you land on is not the law.

**2. A parity guard scoped to two hardcoded files guards two files.**
`tests/unit/monetization-config.test.ts:187-222` greps exactly two paths. **Every surface the
free-tier fix touched was outside its universe**, which is why an intra-page contradiction survived
on `/pricing` — the free card said «3 ασφαλιστήρια» while the comparison table on the same page said
`1`. Seventh instance of this shape in this programme. It should enumerate from the filesystem.

Related and unfixed: `docs/operations/SEO_STRATEGY.md:18` claims *"Free-tier contradiction fixed
(3 policies everywhere)"*. That was **false until this run**.

---

## Open, needing product input — not halts

- `freeUnlockedLimit = 2` (coverage insights) vs `FREE_GAP_PREVIEW_COUNT = 3` (gap report): one
  promise, two screens, two numbers. Different unit from the policy-count fix.
- Stale tier copy: Pro described as "unlimited" (it is 25); "the free plan does not include AI
  analyses" (it does).
- **GB-04** — the 30 legacy `/guides` citations, every one a bare origin. Decision recorded:
  `SOURCES.md` becomes the source of truth and `GuideSource` becomes `{ id }`, because claims are
  cited by more than one article and duplicated evidence drifts. Re-verifying the 30 is the dominant
  cost and the same ΑΑΔΕ/et.gr blockers apply.
