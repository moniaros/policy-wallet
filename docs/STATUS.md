# STATUS

**Production: `c7163c19`** — deployed 2026-08-25, CI green on all four jobs, Vercel `READY`,
zero runtime errors after. **All five halts answered and implemented.**

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

## Halts — all five answered 2026-08-25

- **H-005** the second score → **removed** (index, verdict, tone map, component percentages).
- **H-006 / H-007** → proceed with the disclosure. Implemented as **coverage**: nine B2C surfaces
  rendering model prose had none, including the policy detail page. The Art. 9 notice on the wizard's
  seven health fields is now held to its four promises.
- **H-008** → **no grant.** Credits are the wrong lever for a dormant wallet; the day-30 email drives
  the upload instead.
- **H-009** → deep analysis sits on **both** paid tiers.

## Not started

- **§8's interview and consolidated demands-and-needs record.** Unblocked by H-006/H-007, not
  specified by them (**D-033**). Most of §8's value already ships — comprehension, and the risk
  graph's stated-requirement-versus-policy rows.
- **Phases 4–6** — design system, rebuild, guards.

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
5. **Two guards state their own limits** rather than hiding them: the AI-disclosure check
   over-approximates (an import is not a render — closed with a must-carry-their-own list), and the
   truncation metric cannot see cross-page reachability.

## Next 3 actions

1. Give `verify:gap-catalogue` a database in CI, or make a skipped step fail loudly. It caught a
   live defect locally that CI structurally could not.
2. Start **Phase 4** (design system), whose first row is **P-08**: `PerksCard` renders no clause or
   source link, so a customer is told they have a perk with no way to check where it came from.
3. Decide whether §8's consolidated demands-and-needs record is worth building — it is the one part
   of §8 the product does not already have, and it is a design question, not a blocked one.
