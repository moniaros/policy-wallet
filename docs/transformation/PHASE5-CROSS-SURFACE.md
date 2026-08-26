# Phase 5 — Cross-surface count comparison

**Item:** the detector for the run's headline defect. D-025 (DECISIONS.md) names count
consistency "v2's headline defect (§2.8, **five surfaces**)". The per-page metric
(`tests/measure/count-collector.ts`, §11 metric 8) compares renders **within one
document**; a key rendering 3 on `/dashboard` and 4 on `/wallet` is invisible to it by
construction. This item builds the cross-surface half and runs it.

**Written:** 2026-08-27 · **Role:** MEASUREMENT, PW-MOBILE-TRANSFORM-02 Phase 5

## What was built

| File | What it is |
|---|---|
| `tests/measure/cross-surface-count.ts` | The comparator: pure functions over per-surface captures. `compareAcrossSurfaces` groups every instrumented render by key+subject **across** surfaces and reports any key with more than one distinct value. `compareSweepPasses` is the same-state void detector. Every rule is defended in the file header. |
| `tests/measure/count-collector.ts` | One additive change: the result now carries `groups` — every key+subject group with all renders and canonical values, not only the inconsistent ones. This keeps `valueOf` the **single** definition of value extraction; the comparator never re-extracts. |
| `tests/measure/phase5-cross-surface.spec.ts` | The live sweep: five surfaces, one account, one session, two passes, @390. Report-only for findings (the phase5-live-sweep precedent); FAILS on a void sweep, a lost session, or the D-025 vacuous trap. `CROSS_SURFACE_PLANT=1` is the live red-proof mode. |
| `tests/measure/phase5-cross-surface-probe.test.ts` | The committed jsdom probe: 18 tests, each rule turned red and each deliberate non-finding walked. |

Run:

```bash
npx playwright test tests/measure/phase5-cross-surface.spec.ts --project=measure --no-deps
CROSS_SURFACE_PLANT=1 npx playwright test tests/measure/phase5-cross-surface.spec.ts --project=measure --no-deps   # red-proof
npx vitest --run tests/measure/phase5-cross-surface-probe.test.ts
```

## The rule set, with the reasoning

**1. Same state, or the comparison is meaningless.** One account, one browser context,
navigation only — no click ever happens in the sweep (verified before building:
`/notifications` marks-as-read only on explicit user action, `NotificationsClient.tsx`,
so pure GETs mutate nothing; even the cookie banner is left alone). The sweep runs **two
full passes** over all five surfaces and voids itself if any surface's key→values map
differs between its own two visits, or if the Athens calendar date rolls mid-sweep
(`policy.daysRemaining` moves at Athens midnight). A void run **fails the spec** and
reports nothing — a finding from a moving portfolio can be a phantom. The double pass was
chosen over a single `/dashboard` sentinel (a mutation visible only on two *other*
surfaces would escape the sentinel) and over a DB fingerprint (choosing "the tables that
matter" is a hand-maintained universe — the D-005 guard failure — and opening pooler
connections during a browser run is this repo's documented way to hit the 15-client
ceiling).

**2. Saturation is a floor claim, not a value.** A render whose whole text is `N+` (the
bell badge saturates at «9+» — both AppShell badge sites) is reclassified from the
collector's exact-N to the claim "≥ N". Then: floor vs exact contradicts **iff** the
exact is below the floor (`9+` vs `3` fires, `9+` vs `12` does not); floor vs floor never
contradicts, but differing thresholds are reported as `saturationThresholdDrift`
(count-keys.ts requires lockstep thresholds); exact vs exact contradicts iff distinct.
The pattern is strict — whole text only — because «3 + 2» is arithmetic and a loose match
would launder real numerals into floors. Stated cost: a saturated badge that ever renders
prose around the token would read as exact N.

**3. Legitimately page-scoped keys are excluded by name, with the reason stated.**
`PAGE_SCOPED_KEYS` in the comparator: `portfolio.attentionCollapsedCount` (counts what
*this page's* show-more toggle hides — a presentation fact) and `timeline.groupSize`
(subject is a render-local collapsed-run id). Every excluded observation is **reported**
under `excludedPageScoped` with the values seen — never silently dropped. The list is
deliberately tiny: the registry's namespace rule means nearly every key is *meant* to
agree everywhere, and a key that "needs excluding" to stay green should first be
suspected of being the defect.

**4. Absence is not agreement.** A key on one surface is `single-surface` —
uncorroborated, not consistent. `corroborated-exact` requires **exact values from ≥2
surfaces that agree**; floors agreeing on two surfaces corroborate only the floor
(`corroborated-floor-only`, reported separately — two saturated badges prove both
saturate, not that they would agree unsaturated); one exact plus one floor is
`uncorroborated-shared` (the floor fails to deny the exact, which is not confirmation).
The verdict is four-valued so silence cannot read as a pass: `contradicted` /
`consistent-and-corroborated` / `consistent-but-uncorroborated` /
`vacuous-no-shared-keys`.

Also reported, so the output stands alone: intra-surface inconsistencies (passed through,
labelled — they gate at the per-page metric, not here), channel mismatches (one key
carried as `data-count` on one surface and `data-fact` on another is a vocabulary bug;
groups merge by key+subject regardless of channel so the bug cannot *hide* a value
contradiction), and per-surface `unmeasurable` counts (the verdict vouches only for
instrumented counts).

## Red-proof — the detector has fired

**jsdom probe** (`phase5-cross-surface-probe.test.ts`, 18/18 passing): the RED case is
one key rendering «3 ασφαλιστήρια» on a fabricated `/dashboard` and «4 ασφαλιστήρια» on a
fabricated `/wallet` — both pages individually clean under the per-page metric
(`failures: 0`), the comparator returns `contradicted` naming the key, both values and
both surfaces. Every other rule has its own red and its own deliberate non-finding
(9+/12, 9+/3, 9+/19+, «3 + 2», page-scoped, per-subject, channel mismatch, void
detection, appearance/vanishing between passes).

**Live plant against real pages** (`CROSS_SURFACE_PLANT=1`, run 2026-08-27): the sweep
planted a contradiction into the real `/wallet` DOM — identically in both passes, so the
same-state check stays honest — and caught it:

```
Planted: {"key":"asset.identifier","subject":"cmstecqg5001of5663zv1vfhc","from":"IKZ3113","to":"3120"}
verdict: contradicted
contradictions: exactly ONE — asset.identifier, values ["3113","3120"], surfaces ["/dashboard","/wallet"]
```

Exactly one contradiction — the planted one — with 21 shared keys otherwise comparing
clean: the detector fires on the defect and does not fire on everything. The plant was
then removed (it is a mode, not an edit) and the clean run below shows green.

## The live sweep — 2026-08-27, @390, measure-project account

```
verdict:               consistent-and-corroborated
sharedKeyCount:        21
corroboratedExact:     20
corroboratedFloorOnly:  1   (notification.unreadCount, «9+» on all FIVE surfaces)
uncorroboratedShared:   0
contradictions:         0
intraSurface / channelMismatch / thresholdDrift: 0 / 0 / 0
excludedPageScoped:    portfolio.attentionCollapsedCount (/wallet, value 9) — reason stated
singleSurface:         78 key+subject groups
instrumented groups:   /dashboard 54 · /wallet 57 · /protection 11 · /notifications 1 · /account 1
unmeasurable numerals: /dashboard 0 · /wallet 1 · /protection 1 · /notifications 14 · /account 0
void checks:           both passes identical on every surface; Athens date stable
```

Corroborated across surfaces (the non-vacuous core): `portfolio.policyCount` = 29,
`portfolio.totalAnnualPremium` = 6656, `portfolio.expiringCount` = 5,
`portfolio.premiumNoAmountCount` = 1, `policy.daysRemaining` for 6 shared subjects (40,
14, 11, 11, 11, 14) — all `/dashboard`↔`/wallet`; `recommendation.openCount` = 11,
`gap.severityCount` (high 13, medium 16, low 4) and `household.dependantCount` = 2 —
all `/dashboard`↔`/protection`; `asset.identifier` for 5 shared subjects. Internal
coherence spot-check: 13+16+4 = 33 = `gap.openCount` on `/protection`.

**There is no cross-surface count contradiction on this portfolio, at this width, in
this state, on the instrumented vocabulary.** That sentence carries four qualifiers and
each is load-bearing — see below.

### What the green sweep does NOT prove

- **`/notifications` and `/account` are effectively uninstrumented** — each contributed
  exactly one group (the shell's bell badge), and `/notifications` rendered **14
  uninstrumented numerals** the metric cannot vouch for. "Consistent across five
  surfaces" is really "consistent across three surfaces plus two badges".
- **78 single-surface groups were never compared** — present once, uncorroborated. Among
  them `portfolio.activeCount` (18, `/wallet` only) and `portfolio.attentionCount` (11,
  `/wallet` only), although grep shows *two* code render sites for each: the dashboard
  sites did not render as visible instrumented groups at 390 in this state. A future
  contradiction there is currently undetectable.
- **`notification.unreadCount` is floor-only corroborated**: «9+» everywhere at 390. If
  two surfaces disagreed above the threshold (10 vs 14), no width-390 sweep can see it —
  by design of the badge, not of the detector.
- One state, one width, one account. The v2 defect was reported across five surfaces on
  *production* data; this account is the measure fixture wallet.

### Observations for other Phase 5 items (not this item's to fix)

- **Two keys for one quantity, live instance:** on far-from-expiry policies `/wallet`'s
  `policy.daysRemaining` element renders a **date** («… 25/5/2027», canonicalised
  `date:…`), while `/dashboard` tags dates under `policy.endDate`. Same real-world fact,
  two keys → never compared (blind spot 1). Hand-check on subject `cmstecqg5…`:
  dashboard `policy.endDate` = 6/10/2026, wallet `policy.daysRemaining` = 40 days from
  2026-08-27 = 6/10/2026 — coherent *today*, but the detector cannot vouch for it.
  Either the wallet element should carry `policy.endDate` when it renders a date, or the
  registry should note the dual rendering.
- `asset.identifier` extracts the digits of plates («IKZ3113» → 3113, «…-4821» →
  −4821) — collector blind spot 3b in action. Cross-surface it still compares correctly
  (same plate → same extraction), and it corroborated for 5 shared subjects, but the
  values in reports are not the identifier as a human reads it. 14 fixture policies share
  one «…-4821» plate — fixture data, not a product defect.
- `gap.severityCount` has no `critical` chip on either surface in this state; the three
  rendered chips sum to `gap.openCount`. Whether a zero-critical state should render «0»
  or nothing is an all-clear-honesty question for the surface items.

## Blind spots that remain (the detector's own)

1. **Vocabulary forks are invisible** — two keys for one quantity never compare (live
   instance above). Owned by the registry guard
   (`tests/unit/count-instrumentation-registry.test.tsx`), not by this scan.
2. **Subject-id drift**: the same policy under different subject ids on two surfaces
   would not compare. Subjects are DB cuids everywhere today.
3. **Everything the collector cannot extract** (spelled-out numbers «τρία», masked
   values) never reaches the comparator; uninstrumented numerals are counted per surface
   but not compared.
4. **The five-surface list is the universe.** A sixth surface rendering a third value is
   invisible until added to `SURFACES` in the spec. The list matches the D-025 defect
   description; policy-detail (`/wallet/[id]`) is the most instrumented surface NOT in
   it — adding it requires choosing a policy id and is a deliberate follow-up.
5. **The void detector sees persistent changes only**: a mutation that lands after a
   surface's pass-1 capture and reverts exactly before its pass-2 capture escapes. It
   caught nothing this run because nothing moved; it has its own committed red-proof.
6. **Width 390 only.** Breakpoint-conditional renders (the desktop UserMenu exact unread
   count at lg) are outside this sweep; a width-matrix sweep is a follow-up if wanted.

## Gate evidence (run 2026-08-27, Node 20.20.2)

`audit:api-auth` ✓ · `lint` ✓ · `lint:i18n-changed` ✓ · `lint:utf8` ✓ (2518 files) ·
`lint:encoding` ✓ · `type-check` ✓ · unit suite ✓ (497 files, 5667 tests) ·
`phase5-metrics-probe` ✓ 23/23 (unchanged behaviour after the additive collector change) ·
`phase5-cross-surface-probe` ✓ 18/18. The production build was not run: the diff is
`tests/measure/**` + this document, neither of which enters the Next bundle, and
`type-check` covers the new files.
