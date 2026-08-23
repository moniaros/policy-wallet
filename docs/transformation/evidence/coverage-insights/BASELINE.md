# BASELINE — Αναλύσεις `/coverage-insights` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/coverage-insights` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` (shared definitions) + `tests/measure/surface-harness.ts` (generic
open/settle/measure/write) + `tests/measure/coverage-insights-baseline.spec.ts` (paid) +
`tests/measure/coverage-insights-free.spec.ts` (free). Fixtures: `provisionMatrixFixtures` (the same
15-policy paid matrix `wallet-list-baseline` uses; `FREE_SPECS` for the free capture).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure coverage-insights-baseline` and `--project=measure-free coverage-insights-free`
**Raw evidence:** `data/current/*.json` (4 captures), `screenshots/current/*.png`.

## Settle procedure

Identical across every T-015 surface — see `notifications/BASELINE.md`'s statement of it; not
repeated per-file beyond this pointer, per instruction to keep it recorded on every document.

## §7.5's claim, tested

`docs/transformation/LEDGER.md`'s own entry for this surface says: **"§7.5 calls this 'the densest
surface in the app' and wants the most aggressive reduction. That claim is UNMEASURED on current
code — no baseline exists for it."** This pass is that measurement, and **the claim is CONFIRMED,
not just plausible:**

| surface | state | width | scrollHeight | screens |
|---|---|---|---|---|
| `/coverage-insights` | 15-policy (paid) | 320 | **13,454px** | **18.7** |
| `/coverage-insights` | 2-policy (free) | 320 | **9,444px** | **13.1** |
| `/dashboard` | heaviest state (12 policies) | 320 | 6,263px | 8.7 |
| `/wallet/[id]` | any single-policy fixture | 320 | 2,800–4,930px | 3.9–6.8 |
| `/notifications` | populated (paid) | 320 | 5,002px | 6.9 |
| `/wallet` | 15-policy list (paid) | 320 | (pending — see wallet-list BASELINE.md) | — |

**Even the FREE-tier, 2-policy capture (9,444px) is denser than the dashboard's most heavily
populated 12-policy state (6,263px).** Density here is not proportional to portfolio size the way
`/dashboard`'s is — the per-policy cost on this surface is far higher. §7.5's "most aggressive
reduction" target is justified by measurement, not assertion.

## 0a. Metric table — 4 captures

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | **1.4.11** | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| populated-paid | 320 | 13454 | 18.7 | 6 | 192/3 | 23 | 0 | **74** | 2 | 0 |
| populated-paid | 390 | 12328 | 14.6 | 6 | 193/3 | 23 | 0 | **74** | 2 | 0 |
| populated-paid | 430 | 11739 | 12.4 | 6 | 193/3 | 23 | 0 | **75** | 3 | 0 |
| populated-free | 320 | 9444 | 13.1 | 7 | 126/4 | 22 | 0 | **65** | 5 | 0 |

## 0b. Reading the numbers

- **"6 sections" undercounts the visible complexity.** `sectionCount`'s definition rewards `section[id]`
  landmarks; this page has almost none (its six matches are mostly `<div>`/`<button>`/`<p>` fallback
  labels, not IDs — see the raw `ids` list below). 192 containers at max depth 3 (paid) is the more
  honest density signal, and it is **6–10× the dashboard's own container count** (45–89 across its
  whole matrix) for a page with the SAME "6 sections" headline number. A structural-reduction target
  written against section count alone would declare this page already compliant while its DOM stayed
  the densest in the product.
- **23 sub-44px tap targets (paid), 22 (free) — every one of them is an UNLABELED icon button.**
  `tapTargets` records empty `text: ''` for 13 buttons at 24×24 and 9 at 16×24 (paid, 320px) — these
  are simultaneously a tap-target-size failure AND a missing-accessible-name failure (no visible text,
  and the probe did not find an `aria-label` value either, since it falls back to `textContent ||
  aria-label` and returned empty for both). One labelled control, «Έλεγχος» at 88×28, fails on
  height only.
- **1.4.11 is the highest of any surface measured so far: 74–75 findings.** Breakdown at 320px (paid):
  44 `unmeasured` (sampler found no colour boundary — inside/outside pixels identical, most commonly
  around a `Σημείωση` button whose fill matches its parent exactly), 23 `control` (**GATED class** —
  actual SC 1.4.11 failures on interactive elements, the same order of magnitude as the whole rest of
  the app combined), 6 `surface`, 1 `shell`. The `control` count matches the sub-44 tap-target count
  almost exactly (23/23) — worth checking whether they are the SAME 23 elements (undersized AND
  under-contrast) before scoping a fix, since fixing one without the other would look complete and
  still fail the surviving criterion.
- **Free tier renders its own paywall boundary correctly**: `Ξεκλείδ` (unlock) and `Αναβάθμιση`
  (upgrade) both present in `populated-free`'s text. A recommendation card is shown as a **labelled
  example** — `«Παράδειγμα · Αύξηση κάλυψης κατοικίας · Μεσαία»` — i.e. a sample recommendation
  explicitly marked as such, not real advice dressed as real advice; worth confirming this labelling
  survives whatever Phase 2/5 restructuring happens here, since an unlabelled sample would be a
  placeholder-content leak of exactly the class CLAUDE.md's identity-placeholder invariant warns about
  (a different mechanism, same customer-facing risk: fabricated-looking content with no "this is an
  example" marker).
- **0 truncation on paid at 320/390** rising to 2–5 at wider/free widths — small numbers, not
  investigated further in this pass; raw `probes.truncation` entries are in the JSON for anyone
  scoping a fix.
- **0 internal-token leaks, 0 Latin/English sentences** on both tiers — clean on both leakage classes
  this pass checks.

Raw section ids (paid, 320px): `['<div> Αναλύσεις AI', '<div> Αναλύσεις AI', '<button> Ανανέωση
ανάλυσης', '<div> Προτάσεις κάλυψης', '<div> Το όχημά σας πρόκειται να μείνει ανασφάλ…', '<p> Οι
αναλύσεις AI παρέχουν υποστηρικτική π…']` — two entries read as "Αναλύσεις AI" because the section
counter's fallback-label logic picked up the same heading text from two different DOM nodes (a
genuine duplicate-heading condition, not a counting bug — confirmed by the `containers`/`sections`
IDs being two distinct elements at two different DOM depths in the JSON).

## Fixtures

Paid: the same 15-policy matrix (6 healthy + 9 `defect-*` fixtures, T-012) that `wallet-list-baseline`
and `wallet-detail-baseline` provision — reused, not recaptured with different data, so this surface's
numbers are comparable to those two. Free: `FREE_SPECS` (2 policies, deliberately over the free
gap-preview boundary).

## Not captured in this pass

- The risk-profile quick-start wizard's post-submission state (`QuickStart` on `/insights/risk-profile`
  is a separate landing surface, measured there — but `/coverage-insights`'s OWN life-events panel and
  risk-profile-wizard entry point were captured only in their default, not-yet-started state).
- Dark theme was not captured on any T-015 surface in this pass (matching the other new baselines);
  the existing dashboard/policy-detail series carry the only dark-theme evidence in the repo.
