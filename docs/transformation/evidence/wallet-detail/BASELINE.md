# BASELINE — Ασφαλιστήριο `/wallet/[id]` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/wallet/[id]` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/wallet-detail-baseline.spec.ts` (paid, 15 fixtures × 3 widths = 45 captures) +
`tests/measure/wallet-detail-free.spec.ts` (free, 2 fixtures × 3 widths = 6 captures).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure wallet-detail-baseline` / `--project=measure-free wallet-detail-free`

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

**Supplementary capture, added to close this gap**: `wallet-detail-expanded.spec.ts` re-measures
`motor-active` with all six sections force-opened (each accordion header clicked before capture).

| state | width | scrollHeight | screens | containers/depth | sub-44 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|
| collapsed (original) | 320 | 4930 | 6.8 | 53/5 | 0 | 7 | 2 | 0 |
| **all 6 expanded** | 320 | **12399** | **17.2** | 37/5 | 1 | 11 | 2 | 1 |
| collapsed | 390 | 4339 | 5.1 | 53/5 | 0 | 7 | 1 | 0 |
| **all 6 expanded** | 390 | **10964** | **13.0** | 40/5 | 1 | 11 | 2 | 1 |
| collapsed | 430 | 4013 | 4.3 | 53/5 | 0 | 7 | 1 | 0 |
| **all 6 expanded** | 430 | **10397** | **11.2** | 41/5 | 1 | 11 | 2 | 1 |

**Confirms the correction's premise with a number: expanding all six sections MORE THAN DOUBLES the
page (4930px → 12399px at 320px, a 2.5×increase) and lands within 8% of the pre-Goal-2 Goal-0
baseline's 13,428px.** Most of the "63% reduction" the earlier correction in this document measured
is real for the DEFAULT view, but a large share of the original content did not leave the page — it
moved behind a disclosure. `sections` reads 2 rather than 10 in the expanded state purely because
`sectionCount()`'s heuristic (metrics.ts) credits direct children of `.pw-page-shell` that are
NOT already inside a `section[id]` — with content now filling in below each `<section id>` header,
fewer stray top-level divs qualify; this is a counting-method artifact of measuring a different DOM
shape, not evidence that opening sections reduces structure.

`sub-44` rises from 0 to 1 once expanded (one target inside the previously-unmounted content), and
`1.4.11` from 7 to 11 (four additional boundary findings inside the six sections' own controls) —
both confirm the same point from a different angle: real controls exist inside this content that the
collapsed-state baseline could not see at all.

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

The 6-fixture healthy matrix confirms commit `f23ee784`'s claim holds for ordinary states: **ZERO
`control`-class findings** across all 18 healthy captures — only `surface` (4–7), `unmeasured` (1–2)
and `shell` (1, app-shell chrome, reported not gated) readings, none of which SC 1.4.11 requires to
be zero. **But three of the nine degraded/edge-case fixtures DO produce a live control failure:**

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
