# F5 — rendered numbers before and after citation-backed provenance (PW-TRANSPARENCY-02 close-out)

Seeded customer wallet (`e2e-ph@policywallet.test`: her own analysed motor policy with one under-review finding, plus the agent-demo motor policy `#63708952` carrying two unauthored findings and — new in this run — one AUTHORED finding, `insured_value_above_declared`, seeded by `scripts/seed-agent-demo.mjs`) and the seeded agent book (`e2e-agent@`), 390px, Greek.

**Before** = the R3 "after" capture (`docs/evidence/transparency-r3/r3-after/`, 2026-09-05 13:5xZ, NEW-UI code before this block). The fixture differed by the one authored finding, which the pre-F5 code would have rendered as `under_review` — counted in no summary, no chip, no KPI — so the before numbers are the same with or without it. **After** = `docs/evidence/transparency-f5/after/` (2026-09-05 21:5xZ, this branch at `5b5e1455`), captured by `tests/measure/r3-evidence.spec.ts`, `r3-evidence-agent.spec.ts`, `r3-evidence-f5.spec.ts`, `r3-evidence-agent-f5.spec.ts`.

## B2C dashboard and wallet

| site | before | after |
|---|---|---|
| Home hero open-recommendation count (`recommendation.openCount`) | 4 ευρήματα ίσως χρειάζονται έλεγχο | 4 ευρήματα ίσως χρειάζονται έλεγχο — unchanged: the seed writes gap rows, not recommendation rows, so no recommendation derives from the classified finding in this fixture |
| Home attention list | 3 items | 3 items (same three; none gap-derived) |
| Home gap tile | «Τα ευρήματα υπό αξιολόγηση δεν περιλαμβάνονται σε αυτή τη σύνοψη — τα …» (under review only) | **«1 Νομοθετική απαίτηση»** (`gap.provenanceCount#legislative`) + the under-review sentence |
| /protection headline | 3 σημεία υπό αξιολόγηση στα ασφαλιστήριά σας — δεν έχουν ταξινομηθεί ακόμη, οπότε δεν μετρούν ως ευρήματα. | **Εντοπίστηκε 1 σημείο προς έλεγχο στα ασφαλιστήριά σας — και 3 υπό αξιολόγηση, που δεν έχουν ταξινομηθεί ακόμη.** |
| /protection card microcopy (coverage-insights card of the classified finding) | class label only («Υπό αξιολόγηση») | **Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση)** (`protection-citation-390.png`) |
| Seeded policy findings page — summary band | (run 1, before the seam fix below) «— εκ των οποίων 3 υπό αξιολόγηση…», no citation | **— εκ των οποίων 2 υπό αξιολόγηση, δεν έχουν ταξινομηθεί ακόμη**; the classified card renders `gap.citation` = «Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση)» (`policy-citation-390.png`) |

## Agent book

| site | before | after |
|---|---|---|
| KPI «Με κενά κάλυψης» (`agent.gapClients`) | Με κενά κάλυψης0 | **Με κενά κάλυψης1** |
| Client card chip (`client.openGapCount`) | not rendered (0 classified) | **«1 ανοιχτά ευρήματα»** (singular label fixed in this block; run 1 said «1 ανοιχτά ευρήματα») |
| Client list group | «Σε καλή πορεία (1)» | **«Χρειάζεται προσοχή (1)»** |
| KPI «Μέσος δείκτης προστασίας» | 16/100 | **absent** (F2) — `scoreWords: false` |
| /insights recent-gaps pills (`gap.provenance`) | 3 × «Υπό αξιολόγηση» (run 1 — see seam 2) | **«Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση)» · «Υπό αξιολόγηση» · «Υπό αξιολόγηση»** (`agent-insights-citation-390.png`) |

## Two seams this evidence run exposed (both fixed in `5b5e1455`, both guarded)

1. **The findings page and the home tally disagreed about the same finding.** Report items carry `normalizeGapSlug`'s kebab form (`insured-value-above-declared`); the provenance map is keyed by the authored snake_case slug. The home tally (definition slug) said «1 Νομοθετική απαίτηση»; the policy's own findings page said «3 υπό αξιολόγηση» and rendered no citation. Fix: `canonicalGapSlug` in the ONE lookup (`provenanceEntry`) and in `catalogueIndexOf`, so every caller agrees. Test: `provenance-citations-render.test.tsx` pins both forms and the findings-page summary.
2. **The agent insights rows never carried a slug** (`definition: { select: { title: true } }`), so `provenanceOf(undefined)` made every pill «Υπό αξιολόγηση» since B3 — a pre-existing defect that only a classified slug could reveal. Fix: slug selected and typed on the DTO.

Neither could have been found by the unit guards alone: each piece answered correctly for its own slug form. The gate checks code; journeys check the product.

## Counts that name a class without a citation — deliberately

`gap.provenanceCount#legislative` («1 Νομοθετική απαίτηση») on the home and the agent KPI/chip are COUNT DOORS (B4): they name no requirement, and the page they open renders each requirement with its citation. The render-site guard exempts the class-only section heading of the findings list for the same reason, with the reason in the file.
