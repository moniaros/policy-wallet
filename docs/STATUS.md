# STATUS

**Production: `76f62a43`** — deployed 2026-08-30 via CI-green → deploy.yml (dpl_7DuAspuumiGFu9Cmokr4m3jFh3jb).
The Grafí homepage is LIVE and smoked: fixed-promise H1, 16-line ticker, sourced numbers with
their links, retired sentence absent, 4 steps + ReadingDemo, broker band, comparison, three
pricing cards (€0/€4.99/€8.99) + recommender, CTA white-on-green, no h-scroll at 390; /en
mirror, partners pair noindex, /_vercel scripts 200 (were 307). Zero new Sentry groups in the
2h window after deploy.

## Current phase

**Grafí design-system build + marketing rebuild — ladder G0–G12 walked** (2026-08-30, 18 commits
`a4aae9f2..`). Ledger: `docs/DS_PROGRESS.md`. G0–G3, G7, G11, G12 done; G4/G5/G6/G8/G9/G10
partial with the remainder named per-goal in the ledger. Written system: `docs/design-system.md`;
seams and hostile review: `docs/handover.md`.

## Done since the last entry

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

1. Split marketing route group from app providers (kills ~220KB; the mobile-LCP fix).
2. Restyle the remaining legacy bands (ServicesGrid, WhyDifferent, ClearLimits, FAQ, final CTA)
   onto Grafí and finish the G4 primitive remainder.
3. When legal returns Terms §3 + IDD: de-noindex the partners pair and add its hreflang link.

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
