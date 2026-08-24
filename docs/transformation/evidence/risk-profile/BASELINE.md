# BASELINE — Οι κίνδυνοί σας `/insights/risk-profile` — PW-MOBILE-TRANSFORM-02

**Date:** 2026-08-24 · **Branch:** NEW-UI · **Surface:** `/insights/risk-profile` (authenticated
policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/risk-profile-baseline.spec.ts` (paid) + `tests/measure/risk-profile-free.spec.ts`
(free) + `tests/measure/dashboard-risk-profile-unknown.spec.ts` (dash account).
Fixtures: `provisionMatrixFixtures` (paid: 15-policy matrix, motor+health only) +
`applyUnownedLinesProfileFixture` (paid — read, not modified) + `FREE_SPECS` (free, 2 policies) +
`applyPortfolioState` / the **corrected** `applyUnknownHouseholdFixture` (dash account,
`tests/measure/dashboard-fixtures.ts` — the Deliverable-1 fix this run made).
**Run:**
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure risk-profile-baseline` /
`--project=measure-free risk-profile-free` / `--project=measure-dash dashboard-risk-profile-unknown`

## Status: reachable and captured, 4 states × 3 widths (+1 same-session dashboard cross-check)

This surface had **never been measured**. Until this run's start, `proxy.ts` classified
`/insights/*` as agent-only via a `startsWith("/insights")` prefix match, so a policyholder
requesting their OWN `/insights/risk-profile` was bounced to `/dashboard` before the page ever
rendered. `ROUTE_OWNERSHIP` now carries `["/insights/risk-profile", "policyholder"]`, which wins
over the `["/insights", "agent"]` parent row (most-specific-pattern-wins, `proxy.ts`'s own
documented mechanism). **Reachability was verified live, not assumed**: all three specs below open
with a dedicated `reachability:` test that asserts `page.url()` contains `/insights/risk-profile`
and does **not** match `/dashboard` or `/auth/signin` — all three passed, for the paid, free, and
dash sessions alike.

## PAID tier — `unowned-lines-profile` (§2.2-style: pet/cyber/2-dependants declared, motor+health-only wallet)

Same account and setup as `branches-baseline.spec.ts` (`e2e-ph@policywallet.test`,
`provisionMatrixFixtures([...FIXTURE_SPECS, ...DEFECT_SPECS])` + `applyUnownedLinesProfileFixture`),
so this capture is directly comparable to the existing `/branches` §2.2 evidence: same profile,
same wallet, different surface.

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| risk-profile-unowned-lines-paid | 320 | 3112 | 4.3 | 6 | 35/3 | 0 | 1 | 7 | 2 | 1 |
| risk-profile-unowned-lines-paid | 390 | 2900 | 3.4 | 6 | 35/3 | 0 | 1 | 7 | 1 | 1 |
| risk-profile-unowned-lines-paid | 430 | 2688 | 2.9 | 6 | 35/3 | 0 | 1 | 7 | 1 | 1 |

## FREE tier — natural state (2-policy `FREE_SPECS`, no declared exposures)

`e2e-ph-free@policywallet.test`, `provisionMatrixFixtures(FREE_SPECS)` only — no profile fixture,
matching this account's natural, never-onboarded state.

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| risk-profile-natural-free | 320 | 1871 | 2.6 | 9 | 18/3 | 0 | 0 | 9 | 1 | 0 |
| risk-profile-natural-free | 390 | 1778 | 2.1 | 9 | 18/3 | 0 | 0 | 9 | 1 | 0 |
| risk-profile-natural-free | 430 | 1778 | 1.9 | 9 | 18/3 | 0 | 0 | 9 | 1 | 0 |

No tier check exists anywhere in this surface's own code (`app/(protected)/insights/risk-profile/
page.tsx`, `lib/services/risk-dna/*`, `components/risk-dna/*`,
`components/coverage/RiskGraphPanel.tsx` — confirmed by grep before writing the spec, mirroring the
`/branches` finding): what differs between the two tables above is entirely which wallet/profile
each account holds, not any paywall on this page.

## DASH account — the corrected unknown-household fixture (Deliverable 1) and a heavy-portfolio cross-check

`e2e-ph-dash@policywallet.test`. This surface has no tier gate (see above), so "paid vs free" does
not apply to this account's own captures below — recorded as `tier: n/a`.

### State A — unknown-household (Deliverable 1's fixture: `applyPortfolioState(..., "empty")` then the corrected `applyUnknownHouseholdFixture(..., 22)`)

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| risk-profile-unknown-household-dash | 320 | 2574 | 3.6 | 10 | 27/3 | 0 | 0 | 11 | 2 | 0 |
| risk-profile-unknown-household-dash | 390 | 2461 | 2.9 | 10 | 27/3 | 0 | 0 | 11 | 1 | 0 |
| risk-profile-unknown-household-dash | 430 | 2268 | 2.4 | 10 | 27/3 | 0 | 0 | 11 | 1 | 0 |

The spec asserts (not just observes) that the ΑΓΝΩΣΤΟ row renders: `expect(text).toMatch(/αγνωστο|unknown/i)` on every width, and it passed on all three.

### State B — heavy portfolio (one of "the normal matrix states"), **contaminated** — see caveat below

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| risk-profile-heavy-dash | 320 | 2611 | 3.6 | 10 | 26/3 | 0 | 0 | 10 | 1 | 0 |
| risk-profile-heavy-dash | 390 | 2498 | 3.0 | 10 | 26/3 | 0 | 0 | 10 | 1 | 0 |
| risk-profile-heavy-dash | 430 | 2287 | 2.5 | 10 | 26/3 | 0 | 0 | 10 | 1 | 0 |
| dashboard-heavy-dash-crosscheck | 320 | 5178 | 7.2 | 6 | 72/3 | 0 | 0 | 9 | 8 | 0 |

**Honesty note (§0.5 — do not compare captures whose underlying data moved between passes, applied
against my own spec):** this run's `dashboard-risk-profile-unknown.spec.ts` calls
`applyPortfolioState(db, DASH_EMAIL, "heavy")` for State B, but that function only clears the
`ΣΥΜΒ-2026-*` prefix — it does not touch State A's `E2E-DASH-UNK-MOT-*` policies or the profile
mutation State A made (`vehiclesCount: 22`, `answeredFields: ["vehiclesCount"]`), both left in place
by design (`applyUnknownHouseholdFixture`'s own isolation note says it composes safely with the
portfolio matrix). So **State B is not a clean `heavy` state** — it is `heavy`'s 12 policies **plus**
State A's 22 leftover motor policies and vehicles-known profile: the dashboard's own render below
confirms this directly (**"34 ασφαλιστήρια"** = 12 + 22). This was not the intended isolation for
this state, and a clean single-portfolio-state capture is listed under "Not captured" below.
Despite the contamination, the two pages captured for State B are the **same session, same DB
state, back-to-back** — so the cross-page comparison inside State B (candidate §2.8 below) is still
internally valid; only the label "clean heavy portfolio" is wrong, and this note corrects it rather
than silently presenting a mislabelled capture.

## Candidates

### §2.4 — the second score («Πόσο καλά σας γνωρίζουμε»): CONFIRMED, all three recorded bands

`components/risk-dna/RiskIntelligenceView.tsx:123-131`. Rendered text, verbatim from each capture:

| state | index | band label (el) | colour class (`BAND_TONE`) |
|---|---|---|---|
| paid, unowned-lines | **66** | Μερική εικόνα | `text-amber-600 dark:text-amber-400` (fair) |
| free, natural | **—** (not `0`) | Άγνωστη | `text-muted-foreground` (unknown) |
| dash, unknown-household | **—** (not `0`) | Άγνωστη | `text-muted-foreground` (unknown) |

The null/unknown case renders exactly as the brief anticipated: `health.index === null ? "—" :
health.index` (`RiskIntelligenceView.tsx:126`) — an em dash, never `0`. Confirmed on two
independently-provisioned accounts (free-natural and dash-unknown-household), both landing on
`customerHealthIndex`'s `completeness < 34` early return (`lib/services/risk-dna/health-index.ts:
104-118`), which also supplies the exact copy: *"Γνωρίζουμε πολύ λίγα για τη ζωή σας ώστε να έχει
νόημα ακόμη."*

**Accessibility finding, not previously listed:** the "Μερική εικόνα" (fair-band) label fails WCAG
1.4.3 — measured **3.20:1** (`fg=#e17100 bg=#ffffff`, needs 4.5:1) on the paid capture. `strong`
and `unknown` were not exercised by any fixture in this pass (see "Not captured"), so whether their
`BAND_TONE` colours also fail 1.4.3 is unconfirmed — recorded as a gap, not a clean bill.

### §2.2 — red «Απροστάτευτο» on lines the customer holds zero policies for: CONFIRMED

`components/coverage/RiskGraphPanel.tsx:71` (`STATE_STYLES.unprotected`). Paid, unowned-lines
capture, 320px, four rows rendered exactly this chip:

| risk | anchor | chip |
|---|---|---|
| Διαδικτυακή απάτη και παραβίαση λογαριασμού (cyber_fraud) | Διαδικτυακοί λογαριασμοί | ΑΠΡΟΣΤΑΤΕΥΤΟ |
| Τα υπάρχοντά σας και ζημιές που προκαλείτε ως ενοικιαστής (home_contents_tenant) | Η ενοικιαζόμενη κατοικία σας | ΑΠΡΟΣΤΑΤΕΥΤΟ |
| Απώλεια του εισοδήματος από το οποίο εξαρτάται το νοικοκυριό σας (life_dependents) | Εξαρτώμενο μέλος 1 · Εξαρτώμενο μέλος 2 | ΑΠΡΟΣΤΑΤΕΥΤΟ |
| Απρόβλεπτα κτηνιατρικά έξοδα και ευθύνη κατοικιδίου (pet_costs) | Κατοικίδιο 1 · Κατοικίδιο 2 | ΑΠΡΟΣΤΑΤΕΥΤΟ |

All four are lines `applyUnownedLinesProfileFixture` declares an exposure for (pets, cyber, two
dependants) that the account's wallet (motor+health only) holds no matching policy for —
`rollUpState`'s `if (!hasCover) return "unprotected"` (`protection.ts:365`). Visually confirmed
red (`border-red-200 bg-red-50 text-red-700` / dark equivalents) in the 320px screenshot.

### §2.13 — «ΑΓΝΩΣΤΟ» paired with «Οδήγηση χωρίς υποχρεωτική κάλυψη»: CONFIRMED (this is Deliverable 1)

See the Deliverable 1 report for the full mechanism. Live, rendered confirmation beyond the direct
function-call verification: the dash account's unknown-household capture (State A above) renders,
at every width —

> **Οδήγηση χωρίς υποχρεωτική κάλυψη** · Όχημα 1 · Όχημα 2 · … · Όχημα 12 · **ΑΓΝΩΣΤΟ**

— a blue chip (`STATE_STYLES.unknown`, visually confirmed distinct from the red `unprotected`
chip in the same screenshot), with the evidence panel underneath showing exactly the two
`unevaluable` dimensions: *"Δεν μπορέσαμε να διαβάσουμε ποιους κινδύνους καλύπτει..."* (peril) and
*"Δεν μπορέσαμε να διαβάσουμε ασφαλισμένο κεφάλαιο..."* (limit).

**Not confined to the deliberately-broken fixture — this is the default outcome for real ACORD
data, not previously listed.** The SAME row (`motor_liability`, ΑΓΝΩΣΤΟ) also renders on the PAID
account's `unowned-lines` capture, against the standard 15-policy `FIXTURE_SPECS`/`DEFECT_SPECS`
matrix — realistic, richly-populated ACORD v3 fixtures (`coverages: [{name, status, limits: [{basis,
amount, currency}], explanation}, ...]`, `tests/measure/fixtures.ts:250-279`). The reason: **`
readCoverageFacts` (`lib/services/risk-graph/service.ts:44-56`) reads sum-insured from `acord.
coverage?.sumInsured ?? acord.property?.insuredValue ?? acord.home?.insuredValue` — it never reads
`vehicle.insuredValue`**, which is where the real ACORD schema stores a motor policy's insured
value (`lib/schemas/acord-data.ts:99` under `vehicle`, and confirmed as the correct path by
`lib/gap-detection.ts:260`, `lib/insurance/content/action-resolvers.ts:170-171` and
`lib/services/renewal-differential.ts:55`, which all read it correctly for other features). Likewise
its peril lookup (`acord.coverage?.perils ?? acord.coverage?.coveredPerils ?? acord.home?.perils`)
matches nothing in the real schema, which represents perils as `coverages[].name` / `.status` line
items, not a flat array. Unlike the `territories` field in the same function (whose comment
explicitly says "no extractor writes these yet" — a documented, deliberate no-op), nothing marks
this as intentional. **Net effect: `motor_liability`'s `limit` and `peril` dimensions read
`unevaluable` for every motor policy in the system today, real or fixture, because the code never
looks in the place a motor policy's sum insured actually lives.** «ΑΓΝΩΣΤΟ» is therefore not a rare
edge case this run had to manufacture — it is the current default state of the product's flagship
"compulsory cover" risk, for every customer.

### §2.13(b) — the household guilt copy: CONFIRMED, and renders here (not only on the dashboard)

`lib/services/risk-dna/health-index.ts:199` (`householdOverview`'s `whyItMatters`, `dependantCount
> 0` branch). Renders verbatim inside the "Το νοικοκυριό" card on the paid `unowned-lines` capture
(`dependentsCount: 2` from the fixture):

> «2 άτομα εξαρτώνται από αυτή την προστασία. Ένα κενό εδώ δεν είναι μόνο δικό σας πρόβλημα.»

Context: the card only renders at all when `dependantCount > 0 || assetCount > 0 || obligationCount
> 0` (`RiskIntelligenceView.tsx:224-226`) — confirmed absent on both zero-information captures
(free-natural, dash-unknown-household), where the card is correctly suppressed rather than showing
three zeros.

**Grammar defect, not previously listed — the same class the most recent commit
(`11ec4987`, "count and noun agree at one") just fixed elsewhere.** The card's second sentence,
`householdOverview`'s `nextAction` (`health-index.ts:206`):
```
el: `${shared.length} ${shared.length === 1 ? "περιοχή" : "περιοχές"} που αφορούν όλο το νοικοκυριό παραμένουν ανοιχτές.`
```
inflects the NOUN for count (περιοχή/περιοχές) but not the two VERBS (`αφορούν`, `παραμένουν`,
both 3rd-person-plural), so the `shared.length === 1` case reads **"1 περιοχή που αφορούν όλο το
νοικοκυριό παραμένουν ανοιχτές"** — a singular subject with plural verbs, ungrammatical Greek.
Confirmed live: the dash account's unknown-household capture (State A, `shared.length === 1`)
renders exactly this sentence: *"1 περιοχή που αφορούν όλο το νοικοκυριό παραμένουν ανοιχτές."*
Correct Greek needs *"αφορά"* / *"παραμένει"*.

### §2.8 — count contradictions: CONFIRMED on two axes

**Axis 1 — "Παρακολουθούμε N πράγματα" vs the "Όλα" tab, exactly the v2 shape.**
`RiskGraphPanel.tsx:97` derives its headline from `summary.nodeCount` (the whole graph); the "Όλα"
filter chip (`RiskGraphPanel.tsx:136`) counts `risks.length` (only `applicable`, bound risks). These
are different denominators rendered one paragraph apart:

| capture | headline ("Παρακολουθούμε N πράγματα") | "Όλα" tab count | parts named |
|---|---|---|---|
| paid, unowned-lines | **11** | **6** | 3 περιουσιακά στοιχεία, 2 εξαρτώμενα μέλη (= 5, not 11) |
| dash, unknown-household | **14** | **2** | 12 περιουσιακά στοιχεία (= 12, not 14) |

Three different numbers describing "how much do we know / track", on the same card, in both
captures — matching v2's cited shape ("Παρακολουθούμε 10 πράγματα" against a tab reading "Όλα 5")
almost exactly, independently reproduced twice with different real numbers.

**Axis 2 — expiry-window mismatch between this surface and the dashboard, empirically proven,
same session, same DB state (State B above).** `monitorRisk`'s `cover_lapsing` signal (`lib/
services/risk-dna/monitoring.ts:69`, shared by BOTH `/insights/risk-profile` and `/dashboard` via
`assembleWatch`/`monitorRisk` — the module's own comment calls this the guard against exactly this
class of drift) uses a **45-day** window (`days >= 0 && days <= 45`). The dashboard's OWN, separate
fact-strip (`app/(protected)/dashboard/PolicyholderHome.tsx:299`, via `resolvePolicyLifecycle`,
`lib/policy-status.ts:192`) uses a **30-day** window (`daysUntilExpiry <= 30`). Both render on the
SAME `/dashboard` page. Captured back-to-back in one session, same 34-policy state:

| surface | source | expired | "about to lapse" |
|---|---|---|---|
| `/insights/risk-profile` | `monitorRisk` (≤45 days) | 1 | **3** — *"1 ασφαλιστήριο έχει ήδη λήξει και άλλα 3 λήγουν μέσα σε 45 ημέρες."* |
| `/dashboard` | `resolvePolicyLifecycle` fact-strip (≤30 days) | 1 | **2** — *"1 έχει λήξει · 2 λήγουν μέσα σε 30 ημέρες"* |

Expired counts agree (1 = 1, window-independent). The "about to lapse" counts do not (3 vs 2) — the
dashboard's own renewal timeline lists the exact policy responsible: *"Ταξιδιωτική: ανανέωση σε 45
ημέρες"* (Europ Assistance, ΣΥΜΒ-2026-H7) sits inside `monitorRisk`'s 45-day window but outside the
dashboard fact-strip's own 30-day window — one policy, counted on one page and not the other, both
about the same customer's own cover.

## Every count rendered on this surface, with its label

| label (el, as rendered) | source |
|---|---|
| ΠΟΣΟ ΚΑΛΑ ΣΑΣ ΓΝΩΡΙΖΟΥΜΕ — the index (0-100 or —) | `customerHealthIndex().index` |
| Όσα γνωρίζουμε για τη ζωή σας — component % | `customerHealthIndex().components[0]` |
| Πόσο πρόσφατη είναι η εικόνα — component % | `customerHealthIndex().components[1]` |
| Πόσα μπορέσαμε να κρίνουμε — component % | `customerHealthIndex().components[2]` |
| Κάλυψη που λήγει — "N ασφαλιστήρια έχουν ήδη λήξει" / "M λήγουν μέσα σε 45 ημέρες" | `monitorRisk` `cover_lapsing` (45-day window) |
| Πότε έγινε ο τελευταίος έλεγχος — "N ημέρες" when stale | `monitorRisk` `picture_stale` |
| Το προφίλ κινδύνου σας — nine per-dimension 0-100 scores | `computeRiskDna` (`DimensionResult.score`) |
| Τι προστατεύουμε headline — "Παρακολουθούμε N πράγματα … X περιουσιακά στοιχεία, Y υποχρεώσεις, Z εξαρτώμενα μέλη" | `graph.summary.nodeCount` / `.assets` / `.obligations` / `.dependants` |
| Filter chips — "Όλα N", "Απροστάτευτο N", "Άγνωστο N", etc. | `risks.length` / per-state `.filter().length` |
| Το νοικοκυριό — ΜΕΛΗ / ΕΞΑΡΤΩΜΕΝΑ / ΠΕΡΙΟΥΣΙΑΚΑ ΣΤΟΙΧΕΙΑ / ΥΠΟΧΡΕΩΣΕΙΣ | `householdOverview()` — `memberCount`/`dependantCount`/`assetCount`/`obligationCount` |
| "N άτομα εξαρτώνται…" (guilt copy) | `householdOverview().whyItMatters`, echoes `dependantCount` |
| "N περιοχές που αφορούν όλο το νοικοκυριό…" | `householdOverview().nextAction`, echoes `sharedExposures.length` |
| Header bell / bottom-nav badge — "9+" / raw digit | shell chrome, `AppShell.tsx` — not page-specific (same overflow-at-24px-circle defect already logged against `/branches`) |

Two counts this surface does **not** render, that the dashboard does: total policy count ("34
ασφαλιστήρια") and the gap-severity breakdown ("4 υψηλά · 5 μέτρια · 4 χαμηλά"). Not a
contradiction — nothing on this page claims either number — but worth recording as scope: a
customer who has seen the dashboard's "34 policies" and this page's "14 things we're tracking"
would reasonably not realise the two numbers describe different objects (policies vs. graph nodes)
rather than disagreeing about the same one.

## Not captured in this pass

- `strong` and `thin` health-index bands (§2.4) — every fixture in this pass landed on `fair` (66)
  or `unknown` (null); neither extreme was exercised, so whether their `BAND_TONE` colours pass or
  fail 1.4.3 is unconfirmed.
- A clean, single-portfolio-state `heavy` capture — State B above is a `heavy` + leftover
  unknown-household composite (34 policies), documented above rather than silently mislabelled.
  The other four `PORTFOLIO_STATES` (`empty`, `single`, `typical`, `all-expired`) were not captured
  on this surface at all.
- Dark mode, and any width outside 320/390/430.
- The `RiskGraphPanel` scroll-strip (`-mx-1 mb-4 flex gap-2 overflow-x-auto`) was NOT audited
  against `.pw-scroll-strip`'s specific convention (CLAUDE.md) — it achieves the same effect
  (`flex-shrink-0` on each `Chip`) without the named class, and the `truncationFailures` probe
  correctly reports it as legitimate horizontal overflow, not a clipping bug, but this was not
  independently re-verified against the narrow-viewport `min-width: 0` safety-net rule.
