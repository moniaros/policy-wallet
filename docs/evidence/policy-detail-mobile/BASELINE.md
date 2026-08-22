# BASELINE — Policy Detail (mobile), B2C wallet — Goal 0

**Date:** 2026-08-22 · **Branch:** NEW-UI · **Surface:** `/wallet/[id]` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/policy-detail.ts` (metric definitions, shared verbatim with the Goal 5 pass) +
`tests/measure/policy-detail-baseline.spec.ts` (capture pass) + `tests/measure/fixtures.ts` (matrix fixtures).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure`
**Raw evidence:** `data/baseline/*.json` (one per capture, full probe output), `screenshots/baseline/*.png` (full-page).

## Fixtures

Six local test fixtures on the E2E policyholder account (`e2e-ph@policywallet.test`) in the
local-dev database — the same account/database the E2E suite already provisions into; nothing
touches production and no records exist outside the dev DB (`tests/measure/fixtures.ts`,
idempotent, refuses the prod project by ref):

| key | policyNumber | line | state | end date (relative) |
|---|---|---|---|---|
| motor-active | E2E-PDM-MOT-ACT | motor | active | +165d |
| motor-expiring | E2E-PDM-MOT-EXP | motor | expiring | +15d |
| motor-expired | E2E-PDM-MOT-XPD | motor | expired | −110d |
| health-active | E2E-PDM-HL-ACT | health | active | +165d |
| health-expiring | E2E-PDM-HL-EXP | health | expiring | +15d |
| health-expired | E2E-PDM-HL-XPD | health | expired | −110d |

Each carries a realistic v3 acord envelope (coverages with statuses + structured limits,
exclusions, notable conditions, fine print, perks, extraction meta), a Greek `coverageSummary`,
one document row, one completed analysis run, and two open rule-provenanced gap instances from
ACTIVE authored definitions (severity copied from the definition — nothing re-decides anything).

> **CORRECTION (Goal 1, 2026-08-22).** This section originally stated that the account is free-tier
> "so the captures exercise the locked-report / upgrade-trigger paths". That was an unverified
> assumption and it is **wrong**: `e2e-ph@policywallet.test` holds an ACTIVE `ph-pro` (Family)
> subscription — `entitlements.agentCollaboration: true`, `savingsReportExport: true`,
> `aiAnalysisPerMonth: null`. Consequences for how the baseline should be read: the captures exercise
> the PRO paths (direct savings-report export, collaboration panel visible — which is why B8's
> duplicate string appears in them), and they do **NOT** exercise the free-tier paths (locked gap
> report + €3 unlock CTA, PDF-preview lock, premium-insight upsell cards, the sidebar upgrade banner).
> Those states are unmeasured by this baseline and must be added before Goal 5 can claim the ledger is
> complete. Every metric in the table stands — the tier changes which optional blocks render, not how
> they were measured.

Additionally, the account's real analysed policy **Εθνική 64504715** (the page the candidate
defects were observed on: English stored summary, failed latest run) is captured as
`real-64504715-{320,390,430}` — outside the matrix, for candidate reproduction only.

## Measurement definitions (operationalized)

Defined once in `tests/measure/policy-detail.ts`; the Goal 5 pass reuses the identical file.

- **Settle:** `goto(domcontentloaded)` → `waitForLoadState('networkidle')` capped at 8s
  (never fires on the dev server — the dummy Upstash host retries DNS forever) → fixed +1s →
  animations frozen → the Next.js dev-tools overlay (`nextjs-portal`) hidden (dev-only chrome,
  not product UI; it floats over content in full-page captures).
- **Scroll height:** `document.documentElement.scrollHeight` (CSS px) after settle.
- **Section count:** every visible `section[id]` PLUS every direct child of a top-level layout
  column (page-shell inner wrapper, main column, page `<aside>`) that is outside any
  `section[id]` and has a heading (h1–h3) or a visible boundary. Nested `section[id]`
  (#renewal inside #key-dates) count individually — the customer perceives them as groups.
- **Container count:** visible elements ≥8×8px with a visible boundary: background alpha >0.02,
  box-shadow, or any border side with width>0/style≠none/alpha>0.02 (alpha parsed from both
  modern `/ a` and legacy `rgba()` serialisations; colours with no alpha channel are opaque).
  **Max depth** = deepest ancestor chain of such elements. Off-canvas chrome (the app shell's
  closed drawer at translate-x:-100%) is excluded everywhere.
- **Duplicate-fact count:** `max(dataFactDuplicates, valueScanDuplicates)` — the `data-fact`
  attribute scan (authoritative once Goals 1–4 instrument it; zero attributes exist at
  baseline) and a value scan counting visible elements whose own text contains each named fact
  value (formatted start/end dates, policy number, plate). Both recorded per capture.
- **Sub-44px tap targets:** brief-fixed selector `a, button, [role="button"], input, select,
  summary, [tabindex]:not([tabindex="-1"])`; rendered box <44px in either dimension; excludes
  running-text links (computed `display:inline` or the design system's `.pw-inline-action`),
  sr-only/skip links, and off-canvas chrome. NOTE: this is stricter than
  `mobile-viewport-matrix.spec.ts` (which checks a different selector set with the WCAG 2.5.8
  inline exception only) — the two suites are different guards and their counts are not
  comparable.
- **Contrast (WCAG 1.4.3):** the pixel-differencing method from
  `tests/theme-contrast-audit.spec.ts` (two full-page shots, text hidden in the second;
  background = modal pixel around the glyph run; text = extreme-luminance changed pixel).
  Scope: light theme at all 18 captures + dark theme at 390px per fixture (6 extra passes).
  Non-text boundary contrast (1.4.11) was NOT automated in this pass — recorded as a gap; the
  Goal 4 acceptance will need it.

## 0a. Baseline metric table — 18 captures, locale `el`, light theme

| fixture | width | scrollHeight (≈screens) | sections | containers | max depth | dup facts | sub-44 taps | contrast fails (light) |
|---|---|---|---|---|---|---|---|---|
| motor-active | 320 | 13428 (18.6) | 20 | 187 | 3 | 3 | 11 | 0 |
| motor-active | 390 | 11870 (14.1) | 20 | 188 | 3 | 3 | 12 | 0 |
| motor-active | 430 | 11199 (12.0) | 20 | 189 | 3 | 3 | 13 | 0 |
| motor-expiring | 320 | 13474 (18.7) | 20 | 188 | 3 | 3 | 11 | 0 |
| motor-expiring | 390 | 11885 (14.1) | 20 | 189 | 3 | 3 | 12 | 0 |
| motor-expiring | 430 | 11215 (12.0) | 20 | 190 | 3 | 3 | 13 | 0 |
| motor-expired | 320 | 13551 (18.8) | 20 | 189 | 3 | 3 | 11 | 0 |
| motor-expired | 390 | 11973 (14.2) | 20 | 190 | 3 | 3 | 12 | 0 |
| motor-expired | 430 | 11282 (12.1) | 20 | 191 | 3 | 3 | 13 | 0 |
| health-active | 320 | 13041 (18.1) | 20 | 184 | 3 | 3 | 12 | 0 |
| health-active | 390 | 11245 (13.3) | 20 | 185 | 3 | 3 | 13 | 0 |
| health-active | 430 | 10736 (11.5) | 20 | 186 | 3 | 3 | 14 | 0 |
| health-expiring | 320 | 13087 (18.2) | 20 | 185 | 3 | 3 | 12 | 0 |
| health-expiring | 390 | 11261 (13.3) | 20 | 186 | 3 | 3 | 13 | 0 |
| health-expiring | 430 | 10752 (11.5) | 20 | 187 | 3 | 3 | 14 | 0 |
| health-expired | 320 | 13164 (18.3) | 20 | 186 | 3 | 3 | 12 | 0 |
| health-expired | 390 | 11348 (13.4) | 20 | 187 | 3 | 3 | 13 | 0 |
| health-expired | 430 | 10819 (11.6) | 20 | 188 | 3 | 3 | 14 | 0 |

Reading the table:
- **Scroll height** is 11.5–18.8 viewport-heights of content in every state. The page is
  effectively identical in length whether the policy is alive or 110 days dead.
- **Sections = 20 in every capture** (goal 2 target: ≤ 8 + the four-question head). The count
  is state-invariant because almost nothing on the page is conditional on state.
- **Containers 184–191, max nesting depth 3** (goal 4 targets: ≤50% of this, depth ≤2).
- **Duplicate facts = 3 by value scan** in all 18: expiry date ×3 (hero tile, key-dates tile,
  renewal history row), start date ×2, policy number ×4 (breadcrumb, hero tile, claims chip, +1).
  `data-fact` scan = 0 everywhere (attribute not yet instrumented — that starts in Goal 1).
  Countdown («Ανανέωση σε N ημέρες») additionally renders 2–4× (brief row, key-dates tile,
  outlook headline, hero chip ≤30d) — outside the four instrumented fact values.
- **Sub-44px tap targets, union across captures** (counts are per-capture; offenders below
  appear in N of 18 captures):
  - 18/18 — section-nav pills at **34×44** («Σύνοψη», «Εν συντομία», «Ημερομηνίες»,
    «Ενέργειες», «Καλύψεις», «Εξαιρέσεις», «Παροχές», «Ανάλυση AI»; «Οδηγός κλάδου» 12/18,
    «Προτάσεις» 6/18) — the B3 defect measured
  - 18/18 — app-shell hamburger «Κύρια πλοήγηση» **40×44** and hero kebab
    «Περισσότερες ενέργειες» **40×44**
  - 18/18 — document «Προεπισκόπηση» button **26×44**
  - 3/18 (health only) — BranchActions link «Έλεγξε αν το ομαδικό σου αρκεί» **×38px tall**
- **Contrast (WCAG 1.4.3, pixel-measured): 0 failures** in light at all 18 captures AND in
  dark at 390 for all six fixtures. The 2026-08-21 theme work holds on this page.
  **1.4.11 (non-text boundaries) was not automated in this pass** — open item for Goal 4's
  acceptance; the harness needs an edge-sampling extension before that goal can claim it.

## 0b. Candidate defects — confirmed, refuted, or reproduced differently

The original observation was a single motor/active capture at ~390px. The account and policy
behind it are identifiable from the data: the E2E policyholder's real analysed policy
**Εθνική 64504715** (Mercedes-Benz A-Class, end date 2026-10-06, English stored summary,
latest analysis run `failed`/`TRANSIENT_FAILURE`). It is still present in the dev database and
is captured at all three widths as `real-64504715-{320,390,430}` alongside the fixture matrix.

### B1 — "Large black void in the hero" — CONFIRMED, identified
The "void" is the **annual-premium card**: `w-full max-w-xs rounded-3xl border-white/15
bg-[#111111]` (components/wallet/policy-detail/PolicyHero.tsx:180) — a near-black box on the
hero's own `#111111`, marked only by a 15%-alpha white border. On mobile it stacks exactly
between the metadata tiles (registration no. / dates) and the action row. Its content is one
small kicker + one number, so most of its ~140px is featureless black; in `real-64504715-390`
the app's fixed bottom tab bar additionally floats over it, which in a hand-taken screenshot
produces exactly "a large black void between the registration-number field and the action
buttons". Appears in **both** product types (any `premiumAmount > 0`) at **all three widths**.
Not a failed image; an intentional element whose surface is indistinguishable from its
background.

### B2 — English body under «Το ασφαλιστήριό σας σε απλά ελληνικά» — CONFIRMED (data + code)
- **Data:** policy 64504715's stored `coverageSummary` is English: "The policy concerns the
  insurance of the Mercedes-Benz Class A (W169) vehicle …" — rendered verbatim by SummaryCard
  under the Greek heading (el bundle `summaryTitle`, el.ts:508).
- **Root cause (code):** the extraction schema pins no language on the summary field —
  `coverageSummary: z.string().optional().describe('Brief summary of main coverages, max 200 chars')`
  (lib/services/ai/extraction-schema.ts:44). The shared prompt says "Plain string fields: keep
  the document's original language" (lib/services/ai/prompts.ts:128), but `coverageSummary` is a
  *composed* field, not document text — Gemini composes it in English for a Greek document.
- **No language tag:** the stored value carries no locale, so the renderer cannot detect the
  mismatch (SummaryCard renders `policy.coverageSummary` raw). The deep-analysis path (clarity
  pipeline) DOES pin Greek ("Respond in Greek (Ελληνικά) only", prompts.ts:163/218) — only the
  upload-time extraction path leaks English.
- Reproduces: any policy whose summary came from upload-time extraction in English; all widths,
  all states (data-dependent, not layout-dependent).

### B3 — Nav strip truncating mid-word; labels collapsing — CONFIRMED, WORSE THAN REPORTED
- Reproduces at **all three widths** (320/390/430), both product types, all states.
- At 320px each pill measures ~34×44 with `scrollWidth` 62–95px (probe `clippedLabels`):
  «Σύνοψη» → «Σύν», «Εν συντομία» → «Εν σ», «Ημερομηνίες» → «Ημε»…
- **Root cause:** `app/globals.css` ~366: `:where(.grid, .flex) > * { min-width: 0 }` under
  `@media (max-width: 430px)`. PolicySectionNav's pills are children of `.flex.overflow-x-auto`
  (components/wallet/policy-detail/PolicySectionNav.tsx:18-27) with default `flex-shrink: 1`
  and no `shrink-0`; the global rule removes their min-content floor, so instead of the strip
  scrolling, all pills compress equally into the viewport and clip their labels mid-word.
  The 430px boundary is why the strip looks fine in desktop review (431px+ unaffected).
- The labels have no short-form i18n variants (el.ts:494–511) — but the defect is CSS, not copy.
- Count: the strip has up to 14 items (9–12 typical, state-dependent — matches "nine" observed).

### B4 — «ΛΗΞΗ 6/10/2025» + ΕΝΕΡΓΟ + «Ανανέωση σε 44 ημέρες» — REPRODUCES DIFFERENTLY
- On the observed policy the true end date is **2026-10-06**; start date **2025-10-06**. On the
  observation date the page rendered: status «Ενεργό» (>30 days left), hero ΕΝΑΡΞΗ tile
  «6/10/2025», hero ΛΗΞΗ tile «6/10/2026», renewal outlook «Ανανέωση σε ~44 ημέρες» — all
  mutually CONSISTENT. The reported «ΛΗΞΗ 6/10/2025» matches the ΕΝΑΡΞΗ value: at mobile
  widths the tiles stack and the fixed bottom tab bar can overlay a tile's value, leaving the
  next value visually under the wrong label (visible in `motor-active-320` capture) — a reader
  pairing «ΛΗΞΗ» with the start-date value reads a contradiction that the DOM does not contain.
- **A real latent seam exists and stays open:** the status chip comes from the server's
  `resolvePolicyLifecycle` (Athens-calendar `calendarDaysUntil`, lib/policy-status.ts), while
  the rendered countdown is the client's `computedDaysLeft = Math.floor((end - Date.now())/86.4e6)`
  (components/wallet/PolicyDetailsClientView.tsx:~215) — raw UTC-millisecond arithmetic, the
  exact pattern lib/policy-status.ts's own comment documents as the recurring bug. Between
  Athens midnight and ~03:00 (plus any sub-day fraction) the two can disagree by one day:
  status says «Ληγμένο» while the hero/outlook still count days, or vice versa. Not observable
  at capture time (mid-day run); confirmed by reading, goes to Goal 1 as the B4 fix
  (single source for status + countdown).
- The fixture matrix shows status/dates/countdown consistent in all 18 captures (probe
  `dateFacts`). On `real-64504715` the rendered countdown «σε 44 ημέρες» is already one lower
  than the Athens-calendar count (45) — the seam is live, just not yet contradicting another
  on-page number.

### B5 — Failed analysis inside the gap card — CONFIRMED (structure)
- The real policy's latest run is `failed` (`TRANSIENT_FAILURE` — Gemini spend cap,
  2026-08-20), and `acordData.processingError` persists it, so AnalysisCard renders the amber
  «Απαιτείται ενέργεια» banner (t.analysis.status.attention, el.ts:1635) with «Επανάληψη»
  inside the SAME card as the findings area (AnalysisCard.tsx renders error banner, then
  `<div className="p-6">` with the gap report/empty state directly below).
- Content below the banner: for this policy, gaps = 0 → the "no findings" empty state renders
  under a failure banner. The empty state does NOT say the analysis failed —
  stale-looking reassurance under an error. The findings are not marked stale.
- Note: an earlier run COMPLETED (96%, 2026-08-14) and its extraction is what the whole page
  renders — so the page body is valid data from the last good run while the top-of-card banner
  describes the newest (failed) run. Nothing tells the reader which run produced what.

### B6 — Garbled gap-card heading; σου/σας register mixing — CONFIRMED (both halves)
- **Garbled heading root cause:** for a gap whose slug the authored content map does not know,
  the card TITLE becomes the first sentence of the AI's Greek explanation truncated to 80 chars
  with «…» (lib/wallet/gap-report.ts:744-782 `resolveGapContent` → `firstSentence(…, 80)`,
  :871-878 hard-slices mid-word). Production carries 41 AI-minted definitions (`ai_*` slugs,
  now deactivated but their instances survive), so prose-as-heading with a mid-word ellipsis is
  exactly what renders. Dev fixtures use authored slugs, so the matrix shows clean titles —
  data-dependent, confirmed by code.
- **Register:** systemic mixing on this surface. The page's own bundle keys are formal
  («Το ασφαλιστήριό σας…», ρωτήστε, ελέγξτε) BUT: `policyDetailsPage.askStarter` = «Κάνε μία
  αρχική ερώτηση στο AI» (informal, el.ts:452), `quoteRequestedAgent` = «…στον σύμβουλό σου»
  (el.ts:473), the sidebar export card literal «Κατέβασε μια καθαρή σύνοψη…» (PolicyDetailsClientView.tsx
  EXPORT_COPY), and — the big one — the entire per-branch editorial layer
  (lib/insurance/content/*.ts: 33 of 35 files use informal σου/Δες/Ρώτησε/Έλεγξε), which feeds
  BranchGuideCard, BranchActionsCard labels, claims steps and renewal notes on this page.
  Formal and informal register alternate section by section.

### B7 — Usage meter «0 / Απεριόριστες αναλύσεις» + upgrade CTA — CONFIRMED (root cause)
- Pricing v2 (2026-08-21) set `aiAnalysisPerMonth: null` on EVERY B2C tier
  (lib/pricing/plan-defaults.ts:95/112/130 — "analyses are unlimited" by design).
- `getAIUsageStats` therefore returns `limit: null` for everyone, and AIUsageWidget
  (app/(protected)/wallet/[id]/AIUsageWidget.tsx) renders `{count} / Απεριόριστες αναλύσεις`
  with the meter hidden but the count row intact, PLUS an unconditional upgrade CTA whose
  href is `/upgrade?reason=ai_analysis_limit` — an upsell reasoned by a limit that no longer
  exists, on every tier including free (where a separate upgrade banner already sits in the
  same sidebar). The widget predates pricing v2 and was never retired.
- Reproduces: all widths, all states, both types (see `sidebarText` probe in every capture).

### B8 — «Δεν έχει μοιραστεί ακόμα» twice — REPRODUCES DIFFERENTLY
- Not a duplicate mount: ONE component renders the same copy at two sites —
  CollaborationPanel header subtitle (components/wallet/CollaborationPanel.tsx:207) and the
  empty-state heading (:353), both gated on `shares.length === 0`, so whenever the panel is
  visible with zero shares the string appears twice ~150px apart.
- Visibility gate: the panel renders only when `tierLimits.agentCollaboration !== false` —
  i.e. Pro owners or non-owner viewers. The free-tier fixture account gets the upgrade card
  instead, so the matrix does not show it; the original observation implies the observed
  account resolved a tier with collaboration enabled. Confirmed by code, all widths.

### B9 — Phone numbers as text beside a separate «Κλήση» label — DOES NOT REPRODUCE
- Probe `nonTelPhones` returns empty in every capture (fixtures and real policy): every
  rendered phone number sits inside an `a[href^="tel:"]`. The three render sites
  (BranchActionsCard AnsweredChip:83-91 — one tel link containing «Κλήση» + number;
  PerksCard:105; ClaimsGuidanceCard call button) are real tel targets with min-h 44px.
- The observation predates the 2026-08-21c mobile pass (STATUS: "tel: links in six
  coverage/action cards" raised to ≥44px). Fixed before this series started.

### B10 — Masked values «(XXXX)» — REPRODUCES DIFFERENTLY (no redaction exists)
- No code path in the repo writes `XXXX`/masking into summaries or the plate/registration
  field (repo-wide grep; the only deliberate masker is `lib/identity/tax-id.ts` →
  `••••••XXX`, used in the agent-side customer-resolution service, not on this page).
- Therefore any «(XXXX)» on this page is verbatim STORED MODEL OUTPUT — the extractor's own
  placeholder for something it could not read — rendered with the same confidence as a real
  value. The candidate's requirement ("redaction and extraction failure must be
  distinguishable") is unmet BY CONSTRUCTION: there is no redaction feature, so everything
  that looks masked is an extraction artifact and nothing marks it as such.
- The dev copies of the observed account hold no XXXX values (all three analysed policies
  checked), so the specific observed string was production data; a prod read to confirm was
  blocked by the permission classifier (noted in DECISIONS), and production data is out of
  scope for this series anyway. Verdict: the *class* is confirmed by code; the *instance*
  is unverifiable from dev.

## Also verified (independent of the candidates)

### Empty / placeholder regions per combination (probe: fullText, 390px)
| combination | empty-state strings rendered |
|---|---|
| motor-active | no renewal history; upgrade CTA; «Απεριόριστες» usage row |
| motor-expiring | same as motor-active |
| motor-expired | + expired hero banner, + expired outlook headline |
| health-active | + «Δεν ελέγχεται για αυτόν τον κλάδο» (overlap — health has no checkable subject) |
| health-expiring | same as health-active |
| health-expired | + expired hero banner, + expired outlook headline |
| real-64504715 | no exclusions detected; overlap none; gaps none recorded; failed-analysis banner; «Δεν εντοπίστηκαν ασφαλιστικά κενά…» |

No field on the fixture matrix fell back to an identity placeholder (fixtures carry full
envelopes by construction); the placeholder path is exercised by the real policy only.
Health-specific: the hero has no plate tile (motor-only), the coverage panel switches to the
health section, and the overlap row states its scope limit — otherwise the health page is
structurally identical to motor, including every monetization slot.

### What the expired state actually renders
The expired page is **the active page plus a banner**: «Ληγμένο» chips (hero + key-dates),
the amber «Το ασφαλιστήριο φαίνεται να έχει λήξει…» hero notice, «Αυτό το ασφαλιστήριο έχει
λήξει» twice (brief + outlook), two «Ζήτησε προσφορά ανανέωσης» buttons — and then ~13,500px
of unchanged content: the health score still reads **«71 · Σε καλή κατάσταση»** on a policy
110 days dead, coverage tables still assert cover in the present tense, perks still offer
call CTAs, and the AI question pills still invite questions about "your coverage". The
brief's "expired path is under-designed" hypothesis is confirmed: expiry changes ~5 strings
out of a 20-section page.

### Untranslated strings in the `el` locale
- Fixture matrix: **0** Latin-script sentences (probe threshold ≥3 consecutive Latin words).
- Real policy: **1** — the stored English coverage summary (B2).
- Below the sentence threshold but visible English in `el`: the app shell's bottom-tab label
  **«AI Insights»** (every capture), and «Insights» appears in tab labels. Site chrome, not
  this page's components — logged for the shell workstream.

## Additional findings (not among the ten candidates)

**Broken / gates launch:**
- **A1 — Score renders a verdict on a failed/incomplete analysis.** The real policy renders
  «100 · Έλεγχος ασφαλιστηρίου · Σε καλή κατάσταση» — a perfect score with a verdict label —
  on a third-party-only policy whose latest analysis run FAILED (capture `real-64504715-390`).
  This is the brief's invariant-2 scenario observed live. `calculatePolicyHealthScore` starts
  at 100 and only subtracts for findings, so zero findings (because analysis failed or never
  ran deep) reads as a perfect policy. Goal 3 material, recorded here as baseline fact.
- **A2 — The three-navigation problem is real at baseline:** fixed bottom tab bar (app shell)
  + 14-pill section nav + two in-card tab systems (analysis tabs, coverage tabs) render
  simultaneously on one page (all captures).

**UI/UX (does not gate):**
- **A3 —** `basisLabel` in StructuredCoverageTable falls back to the RAW enum token for any
  limit basis outside its 9-entry map (components/wallet/coverage-details/StructuredCoverageTable.tsx:53
  `return map[basis] ?? basis`) — an unmapped basis renders `per_period_aggregate`-style
  tokens to the customer. (Surfaced by an early fixture that used an off-schema basis; real
  stored data in dev uses mapped values, so this is a fallback-hardening note, not an
  observed defect.)
- **A4 — «AI Insights» (English) is a bottom-tab-bar label in the el locale** (app shell,
  all captures). Site chrome rather than this page's components, but it is untranslated text
  a Greek customer sees on every wallet screen.
- **A5 — Hero brand name breaks mid-word at 320px** («Interameri/can») via the global
  `overflow-wrap:anywhere` on headings ≤430px. A wrap, not a clip — invariant 4 tolerates it —
  but a brand name split without a hyphen reads broken.
- **A6 — The quote CTA renders up to three times** («Ζήτησε προσφορά ανανέωσης» in KeyDates +
  RenewalOutlook, plus the quote action in BranchActions) — same action, three buttons
  (probe `repeatedStrings`, motor-expired captures).
- **A7 — The countdown sentence renders twice** («Ανανέωση σε N ημέρες» in #brief and
  #key-dates outlook) — duplicate-fact class beyond the instrumented facts.
- **A8 — App-shell hamburger is 40×44** («Κύρια πλοήγηση», every capture) — sub-44 width on
  site chrome; counted in the tap-target totals but owned by the shell, not this page.
- **A9 — The Next.js dev overlay reported "7 issues" on this page in dev** — not a product
  defect (dev-only chrome, hidden by the harness for measurement), but the underlying console
  errors are unaudited for the policyholder route (the console-clean spec covers the agent
  console only). Worth a follow-up.

## 0c. Relocation Ledger — every user-facing capability on the page

Complete enumeration from the component tree (PolicyDetailsClientView + children), 2026-08-22.
"Post-change location" is filled in by Goals 2–4; at Goal 0 every row is `TBD (Goal 2)` unless
the capability is already slated by the brief (dates → stated once, claims phones → claims section).

| # | Capability | Current location | Post-change location | Rationale |
|---|---|---|---|---|
| 1 | Breadcrumb back to wallet («Πορτοφόλι /») | top breadcrumb nav | TBD (Goal 2) | |
| 2 | Owner unverified-extraction note | banner above hero | TBD (Goal 3 — extraction confidence) | |
| 3 | Agent extraction-review banner + «Έλεγχος τώρα» link | banner above hero (agent viewers only) | TBD (Goal 2) | |
| 4 | Merge-request banner (approve / reject buttons) | banner above hero (when pending) | TBD (Goal 2) | |
| 5 | Status chip (Ενεργό/Λήγει σύντομα/Ληγμένο) | hero | TBD (Goal 2 — "one status, stated once") | |
| 6 | ≤30-day countdown chip | hero | TBD (Goal 2 — merges into single dates block) | |
| 7 | Expired notice banner | hero (expired only) | TBD (Goal 2 — attention slot) | |
| 8 | Kebab menu → Delete policy (dialog) | hero top-right (owner) | TBD (Goal 2) | |
| 9 | Policy identity: insurer, type, policy number, plate | hero tiles | TBD (Goal 2 — ten-second Q1) | |
| 10 | Start / end date tiles | hero tiles | TBD (Goal 2 — dates stated once) | |
| 11 | Premium card (amount + frequency) | hero right card | TBD (Goal 2) | |
| 12 | «Ρωτήστε το AI» primary CTA (#policy-qa anchor) | hero action row | TBD (Goal 2 — AI entry consolidation) | |
| 13 | Share policy (navigator.share / clipboard) | hero action row | TBD (Goal 2) | |
| 14 | Download contract (first document via authorized endpoint) | hero action row | TBD (Goal 2) | |
| 15 | Call insurer (tel: via claims contact) | hero action row | TBD (Goal 2 — claims section per brief) | |
| 16 | Section anchor nav (up to 14 pills) | below hero | TBD (Goal 2 — the one navigation system) | |
| 17 | AI plain-language summary + AI chip | #summary | TBD (Goal 3 — point-of-use AI label) | |
| 18 | Policy health donut + verdict + methodology disclosure | #summary | TBD (Goal 3 — score prominence rules) | |
| 19 | Policy brief: 7 one-liner rows with anchors + tone dots | #brief | TBD (Goal 2/3) | |
| 20 | Key dates card (start/end/renewal, progress, history, sources) | #key-dates | TBD (Goal 2 — dates stated once) | |
| 21 | «Ζήτησε προσφορά» (request renewal quote) — KeyDates copy | #key-dates | TBD (Goal 2 — ONE quote CTA) | rendered 3× today (#20, #23, #24) |
| 22 | Renewal reminders list (milestones sent) | #key-dates | TBD (Goal 2) | |
| 23 | Renewal outlook (headline, checklist, reminder line) + quote CTA | #renewal (inside #key-dates) | TBD (Goal 2) | |
| 24 | Branch actions (answered chips + ask-AI / ask-agent / self-task CTAs + tel links) + quote CTA | #branch-actions | TBD (Goal 2) | |
| 25 | Upgrade trigger: advanced renewal reminders (free) | after #key-dates | TBD (Goal 2 — monetization slots) | |
| 26 | Coverage tab view (Καλύπτεται / Δεν καλύπτεται tabs + per-branch panel) | #coverage | TBD (Goal 2 — Coverage section) | |
| 27 | Coverage absence copy (never-analysed / failed / blocked / empty states) | #coverage fallback | TBD (Goal 1 B5 + Goal 2) | |
| 28 | Exclusions list + show more/fewer | #exclusions | TBD (Goal 2 — "Terms that can affect a claim") | |
| 29 | Notable conditions + glossary hints (sub-limit, co-payment) | #exclusions | TBD (Goal 2) | |
| 30 | Fine print clauses + risk chips + show more/less | #exclusions | TBD (Goal 2 — ψιλά γράμματα promoted) | |
| 31 | Perks list + tel/site CTAs + «Μην το ξεχάσεις» chip | #perks | TBD (Goal 2) | |
| 32 | Analysis tabs (Ανάλυση AI / Insights) + red count badge | #analysis | TBD (Goal 2/3) | |
| 33 | Run analysis / retry / retry-missing controls + progress | #analysis (AnalysisCard) | TBD (Goal 1 B5) | |
| 34 | Free-trial-analysis advertisement / post-trial upgrade card | #analysis | TBD (Goal 2) | |
| 35 | Gap report list (cards, expand, mechanic chips, evidence chip, ignore/notify) | #analysis | TBD (Goal 2/3 — "items for review") | |
| 36 | Gap report unlock CTA (€3) + locked cards | #analysis (free tier) | TBD (Goal 2) | |
| 37 | AI insights tab (verification overview, structured coverages) | #analysis | TBD (Goal 2) | |
| 38 | Branch guide (editorial: why/what/how + common gaps + expand) | #branch-guide | TBD (Goal 2) | |
| 39 | Premium insight locked cards (non-pro) | #premium-insights | TBD (Goal 2) | |
| 40 | Related recommendations cards (expand, dismiss, review links) | #recommendations | TBD (Goal 2) | |
| 41 | Policy Q&A chat (collapse toggle, history, input, send) | #policy-qa | TBD (Goal 2 — AI consolidation) | |
| 42 | Suggested-question pills (branch-specific) | #policy-qa | TBD (Goal 2 — AI consolidation) | |
| 43 | Free-questions upgrade trigger (exhausted state) | #policy-qa | TBD (Goal 2) | |
| 44 | Claims guidance steps (branch editorial) | #claims | TBD (Goal 2 — Making a claim) | |
| 45 | Claims: call insurer button + policy-number chip | #claims | TBD (Goal 2) | |
| 46 | Claims deadlines (extracted, amber) | #claims | TBD (Goal 2) | |
| 47 | Claims: ask AI / ask-my-agent / find-agent CTAs | #claims | TBD (Goal 2) | |
| 48 | Agent collaboration timeline (threads, notes, tasks, inputs) | #agent (paid + relationship) | TBD (Goal 2 — Documents/notes/sharing) | |
| 49 | Agent section locked state + upgrade CTA | #agent (free + relationship) | TBD (Goal 2) | |
| 50 | Free-tier upgrade banner | sidebar | TBD (Goal 2) | |
| 51 | Savings-report export (pro: download; else unlock modal) | sidebar | TBD (Goal 2) | |
| 52 | Documents list (download links, kind + date, preview button, free-tier preview lock) | sidebar #documents | TBD (Goal 2 — Documents section) | |
| 53 | Insured people card | sidebar | TBD (Goal 3 — PII heading requirement) | |
| 54 | AI usage widget («N / Απεριόριστες» + upgrade CTA) | sidebar | TBD (Goal 1 B7 — likely retire meter, ledger will record) | |
| 55 | Report-unlock variant of usage widget (#gap-unlock deep link) | sidebar (locked report) | TBD (Goal 2) | |
| 56 | Collaboration panel (invite form, share list, revoke, «Δεν έχει μοιραστεί ακόμα») | sidebar (paid/owner) | TBD (Goal 2) | |
| 57 | Agent-collaboration upgrade trigger (free) | sidebar | TBD (Goal 2) | |
| 58 | Upgrade modals (export, branch-agent, preview, QA) | overlay | TBD (Goal 2) | |
| 59 | Delete-policy confirm dialog | overlay | TBD (Goal 2) | |
| 60 | Cookie-consent banner (site-wide, overlays this page) | overlay | unchanged (out of scope) | |

AI entry points counted (for Goal 2's ≤2 rule): hero CTA (#12), summary card (#17),
analysis card (#32–35), Q&A chat + pills (#41–42), claims ask-AI (#47), branch-action
ask-AI CTAs (#24) — six today, four of them observed in the original capture.

## 0d. Decisions, caveats, blockers

- **Harness caveats, stated for the record:** `networkidle` never fires on the dev server
  (dummy Upstash DNS retries), so settle = capped 8s wait + fixed 1s — identical both passes.
  The Next dev-tools overlay is hidden by the harness (dev-only chrome). Off-canvas app-shell
  chrome (closed drawer) is excluded from all counts. Fixed-position elements (bottom tab
  bar) paint at their viewport position in full-page screenshots — mid-page overlays in the
  PNGs are a capture artifact, not a layout fact (but the SAME artifact plagued the original
  observation, see B4).
- **`data-fact` duplicates = 0 at baseline is vacuous** (no attributes exist yet); the
  value-scan column is the honest baseline number. Both are recorded per capture so Goal 5
  compares like with like.
- **Non-text contrast (WCAG 1.4.11) is not yet automated** — must be added before Goal 4
  claims its contrast acceptance.
- **B10's specific observed instance could not be verified**: no dev data carries masked
  values, a prod read-only check was blocked by the permission classifier, and prod data is
  out of scope for this series regardless. The class verdict (no redaction feature exists;
  masks are extractor output rendered as fact) stands on code.
- **The dev Supabase pooler** needed a connection-limit/timeout override and one retry for
  fixture provisioning (documented in the spec); expect the same when re-running.
- **No app code was changed.** Changes: `tests/measure/*` (new), `playwright.config.ts`
  (new `measure` project + ignore rule), `docs/evidence/policy-detail-mobile/*` (new).
  `lib/gap-detection.ts` untouched; no AI provider schema touched (verified by `git status`).

**STOP per the brief: Goal 1 does not start in this run. Awaiting review of this baseline.**
