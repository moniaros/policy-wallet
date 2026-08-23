# BASELINE — Αρχική `/dashboard` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/dashboard` (authenticated policyholder) · **Locale:** `el`
**Reused evidence, NOT recaptured** (per instruction 4 and §5.6): a prior, already-shipped goal
series (`docs/evidence/dashboard-mobile/`, Goals 0–5, deployed on `dd815b3d`) already measured this
surface in full with the identical harness this run also uses (`tests/measure/metrics.ts` +
`dashboard.ts`, imported verbatim, no fork). Re-running the whole 19-capture matrix here would
duplicate work with no new information — **except that the specific directory the T-015 brief named
turned out to be wrong**, corrected below before anything was reused.

## CORRECTION: the brief's `data/current/` is STALE — `data/goal5/` is what HEAD actually renders

The T-015 instructions said: *"Reuse `docs/evidence/dashboard-mobile/data/current/` rather than
recapturing... it has 19 valid captures."* Investigated rather than trusted, because a stale reuse
directive would have republished stale numbers under a document that claims to measure HEAD:

| directory | `typical@320` sections | scrollHeight | sub-44 | mtime |
|---|---|---|---|---|
| `data/current/` | **13** | 4882px | 5 | 10:13 |
| `data/goal5/` | **6** | 4006px | 0 | 14:45 |
| **fresh live capture (this run, 2026-08-23)** | **6** | 4006px | 0 | — |

`data/current/` is frozen at the Goal-1-R / pre-Goal-2 state — before the six-section restructure,
before the tap-target fix. It was never refreshed after Goal 2–5 landed, despite its name. **A fresh
live capture run in this session (`npx playwright test dashboard-baseline -g "typical"`,
`measure-dash` project) matches `data/goal5/` exactly** (4006px, 6 sections, 0 sub-44 at 320px;
3838px vs `goal5`'s 3838px at 390px — within 2px, i.e. identical within render noise) — confirming
`goal5` is the accurate current-HEAD reference and `current` is not. **This capture also overwrote
`data/current/typical-{320,390,430}.json` with correct data**, so that specific staleness is now
partially self-healed, though the other 16 captures in `current/` remain stale until someone re-runs
the full matrix.

**This is the same class of mistake D-004 already named for this run** ("Αρχική's stated evidence is
stale... re-verified against HEAD rather than trusted") — happening a second time, this time inside
the run's OWN T-015 instructions rather than the original brief. Recorded so a future cold start does
not repeat it a third time: **`data/current/` is not a synonym for "current" — check the mtime and a
live sample before trusting any named evidence directory in this repo.**

## Reused evidence: `docs/evidence/dashboard-mobile/data/goal5/` — 19 captures

5 portfolio states (`empty`, `single`, `typical`, `heavy`, `all-expired`) × 320/390/430, + 3
analysis-state captures at 320px (`heavy-analysis-in-progress`, `heavy-never-analysed`,
`heavy-all-failed`), + 1 Pro-tier capture at 320px. Full methodology, fixture design and per-goal
history: `docs/evidence/dashboard-mobile/{BASELINE,GOAL1R,GOAL2,RESULT}.md`.

| state | width | scrollHeight | screens | sections | containers/depth | sub-44 | count-fail | dup-blocks | leaks | 1.4.3 | 1.4.11 | CTAs (primary) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| empty | 320 | 3169 | 4.4 | 6 | 45/3 | 0 | 0 | 0 | 0 | 0 | 10 | 18 (1) |
| empty | 390 | 2889 | 3.4 | 6 | 46/3 | 0 | 0 | 0 | 0 | 0 | 11 | 18 (1) |
| empty | 430 | 2763 | 3.0 | 6 | 47/3 | 0 | 0 | 0 | 0 | 0 | 11 | 19 (1) |
| single | 320 | 3242 | 4.5 | 6 | 46/3 | 0 | 0 | 0 | 0 | 0 | 9 | 17 (1) |
| single | 390 | 2947 | 3.5 | 6 | 47/3 | 0 | 0 | 0 | 0 | 0 | 10 | 17 (1) |
| single | 430 | 2844 | 3.0 | 6 | 48/3 | 0 | 0 | 0 | 0 | 0 | 10 | 18 (1) |
| typical | 320 | 4006 | 5.6 | 6 | 56/3 | 0 | 0 | 0 | 0 | 0 | 8 | 20 (1) |
| typical | 390 | 3838 | 4.5 | 6 | 57/3 | 0 | 0 | 0 | 0 | 0 | 9 | 20 (1) |
| typical | 430 | 3327 | 3.5 | 6 | 58/3 | 0 | 0 | 0 | 0 | 0 | 9 | 21 (1) |
| heavy | 320 | 5371 | 7.5 | 6 | 72/3 | 0 | 0 | 0 | 0 | 0 | 8 | 24 (1) |
| heavy | 390 | 4342 | 5.1 | 6 | 73/3 | 0 | 0 | 0 | 0 | 0 | 10 | 24 (1) |
| heavy | 430 | 3864 | 4.1 | 6 | 74/3 | 0 | 0 | 0 | 0 | 0 | 9 | 25 (1) |
| all-expired | 320 | 3263 | 4.5 | 6 | 48/3 | 0 | 0 | 0 | 0 | 0 | 8 | 17 (1) |
| all-expired | 390 | 2916 | 3.4 | 6 | 49/3 | 0 | 0 | 0 | 0 | 0 | 9 | 17 (1) |
| all-expired | 430 | 2766 | 2.9 | 6 | 50/3 | 0 | 0 | 0 | 0 | 0 | 8 | 18 (1) |
| heavy-analysis-in-progress | 320 | 5371 | 7.5 | 6 | 72/3 | 0 | 0 | 0 | 0 | 0 | 8 | 24 (1) |
| heavy-never-analysed | 320 | 5442 | 7.6 | 6 | 71/3 | 0 | 0 | 0 | 0 | 0 | 8 | 24 (1) |
| heavy-all-failed | 320 | 5366 | 7.5 | 6 | 72/3 | 0 | 0 | 0 | 0 | 0 | 8 | 24 (1) |
| **pro-tier** | 320 | 5861 | 8.1 | 6 | 83/3 | 0 | — | 0 | 0 | — | 10 | — |

## Tier coverage (requirement 3)

`e2e-ph-dash@policywallet.test` receives no subscription row in `tests/global-setup.ts`
(`provisionUser(db, E2E_POLICYHOLDER_DASH)` only) — by the same "no live non-agent subscription →
`free`" rule `E2E_POLICYHOLDER_FREE`'s own comment documents, the 18 non-Pro captures above are
**free-tier** by construction, not merely unlabelled. The 19th (`pro-tier`) is the paid-tier sample,
captured separately at 320px only. Both tiers are therefore represented, though Pro is thinner (1
width vs 3) — a gap inherited from the prior series, not introduced here; not re-run in this pass
since `goal5`'s methodology note already states why (the dashboard fixture matrix cannot produce
recommendation-plan content, so Pro was verified once, deliberately, against a real Pro account).

## Headline findings (already adjudicated by the prior series; not re-litigated here)

- **6 sections in every state, 0 sub-44px tap targets across all 19, 0 count-consistency failures, 0
  duplicate blocks, 0 internal-token leaks, 0 text-contrast (1.4.3) failures.** All four of Goal 0's
  confirmed defect classes on this surface are at target.
- **1.4.11 (non-text contrast) is NOT zero: 8–11 findings per capture, rising to 10 on Pro.**
  `RESULT.md` attributes these to `surface`/`shell`/`unmeasured`/`subpixel` classes, explicitly none of
  them a live `control` failure — a considered, stated exception (darkening every card edge in the
  product to satisfy a decorative-boundary reading was rejected as disproportionate), not an
  oversight. Carried forward here rather than re-argued.
- **Scroll height is 2.9–8.1 screens depending on state** — far below `/coverage-insights`'s
  12.4–18.7 screens on the SAME account's portfolio (see `coverage-insights/BASELINE.md`) — the
  dashboard is not the densest surface in the app; that claim belongs to coverage-insights, confirmed
  by this run's own fresh measurement, not the dashboard.

## What T-015 adds beyond reuse

1. The staleness correction above (a live spot-check nobody had run since Goal 5 shipped).
2. Explicit tier-coverage statement (requirement 3) — implicit in the prior series, not stated as
   plainly.
3. Cross-surface density comparison against `/coverage-insights`, `/wallet/[id]`, `/wallet`,
   `/notifications` — new context the single-surface prior series had no reason to compute.

## Not captured in this pass
Dark theme (not part of the prior series' final matrix; only spot-checked at Goal 0). No new
fixtures were added for T-015's dashboard entry — the existing matrix already covers empty/single/
typical/heavy/all-expired/3-analysis-states/pro-tier, which was judged sufficient rather than
re-derived.
