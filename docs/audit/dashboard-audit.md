# Dashboard audit — findings ranked by user cost (D3)

*2026-08-31. Every finding carries the probe that measured it, the selector or
JSON evidence, and where it stands after the fix pass. No finding without
evidence; the probes and baselines live under `tests/audit/` and
`docs/audit/`. The OLD build = the pre-rebuild screens at :3000 (NEW-UI);
the NEW build = `feat/grafi-b2c` at :3100.*

## Ranked findings

### 1. Facts a user could lose money over (probe: inventory + loss gate)

| finding | evidence | outcome |
|---|---|---|
| **/help had no entry point anywhere in the rebuilt IA** — the help centre, its articles, dictionary and support band were unreachable except by URL | `loss.spec.ts` (gate 1), old fact «Βοήθεια και υποστήριξη» on /dashboard | **FIXED** — /me carries the help row |
| **No lens of the folder showed a policy's expiry date** — the by-expiry lens grouped by expiry without stating it, and no row carried a date; the old dashboard showed dates for every renewal | `loss.spec.ts`; old facts «ανανέωση σε N ημέρες · date» | **FIXED** — expiring/expired rows carry their date in every lens; the expiry lens leads with it |
| The old wallet's «Ασφαλιστικό αποτύπωμα 1.064,30 €» summed mixed-lifecycle rows into a figure with no definition | inventory /wallet; R-11 | Replaced by the defined figure on /money (in-force premiums, with the exclusion note) |
| «Το σκορ προστασίας σας πήγε από 83% σε 74%» — a percentage score of the person, still stored in notification rows | inventory /notifications; R-02 | Filtered by `isRetiredScoreRow`; scores are banned outright |

### 2. Blocked reading and broken geometry (probe: layout.spec.ts, A2)

The NEW build swept clean — **132 findings → 0 across 5 viewports × 23
routes** (`docs/audit/layout-findings-new-*.json`). What the sweep found and
fixed, by cost: both Switch implementations overhung every settings/consent
row by 4–6 px; the branch-lens alert title rendered as a one-character
vertical column beside its chip at 375; GlossaryHint's opened definition
collapsed to the width of its trigger word; the pricing grid overflowed the
viewport from the popular card's scale; /help and /upgrade crushed
three-column bands into a ~700 px shell column (~200 px cards); the «Νέο»
badge clipped its own text; nine controls sat under the 44 px floor;
truncating labels (document filenames, branch rows, the user-menu email) had
no full-text form. The old build's geometry baseline is recorded in
`layout-findings-old-*.json` for the record.

### 3. Vocabulary babel (probe: consistency.spec.ts, A6 — the highest-value probe)

Old build (baseline JSON): **11 distinct status vocabularies** on six routes
(ΛΗΓΜΕΝΟ, ΛΗΓΕΙ ΣΥΝΤΟΜΑ, ΕΝΕΡΓΟ, ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ, Κρίσιμη/Υψηλή
προτεραιότητα, Απαιτείται ενέργεια, Εντάξει, υψηλά/μέτρια/χαμηλά, Κενό
προστασίας…), 29 css-uppercase Greek runs, 23 duplicate-text violations
(the /protection page repeated 16 strings), one banned advice stem, three
naked numbers. New build: **exactly the three states, zero on every other
rule** — asserted, not reviewed.

### 4. Accessibility (probe: a11y.spec.ts, A3)

Old: `aria-progressbar-name` (serious) on the dashboard ring in both themes
and widths; a serious `color-contrast` on /notifications. New: **zero axe
violations and zero custom findings** (one h1, no heading skips, aria-live
present, visible focus, landmark-aware reading order) at desktop + iphone-15
× light + dark.

### 5. Contrast (probe: contrast.spec.ts, A4)

Old: the wallet search input's boundary at **1.25:1 light / 1.0:1 dark** —
an invisible control edge. New: the probe caught the same class of defect —
the Grafí Input border (`border-strong`, classed decorative in G2) measured
**1.45:1** where it is the control's only identification. **FIXED at the
token level**: new `border-control` role (green-500) with 3:1 checks in the
generated matrix (50 pairs, all ≥ floor); every input/select moved onto it.
New build asserts zero failing rendered pairs, both themes.

### 6. Performance (probe: performance.spec.ts, A5)

CLS is **0.000 on every route** (skeletons hold their layout). The probe
exposed a real waterfall: the protected layout awaited five independent
reads sequentially — against a dev database where one `SELECT 1` costs
~660 ms, that was seconds of TTFB. **FIXED**: one `Promise.all` wave.
What remains is geography, not code (A-36): the absolute LCP < 2 s gate is
`PERF_STRICT=1` for a same-region run; locally the asserted floors are CLS
and client cost (LCP−TTFB < 1.5 s under 4G × 4× CPU). Route JS on `/` is
528 KB transferred — the known Sentry/Supabase shell weight named in
`docs/perf-report.md` stands.

## What the current (old) UI did well — the facts that had to survive

These made the clean rebuild hard, and the loss gate proves each survived:
the **per-policy premium and renewal dates**; the **citation blocks**
(document + page/section per extracted fact — now the FindingCard's source
line, which the card cannot render without); the **expiring-count lines**
(«5 λήγουν μέσα σε 30 ημέρες» — now the verdict + tiers); the **adviser's
shared-policy list** with per-policy visibility and grant dates; the
**consent register** with per-document revocation; the **plates and policy
numbers as identity** on every row. The full contract: 322 items in
`information-inventory.md`, 189 in guarded classes, zero unexplained losses
(`loss-report.json`), 18 written retirements (`retired-information.md`).

## Probe honesty ledger

Findings the instruments produced about THEMSELVES during the red runs —
recorded because a probe that cries wolf is worse than none: sr-only text
is not truncation; content scrolled behind fixed chrome is not an overlap;
closed-`details` geometry ghosts (content-visibility) are not tap targets;
absolute-positioned badges are not text clipping; stored-caps legal names
are data, not shouting; per-row affordances are structure, not duplication;
landmark crossings are not focus leaps; fixture-relative dates drift, so
loss anchors are contract identities.
