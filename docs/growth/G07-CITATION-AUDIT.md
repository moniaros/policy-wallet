# G-07 — legacy citation audit

**Run:** PW-GROWTH-02, 2026-08-29. Ordered by the owner to run immediately after Z-01 and to
report **before any new guide ships**, because Z-01's defect was published *under a sources
heading* — which makes the corpus's citations a live truth question, not queued debt.

## The number

| | |
|---|---|
| guides in corpus | **15** (not 12 — GA-05 added three) |
| citations total | **37** |
| **UNRESOLVABLE** (bare origin) | **29** — 78% |
| resolvable (deep link, fetched 200) | 8 |
| guides with **no resolvable citation at all** | **11 of 15** |
| guides fully clean | 3 — all three created by GA-05 |
| guides mixed | 1 — `prostimo-anasfalistou-oximatos` |

**Method.** Every `url:` inside every guide's `sources:` block, classified by URL path: an empty
path is a bare origin, anything else is a deep link. Every deep link was then fetched. Nothing was
inferred from a slug.

## What "unresolvable" means here, precisely

A bare origin is `https://www.eaee.gr` cited as the source for a specific statutory or contractual
claim. It fails on two counts, and the second is the one that matters:

1. **It cannot substantiate the claim.** A reader who follows it lands on a homepage and has no way
   to reach the sentence the article rests on.
2. **It cannot go stale detectably.** A homepage returns 200 for ever. `sources-freshness` can never
   catch it, so the citation looks maintained in perpetuity while the claim behind it drifts.

This is the same class of defect as the trust metrics removed from this site: **material presented
as verified, under a heading that asserts it is verified**, and it is published and indexed —
guides emit `Article` and `FAQPage` JSON-LD, so the «Πηγές» block is machine-read as provenance.

## The bare origins

| count | origin |
|---|---|
| 11 | `https://www.eaee.gr` |
| 9 | `https://www.bankofgreece.gr` |
| 4 | `https://www.gov.gr` |
| 3 | `https://www.aade.gr` |
| 1 | `https://www.epikef.gr` |
| 1 | `https://www.dias.com.gr` |

Twelve guides carry at least one. Three carry three each
(`apallagi-asfaleia-ygeias-pos-leitourgei`, `omadiko-symvolaio-ergasias`,
`pliromi-asfalistron-psifiaka`, `poso-kostizei-i-asfalisi-seismou`, `ti-kalyptei-i-asfaleia-aytokinitou`).

## The eight that resolve

All fetched 200 on 2026-08-29. Every one comes from a **responsible body re-hosting a signed
document** — minfin.gov.gr, elga.gr — or from an insurer publishing its own wording. That is the
only retrieval path that has ever worked here, and it is the pattern GA-05 followed deliberately.

Two caveats worth carrying, neither disqualifying:
- `vraxychronia-misthosi-asfalisi-katoikias` cites the **same PDF twice**, by part (Γενικοί /
  Ειδικοί Όροι). Already disclosed in `PROGRESS-GROWTH.md`; truthful, and preferable to padding
  with an uncited link.
- `elga.gr/thesmiko-plaisio/` is a **section index**, not a document. Weaker than its sibling, which
  is the ΚΥΑ PDF itself.

## Consequence — the order of work changes

The brief anticipated this: *"If it is high, ten new guides are being added to a corpus with a live
truth problem, and the order of work changes."*

**78% is high, and 11 of 15 guides cite nothing a reader can check.** Shipping four new guides on
top of that adds correct citations to a corpus whose existing ones are decorative, and makes the
«Πηγές» heading less trustworthy, not more, because the reader cannot tell which kind they are
looking at.

**Decision taken under the run contract: new guides are held; Track P and the in-app surfaces
proceed.** They add no citation surface at all.

| held (adds a guide) | proceeds (adds no guide) |
|---|---|
| H5, H12, H16, H18 | P-00, C1, C2a, C4 capabilities |
| H4's extension | the in-app surfaces for H1, H3, H7, H12 |
| | M-01 ticker extension, H10 slot |

**What would release the hold:** GB-04's migration — `GuideSource` becomes `{id}` resolving into
`SOURCES.md`, and the 29 are either re-verified to a deep link or the claim they support is cut.
`SOURCES.md`'s own record is that re-verifying the legacy set is the dominant cost, and that the
et.gr blocker applies to a share of them. That is a sized piece of work, not a sweep, and it is
**not** in this run's queue — it is the next thing the owner should schedule.

**This is a report, not a repair.** G-07 was scoped to size the problem and it has.
