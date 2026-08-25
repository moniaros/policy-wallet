# STATUS

**Production: `5cc2c951`** — deployed 2026-08-25, CI green on all four jobs, Vercel `READY`,
zero runtime errors in the hour after. Prod was on `11ec4987` before this; no branch divergence.

## Current phase

`PW-MOBILE-TRANSFORM-02`, **Phases 0–3 complete and tagged**
(`pw-transform-v2-phase-{0,1,2,3}-complete`). 102 commits shipped in one push.

## Done

- **Phase 1** — score removed product-wide; outbound at 0 score / 0 tokens / 0 Latin; one definition
  of "policies held"; English-in-customer-content is now a **compile error**; the Greek copy freeze;
  identity scrubbing; per-channel notification prefs; the §9.5 cadence controls.
- **Phase 2** — §4.2: ten menu items → **five tabs and a bell**. `/branches`, `/branches/[branch]`,
  `/insights/risk-profile`, `/coverage-insights`, `/timeline` removed; «Η προστασία μου»
  (`/protection`, two lenses) and `/account/history` replace them. **Capability count unchanged at
  109** — build-before-remove held throughout.
- **Phase 3** — §6.11 truncation resolved as *reachability, not absence of clamping*; §9 checked and
  found sound.

## Blocked

- **Phase 2b (§8, the AI advisor)** — deliberately not started (**D-032**). H-006 (IDD Art. 20 advice
  boundary) and H-007 (Art. 9 consent) are regulatory questions, and *not building is the reversible
  option*: code reverts, collected health data and given advice do not.
- **Phases 4–6** — design system, rebuild, guards. Not started.

## Top risks, ranked

1. **`verify:gap-catalogue` does not run in CI.** Guarded by `if: env.DEV_DATABASE_URL != ''` and CI
   holds no DB secret, so it **skips** — and a gate that skips is indistinguishable from one that
   passes. It caught a live defect locally today: the AI minted `no_glass_cover_variant` on
   2026-08-23, *hours after* both databases were verified clean, and it had already served one
   `gap_instance`. Dev repaired; prod was clean.
2. **`/protection` is 19–21 screens tall at 320px.** §7.5 wanted the densest surface reduced;
   consolidation put three surfaces where it stood. Phase 5's problem, measured and recorded.
3. **Page-level `redirect()` is unreliable under `(protected)`** — it streams inside the RSC payload
   as a 200. `/coverage` shipped broken this way until today. Legacy redirects belong in `proxy.ts`.
4. **`policy-detail-goal2`: 10 sections against a ≤8 budget** — unresolved, possibly a detector
   artifact (a heading counted twice while `SummaryCard` renders once). Not on the CI path. **Check
   the detector before editing the page on the strength of that number.**
5. Five halts open: H-005, H-006, H-007, H-008's commercial half, H-009's tier gate.

## Next 3 actions

1. Answer **H-006 / H-007** — they unblock Phase 2b and need no code first.
2. Give `verify:gap-catalogue` a database in CI, or make a skipped step fail loudly.
3. Start **Phase 4** (design system), whose first row is **P-08**: `PerksCard` renders no clause or
   source link, so a customer is told they have a perk with no way to check where it came from.
