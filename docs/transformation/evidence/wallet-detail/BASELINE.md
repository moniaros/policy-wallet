# BASELINE — Ασφαλιστήριο `/wallet/[id]` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/wallet/[id]` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/wallet-detail-baseline.spec.ts` (paid, 15 fixtures × 3 widths = 45 captures) +
`tests/measure/wallet-detail-free.spec.ts` (free, 2 fixtures × 3 widths = 6 captures) +
`tests/measure/wallet-detail-expanded-matrix.spec.ts` (T-016c, paid, 6 healthy-matrix fixtures × 3
widths, all sections force-open = 18 captures; supersedes `wallet-detail-expanded.spec.ts`'s
single-fixture, scroll-position-affected numbers — see "0c" below).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure wallet-detail-baseline` / `--project=measure-free wallet-detail-free` / `--project=measure wallet-detail-expanded-matrix`

## CORRECTION: this surface's evidence is STALE too — a second instance of the D-004 class

`docs/transformation/LEDGER.md`'s own entry for this surface asserts: *"Unlike the dashboard, the
brief is ACCURATE about this surface... The committed Goal 0 baseline
(`docs/evidence/policy-detail-mobile/BASELINE.md`, 2026-08-22, 18 captures) measures 20 sections,
187–189 containers, max depth 3, 13,428px scroll at 320px."* **That is the state of the page BEFORE
commit `5705289b` ("GOAL 2 restructure + the §0.5 amendments"), which already shipped.** This baseline's
own fresh capture of the identical fixture (`motor-active@320`) measures **10 sections, 53 containers,
depth 3, 4,930px** — a 63% reduction the LEDGER's assumption never accounted for, because whoever
wrote that entry cited the Goal 0 document without checking it against `git log` for the component
tree. `docs/evidence/policy-detail-mobile/` contains `BASELINE.md` (Goal 0) and `GOAL1.md` only — no
`GOAL2.md`/`RESULT.md` — the Goal 2 code shipped (`git log -- components/wallet/PolicyDetailsClientView.tsx`
shows `5705289b fix(policy-detail-mobile): GOAL 2 restructure`) but its evidence trail was never
completed in that directory. **This is the third confirmed instance of the D-004 staleness pattern in
this run** (the dashboard brief, the dashboard's own `data/current/` — see `dashboard/BASELINE.md` —
and now this LEDGER entry). Every number below is a fresh capture against HEAD, not carried forward
from either stale source.

## CORRECTION 2, MORE CONSEQUENTIAL: every number below is a floor, not the page

Found while writing `overlays/BASELINE.md`'s Delete Policy Dialog test, which could not find the
delete button at all — `getByRole` returned 0 matches, which read as a hang (repeated
actionability-wait retries) before being traced to the actual cause. The delete button lives inside
the "documents" `<PolicySection>` — one of **six** accordion sections (`coverage`, `terms`, `review`,
`dates`, `claims`, `documents`) the Goal 2 restructure introduced. `PolicySection`'s own source
comment states the design explicitly: *"Unmounted when closed, not hidden: a closed section must not
contribute its facts to the page — otherwise every duplicate-fact and tap-target measurement counts
content no reader can see."* **Every one of the six sections defaults to closed** — `grep
defaultOpen` across `PolicyDetailsClientView.tsx` returns nothing, and at most ONE section
auto-opens (`openSection = forcedOpen ?? attention.target`, driven by which finding is most urgent).

**Consequence: the 45+6 captures in this document measure the ALWAYS-VISIBLE head — hero, identity,
actions, AI summary, gap-count banner — but NOT the six sections' own content**, because closed
`PolicySection` content is not in the DOM at all, not merely CSS-hidden. Every tap-target,
truncation, container and 1.4.11 count above is a **floor**, not the whole page a reader eventually
sees once they start opening sections.

**Supplementary capture, added to close this gap**: `wallet-detail-expanded.spec.ts` (previous pass)
re-measured `motor-active` only, with all six sections force-opened (each accordion header clicked
before capture). **T-016c (this pass) found that capture's own numbers were themselves wrong** — not
because any metric definition was broken, but because of WHEN they ran — and replaced it with
`wallet-detail-expanded-matrix.spec.ts`, which fixes the defect and extends the capture to all six
healthy-matrix fixtures (not just `motor-active`) so the expanded state has a genuine row-for-row
companion to table "0a" above, at every width, for every fixture.

### A second harness defect found and fixed: scroll position, not the metrics

`wallet-detail-expanded.spec.ts` clicks each of the six `PolicySection` headers in document order and
then calls `captureSurface` with **no scroll reset**. Playwright's `click()` auto-scrolls its target
into view when the target is not already on screen, and by the time the LAST header ("documents") is
clicked on a page that has grown past 10,000px, the click has scrolled the viewport to near the
BOTTOM of the page. Every "visible" filter in `metrics.ts` (`sectionCount`, `containerCount`,
`duplicateFacts`, `smallTapTargets`, the 1.4.11 boundary scan) is `getBoundingClientRect()`-based and
treats `r.bottom <= 0` — scrolled ABOVE the current viewport — as invisible, with no equivalent
exclusion for content below it. A capture taken from that end-of-page scroll position therefore
silently dropped everything ABOVE roughly the "claims"/"documents" boundary from every one of those
scans — not merely `duplicateFacts` (confirmed directly: a standalone probe against
`motor-active@320` found the SAME policy-number `<span>` inside the "claims" section at
`getBoundingClientRect().y = -205` at the moment `captureSurface` ran, which is why the old capture
recorded 0 duplicate-fact hits at 320px and 1 at 390/430px — a WIDTH-dependent difference that was
itself a symptom, since the DOM content is identical at every width and `document.body.innerText`
contains the policy number 4 times regardless).

**The consequence was not confined to duplicate facts — `sections` reading 2 instead of 10 was the
same bug, not (as the previous version of this document speculated) "a counting-method artifact of
measuring a different DOM shape".** Every `<section id>` element is present in the DOM whether its
`PolicySection` is open or closed (only the inner content is conditionally rendered) — collapsed and
expanded states have the identical ten `section[id]` elements, and the folded baseline above already
counts all ten. The old expanded capture counted only the two whose header hadn't been scrolled past.
**Corrected: `sections` reads 10 in the expanded state too, at every fixture and every width** — the
"counting-method artifact" explanation in the previous version of this section was itself wrong,
published without having traced the number to its cause, exactly the honesty rule this pass was
asked to enforce. Fix: `wallet-detail-expanded-matrix.spec.ts` runs `window.scrollTo(0, 0)` and
settles again after every section is force-opened, before calling `captureSurface` — the same
scroll-position convention (measure from the top) every OTHER capture in this evidence set already
uses implicitly, since `openSurface` never scrolls a freshly-loaded page. `wallet-detail-expanded.spec.ts`
is left in place (outside this pass's file boundary to edit or remove) but is now SUPERSEDED — running
it again would reproduce the same undercounts, so it should be retired in favour of the matrix file.

### 0c. Metric table — folded vs. expanded, all 6 healthy-matrix fixtures × 3 widths, full metric set

`1.4.3`, `attr`/`val` (dup facts), and locale purity (Latin-script sentence detector) are 0 across
**every** row in both states — omitted as columns below to keep the table readable, stated once here.
`1.4.11` is `total (control)` — the control-class count is the one SC 1.4.11 gates.

| fixture | width | state | scrollHeight | screens | sections | containers/depth | sub-44 | dup (val) | 1.4.11 total (control) | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| motor-active | 320 | folded | 4930 | 6.8 | 10 | 53/5 | 0 | 1 | 7 (0) | 2 | 0 |
| motor-active | 320 | **expanded** | **12399** | **17.2** | 10 | **159/5** | 1 | **2** | **26 (3)** | **5** | 1 |
| motor-active | 390 | folded | 4339 | 5.1 | 10 | 53/5 | 0 | 1 | 7 (0) | 1 | 0 |
| motor-active | 390 | **expanded** | **10964** | **13.0** | 10 | **159/5** | 1 | **2** | **26 (3)** | 2 | 1 |
| motor-active | 430 | folded | 4013 | 4.3 | 10 | 53/5 | 0 | 1 | 7 (0) | 1 | 0 |
| motor-active | 430 | **expanded** | **10397** | **11.2** | 10 | **159/5** | 1 | **2** | **26 (3)** | 2 | 1 |
| motor-expiring | 320 | folded | 2817 | 3.9 | 10 | 31/5 | 0 | 2 | 9 (0) | 2 | 0 |
| motor-expiring | 320 | **expanded** | **12389** | **17.2** | 10 | **159/5** | 1 | 2 | **26 (3)** | **5** | 1 |
| motor-expiring | 390 | folded | 2615 | 3.1 | 10 | 31/5 | 0 | 2 | 9 (0) | 1 | 0 |
| motor-expiring | 390 | **expanded** | **10945** | **13.0** | 10 | **159/5** | 1 | 2 | **26 (3)** | 2 | 1 |
| motor-expiring | 430 | folded | 2514 | 2.7 | 10 | 31/5 | 0 | 2 | 9 (0) | 1 | 0 |
| motor-expiring | 430 | **expanded** | **10361** | **11.1** | 10 | **159/5** | 1 | 2 | **26 (3)** | 2 | 1 |
| motor-expired | 320 | folded | 2793 | 3.9 | 10 | 32/5 | 0 | 2 | 9 (0) | 2 | 0 |
| motor-expired | 320 | **expanded** | **12365** | **17.2** | 10 | **160/5** | 1 | 2 | **26 (3)** | **5** | 1 |
| motor-expired | 390 | folded | 2619 | 3.1 | 10 | 32/5 | 0 | 2 | 9 (0) | 1 | 0 |
| motor-expired | 390 | **expanded** | **10949** | **13.0** | 10 | **160/5** | 1 | 2 | **26 (3)** | 2 | 1 |
| motor-expired | 430 | folded | 2535 | 2.7 | 10 | 32/5 | 0 | 2 | 9 (0) | 1 | 0 |
| motor-expired | 430 | **expanded** | **10382** | **11.1** | 10 | **160/5** | 1 | 2 | **26 (3)** | 2 | 1 |
| health-active | 320 | folded | 5273 | 7.3 | 10 | 56/5 | 1 | 1 | 7 (0) | 2 | 1 |
| health-active | 320 | **expanded** | **12811** | **17.8** | 10 | **162/5** | 2 | **2** | **24 (1)** | **15** | 1 |
| health-active | 390 | folded | 4684 | 5.5 | 10 | 56/5 | 1 | 1 | 7 (0) | 1 | 1 |
| health-active | 390 | **expanded** | **11095** | **13.1** | 10 | **162/5** | 2 | **2** | **24 (1)** | 2 | 1 |
| health-active | 430 | folded | 4318 | 4.6 | 10 | 56/5 | 1 | 1 | 7 (0) | 1 | 1 |
| health-active | 430 | **expanded** | **10546** | **11.3** | 10 | **162/5** | 2 | **2** | **24 (1)** | 2 | 1 |
| health-expiring | 320 | folded | 2801 | 3.9 | 10 | 31/5 | 0 | 2 | 9 (0) | 2 | 1 |
| health-expiring | 320 | **expanded** | **12801** | **17.8** | 10 | **162/5** | **2** | 2 | **24 (1)** | **15** | 1 |
| health-expiring | 390 | folded | 2638 | 3.1 | 10 | 31/5 | 0 | 2 | 9 (0) | 1 | 1 |
| health-expiring | 390 | **expanded** | **11076** | **13.1** | 10 | **162/5** | **2** | 2 | **24 (1)** | 2 | 1 |
| health-expiring | 430 | folded | 2537 | 2.7 | 10 | 31/5 | 0 | 2 | 9 (0) | 1 | 1 |
| health-expiring | 430 | **expanded** | **10510** | **11.3** | 10 | **162/5** | **2** | 2 | **24 (1)** | 2 | 1 |
| health-expired | 320 | folded | 2777 | 3.9 | 10 | 32/5 | 0 | 2 | 9 (0) | 2 | 1 |
| health-expired | 320 | **expanded** | **12777** | **17.7** | 10 | **163/5** | **2** | 2 | **24 (1)** | **15** | 1 |
| health-expired | 390 | folded | 2642 | 3.1 | 10 | 32/5 | 0 | 2 | 9 (0) | 1 | 1 |
| health-expired | 390 | **expanded** | **11080** | **13.1** | 10 | **163/5** | **2** | 2 | **24 (1)** | 2 | 1 |
| health-expired | 430 | folded | 2558 | 2.7 | 10 | 32/5 | 0 | 2 | 9 (0) | 1 | 1 |
| health-expired | 430 | **expanded** | **10531** | **11.3** | 10 | **163/5** | **2** | 2 | **24 (1)** | 2 | 1 |

(`dup (val)` folded counts read from table 0a's `0/1` and `0/2` cells above, taking the value-scan
half since the attr scan is 0 everywhere; `folded` rows are restated here, not re-captured, so the
two states sit in one table per the brief's requirement.)

### What changed materially, corrected numbers

- **`scrollHeight` more than doubles** on every fixture: 4930→12399px (motor-active@320, +152%) down to
  2514→10361px (motor-expiring@430, +312%) — the shorter the folded state, the larger the relative
  jump, because the collapsed states of an urgency-flagged (`expiring`/`expired`) policy already had
  one section forced open, so they had less "hidden" content proportionally... except expanding all
  six still adds ~9,500-10,000px regardless of starting state, landing every fixture in the
  10,300-12,800px band regardless of what its folded height was.
- **`containers` jumps 3× or more everywhere, not the ~1.15× the pre-fix capture reported.**
  motor-active: 53→**159** at 320px (the buggy capture said 37, i.e. UNDER the folded count — the
  scroll bug was hiding container content the folded capture could already see). health-active:
  56→**162**. This is the corrected version of the number the previous section of this document got
  wrong.
- **`sections` is unchanged at 10→10** — corrected from the buggy capture's 2, and from that
  capture's own wrong explanation for why (see above). Opening every section does not change how many
  the page has; it changes how much is inside them.
- **`1.4.11` total rises 3.7× on motor (7→26) and 3.4× on health (7→24)**, not the pre-fix capture's
  7→11. **The control-class subset — the one SC 1.4.11 actually gates — rises from 0 to 3 on every
  motor fixture and 0 to 1 on every health fixture, on ALL SIX HEALTHY fixtures, not just the
  degraded/edge-case ones.** This directly qualifies the "1.4.11 — mandatory this pass" section
  below: its claim of "ZERO control-class findings across all 18 healthy captures" is true only for
  the FOLDED state. The three motor controls are «Δήλωση ατυχήματος» (accident-declaration call link,
  1.24:1), «Οδική βοήθεια» (roadside-assistance link, 1.14:1) — both live inside the "claims"
  accordion — and «Δημιουργία» (2.74:1, inside "documents", present on every fixture including
  health). Any Phase 1 target of "zero 1.4.11 control failures on this surface" must now also cover
  these three, not only the three `defect-*` states the folded-state section already named.
- **`truncation` at 320px only: 2→5 on motor, 2→15 on health** (390/430 stay flat at the folded
  values, 1→2). The health increase is a genuine, previously-invisible content defect, not a
  measurement artifact: the "coverage" section's `Ετήσιο όριο κάλυψης 1.500.000 €` (annual limit) and
  its sibling limit lines overflow their box by 6-23px sideways at 320px — a coverage AMOUNT clipped
  at the narrowest supported width, inside content nobody could see before this pass because the
  section was closed by default. Motor's five 320px-only overflows are a roadside-assistance phone
  number (`2109099999`, twice, in the "claims" section) and two badge/counter overflows.
- **`sub-44` rises from 0→1 on motor (unchanged from the buggy capture's number — this one happened
  to survive the scroll bug) and 1→2 on health**, the second offender appearing only once sections are
  expanded.
- **The end-date duplicate becomes universal, not conditional.** The folded-state section below
  ("Duplicate facts") found the `Ισχύει έως {date}` / `#dates` pair duplicated on only 4 of 18 healthy
  captures (`expiring`/`expired`; 0 of 6 `active`) — because `#dates` only auto-opens when the policy's
  urgency makes it the page's one forced-open section, which never happens for `active`. Once every
  section is force-opened, the duplicate appears on **all 6 fixtures including both `active` ones**
  (`motor-active`, `health-active`) — confirmed directly in the capture JSON
  (`health-active-all-expanded-320.json`: `'top <p> Ισχύει έως 4/2/2027'` and `'#dates <p> 4/2/2027'`).
  The policy-number duplicate also strengthens from 2 hits (folded) to 4 (expanded: hero span, a `<dd>`
  definition-list value, the "claims" section's own copy, and the "documents" section's generated
  label) on every fixture.
- **Locale purity and 1.4.3 text contrast stay at zero** in the expanded state on all 18 captures,
  matching the folded baseline — expanding the accordions does not surface any Latin-script leak or
  text-contrast failure this pass, only structural/boundary/duplication ones.

**The delete button's location is itself a finding worth naming**: a destructive, identity-critical
action (deleting a policy and all its documents/analyses) is nested three interactions deep — open
the page, open the "Documents" accordion (whose label gives no hint that Delete lives there), scroll
to the bottom of that section's content. `docs/transformation/LEDGER.md`'s own P-18 row ("Policy
header menu (edit, delete, share) — KEEP") describes this as a header MENU; it measurably is not one
in the current DOM — it is exactly one specific accordion's last child.

## Settle procedure
Identical across every T-015 surface — see `notifications/BASELINE.md`.

## Fixtures
6 healthy matrix fixtures (`FIXTURE_SPECS`: motor/health × active/expiring/expired) + 9 `defect-*`
fixtures (`DEFECT_SPECS`, T-012) on the paid account; `FREE_SPECS` (2 policies, deliberately over
the free gap-preview boundary) on the free account. All via `provisionMatrixFixtures`, idempotent,
prod-guarded.

## 0a. Metric table — 6 healthy-matrix captures × 3 widths (paid)

| fixture | width | scrollHeight | screens | sections | containers/depth | sub-44 | dup facts (attr/value) | 1.4.3 | **1.4.11** | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| motor-active | 320 | 4930 | 6.8 | 10 | 53/5 | 0 | 0/1 | 0 | 7 | 2 | 0 |
| motor-active | 390 | 4339 | 5.1 | 10 | 53/5 | 0 | 0/1 | 0 | 7 | 1 | 0 |
| motor-active | 430 | 4013 | 4.3 | 10 | 53/5 | 0 | 0/1 | 0 | 7 | 1 | 0 |
| motor-expiring | 320 | 2817 | 3.9 | 10 | 31/5 | 0 | 0/2 | 0 | 9 | 2 | 0 |
| motor-expiring | 390 | 2615 | 3.1 | 10 | 31/5 | 0 | 0/2 | 0 | 9 | 1 | 0 |
| motor-expiring | 430 | 2514 | 2.7 | 10 | 31/5 | 0 | 0/2 | 0 | 9 | 1 | 0 |
| motor-expired | 320 | 2793 | 3.9 | 10 | 32/5 | 0 | 0/2 | 0 | 9 | 2 | 0 |
| motor-expired | 390 | 2619 | 3.1 | 10 | 32/5 | 0 | 0/2 | 0 | 9 | 1 | 0 |
| motor-expired | 430 | 2535 | 2.7 | 10 | 32/5 | 0 | 0/2 | 0 | 9 | 1 | 0 |
| health-active | 320 | 5273 | 7.3 | 10 | 56/5 | 1 | 0/1 | 0 | 7 | 2 | 1 |
| health-active | 390 | 4684 | 5.5 | 10 | 56/5 | 1 | 0/1 | 0 | 7 | 1 | 1 |
| health-active | 430 | 4318 | 4.6 | 10 | 56/5 | 1 | 0/1 | 0 | 7 | 1 | 1 |
| health-expiring | 320 | 2801 | 3.9 | 10 | 31/5 | 0 | 0/2 | 0 | 9 | 2 | 1 |
| health-expiring | 390 | 2638 | 3.1 | 10 | 31/5 | 0 | 0/2 | 0 | 9 | 1 | 1 |
| health-expiring | 430 | 2537 | 2.7 | 10 | 31/5 | 0 | 0/2 | 0 | 9 | 1 | 1 |
| health-expired | 320 | 2777 | 3.9 | 10 | 32/5 | 0 | 0/2 | 0 | 9 | 2 | 1 |
| health-expired | 390 | 2642 | 3.1 | 10 | 32/5 | 0 | 0/2 | 0 | 9 | 1 | 1 |
| health-expired | 430 | 2558 | 2.7 | 10 | 32/5 | 0 | 0/2 | 0 | 9 | 1 | 1 |

`health-expired@430` was recaptured after this pass's harness caught a genuine capture failure —
see "Harness defect found and fixed" below; the value above is the corrected one.

## 0b. Metric table — 9 `defect-*` states × 3 widths (paid), 320px shown, full data in JSON

| fixture | scrollHeight@320 | sections | containers/depth | 1.4.11 (control/surface/unmeasured/shell) | leaks |
|---|---|---|---|---|---|
| defect-english-summary | 4960 | 11 | 55/5 | **1**/4/2/1 | 0 |
| defect-unreadable | 4995 | 11 | 54/5 | 0/4/2/1 | 0 |
| defect-failed-run | 4174 | 10 | 43/5 | 0/5/2/1 | 1 |
| defect-unmapped-gap | 5333 | 10 | 57/5 | 0/5/1/1 | 0 |
| defect-placeholder-identity | 3711 | 11 | 43/5 | **1**/4/5/1 | 2 |
| defect-raw-enum-basis | 4928 | 10 | 53/5 | 0/4/2/1 | 0 |
| defect-no-premium | 4928 | 10 | 53/5 | 0/4/2/1 | 0 |
| defect-no-documents | 4050 | 10 | 45/5 | 0/5/1/1 | 1 |
| defect-long-insurer | 5154 | 10 | 53/5 | **1**/5/1/1 | 0 |

## 1.4.11 — mandatory this pass, and the result is NOT uniformly zero

**This section is the FOLDED state only — see "0c" above for the expanded correction.** The
6-fixture healthy matrix confirms commit `f23ee784`'s claim holds for ordinary states while every
`PolicySection` is collapsed: **ZERO `control`-class findings** across all 18 healthy captures — only
`surface` (4–7), `unmeasured` (1–2) and `shell` (1, app-shell chrome, reported not gated) readings,
none of which SC 1.4.11 requires to be zero. Once every section is expanded (T-016c, "0c" above),
this ZERO does not hold: all six healthy fixtures show 1–3 live control failures inside content the
folded state never rendered. **But three of the nine degraded/edge-case fixtures ALSO produce a live
control failure even while folded:**

- **`defect-english-summary` — «Μετάβαση στην ανάλυση»** (Go to analysis) link, 1.35:1. This is the
  link the B2 fix's own UI shows when it suppresses a wrong-language summary — the fix for one
  defect (B2) introduced a control that fails a different one (1.4.11).
- **`defect-long-insurer` — «Δείτε τα σημεία για έλεγχο»** (See the points to review) button, **1.02:1
  — effectively invisible boundary.** The lowest ratio measured on this surface in this pass.
- **`defect-placeholder-identity` — «Δημιουργία»** (Generate/Create) button, 2.74:1 — close to the
  3:1 floor but under it.

**Why the clean matrix missed these:** none of the six healthy fixtures ever shows a wrong-language
summary, a 130-character insurer name, or a pending-identity policy, so these three controls simply
never render in the states that "10 → 0" was measured against. This is the T-012 lesson applied to
1.4.11 specifically: **a control-contrast claim measured only on healthy fixtures is a claim about
healthy fixtures, not about the surface.**

## Duplicate facts (value scan; `data-fact` attribute scan is vacuous — 8 attributes product-wide)

**Policy number renders twice in EVERY capture**, all 45 paid + 6 free: hero/breadcrumb `<span>` +
a `<dd>` definition-list value elsewhere on the page. Constant across every fixture and width.

**End date ALSO renders twice, but only on `expiring`/`expired` states** (12 of 18 healthy captures;
0 of 6 `active`): a `<p>Ισχύει έως {date}</p>` near the top plus the identical date inside `#dates`.
Confirmed by direct inspection (`motor-expiring-320.json`): `'top <p> Ισχύει έως 7/9/2026'` and
`'#dates <p> 7/9/2026'`. Not investigated further in this pass why `active` states do not show the
same duplication — recorded as an open question for whoever designs the "stated once" consolidation
(`docs/transformation/LEDGER.md` row P-02).

## Confirmed: three Goal-1 fixes hold on HEAD (positive findings, verified not assumed)

- **B2 (wrong-language summary):** `defect-english-summary` renders *"Η σύνοψη αυτού του
  ασφαλιστηρίου δημιουργήθηκε σε άλλη γλώσσα, γι' αυτό δεν εμφανίζεται εδώ..."* — the raw English
  text never reaches the DOM (`latinSentences` probe: `[]`).
- **B10 field-level (extractor placeholder in a FIELD):** `defect-unreadable`'s vehicle plate renders
  *"ΟΧΗΜΑ Δεν διαβάστηκε από το έγγραφο"* — the raw `XXXX` is replaced, not merely annotated.
- **B10 summary-level, CONFIRMED WORKING AS DESIGNED, NOT A BUG (investigated before publishing):**
  both `defect-unreadable` (`(XXXX)`) and `defect-placeholder-identity` (`(????)`) render the raw
  bracketed marker **inline inside the composed summary sentence**, immediately followed by a
  disclaimer ("Ορισμένα στοιχεία δεν διαβάστηκαν από το έγγραφο και εμφανίζονται ως «XXXX»/«????»
  στο..."). This looked like a redaction failure on first read — it is not: `GOAL1.md`'s own B10
  section states the design explicitly: *"A placeholder embedded mid-sentence in the composed
  summary cannot be replaced without rewriting the model's sentence, so it is annotated: the note
  says the values are not hidden and offers the document."* Recorded here so a future reader does not
  re-discover this as a false regression.

## Free tier (requirement 3) — captured, closes the Goal 0 baseline's own documented gap

`docs/evidence/policy-detail-mobile/BASELINE.md` explicitly recorded that its 18 captures never
exercised free-tier paths (the account turned out to hold `ph-pro`). `wallet-detail-free.spec.ts`
closes it: 2 `FREE_SPECS` fixtures × 3 widths, `reportUnlockedAt` reset before the run so the paywall
boundary renders every time.

| fixture | width | scrollHeight | sections | containers/depth | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|
| free-motor-active | 320 | 4953 | 10 | 57/5 | 6 | 6 | 0 (fixture-id false positive) |
| free-motor-active | 390 | 4231 | 10 | 57/5 | 6 | 3 | 0 |
| free-motor-active | 430 | 3960 | 10 | 57/5 | 6 | 3 | 0 |
| free-health-expiring | 320 | 2756 | 10 | 31/5 | 9 | 2 | 0 |
| free-health-expiring | 390 | 2593 | 10 | 31/5 | 9 | 1 | 0 |
| free-health-expiring | 430 | 2509 | 10 | 31/5 | 9 | 1 | 0 |

**The paywall boundary confirmed rendering**, verbatim in the capture JSON:
*"Ξεκλειδώστε και τα υπόλοιπα 2 κενά — €3 Ασφαλή πληρωμή με Stripe · Χωρίς συνδρομή"* ("Unlock the
remaining 2 gaps — €3, secure payment via Stripe, no subscription") — the free tier correctly shows
3 of 5 findings then locks the rest, exactly the `FREE_GAP_PREVIEW_COUNT` boundary the fixture was
built to exercise.

**A test-harness bug found and fixed while verifying this, kept transparent rather than silently
patched:** the tier-sanity assertion in `wallet-detail-free.spec.ts` (copied from
`policy-detail-free.spec.ts`'s precedent) checks `/Ξεκλείδ/` — with an ACCENTED ι. The actual rendered
Greek is the imperative **«Ξεκλειδώστε»**, which has no accent on that syllable, so the regex never
matched and the sanity test failed on both its attempts even though the paywall demonstrably
rendered (confirmed by reading the capture JSON directly, independent of the failing assertion). Fixed
to `/Ξεκλειδ/` (unaccented) in this file. **`policy-detail-free.spec.ts` carries the identical
accented pattern and may have the same latent bug** — out of this file's boundary to fix, flagged
here rather than silently left for the next person to rediscover.

## Harness defect found and fixed during this pass

`health-expired@430`'s first capture silently recorded **1076px / 2 sections** where its siblings
show ~2500-2800px / 10 sections. Investigated per the honesty rule before publishing: the page had
rendered the generic ERROR BOUNDARY (`«Κάτι πήγε στραβά»` / event code) — almost certainly triggered
by the resource contention of three concurrent `measure`/`measure-free` Playwright+Chrome processes
running simultaneously earlier in this pass (confirmed independently: two unrelated specs failed at
the exact same time with `page.waitForURL` timeouts and `ENOENT` trace-file errors). The generic
300px non-render floor did not catch it because 1076px is well above that floor. Fixed in
`tests/measure/surface-harness.ts`: `captureSurface` now refuses (throws) if the page text contains
`«Κάτι πήγε στραβά»`, the same "refuse to record a non-render" principle the dashboard harness
already applied to short captures, extended to a specific known false-positive shape. Recaptured
clean afterward (table above shows the corrected value); every other capture in this pass was
individually re-scanned for the same string — no other instance found.

## Sub-44px tap targets — near-zero, one survivor confirmed

0 across every capture except `health-active` (all 3 widths): one link, «Ελέγξτε αν το ομαδικό σας
αρκεί» (BranchActions, health line of business), at 254×**38**px — height fails by 6px. This is the
same offender the Goal 0 baseline already named (`«Έλεγξε αν το ομαδικό σου αρκεί» ×38px tall`,
3/18 captures then) — copy has been reworded (informal «σου»/«ελέγξε» → formal «σας»/«ελέγξτε»,
consistent with the register-conversion pass in `f23ee784`) but the height defect was not addressed,
and its footprint shrank from 3 fixtures to 1 (only `health-active`; `health-expiring`/`health-expired`
show zero tap targets in this pass — not investigated why the link is absent there rather than merely
resized).

## Not captured in this pass
- Dark theme (matches every other T-015 surface so far — only the prior Goal 0/0.5c series has dark
  captures, at 390px only, for the 6 healthy fixtures).
- The 14-pill section-nav strip's own tap-target sizes were not re-measured as an isolated finding
  here (folded into the whole-page count above, which is otherwise clean — B3's fix appears to hold,
  but this baseline did not isolate the nav strip the way the Goal 0 baseline did).
- **T-016c scope note**: the corrected expanded-state capture ("0c" above) covers the 6 healthy-matrix
  fixtures only, matching table 0a. The 9 `defect-*` states (table 0b) were NOT re-measured expanded —
  their own sections/accordions were never opened, so a defect living inside a collapsed section
  (e.g. a placeholder or leak inside "coverage"/"terms"/"review") would not appear in table 0b either.
  Free tier was also not re-measured expanded. Both are open gaps for whoever picks up the Phase 1
  fix for this surface — expand-all should be re-run against at least the fixtures a fix actually
  touches before that fix is marked done.
