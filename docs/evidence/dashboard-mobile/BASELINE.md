# BASELINE — Dashboard «Η προστασία μου» (mobile), B2C wallet — Goal 0

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/dashboard` (authenticated policyholder) · **Locale:** `el`
**Harness:** shared metrics imported **verbatim** from `tests/measure/policy-detail.ts`; only the two
dashboard-specific metrics live in `tests/measure/dashboard.ts`. Fixtures: `dashboard-fixtures.ts`.
**Run:** `npx playwright test --project=measure-dash` (+ `--project=measure pro-home` for the Pro capture)
**Evidence:** `data/baseline/*.json`, `screenshots/baseline/*.png` — 19 captures.

**Measured on the post-Goal-2 policy-detail tree** (commit `5705289b`), including the AppShell
`env(safe-area-inset-bottom)` reservation — your decision, so the dashboard is measured on a shell
whose bottom bar no longer occludes 15px of it. Production still carries the occlusion until the next
deploy.

## Fixtures — built to be able to produce the defect

Portfolio state is a property of the **user's whole wallet**, not of a policy, so this matrix cannot
be six policies side by side: a dedicated account (`e2e-ph-dash@policywallet.test`) has its wallet
**rebuilt between captures**. The Goal 0.5 lesson from the policy-detail series was applied up front —
a clean wallet reproduces none of D3/D5/D7/D11 — so the degraded conditions are deliberate: the two
longest real Greek insurer legal names, a policy with **no premium**, an unanalysed policy inside a
scored portfolio, two policies with **deliberately identical display values** (D11), a failed run, and
an expired policy inside a live wallet.

## 0a — Baseline metrics

| state | width | scroll (screens) | sections | containers/depth | sub-44 | count-fail | dup-blocks | leaks | 1.4.3 | 1.4.11 |
|---|---|---|---|---|---|---|---|---|---|---|
| empty | 320 | 3311 (4.6) | 9 | 45/3 | 5 | 0 | 0 | 0 | 0 | 20 |
| empty | 390 | 3032 (3.6) | 9 | 45/3 | 5 | 0 | 0 | 0 | 0 | 21 |
| empty | 430 | 2889 (3.1) | 9 | 46/3 | 5 | 0 | 0 | 0 | 0 | 21 |
| single | 320 | 3524 (4.9) | 9 | 46/3 | 5 | 0 | 1 | 0 | 0 | 20 |
| single | 390 | 3233 (3.8) | 9 | 46/3 | 5 | 0 | 1 | 0 | 0 | 21 |
| single | 430 | 3113 (3.3) | 9 | 47/3 | 5 | 0 | 1 | 0 | 0 | 21 |
| typical | 320 | 5027 (7) | 13 | 63/3 | 5 | 1 | 1 | 0 | 0 | 24 |
| typical | 390 | 4720 (5.6) | 13 | 63/3 | 5 | 1 | 1 | 0 | 0 | 25 |
| typical | 430 | 4129 (4.4) | 13 | 64/3 | 5 | 1 | 1 | 0 | 0 | 26 |
| heavy | 320 | 6263 (8.7) | 13 | 79/3 | 5 | 1 | 1 | 0 | 0 | 28 |
| heavy | 390 | 5133 (6.1) | 13 | 79/3 | 5 | 1 | 1 | 0 | 0 | 29 |
| heavy | 430 | 4574 (4.9) | 13 | 80/3 | 5 | 1 | 1 | 0 | 0 | 30 |
| all-expired | 320 | 4022 (5.6) | 11 | 52/3 | 5 | 1 | 1 | 0 | 0 | 21 |
| all-expired | 390 | 3602 (4.3) | 11 | 52/3 | 5 | 1 | 1 | 0 | 0 | 22 |
| all-expired | 430 | 3466 (3.7) | 11 | 53/3 | 5 | 1 | 1 | 0 | 0 | 23 |
| heavy-analysis-in-progress | 320 | 6263 (8.7) | 13 | 79/3 | 5 | 1 | 1 | 0 | 0 | 28 |
| heavy-never-analysed | 320 | 6301 (8.8) | 13 | 79/3 | 5 | 2 | 1 | 0 | 0 | 28 |
| heavy-all-failed | 320 | 6285 (8.7) | 13 | 79/3 | 5 | 1 | 1 | 0 | 0 | 28 |
| **pro-tier** | 320 | 6234 | 9 | 89/3 | 5 | 3 | 2 | **6** | — | 34 |

Reading the table:

- **An EMPTY wallet renders 9 sections and 3,311px** — 4.6 screens for zero policies.
- **Scroll height barely moves with content**: single 3,524px → heavy 6,263px. The page's length is a
  property of the page, not of the portfolio.
- **Sections are 9–13 in every state** (Goal 2 target: ≤7).
- **Container depth is 3 everywhere** (Goal 4 target: 2).
- **Sub-44px targets: 5 in every single capture** — identical across all states and widths, so they
  are chrome, not content.
- **1.4.3 text contrast: 0 failures everywhere. 1.4.11 non-text: 20–34 failures everywhere.**
  Same finding as the policy-detail §0.5 — the shared secondary-control pattern
  (near-transparent fill, `border-black/10`) is below 3:1 across the whole application. This is
  founder decision #3 already logged in `STATUS.md`.
- **The Pro capture is the outlier on leakage: 6 internal-token leaks** where every other capture has
  zero. That is not a tier behaviour — see D5.

## 0b — The eleven candidates, adjudicated

### D1 — the score. **CONFIRMED, but not the mechanism the brief describes.** THE headline result.

**The premise needed correcting first.** The brief (and invariant 2) describe the score as "an
aggregate over per-policy scores that return 100 for minimum cover and 81 for a policy 15 months
expired". It is not. `calculateScoreFromAssessments`
(`lib/services/gap-engine/protection-score.ts:421`) is a **weighted average over risk-assessment
categories** — health, life & income, property & motor, income protection, liability, lifestyle —
scored on which lines of business the customer's profile implies versus which they hold. It has no
relationship to `calculatePolicyHealthScore`, the per-policy figure that produced A1 on the policy
page. It already carries an `indeterminate` guard (`:542`): below 50% of the assessment catalogue
decided, the number is suppressed. `PolicyholderHome.tsx:299-321` already renders four states —
`empty`, `provisional`, `indeterminate`, `scored`.

**It measures BREADTH, not quality** — and its own methodology copy says so, accurately:
«Η βαθμολογία δείχνει το εύρος των καλύψεων που έχετε — όχι αν τα όριά τους επαρκούν» (`el.ts:1835`).

**What is actually broken — measured, one capture per state:**

| portfolio state | verdict rendered | honest? |
|---|---|---|
| empty (0 policies) | **none** | ✓ correctly withheld |
| single (1 policy, **never analysed**) | **«Καλή κάλυψη»** | ✗ a verdict from one unread policy |
| typical (3 mixed) | «Καλή κάλυψη» | — |
| heavy (12 mixed) | «Χρειάζεται προσοχή» | — |
| **all-expired (4, zero cover)** | **«Χρειάζεται βελτίωση»** | ✗ "needs improvement" for a customer with **no cover at all** |
| **heavy, nothing ever analysed** | **«Χρειάζεται προσοχή»** | ✗ nothing was read; a verdict renders anyway |
| **heavy, every analysis failed** | **«Χρειάζεται προσοχή»** | ✗ same |

So the empty guard works and the brief's "all-expired renders a positive verdict" is **too strong** —
it renders an *understated* one. That is still a false statement: a wallet whose every policy has
expired provides no cover, and «χρειάζεται βελτίωση» describes a portfolio that needs work, not one
that does not exist.

**Root cause, and why it is the same defect as policy-detail A1:** nothing in
`protection-score.ts` or in the hero derivation reads `lastAnalyzedAt`, `processingError`, or run
status — grep returns zero matches. Expired policies *are* excluded from coverage inference
(`isPolicyCoverageActive`, `gap-engine/index.ts:382`), which is why all-expired scores low rather than
high; but "we could not read your policies" and "your policies are thin" are collapsed into one
number. **Goal 1 fix: the same rule one level up — no verdict where the inputs cannot support one.**

### D2 — the floating avatar. **DOES NOT REPRODUCE.**
No absolutely-positioned element exists anywhere in `components/dashboard/home/*` (grep: zero
`absolute`). No layout-integrity failure in any of the 19 captures. The observed overlap is the app
shell's own fixed header/avatar painting over content in a full-page screenshot — the same capture
artifact catalogued as policy-detail B4, and now *also* a real one on production until the
`env(safe-area-inset-bottom)` fix deploys (policy-detail §0.5e).

### D3 — broken Greek. **SPLITS FOUR WAYS; two are misreads.**

| observed | verdict |
|---|---|
| «Αναμονή για θεραπεία τη στιγμή που **μεταλάει**» | **MISREAD.** The authored string is «…που **μετράει**» (`gap-engine/risk-catalog.ts:901`) — correct Greek. |
| «Πείτε μας **να** θα την επανεκτιμήσουμε» | **MISREAD.** Authored: «Πείτε μας **και** θα την επανεκτιμήσουμε» (`el.ts:1863`) — correct. |
| «**Ανοιχτές σοβαρές εκθέσεις**» | **CONFIRMED mistranslation.** `risk-dna/monitoring.ts:137` renders "Serious exposures open" as «εκθέσεις» — which in Greek means *exhibitions/reports*, not insurance exposure. Authored string, editable. |
| «Προστασία που υποχωρεί» | **NOT BROKEN.** `monitoring.ts:92`; awkward but grammatical. |
| «ο βαθμολογία» | **UNRESOLVED.** Not present in any authored string, and not present in any of the 19 captures' `fullText`. Neither reproduced nor traced; recorded as open rather than closed. |

Locale purity is otherwise clean: **0 Latin-script sentences** in all 19 captures. D8's `AI Insights`
is shell chrome and sits outside `.pw-page-shell`.

### D4 — unlabelled euro chips. **CONFIRMED as a real gap in the data, not the layout.**
The `heavy` fixture deliberately includes a policy with `premiumAmount: null`. The portfolio total is
therefore computed over 11 of 12 policies with nothing saying so — the same class as D9/D10: a number
whose scope is invisible.

### D5 — fixture leakage. **CONFIRMED, and it is two defects, one of them real beyond fixtures.**
The Pro capture leaks **6 internal identifiers** where every dashboard-fixture capture leaks zero:

- «Ασφαλιστήριο Υγεία · **E2E-PDM-HL-XPD**» ×5 — the document label is generated as
  `<type> · <policyNumber>` and rendered verbatim by `PortfolioSummaryCard`. For a real customer this
  is their real policy number, which is defensible; the point is that **whatever the policy number
  contains reaches the screen unfiltered**.
- «Συνδεδεμένος: **E2E Agent**» — the advisor's name. Correct for a fixture. **But the fallback is
  the defect:** `agentName = customerRelationship.agent.name || customerRelationship.agent.email`
  (`PolicyholderHome.tsx:582`). **An agent who has not set a name has their email address rendered to
  the customer.** That is a live data-exposure path independent of any fixture.

### D6 — AI disclaimer three times. **CONFIRMED (as two on this account, three call sites).**
One component, three independent call sites: `AttentionList.tsx:118`, `ProtectionStatusHero.tsx:188`,
`RecommendationCards.tsx:687`. Measured: **2 duplicate blocks** on the Pro capture — the disclaimer
*and* a second one nobody reported, the severity qualifier
«Οι προτεραιότητες βασίζονται στο προφίλ σας…», also rendered twice.

### D7 — truncation. **CONFIRMED, but NOT on insurer names.**
The insurer names render in full — even the 57-character
«ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ «Η ΕΘΝΙΚΗ»». What clips is the **branch category
chips**, and severely:

| chip | needs | has | hidden |
|---|---|---|---|
| «Σύνταξη & Αποταμίευση» | 146px | 62px | **57%** |
| «Ταξιδιωτική» | 72px | 62px | 14% |
| «Αυτοκίνητο» | 69px | 62px | 10% |
| «Κατοικίδιο» | 64px | 62px | 3% |

**11 clipped elements at 320px**, 5 even on all-expired. Root cause: `BranchCoverageMap.tsx:57,72` —
`min-w-[128px]` on the chip with `truncate` on a `flex-1` label inside. **Not the global
`min-width: 0` rule** (policy-detail §0.5d measured that rule: ten scroll strips share B3's shape and
none currently compresses). This is a component-level width choice.

### D8 — `AI Insights`. **CONFIRMED, shell.** Already logged as policy-detail A4. Fix once.

### D9 / D10 — the counts. **BOTH CONFIRMED as labelling defects, one worse than described.**

Measured on the Pro capture, one page, four numbers all called «ασφαλιστήρια»:

> «**9** περιοχές ίσως χρειάζονται έλεγχο · **12** ασφαλιστήρια καταχωρημένα» …
> «**3** ασφαλιστήρια λήγουν μέσα σε 45 ημέρες» … «ΑΝΑΝΕΩΣΕΩΝ **6** ασφαλιστήρια»

- **D9 is legitimate but unlabelled:** «περιοχές» counts `activeRecommendations`; the gaps widget
  counts gap *instances* by severity. Two different things, both correct, neither says which.
- **D10 is NOT a legitimate subset.** `renewalItems = upcomingRenewals.slice(0, 6)`
  (`PolicyholderHome.tsx:538`) — **6 is a display cap rendered as a quantity.** The heading says
  «6 ασφαλιστήρια» whether the customer has 7 upcoming renewals or 70.

### D11 — identical renewal rows. **CONFIRMED by construction.**
The `heavy` fixture deliberately contains twins (H2/H3: same branch, same insurer, same 164 days, same
gap count). They render indistinguishably — «Αυτοκίνητο: ανανέωση σε 164 ημέρες» twice, with nothing
identifying which policy is which. Two real policies can legitimately share every displayed value, so
the row lacks distinguishing identity either way.

## 0c — Also verified

- **Empty state:** 9 sections, 3,311px, **no score and no verdict** — the one state that is already
  right. It is also 4.6 screens of scaffolding for a customer with nothing in their wallet.
- **Single state:** 9 sections for one policy, and a «Καλή κάλυψη» verdict over a policy that has
  never been analysed.
- **All-expired:** see D1. Also note it renders 11 sections and 5.6 screens — the wallet provides no
  cover, and the page's shape barely changes to say so.
- **Analysis states:** in-progress, never-analysed and all-failed are **pixel-identical to `heavy`**
  (6,263 / 6,301 / 6,285px, 13 sections, same containers). The page does not change shape when its
  own inputs are missing.
- **Register:** the dashboard bundle is formal. The informal layer reaches it indirectly through
  `lib/insurance/content/*.ts` (33 of 35 files), which is founder decision #2, already logged.
- **Contrast:** 1.4.3 clean; 1.4.11 20–34 failures per capture, the app-wide control pattern.
- **Screen reader:** not yet measured. Recorded as **outstanding** — the brief asks how the donut and
  the severity chips are announced, and answering it needs an accessibility-tree assertion the
  harness does not have. It belongs with the Goal 3 severity work.

## Metric limitations — stated, because a clean number is worse than none

Both dashboard metrics were **wrong on their first run and corrected before this baseline was
published**. Recording that here rather than quietly shipping the second version:

1. **Count-consistency reported 0 on a page that says «12 ασφαλιστήρια» and «6 ασφαλιστήρια».** The
   first implementation grouped by the whole normalised label, so the two phrasings became different
   keys. It now groups by the **noun** the number counts. Same class of error as the 1.4.3-only
   contrast pass — a metric that cannot see its own defect.
2. **Truncation reported 0 clipped labels on a page with 11.** The shared `clippedLabels` probe is
   imported verbatim as the brief requires, but its selector list was written for policy-detail's
   element types (nav links, headings, `dt`, `th`). The dashboard clips in `<span class="truncate">`.
   Added `clippedContent` **alongside** it — additive, not a fork.
3. **Count-consistency still over-reports** row-level counts: six renewal rows each saying
   «N σημεία για έλεγχο» for *different policies* group together and register as a disagreement.
   That is what the brief's namespaced `data-count` keys exist to fix, and it cannot be resolved by a
   value scan. The baseline numbers in the table therefore **include this false-positive class**;
   the specific real disagreements are enumerated under D9/D10 instead.

## 0d — Relocation Ledger

Thirteen sections at `heavy`, enumerated from the render tree (`PolicyholderHome.tsx:655-860`):

| # | Capability | Current location | Post-change | Rationale |
|---|---|---|---|---|
| 1 | Score hero: donut, verdict, delta, key reason, methodology disclosure | top | TBD (Goal 3 — D1) | |
| 2 | «Έλεγχος της προστασίας μου» CTA | hero | TBD (Goal 2 — the ONE primary) | |
| 3 | Carried-plan checkout card | after hero (conditional) | TBD | monetization |
| 4 | Open risk-review card | after hero (conditional) | TBD | |
| 5 | Attention list + its AI disclaimer | main | TBD (Goal 2 — attention slot) | |
| 6 | Coverage-gaps widget (severity chips + qualifier) | main | TBD (Goal 3 — invariant 1) | |
| 7 | Protection monitor signals | main | TBD | |
| 8 | Life-event prompt chips | main | TBD (Goal 2 — promote) | |
| 9 | Renewals timeline (+ upgrade teaser) | ~70% depth | TBD (Goal 2 — promote to attention) | monetization |
| 10 | Portfolio summary: counts, premium total, document tiles | main | TBD (Goal 2 — D4/D10) | |
| 11 | Protection plan «8 από 16» | main | TBD (Goal 2 — split) | |
| 12 | Recent changes widget | main | TBD | |
| 13 | Advisor status + help tiles | foot | TBD (Goal 1 — D5) | |
| 14 | Branch coverage map chips | main | TBD (Goal 1 — D7) | |

**Counted separately:** CTAs and AI entry points are **not yet fully enumerated** — the ledger above
is by section, and the brief asks for a per-CTA count with destinations. Outstanding, and needed
before Goal 2 can claim "one primary CTA". **Monetization surfaces: 3 identified** (carried-plan card,
renewals upgrade teaser, plan-limit line «Το Plus έχει χώρο για έως 10 ασφαλιστήρια»), against 12 of
60 on policy-detail.

## 0e — The score decision (surfaced, not decided)

**How it is computed.** Weighted average over six risk-assessment categories (health, life & income,
property & motor, income protection, liability & legal, lifestyle), each scored on whether the lines
the customer's profile implies are actually held. Suppressed entirely when under 50% of the
assessment catalogue can be decided. It measures **breadth of cover**, and its methodology copy says
so accurately.

**What it returns:** see the D1 table — correctly silent when empty, and rendering a verdict in every
other state including "nothing has ever been analysed" and "every policy has expired".

**Options.**
1. **Remove it.** Honest, and discards a genuinely useful breadth signal.
2. **Replace with a factual composition** — «12 ασφαλιστήρια · 3 λήγουν σύντομα · 2 δεν έχουν
   αναλυθεί». States facts, needs no caveat, and answers the ten-second test's questions 1–3 directly.
3. **Keep behind a disclosure, no verdict** — the number with its methodology, never a word.

**Recommendation: 2 as the headline, 3 underneath it.** The composition is what the ten-second test
actually asks for, and it cannot be wrong; the score survives for the customers who want a single
figure, without a verdict the inputs cannot support. **Not my decision** — logged in `STATUS.md`.

## Out of scope, untouched

`lib/gap-detection.ts` unchanged (`git diff` empty). Score **arithmetic** unchanged. No AI schema
touched. No app code changed in Goal 0 — including no `data-count` attributes.

**STOP: Goal 1 not started, per the brief.**
