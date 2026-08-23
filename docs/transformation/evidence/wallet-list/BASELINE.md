# BASELINE — Πορτοφόλι `/wallet` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/wallet` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/wallet-list-baseline.spec.ts` (paid) + `tests/measure/wallet-list-free.spec.ts` (free).
Fixtures: `provisionMatrixFixtures` (15-policy paid matrix, 6 healthy + 9 `defect-*`) / `FREE_SPECS`.
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure wallet-list-baseline` / `--project=measure-free wallet-list-free`

## Status: BOTH tiers complete

The first `wallet-list-baseline` (paid) run hit a **harness bug, not a product one**: its
`beforeAll` provisions 15 fixtures (6 healthy + 9 `defect-*`) and exceeded Playwright's default 30s
hook timeout — every OTHER spec written for this run copies `policy-detail-free.spec.ts`'s pattern of
calling `test.setTimeout(300_000)` as the first line inside `beforeAll`; this file's first draft
omitted it. Fixed (the omission, not the fixture provisioning), and the rerun below succeeded.

## FREE tier — captured, 3/3 widths

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| populated-free (2 policies) | 320 | 1799 | 2.5 | 12 | 38/3 | **6** | 0 | 12 | 2 | 0 |
| populated-free | 390 | 1568 | 1.9 | 12 | 38/3 | **6** | 0 | 12 | 1 | 0 |
| populated-free | 430 | 1532 | 1.6 | 12 | 38/3 | **6** | 0 | 12 | 1 | 0 |

### Confirmed findings (free tier)

**W1 — three per-row quick-action buttons are 36px wide against the 44px minimum, at every width,
on every row.** `tapTargets` names them explicitly: «Κατανόηση ασφαλιστηρίου» (Understand your
policy), «Έγγραφα» (Documents), «Κοινοποίηση σε σύμβουλο» (Share with adviser) — each rendered at
**36×44** (height passes, width fails by 8px). 3 buttons × 2 policies = 6 offenders per capture,
constant across all three widths — this is a fixed-width CSS problem, not a viewport-squeeze one.

**W2 — a real insurer name truncates in the policy row.** «Εθνική Ασφαλιστική» clips at
`scrollWidth=129 / clientWidth=85` (`span.truncate.text-body-sm`) — the insurer name is the
customer's primary way of identifying which policy a row is about (the same D7-class concern the
dashboard's own long-insurer fixture exists to test), and it is cut on a real, moderately-short
Greek insurer name, not only the pathological 130+ character legal names.

**1.4.11: 12 findings, mostly `control` and `unmeasured`.** Sampled: the search input («Αναζήτηση
ασφαλιστηρίων...») at 1.32:1, the manual-add button at 1.21:1, plus two `unmeasured` readings on the
upload/batch-upload buttons where inside and outside pixels were identical (their fill is `#ffffff`
against a `#ffffff` page background with no border — genuinely no boundary to measure, not a
harness miss).

## PAID tier — captured, 3/3 widths (rerun succeeded after the timeout fix)

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| populated-paid (15 policies) | 320 | 5703 | 7.9 | 9 | 143/3 | **87** | 0 | 39 | 9 | 0 |
| populated-paid | 390 | 5580 | 6.6 | 9 | 143/3 | **87** | 0 | 39 | 2 | 0 |
| populated-paid | 430 | 5513 | 5.9 | 9 | 143/3 | **87** | 0 | 40 | 2 | 0 |

### W1, confirmed at scale
The three 36×44 per-row action buttons found on the free-tier 2-policy wallet (W1 above) recur
**29 times each** on the 15-policy paid wallet — 3 × 29 = 87, exactly the reported sub-44 count.
Constant across all three widths: a fixed-CSS-width problem, not a viewport squeeze.

### W2, confirmed on a COMMON insurer name, not only long ones
`Εθνική Ασφαλιστική` clips as before, but so does **`Interamerican`** — 88px content in an 85px box,
a 3px overflow on one of the most common insurer names in the fixture set, appearing 4 times in this
capture alone. W2 is not an edge case triggered only by unusually long legal names; an ordinary
9-character brand name already overflows its column at 320px.

### New finding — a fixture display-name leaks into a section heading, rendered TWICE
`sections.ids` lists **`<div> Καλώς ήρθατε πίσω, E2E!`** (`"Welcome back, E2E!"`) as TWO separate
matched elements. This is the exact defect `docs/transformation/PROGRESS.md` (Checkpoint 3) already
named for a different surface — *"«Καλώς ήρθατε πίσω, E2E!» is a clean Greek string with a fixture
display-name leaking through it (identity scrubbing, not i18n)"* — confirmed here as ALSO present on
`/wallet`, and rendered in duplicate on this surface specifically (the sectionCount probe's two
matches are two distinct DOM nodes, not a counting artifact — both carry the identical heading text
at different container depths).

## Not captured in this pass
- Empty-wallet and single-policy states for `/wallet` specifically — this surface always renders
  whatever the account holds, and the paid account's 15-fixture matrix (needed by `/wallet/[id]` and
  `/coverage-insights` too) cannot be emptied without breaking those other surfaces' fixtures. An
  empty/single state for `/wallet` would need its own scoped account, not attempted in this pass.
