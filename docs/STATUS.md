# STATUS

**Production: `45013e3f`** — the Document Validation Gate (PR #298), merged and deployed
2026-09-05 00:00Z (deploy run 33930719296) after CI green (one flaky, unrelated
`area-detail-questions` case re-run); prod migration `20260905120000_document_validation_stamp`
and the `policies` bucket INSERT-policy drop verified by query BEFORE the merge; production
smoke: one junk PDF refused with no rows and no tokens, one real schedule validated and analysed
(evidence in Done below and in `docs/audits/document-validation-gate-2026-09.md` §7). Previous:
**`b395a106`** — merged 2026-09-04 (PR #290 carrying the whole stack #291 → #294 →
#296: the Steady phone layer, B2B batches B and C, the audited customer intake); CI green,
deployed 2026-09-04 11:48Z (deploy run 33868900303) and verified: 200, the phone-layer
stylesheet served by production, no new Sentry group in the window after. Previous:
`a910cbe7` (hotfix #292, every upload committed a policy with zero documents) on `6cb43303`
(Direction A, PR #288) + `addfb7e6` (PR #289, dashboard link-card borders and coverage-map tiles).
The Grafí homepage (`76f62a43`, 2026-08-30) is LIVE and smoked: fixed-promise H1, 16-line ticker, sourced numbers with
their links, retired sentence absent, 4 steps + ReadingDemo, broker band, comparison, three
pricing cards (€0/€4.99/€8.99) + recommender, CTA white-on-green, no h-scroll at 390; /en
mirror, partners pair noindex, /_vercel scripts 200 (were 307). Zero new Sentry groups in the
2h window after deploy.

## Current phase

**PW-TRANSPARENCY-02 — Track A, B0, B1.5, B1.7, B2 (PR #299 → `85088850`, deployed 2026-09-05, deploy run 33962418257, prod smoke: the dated findings-provenance line renders on the smoke policy) and B1 core + B3 skeleton (PR #300 → `b0044eaa`, deployed 2026-09-05 and smoked on production: the policy head shows «Προς επιβεβαίωση», the findings list is sectioned «Ευρήματα υπό αξιολόγηση», no severity colour) MERGED to NEW-UI; B4 «dashboards become routers» + Goal G on PR #301 (`feat/transparency-02-b4`, **NOT MERGED — verification halt**); B1.6 halted.** Verification block V1–V4 (2026-09-05): V1 `lib/gap-detection.ts` decision path byte-identical but the file WAS edited (legacy writer removed) — reported for the owner's revert decision; V2 the B3 under-review rule leaks through the recommendation path (hero count, attention list, /protection), `ProtectionScore.gapCount` on the agent client chip, the coverage-insights headline and the findings-page summary band — reported, not changed; V3 the pre-plan state is built and guarded (red → green); V4a section count reported honestly as 7 (fold reverted); V4b overlapping hit areas 2–9 per capture → **B4 not done**. Human-track handoff: `docs/transparency/HANDOFF.md`. Halted: no C1/C2, no B1.6. B1: the five-state record status (`lib/wallet/record-status.ts`, text-only label on the policy head and the agent findings card; `confirmed` unreachable until C1) and severity removed as an ordering / colour / chip / emphasis axis everywhere outside six reasoned exemptions (guard `severity-never-orders.test.ts`, 4 probes). B3: `lib/gaps/provenance.ts` ships all 29 checks `under_review` with `citation: null`; provenance is the ordering axis; under-review findings render only disclosed, count in no summary, reach no email / notification / report (guard `provenance-skeleton.test.ts`); candidates for the human track in `docs/transparency/PROVENANCE-CANDIDATES.md`. Suite 594 / 6909 green.

Previous phase note (kept for the record): branch `feat/transparency-02`. **Prod migration `20260905150000_gap_instance_run_provenance` is APPLIED and
verified on production** (2026-09-05 ~10:30Z, via Supabase MCP: six new `gap_instances` columns, `analysis_run_id`
NOT NULL, FK to runs, two new indexes, the old unique index replaced by the partial «current row» one, the single prod
row backfilled to its motor run, `_prisma_migrations` stamped with the file's sha256; rollback export
`docs/archive/2026-09-05T1025Z_prod_gap_instances_before_…sql`). Applied BEFORE the merge on purpose: the old
code reads gap rows without the new columns and keeps working, the new code cannot run without them; only analysis
persistence fails in the window between apply and deploy (zero real users). B0: one writer of `gap_instances` with run
provenance and supersede semantics; every findings list names its run and dates it. B1.5: the unauthored-branch state on
the policy page, the findings card, the dashboard tally (with denominator) and the agent client card. B1.7: score
renders removed agent-side and the per-policy health number removed; the two score APIs wait on BL-02. **B2: two lines,
two denominators** — `lib/gaps/composition.ts` classifies the run's attempted rules by question (20 coverage / 9
recording), reads declared inputs presentation-side, counts the unsubstantiated as indeterminate; rendered only on
the B2C findings card and the B2B customer-policy view, never email/push/report; no undeclared-input rule exists.
B1.6 (Risk DNA numbers) is a halt (`docs/transparency/HALTS.md` H-T01). Blocked: BL-01 (Terms §5), BL-02 (score APIs).
Still to do in this series: B1 taxonomy + severity de-emphasis, B3 provenance skeleton, B4 dashboards, Goal G guards.
Next 3: (1) merge #299 on CI green and smoke the prod policy page for the provenance line and the composition;
(2) B1 status taxonomy; (3) B3. Ledger: `docs/transparency/PROGRESS.md`.

**Grafí design-system build + marketing rebuild — ladder G0–G12 walked** (2026-08-30, 18 commits
`a4aae9f2..`). Ledger: `docs/DS_PROGRESS.md`. G0–G3, G7, G11, G12 done; G4/G5/G6/G8/G9/G10
partial with the remainder named per-goal in the ledger. Written system: `docs/design-system.md`;
seams and hostile review: `docs/handover.md`.

## In progress (2026-09-03)

- **2026-09-04 — The Personal Risk Profile: onboarding as breadth, assessment as depth, evidence
  as coverage — built on `feat/onboarding-protection-profile` (PR #293, base NEW-UI, awaiting the
  owner).** Contract and diagnosis in `docs/planning/PERSONAL_RISK_PROFILE.md` (four code audits:
  five vocabularies described one person, the assessment re-asked every onboarding fact and its
  wizard erased Art. 9 data on every save, the engine's own «what we still need» list was never
  shown, no rule ever met a need, most users never got a gap row). Built: `lib/protection/domains.ts`
  (the one risk↔domain↔LOB table, guarded), `PolicyholderProfile.fact_provenance` +
  `incomeDependency` (migration `20260904150000`, dev AND prod), `applyFactWrites` as the one
  write path, the six-level evidence scale, `attention-areas.ts` (importance + exposure + coverage
  → a conservative alignment: `gap` only on a rule finding, `appears_covered` only on a held line
  the catalogue accepts by exact id or declared substitute, an engine finding with nothing held is
  «δεν έχουμε δει», never "uncovered"; limits / expiring / lapsed caveats inline everywhere), one
  server loader, the onboarding map on the composed areas with «Τι άλλαξε στην εικόνα σου» after
  the upload, `/protection?lens=risk` as areas of attention + «Τι χρειάζεται ακόμη να
  καταλάβουμε», `/protection/areas/[area]` asking one unknown-or-coarse factor at a time (health
  behind a two-sided gate; prevention first; transfer «για συζήτηση», price arguments removed),
  the dashboard card on the same areas, reviews closed by evidence at area level from analysed
  policies only, eight new journey events + a server mirror. Three red teams (behavioural,
  insurance/risk, product) → one fix wave; a browser walk found that a document with no policy
  details became an active «covered» policy → `EXTRACTION_EMPTY`, `action_needed`, kept document.
  **Open for the owner:** which plan clears deep analysis (H-009 says both paid tiers; the
  pricing-v2 pins say top tier only; `plan-defaults.ts` says every tier) — production keeps the top
  tier through the one predicate `canRunDeepAnalysis`, the locked CTA names the feature, not a plan.
  Gates: full suite 572 files / 6644 tests, build green; harness `scratchpad/prp/prp-walk.mjs`
  (five personas at 390 through onboarding → map → upload → dashboard → lens → detail, DB
  inspection, cleanup). Not built (next): the needs-vs-limits adequacy rule (needs a benefit
  vocabulary on `coverages[].name` and a basis on `limit`), a month-2 cadence keyed on
  `factorsToResolve`, prevention by region/building age, a per-area change ledger.
- **2026-09-04 — The B2B customer-intake and policy-upload audit is merged (PR #296 → the
  stack → NEW-UI `b395a106`).** Ten launch-gating defects fixed, each with an enumerating guard
  and a probe: `/customers/[id]` read Next 16's Promise `params` synchronously and showed an
  arbitrary customer; a document reached the model provider with no consent on any party (now
  the agent's own AI consent, collected in-flow, plus a mandatory pre-scan attestation in the
  audit row — owner decision D1); the add-customer «smart PDF» door parsed and dropped the file
  (it opens the upload modal now); bulk import created relationships in the ENDED `inactive`
  status and choked on Greek `;` CSVs (per-row outcomes, chunked, ΑΦΜ accepted); invites
  resurrected terminated relationships; policy + grant + notification committed before the
  storage upload; server actions took unvalidated input (Zod, codes not prose, every error
  localised on the step that owns the field); the free tier was told «η ανάλυση εκτελείται»
  while the token gate could never pass (now `queued | blocked_quota | blocked_consent`, a
  blocked policy kept as `action_needed`). Owner decisions: D2 Article 14 inside the invite
  email only; D3 customers without an email (ΑΦΜ + Greek mobile as identity, synthetic
  `noemail+<afm>@customers.policywallet.invalid`, `users.contact_email_missing` — migration
  `20260904120000` applied and verified on dev AND prod, the one email transport refuses the
  domain, «Χωρίς email» pill + add-email path); D4/D6 a terminated relationship frees the seat
  and only the customer reconnects — a customer may have several agents, never assume one.
  Harness (session scratchpad, worth committing under `tests/journeys/`): `intake-walk.mjs`
  walks manual / pdf-door / upload / bulk at 390 as the E2E agent and `intake-db.mjs
  inspect|cleanup` checks the rows; three clean rounds on the final code (a fourth was lost to a
  dev-Supabase connectivity blip, not the product). Both databases had zero mixed-case emails,
  collisions or `inactive/not_invited` rows, so no data repair ran. Full suite 536 files / 6153
  tests; local production build green. Deferred: PRs #293 (onboarding) and #295 (perf) await the
  owner; the marketing dictionaries cut; the classifier blocked `gh pr merge` and `gh run`
  polling loops (merges went through the GitHub connector).
- **2026-09-04 — B2B batch C on `feat/b2b-batch-c` (stacked on #291 → #290): insights,
  benefits, commissions, questionnaires, team and the three customer modals are on the
  Direction A anatomy.** Three parallel subagents re-cut the nine files against the batch B
  exemplars; the lead swept the shared pieces the DOM audit still flagged (UploadDropzone,
  EmptyState rows, ConsentStatusBadge, the FAB tooltip, AiDisclaimer, AdvisorBookView) and moved
  the agent copy off «συμβόλαιο» (role-copy is now in the policy-term guard's file list). Fixed
  along the way: the questionnaires' hover-only edit/delete became always-visible pills, the
  team pipeline's raw `won`/`motor_liability` slugs became dictionary and taxonomy labels, the
  insights coverage empty state no longer reassures («Η κάλυψη είναι πλήρης» → what was checked),
  a rejected PDF scan in the add-customer modal now shows its reason. Verified in a browser as the
  E2E agent at 1440 and 390: no horizontal scroll, one primary per page, no console errors except
  one non-reproducing hydration warning on /customers. Trap: after a branch switch Turbopack
  served a stylesheet without `.pw-segmented` — the questionnaires toggle rendered bare until the
  cache was cleared. Gates green locally (CI does not run for a feature-branch base).
- **Late 2026-09-03 — Direction A is LIVE; the phone layer is up for the owner's decision.**
  PR #288 merged (`6cb43303`) after the owner's "error seen on production" turned out to be an
  OLD PREVIEW deployment whose Preview-scope `DATABASE_URL`/`DIRECT_URL` still carry 55-day-old dev
  credentials (Supabase `query_logs` showed the failed auths on the DEV project; production had
  none) — the raw Prisma message that page leaked is now a localised generic (`7f6a2f5d`), but
  the Preview env vars themselves are an OWNER action (`vercel env add` is classifier-blocked
  for the agent): set Preview `DATABASE_URL` to the dev 6543 pooler URL (without the local
  `connection_limit=5&pool_timeout=20`) and `DIRECT_URL` to the dev 5432 URL, then redeploy the
  previews. The dashboard defects the owner then flagged on the preview shipped as PR #289
  (`addfb7e6`): the element-scoped control-border rule painted every `a.pw-card` 45 % black
  (retired; `.pw-control-boundary` stays as the explicit opt-in), and unassessed coverage-map
  tiles were dashed and faded (plain sunken tiles now). **PR #290 (`feat/steady-mobile`) is the
  Steady phone layer** the owner pinned ("for the mobile UIs only"): ≤1023px only — near-white
  canvas, borderless 20px cards, one `.pw-segmented`/`.pw-segment` recipe (state from
  aria-current/pressed/selected; ink pill active on phones, the sunken track + white pill on
  desktop as before), avatar-left/bell-right header on the canvas, a floating ink icon-only tab
  bar (still `fixed bottom-0` + safe-area, so the shell guards hold), and the ink stat pill /
  panel under the headline number on the dashboard hero and the wallet overview (wrapper is
  `lg:contents`; every count renders once, h2 text unchanged). NOT merged on purpose — it is a
  design direction for the owner to look at on the preview at phone width. Guard moved in the
  register direction: `risk-assessment-panel-mobile` accepts `.pw-scroll-strip` and checks
  no-wrap on the `.pw-segment` rule itself. Deliberately not done: list rows as separate white
  cards on the canvas, dark detail headers with bottom sheets. Still legacy: **B2B batches B**
  (customers list/detail, renewals, opportunities, tasks, activity) **and C** (insights,
  questionnaires, team, commissions, benefits). Owner question answered in the session report:
  the Google consent screen's «to continue to cquudefwfwrmvpftuhyl.supabase.co» is the
  Supabase-hosted OAuth redirect — brand verification and/or a Supabase custom auth domain fix
  it, no code needed.
  **B2B batch B is on PR #291 (`feat/b2b-batch-b`, stacked on #290 because it uses the segmented
  recipe):** B-1 = tasks, activity, renewals, opportunities; B-2 = customers list, customer detail
  (the four tabs, the collaboration cards, the danger zone) and invite — all on the card anatomy
  (page names itself on the canvas, CardHead on every card, sub-card rows, fact cells / StatTiles,
  status pills on tokens, segmented view switches with aria-pressed, one primary per screen).
  `components/ui/PageHeader.tsx` deleted; SortableColumn headers in caption sentence case; the
  FAB clears the phone bar (fix on #290). Registers moved in the register direction:
  task-priority-colors-urgency (status-warning accepted), customer-list-responsive (toggle by
  recipe class), design-token-debt (invite hex gone), gap-severity-display-single-source and
  solid-panel-contrast (entries whose debt is paid), Greek inventory (+1 pair). 518 files / 5900
  tests, tsc, eslint, i18n, utf8 clean after each batch; captured at 1440/390 with 0 console
  errors. NOTE: CI does not run for a PR whose base is a feature branch — gates were run locally.
  **Still legacy (batch C):** insights, questionnaires, team, commissions, benefits, and the
  three customer modals (AddCustomerModal, UploadPolicyModal, BulkImportModal).
- **B2C app redesign — Direction A BUILT on `feat/b2c-direction-a` (`b73421e6`), draft PR #288
  against NEW-UI, awaiting the owner's look on the preview** (superseded by the entry above —
  merged the same day). Owner set aside `feat/grafi-b2c`
  (PR #287) for the policyholder app and picked, from the proposals artifact
  (https://claude.ai/code/artifact/ea4a5213-6b3b-4612-8769-d2e2a8d7161b), **Direction A · Inter ·
  cool slate**. Shipped in this pass: the shell (three-group sidebar, desktop top bar with
  accent-insensitive policy search ⌘K + bell + account, phone tab bar, flat slate canvas,
  light-first default) and `/dashboard` re-cut on the reference grid (facts row inside the
  same guarded h2, count bar instead of a score, renewal term bars, dedupe of duplicate
  uploads by policy number, map tiles, advisor rail card, one upload offer). Every honesty
  guard kept green; registers updated deliberately (clamp, token-debt, always-dark, Greek
  inventory). 518 files / 5900 unit tests, tsc, eslint, i18n, utf8, api-auth all clean.
  **Finish review (independent reviewer, degraded in-thread role via subagent):** first pass
  `fix` → batch applied (`0c64c2cd`: three visible planes via `--surface-canvas`/`--surface-sunken`,
  36px/10px slate-200 chips, 12px floor on every functional string, neutral term bars outside 30
  days, soft-pill secondary actions, drawer sign-out dedupe) → verdict pass scored 6/8 resolved or
  accepted-as-cited; regressions it found (pill arrow wrap, drawer label wrap) fixed in the
  follow-up commit. **Open by decision, for the owner:** (a) the severity tone module uses blue
  (`sky-500`) for the *medium* tier while the design rule says blue = info only — a product-wide
  single source (`components/gaps/severity-tone.ts`), not repainted here; (b) DESIGN.md still
  describes the pre-build canvas and lacks the sub-card/chip/count-bar devices — to be documented
  from the built world after the remaining surfaces are re-cut. Preview: Vercel git integration
  builds every push on `moniaros-projects/policy-wallet` (the second "AgentRise" team status fails
  on author access and is pre-existing); the CSP blocks Vercel's live-feedback script on previews.
  **Pass 2 (later 2026-09-03, same branch/PR): wallet, policy detail, protection and settings
  bodies re-cut onto the same card anatomy.** `/wallet`: KPI tiles + completion ring → ONE overview
  card of fact cells (every `data-count`/`data-fact` key kept, each rendered once), red notices box →
  white card with sub-card rows and a «+N ακόμη» soft pill, segmented filter/view controls on the
  sunken surface, sentence-case table headers, neutral chips, soft-pill row actions, the sticky
  `PageHeader` replaced by the page's own header, FAB as a round brand button with a card menu.
  `/wallet/[id]`: head without uppercase/mono (captions for labels, attention as a sub-card,
  primary DO + soft-pill ASK in one row — still exactly two buttons, DO first), summary on
  `CardHead` with the health donut turned into a fact cell, the six disclosure sections as cards
  with chips, 60+ uppercase labels across the sub-cards → sentence case, inner cards flattened into
  groups with sub-card tiles. `/protection`: header, segmented lens tabs (no green pill),
  `RecommendationCards` → `CardHead` + sub-cards with white pill actions, `InsightCard` without the
  coloured side bar and the six green blocks, raw branch id → localised branch name, expired notice
  on the warning tint. `/account`: rail active = bar + tint, chips, tokens. Also fixed a REAL
  hydration error on every expired policy (GlossaryHint's `<details>` inside a `<p>` in
  KeyDatesCard). Register/guard moves: token-debt −4 (ImportantNotices hex), Greek inventory
  (+«Επισκόπηση», +«Λήγουν σύντομα», «Αριθμός ασφαλιστηρίου» — the old ALL-CAPS label had evaded
  the «συμβόλαιο» ban because capitals drop the tonos), ledger A-10 now asserts the localised branch
  name rather than the raw id in capitals. Left as-is by decision: `policyStatus` labels stay
  ALL-CAPS in the source (pinned by policy-status-wording + e2e), `.pw-card:hover` mint lift is
  global, CoverageInsightsClient's verdict/stat tiles and the rest of its body, RecommendationCards'
  urgency colour map (bypass-listed). 518 files / 5900 unit tests, tsc, eslint, i18n, utf8,
  api-auth clean; browser console clean on all four surfaces at 1440 and 390.
  DESIGN.md and `.impeccable/design.json` re-documented from the BUILT world (three planes, card head,
  fact cells, soft pills, segmented control, count bar; MASTER.md gained the two app surface rows).
  **Pass 3 (later 2026-09-03, same branch/PR): /agent, /notifications, /account, /help re-cut and
  run through the finish reviewer until `disposition: ship` (three verdict passes; every material fix
  and regression resolved on recaptures).** Notable: notifications as ONE card of day-grouped rows with
  a fixed unread gutter; the advisor page as header + segmented tabs + white cards (connected state
  seeded on dev via `scripts/seed-agent-demo.mjs e2e-agent@… e2e-ph@…`); help page on the card
  anatomy with formal-plural copy and sentence-case article titles; every settings card opens with
  `CardHead` and its OWN glyph, row actions are soft pills (`.pw-soft-button` is now `:where()`-scoped
  so `text-status-danger` wins on destructive ones), quiet hours on the shared Switch, the ended plan
  reads as ended (badge, no price, past-tense entitlements, over-limit meter copy), UsageMeter's label
  is a caption (typography pin updated), TokenUsageCard on the ladder with a card head. Two shell
  traps fixed: a second `min-h-screen` INSIDE `<main>` under the 64px bar (64px/144px of empty canvas
  on every short page) and legacy `pb-28` tab-bar allowances stacked on the shell's own reserve.
  **Marketing (same day): the dummy phone UIs are gone.** `components/landing/real-screens/
  RealScreens.tsx` renders the REAL app components (ProtectionStatusHero + AttentionList, the
  renewals timeline, the coverage map, the advisor's ClientCard rows) on fixture data, laid out at
  390px and scaled into the hero DeviceFrame (now 300px, unpadded), both AudienceTabs phones and the
  «Γιατί τώρα» band; each screen brings a pinned `LanguageProvider` + `TranslationsProvider` (the
  public layouts mount neither), is `inert`, and is stamped as a sample; the mock-honesty guard now
  scans that file. BranchCoverageMap sizes to its container (`@container` / `@sm:`), which is what
  keeps it two-up inside a phone frame on a wide viewport. **Motion (same day, `/impeccable animate`):**
  the phone screens now behave like the app — a status bar and the app's own tab bar frame each
  screen; when a screen goes live (the hero frame switching to it, a static phone scrolling into
  view) its content pushes in from the right while the chrome stays put, cards settle in with a
  short stagger, bars fill to their values and counts tick up, and the tab bar's mark lands on the
  screen's tab; the hero now plays home → wallet → coverage map as one session. CSS keyframes
  (`.rs-live`, globals.css) + two small Web Animations tweens; reduced motion flattens everything;
  nothing loops off-screen. Pre-existing, not touched: a hydration attribute mismatch on the
  homepage comes from `PlanRecommender`'s range input (`caret-color` inline style).
  **Polish on /protection (same day, `/impeccable polish`):** functional first — the risk lens
  logged a React missing-key warning on every render (the RiskGraphPanel element is created in the
  server component and handed to the client view; Flight's frozen element cannot be marked
  validated, so it now carries a key), and the «Τι ελέγξαμε και είναι εντάξει» rows printed the
  stored slug («health», «motor») as a title with an English «OK» pill (now the taxonomy label and
  «Εντάξει»). Then the drift: the coverage summary is ONE card (CardHead · verdict sentence · tally ·
  expired notice · three fact cells on the sunken surface) instead of a centred kicker block over
  floating tiles; the empty states, free-tier gate, all-clear list and «Επόμενα βήματα» are cards
  with soft pills; branch tiles are chip · title · caption with status-token pills and no faded
  neutral state; life events, monitoring, risk profile, risk graph, household, trends, predictions
  and the quick-start opener share CardHead, sunken rows, segmented filters on the track and
  caption labels. Every bar, icon and pill colour is a status token (no `#1A2420`, no
  `text-black`, no palette literals). One guard learned the token vocabulary
  (`risk-assessment-panel-mobile`'s unknown-vs-unprotected check only knew `bg-red-50`-style
  classes). Recaptured both lenses at 1440/390: 0 console errors. Commit `fc6b7cac`. A second
  batch (captured as the FREE and DASH fixtures, whose thin profiles render the states the Pro
  fixture hides) put RiskProfileWizard on the anatomy — CardHead, sentence-case section heads,
  `.pw-input` recipe fields with a visible control edge, sunken chips with a primary ring when
  ticked (ChipToggle's amber «warning» accent is gone: a ticked family-history chip is state, not
  a finding), content-width submit — and moved every upgrade CTA on the page (lite gate, locked
  empty state, UpgradeTriggerCard's card and inline variants) to soft pills, so the wizard's
  submit is the screen's one primary. Not touched: the finding cards (already on the anatomy).
  **Auth pages (same day, `/impeccable polish`):** the auth tree is the Grafí world (the split
  AuthShell, `fg-*`/`surface-*`/`state-*` tokens) and sign-up already lived there; sign-in and the
  five utility screens did not. Sign-in: the email/phone switch is a segmented pill on the sunken
  surface, the error banner / field errors / reset dialog use the shared gap and covered notices,
  the submit and dialog buttons are the design-system Button, the trust badge and links are on
  tokens — no hex, no rose, no app-world `pw-*` recipes. Forgot / reset / verify / confirmation /
  handover: one anatomy (state disc · display-md heading · body · one action) on the same
  notices and Button; the reset page's two hand-rolled password inputs — `<label>`s with no
  `htmlFor`, an unlabelled three-segment meter — are now the shared PasswordField (a `showRule`
  prop hides the rule line on the confirm field). Shared recipes live in
  `components/auth/FormField.tsx` (`AUTH_LINK_CLASS`, `AUTH_PRIMARY_LINK_CLASS`,
  `AUTH_SECONDARY_LINK_CLASS`, `AUTH_NOTICE_GAP_CLASS`, `AUTH_NOTICE_COVERED_CLASS`). The five auth
  pages left the always-dark register's MIXED list because they no longer carry a dark literal.
  Captured unauthenticated at 1440/390: 0 console errors.
  **Next:** owner review on the preview (four app pages + /protection both lenses + homepage
  hero/audience/why-now); the severity tone decision. Two proposal-backlog claims were retracted/corrected in the artifact (the "avatar over
  the first tab" was the Next dev-tools button; the identical renewal rows were fixture
  duplicates, now collapsed).

## Done since the last entry

- **2026-09-05 — The Document Validation Gate (PR #298 → NEW-UI `45013e3f`,
  DEPLOYED 2026-09-05 00:00Z, deploy run 33930719296, SMOKED on production): no document enters
  expensive analysis unvalidated.** Root cause: nothing read a
  PDF locally, so «is this a policy?» was answered only AFTER the whole file had been base64'd to
  Gemini (~211k estimated tokens per run); `/wallet/add` uploaded from the browser straight into
  the bucket and committed the Policy with an extension check; every other door persisted before
  content was known; the selected branch was a prompt hint. Built: `lib/ingestion/` — `unpdf`
  probe (page cap FIRST, text of the first 12 pages, image-only), a Greek/English lexical
  classifier scored by distinct evidence groups (one repeated word can never look like a policy;
  text that talks to a model is refused outright), the cheap model only for the middle band or a
  scan (≤6k chars / ≤2-page pdf-lib excerpt, consent read first, closed schema, excerpt framed as
  data), branch FAMILIES with mismatch only when lexicon and model agree, duplicate by
  `documentHash`, a 20/h rejection budget; ONE persistence path `ingestPolicyDocument` (gate →
  storage → Policy + stamped PolicyDocument in one tx) behind `/wallet/add` (file now travels in
  the action; browser→storage code deleted), onboarding, wallet upload, renewal, the agent commit
  (grant in the same tx) and the documents route (attachment mode); the extract route and the
  agent scan gate BEFORE the daily spend cap; `extractPolicyData` takes a `ValidatedAIDocument`
  only `toValidatedAIDocument` can mint; `prepareDocument` validates legacy rows lazily
  (keep-and-inform); `createRun` returns the in-flight run, requires a document and marks
  «analysing» only after the token gate; `executeRun` re-checks consent + deletion; QStash
  `deduplicationId`. Migration `20260905120000_document_validation_stamp` on dev AND prod
  (verified by query); the `policies` bucket INSERT policy dropped on dev AND prod (archived;
  `pg_policies` on `storage.objects` is empty on prod, so the browser can no longer write the bucket). Copy: one code-driven block for every surface (el/en), no
  field counts; «Άλλαξε τύπο σε …» / «Συνέχισε ως …» / «Επιβεβαίωση και συνέχεια». KPI: ActivityLog
  `DOCUMENT_*` rows → admin dashboard «Document gate» card («AI analyses prevented», tokens
  prevented, classifier spend separately). Guards + probes: `document-gate-before-model`,
  `document-gate-storage-single-path`, consent guard's `classifyDocument` arm. Journey:
  `tests/document-gate.spec.ts` (policyholder, serial), `tests/document-gate-agent.spec.ts`;
  fixtures `tests/fixtures/documents/` (built by `build.mjs`). Audit:
  `docs/audits/document-validation-gate-2026-09.md`. **Deliberately not built:** OCR; a
  DB-level unique constraint on in-flight runs (Prisma 5 partial indexes); stopping
  `resolveLineOfBusiness`'s post-extraction overwrite. **Production smoke 2026-09-05 (owner account, `/wallet/add` as Motor):** `menu.pdf` → gate card `NOT_AN_INSURANCE_DOCUMENT`, 0 policies / 0 documents / 0 `token_usage`, one `DOCUMENT_REJECTED` row (tokensPrevented 188,640, no classifier call); `motor-schedule.pdf` → policy `cmtnmck13000385ohunkc6rbi` active, document stamped `validated` / `docgate-1` / `insurance_policy` / motor / consistent, run completed in 24 s, four `token_usage` rows (analysis, clarity, gap detection, other), one `DOCUMENT_VALIDATED` row. No new Sentry group in the window after deploy. The smoke policy is still in the owner's wallet.

- **Auth rebuild A0–A8 (brief: split-shell, phone removal, phased social login)**
  (2026-08-31, `e663df0f` — DEPLOYED, CI+deploy green, live signup smoked: new H1s,
  no phone field, «Δημιουργία λογαριασμού», no social button pending credentials): phone retired as an IDENTIFIER (synthetic emails minted
  for no new account; universal email verification; recovery restored); terms now
  RECORDED on both paths; one AuthShell across all 9 auth screens (panel subtree
  omitted <1024); social registry live|soon|off with signed-intent role transport,
  callback row-birth + linking guards (and the id-vs-email lookup bug fixed);
  Google code-complete behind NEXT_PUBLIC_AUTH_GOOGLE [verify: owner credentials].
  Ledger docs/AUTH_PROGRESS.md · audit docs/auth-audit.md · handover appended.
  518 files / 5900 unit tests green.
- **How-it-works band restyled onto Grafí** (2026-08-30, uncommitted): new
  `components/landing/grafi/HowItWorks.tsx` — numbered icon tiles, one bold brand-green
  phrase per step (`emphasis`, a verbatim substring of the JSON-LD description), per-step
  44px arrows (1/4 → signup `source=landing_how_it_works`, 2 → `#reading-demo`,
  3 → `#difference`), closing line «Εσείς αποφασίζετε.», ReadingDemo kept inside. Copy from
  the owner's mock (accents fixed). Guard: `tests/unit/landing-how-it-works.test.ts`.
  Verified 1280 + 390 (no h-scroll), HowTo JSON-LD plain, full unit set green.
- **«Για ποιον» band restyled onto Grafí and moved under «Πώς λειτουργεί»** (2026-08-30,
  uncommitted): new `components/landing/grafi/WhoItIsFor.tsx` (header with brush accent,
  the shared «σωστή κάλυψη, τη σωστή στιγμή» strip) around a rewritten `AudienceTabs`
  (same ARIA/keyboard contract, pill switch with icons, role cards with stamped phone
  samples on the three-state chips — «Καλύπτεται»/«Κενό», no «Εντάξει»). Mock copy taken
  in formal plural per the voice rule. Retired every hex literal in AudienceTabs and the
  last one in WorldClassLanding (debt list shrunk). `BrushUnderline` promoted to
  `src/design-system/layout.tsx`. Verified 1280 + 390, light + dark, both tabs.
- **Grafí tokens → components → homepage**: fixed-promise H1 (carousel gone), coverage ticker,
  answer block joined to the glossary (guarded), sourced market numbers (ΕΔΑ + ΕΝΦΙΑ only),
  4 steps + ReadingDemo, broker band + BrokerScanPanel, comparison on /compare's source,
  Free card + billing toggle + PlanRecommender on the enforced entitlement ceilings.
- **Accepted-but-never-applied marketing decisions landed**: NEUTRALITY_STATEMENT replaces the
  retired «δεν συνεργαζόμαστε» sentence; TRUST_FACTS stops claiming data "stays in Europe";
  FAQ funding claim retired; deliverable-4 titles/descriptions applied.
- **Three production-grade defects found by the G12 passes**: tailwind-merge silently deleting
  `text-fg-on-brand` (hero CTA at 2.74:1 → cn() group registration, a11y 97→100); triple Inter
  loading (un-preloaded H1 font); `/_vercel` analytics scripts 307'd to signin by proxy.ts.
- **/solutions/partners + /synergates** created noindex per A-04; «Κάλυψη» glossary entry;
  health/property wedge sections with primary sources.

## Blocked

- Partners de-noindexing: Terms §3 qualification + IDD opinion (legal — `docs/legal-review-queue.md`).
- Guides 6–8: citation debt (A-03: citation-clean or not at all).

## Top risks, ranked

1. **Marketing routes ship the app bundle** (602KB: Sentry 172KB, Supabase 46KB) — mobile LCP 4.8s
   vs the 2.0s budget; the split is the named fix (`docs/perf-report.md`).
3. **Visual seam mid-homepage** — legacy-styled bands below the Grafí upper page until G6 polish.

## Next 3 actions

00. PW-TRANSPARENCY-02: when PR #299 is CI-green, apply the B0 migration on prod (Supabase MCP +
    `_prisma_migrations` row, checksum `3710e0e2…3ffb`) and merge in the same step; then B1 taxonomy /
    severity de-emphasis and B2. Owner: BL-01 (production free-tier plan row → Terms §5), BL-02
    (external consumers of the two score APIs), H-T01 (Risk DNA numbers: option A or B).
0. Document gate follow-ups: run `tests/document-gate-agent.spec.ts` (`agent-chromium`) once
   against dev — the agent door is covered by unit tests and the shared ingestion path but has
   not been walked in a browser; watch the admin «Document gate» card for a week (rejections by
   code, classifier spend vs analyses prevented); decide whether `resolveLineOfBusiness` may
   still overwrite a branch the gate called consistent; delete or keep the smoke policy
   `cmtnmck13000385ohunkc6rbi` («Example Insurance Company Ltd») in the owner's wallet.
1. Owner: open PR #290's preview at phone width (dashboard, wallet, protection, /agent, account)
   and decide on the Steady phone layer; then set the Preview-scope DB env vars and the Google
   OAuth branding / custom auth domain (both owner-only, see In progress).
2. B2B batch C (insights, questionnaires, team, commissions, benefits) and the three customer
   modals onto the Direction A anatomy; then merge #290 → #291 in that order.
3. Marketing carry-overs: split the marketing route group from the app providers (the mobile-LCP
   fix), restyle the remaining legacy bands, and de-noindex the partners pair when legal returns.

---

<details>
<summary>Previous entry (2026-08-28, PW-MOBILE-TRANSFORM-02)</summary>

## Done since the last entry

- **The needs check's multi-selects were the real dead end** (reported second, and
  worse than the single-choice one). `isStepComplete` counts a multi question as
  answered when its array EXISTS — an empty array is the affirmative "none of
  these", exactly as `toRiskProfilePayload` documents. Nothing ever created that
  array, so the only route to "none" was to tick an option and untick it. Anyone
  with no boat, no business and no high-risk sport hit a disabled Continue on
  step 5 while the step's own intro said «αν δεν ισχύει κανένα, προχωρήστε».
  Fixed with an explicit control, NOT by loosening the gate: the form's claim to
  honesty is that a reader can tell "asked and said no" from "never asked", so
  auto-completing would let someone who scrolled past look like they had
  answered. The renderer draws the pill for every multi question, so a new one
  cannot ship without it; `noneLabel` exists only because Greek gender has to
  agree («Καμία από αυτές» for καλύψεις). Guarded by a component test that
  asserts the OUTCOME — Continue disabled with nothing ticked, enabled after
  "none" — red-proved in both directions.

- **The literal sweep: 456 -> 124 across 80 -> 29 files.** Four status roles
  (success/warning/danger/info) are now tokens with the same machine-read
  `@on <surface> @min <ratio>` contract as the brand accent. Measured first, and
  the measurement changed the story: every shipping value already cleared 4.5:1,
  so this was never remediation. It was ONE ROLE RENDERING MANY WAYS — warning
  foreground in three ambers, warning tint in five, success in two mints — with
  the light side of all four roles already uniform. Only the unreviewed half of
  the theme had drifted. Light mode is now byte-identical (**0 of 15,111,680
  pixels** on a full-page landing diff); 59 dark instances move and the worst
  lands at 8.63:1 against a 4.5 floor. Edges left alone deliberately: amber-200
  on the amber tint is 1.12:1 and looks like a 1.4.11 failure, but the chip is
  already identified by its fill and text, so the border carries no information.
- **A defect class found on the way: eleven elements set the same property twice
  under the same variant.** Three named different values, and Tailwind emits both
  at equal specificity — so stylesheet order decides, not class order, and the
  rendered colour is one nobody chose. Eight fell out of the sweep; the other
  three used palette classes no colour rule would ever reach.
  `one-variant-one-declaration.test.ts` guards the shape and reads its colour
  vocabulary from globals.css so `text-sm` is not mistaken for a colour.
- **The needs check showed six blank grey slabs on a phone.** The step strip is a
  6px progress bar whose only text is `sr-only`; the unlayered mobile control
  floor (`button { min-height: 44px }` under 768px) had nothing to grow but the
  button's own box, so each segment inflated into an empty 44px pill. It looked
  correct on desktop, where the floor does not apply, which is why it survived.
  The button now owns the 44px target and the bar is a 6px child — the hero
  carousel's pattern — and `basis-8` keeps all six on one line down to 320px.
- **Three required questions were dead ends, and one value was unsaveable.** The
  needs check refuses to advance until every single-choice question is answered,
  and «Πού μένετε / Πώς εργάζεστε / οικογενειακή κατάσταση» had no option for a
  student, employer housing, or anything unlisted. Worse, `student` was already
  a valid value in `profile-mapping.ts` and **rejected by the Zod schema** — so
  anyone picking it in the questionnaire had their save refused. `partnered` was
  accepted everywhere and missing from the wizard's own select. Four descriptions
  of three fields, drifting in every direction;
  `profile-choice-sets-agree.test.ts` now enumerates the option lists from source
  and fails on any value the contract refuses, plus on a required question with
  no way out. Red-proved three ways, one of them the exact live bug.

- **Dark mode was ungoverned, and the token migration was about to make that permanent.**
  `text-[#29685B] dark:text-[#A7F3D0]` across four landing files was never a style pair — the
  brand green measures **2.74:1 on slate-900** and is unusable there, so the second literal was
  the contrast fix, stored as a magic string with nothing recording why. Migrating the light half
  to a token and leaving the dark half a literal (the pattern the already-migrated landing files
  use) buys a governed light theme and an ungoverned dark one; token work gets reviewed in light
  mode, which is exactly where drift hides. Owner chose to add the dark tokens FIRST.
  `--brand-accent-on-light` / `--brand-accent-on-dark` are named by role and carry a machine-read
  `@on <surface> @min <ratio>` contract; `tests/unit/token-contrast-contract.test.ts` enumerates
  every `*-on-light`/`*-on-dark` token in `app/globals.css`, resolves its surface, measures the
  ratio and fails below the floor — **including on a missing annotation**, so the contract cannot
  be skipped by omission. Red-proved three ways against the real file, plus an 8-branch probe
  fixture. This is the return on the decision: the literal-count ratchet became a contrast
  ratchet, and the remaining 81 pinned files inherit it.
- **HeroSlides fully migrated — 24 literals to 0**, and 11 `dark:` colour twins deleted rather
  than tokenised one-sided. Debt guard total **489 → 465** literals across **82 → 81** files;
  no other file's count moved. Two greys turned out to already have exact tokens
  (`#5B6A7A` = `--muted-foreground`, `#0F172A`+`dark:text-white` = `--brand-text-primary`), so
  those were zero-change swaps, not the trade-off they looked like.
- **One real defect in HeroSlides, found by asking what the greys were doing.** The inactive
  carousel dot measured **1.48:1** on white and **2.36:1** on slate-900 — a live SC 1.4.11
  failure, and *worse* in the theme nobody was checking. An inactive dot is the only thing
  telling a reader the control exists. Now `--dot-track`: **3.61:1** light, **3.75:1** dark.
  Verified by pixel diff: **176 of 272,240 pixels changed, all inside the two dots, in both
  themes** — nothing else on the hero moved.
- **The auto-rotating hero audit came back clean apart from that dot.** 2.2.2 pause control
  (visible, labelled, 44px), reduced-motion kills auto-advance entirely and removes the dead
  control, hold on hover AND keyboard focus, `aria-live` off→polite on user control, inactive
  slides `inert`+`aria-hidden` with only the active one an `<h1>`, focus ring at 6.51:1/13.92:1,
  44px targets. Reported rather than assumed — it was the most likely Level A failure on the page.

- **The gap engine was inventing duplicate motor cover.** `insuredSubject` kept a hand-rolled copy
  of the asset-identity map and never rejected the extractor's unreadable masks, so two different
  cars whose plates both read «(XXXX)» were reported as one vehicle insured twice — advice to drop a
  policy, on compulsory third-party cover. Measured against the shipped code before fixing. Now
  delegated to `policyAssetSubjectKey`, which also makes the dead `assetIdentityKey` live and adds
  pet and vessel subjects the old copy could not see.
- **Greek public pages could render English, per device, with no way back.** `/guides` and six
  siblings never pinned a locale, so they rendered whatever `localStorage` on THAT device last
  chose — which is why it looked like a mobile bug when nothing in the locale path is
  device-dependent. The ΕΛ toggle pointed at the page you were already on, so it was unrecoverable
  in place. Seven routes pinned; **verified on production with `language:'en'` stored — renders
  Greek, `langOwner="static"`.** Guard enumerates twins from the filesystem (both manual sweeps
  missed `/for-agents`; the guard caught it).
- **A renewal upload left a stale «Το ασφαλιστήριο έχει λήξει» until repeated refreshes.** Three
  defects: the path never marked the policy `analyzing`, so nothing had an honest state to show;
  `after()` deferred the run while `revalidatePath` fired ahead of it and nothing revalidated when
  it landed; and **on free/Starter the dates never moved at all** — the evidence gate rejects
  `renewal_notice` by definition, so those users would never have seen an update, ever. New
  `renewal_under_review` attention state claims neither verdict.
- **A renewal is now checked against the policy it is attached to**, comparing numbers
  presentation-insensitively (punctuation, and Greek/Latin capitals that render identically). A
  mismatch refuses to apply and names both numbers; the document is always kept.
- **The insured person is updated, not duplicated.** `deriveInsuredNames` unioned four keys holding
  one party; a renewal that restated the name listed the old and new spelling as two covered people.

- **GROWTH-HOOKS-01 Track A is live** — hook ticker on `/guides`, three new sourced guides, one
  extended, verified on the production site.
- **Two live consumer-facing errors corrected and deployed.** The uninsured-vehicle guide named the
  wrong authority (ΑΑΔΕ, not Γ.Γ.Π.Σ.Ψ.Δ./Σ.Δ.Ο.Ε.) *and* understated every fine — €150 published
  against €500 in law for a passenger car. Both from ν. 5113/2024, verified verbatim.
- **Phase 4** — design-token debt guard (321 keys, shrink-only, red-proved both directions), 274
  landing literals migrated with before/after computed-style verification across 24 captures,
  MASTER.md's real drift fixed.
- **Phase 5 preconditions** — the two missing §11 metrics built (`duplicateActions`,
  `countConsistency`), counts instrumented, and a **cross-surface** detector that catches a
  contradiction the per-page metric structurally cannot see. Proven red live, not just in jsdom.
- **Phase 6 guard audit** — all 45 guard files read. **Two were green over live defects.**
- **`check-utf8` now refuses C0 control bytes**, and immediately found a corrupted hostname in a
  March governance evidence record.

## Top risks, ranked

0. **Plan naming — the APP is fixed; the EDITORIAL corpus is not, and it is not safe to bulk-rename.**

   *Fixed 2026-08-28.* «Plus» named two different plans at two different prices: the upgrade modal
   offered «Συνέχεια με Plus — 8,99 €» for `ph-pro` while `/upgrade`, the public pricing page, the
   landing page and the help centre call `ph-plus` «Plus» at €4.99 and `ph-pro` «Family». Three
   components held their own label maps — `UpgradeModal`, `CarriedPlanCard` and `PlanBadge` (the
   third was invisible to the first guard, which named files instead of enumerating). All three now
   resolve through `planTierName()`; the four `subscription-copy` CTAs whose KEY named one tier and
   whose VALUE named another are corrected, as is the `/upgrade` FAQ that priced «Starter» at €39
   and «Plus» at €79 on the same page whose cards said «Plus €4.99» and «Family €8.99». The guard
   now enumerates `components/{monetization,account,shell}` and is red-proved against `PlanBadge`.

   **CLOSED 2026-08-28.** The gating audit turned out to be already written down:
   `plan-defaults.ts` states the intent in its own comments — `plus` is "displayed Plus (the name
   moved from Starter)", `pro` is "displayed Family (the name moved from Plus)". Every editorial
   instance was then decidable and renamed MEANING-PRESERVINGLY: 8 «Starter»→«Plus» (all reminder
   claims, and `notifications` is true on `plus`, so also factually right) and 3 «Plus»→«Family»
   (all gap/under-insurance claims, and `portfolioGapView` is `pro`-only). The copy freeze confirms
   it: 11 added, 11 removed, the only difference in each pair being the plan name.

   It also caught a **false claim at the point of sale**: `upgrade-copy` promised "Έως 5
   ασφαλιστήρια (Starter) ή απεριόριστα (Plus)" to a free user hitting the policy cap. The catalog
   says 10 and 25 — wrong on the numbers as well as the names, while the public pricing page had
   said 10/25 all along.

   A FOURTH hardcoded map was found by widening the guard: `MainNav` rendered "Plus" for `pro` and
   "Starter" for `plus` on the nav badges. The guard covered its directory but matched only
   `key: "value"` maps; a JSX text node was invisible to it. It now checks both shapes.


1. **H-011 — a document reaches a model provider BEFORE anyone consents.** The agent scan path
   (`parsePolicyPdfWithGemini`, 93 lines, zero consent references) sends the document, and
   `commitScannedPolicy` takes `attestedAiConsent` as a parameter — consent is attested *after* the
   processing. `AddCustomerModal` calls the scan directly from the client, bypassing both wrappers.
   **CLAUDE.md claims this cannot happen "on every path"; that claim is false.** There is a fair
   structural argument (the subject is unknown at scan time — resolving it is the point), but a
   lawful basis is needed when processing happens, not when it is recorded, and no exemption is
   written down anywhere. Three options in `HALTS.md → H-011`; the cheapest is to accept it and fix
   the doc, because a future agent will trust the invariant as written.

2. ~~**The money path has rotted.**~~ **GREEN — 14/14, 2026-08-28.** It had been red for five days
   and nobody knew, because Playwright is not in CI. Running it found far more than the one stale
   selector STATUS knew about: **6 failed / 4 passed / 4 never ran**, and the spec could not pass in
   ANY configuration — its docblock said FREE tier, the config gave it the PRO session (every
   assertion is about gates that need `tier !== 'pro'`), and its fixture resolved the PRO user's
   policy, a correct 404 under the free session.

   Nine iterations, because serial mode reveals one failure at a time. Fixed in the PRODUCT where
   the product was wrong (plan naming, the upsell inside a collapsed section) and in the
   ASSERTIONS where they described a page that had been deliberately replaced:

   - the `money-free` project, the free user's own fixture policy, the pro session pinned on the
     one billing block that needs it;
   - `PremiumInsightCards` carries its `id` on the component, not a container;
   - the shared modal probe matched «Συνέχεια με Plus» — three unrelated tests went red at once
     when the modal stopped calling `ph-pro` "Plus". It now requires the **price**, because the
     locked feature cards carry «Συνέχεια με απεριόριστες ερωτήσεις →» and sit EARLIER in the DOM,
     so a loose match with `.first()` selected a card and passed against a modal that never opened;
   - assertions on a raw filename the product never persists, on a Q&A trigger that moved into the
     head card in GOAL 2, and on a free-question allowance that was removed
     (`FREE_LIFETIME_QUESTIONS = 0`) — the last rewritten to pin what replaced it: the lock is a
     PLAN gate, so prior usage cannot change it.

   **Playwright is still not in CI.** Everything above was invisible to a fully green gate.
3. **SEC-01 — session objects reached the Vercel runtime logs. LAUNCH RISK, not post-GA debt.**
   **Contained, not closed**, and not closable by the agent. The middleware TypeError embedded the
   whole session in its message; **8 occurrences confirmed** in production (2026-08-23 ×7,
   2026-08-26 ×1), counted two independent ways.
   *Done:* the affected admin session **revoked** (prod verified 0 sessions / 0 unrevoked); both
   leaked access-token JWTs had already expired and neither leaked refresh token still existed in
   `auth.refresh_tokens`; the throw is caught and redacted in `proxy.ts`; `scrubText` now redacts
   credentials, which it never did; Sentry holds **no** copy. The IP-origin line raised in review
   is **CLOSED — confirmed VPN, not a finding**.
   *Open, and the only thing gating closure:* whether a **Vercel log drain** was configured inside
   the exposure window. Dashboard check, project *and* team — see `HALTS.md → SEC-01`. No drain ⇒
   exposure confined to Vercel's own logs, which age out and hold only dead credentials, and
   SEC-01 closes. Drain ⇒ the 8 entries were forwarded to a third party with its own retention and
   access list, containment is **not** established, and a new scope item opens.
   Vercel exposes no delete endpoint for runtime logs; the only early-purge lever is deleting the
   two producing deployments, deliberately not done — irreversible, and the credentials are dead.
   Whether occurrences predate 2026-08-23 **cannot be established**: the 7-day aggregate times out
   and 30 days is rejected.

2. ~~**The local session pooler (5432) is wedged.**~~ **RECOVERED, verified 2026-08-28** — connects
   in ~1.8s, `global-setup` provisioned all five e2e users over SQL, and a full Playwright
   measurement run completed. Local measurement is unblocked. Original note kept below.

2. **(historical) The local session pooler (5432) was wedged.** `verify:gap-catalogue` passed at 04:44 and failed
   at 05:10 on the same invocation. TCP is healthy (~400ms, no IPv6 records) and the database is
   idle at 3 upstream connections, but new *session-mode* connections stall past the 20s pool
   timeout while transaction mode (6543) still answers. Follows two crashed provisioning runs.
   Blocks every local Playwright measurement.
3. ~~**`/protection` is the one unresolved capture.**~~ **RE-CAPTURED 2026-08-28: it is 6 sections,
   not 20/26.** Both lenses. The re-measured id list is an exact PREFIX of the stored one and every
   dropped entry is a nested descendant of the six that remain — card titles inside «Προτάσεις
   κάλυψης», rows inside «Σύνοψη κάλυψης». `/account/history` held at 2 in the same run, so the
   collector did not simply start counting lower. **The ceiling concern was a measurement artefact;
   the page needs no section reduction.**

   **The rest of the stale corpus was then re-run, and it is in far better shape than "inflated by
   an unknown factor" implied.** Of 54 stale captures re-measured, **49 were already correct and 5
   were wrong.** The inflation is not a factor applied to the corpus — it is a property of one page
   SHAPE. Every capture that moved is a surface with nested card groupings, where the old collector
   counted a grouping and its own contents separately, consistently 3.3–4.5×:

   | capture | stored | true | factor |
   |---|---|---|---|
   | `/protection` ανά κλάδο | 20 | **6** | 3.3× |
   | `/protection` ανά κίνδυνο | 26 | **6** | 4.3× |
   | `overlays` batch-upload-modal | 12 | **3** | 4.0× |
   | `wallet-list` populated-paid | 9 | **2** | 4.5× |

   Everything unchanged was a page the collector scored 0 or 2 — nothing nested to double.

   **Four stale surfaces can NEVER be corrected.** `branches`, `coverage-insights`, `risk-profile`
   and `timeline` (31 captures) have no spec, because V2-P2-03 deleted their routes. Their inflated
   numbers are the only surviving record of pages that no longer exist and must be read as
   before-pictures, not measurements.
4. **`verify:gap-catalogue` now runs in CI** (the secrets were a name mismatch, not missing) — but
   the loud-skip fallback has never actually fired, so the failure path is unproven.
5. **The fix for a guard gap had the same gap.** The pooler lock shipped guarding `withDb` while
   the heaviest DB user in the run bypassed it. Assume every new guard's universe is too small
   until enumerated from the filesystem.

## Next 3 actions

1. ~~`no-raw-euro-money-interpolation` — seven files not yet fixed.~~ **STALE, verified
   2026-08-28: all seven were routed through the formatters, `KNOWN_RAW_EURO_DEBT` is empty and the
   tree is clean of BOTH shapes** — the guard's `€{expr}` / `€${expr}` forms and the suffix shape
   `{expr.toFixed(2)} €` it structurally cannot see (swept separately, 0 matches).
3. Confirm who can read the Vercel runtime logs — team `moniaros' projects` (Pro, no SAML) is the
   access boundary, and its member list could not be enumerated from the tooling here.
2. ~~Re-capture `/protection`.~~ **DONE** — see risk 3. The follow-on is that the label-collision
   correction proposed in `P5-measure-00` is now measured as far too weak to publish: it catches only
   doubles that SHARE a label (2 of the 20 dropped here), so it would have reported a number wrong by
   an order of magnitude while looking corrected. Re-run captures instead.
3. **P5-wallet-01** is unblocked: motor, property, pet and marine carry strong identifiers in
   `acordData`; health, life, travel, cyber, business and pension carry none, which is exactly why
   the duplicate rows measured were health. Rows without an identifier stand alone.

</details>
