# PolicyWallet — Project Status

## Session wrap — 2026-08-21b (Live Stripe, the promo guard, and renewals)

### The live false claim is resolved — PATH 1, made true

policywallet.gr advertised ENDOFSUMMER26 (25% off, expiring 2026-08-31) while production
was configured against a sandbox account. The live account turned out to be **fully
activated** — `charges_enabled`, `payouts_enabled`, `details_submitted`, card payments
active, EUR, Greek bank account, zero outstanding requirements — so only the catalog was
missing.

Created in **live** mode: coupon `KoRxXvUh` (25%, repeating 12 months), promotion code
`promo_1U6jES1JRuUbwXlyN3KQK5Ys` = ENDOFSUMMER26 (`first_time_transaction`, expires
1788209940 = 2026-08-31 20:59Z = **23:59 Europe/Athens**), 5 products, 10 prices on the
`<plan_id>_<interval>` convention. Every live price amount verified equal to the displayed
catalog. `plans.stripe_price_id` in BOTH databases now points at live prices — zero
sandbox ids remain.

**Webhook is on `www`, not the apex.** policywallet.gr 308-redirects to www and Stripe does
not follow redirects on delivery, so an apex endpoint would have failed every event
silently. It subscribes to all three events the route handles; the test-mode endpoint
carried only one, so `checkout.session.expired` and `async_payment_succeeded` were handled
in code and never delivered.

**The guard** (the durable part): a promotion declares which Stripe modes it exists in, and
`activePromotions` requires the mode the deployed build actually charges in — resolved
server-side from the key PREFIX, never the key. It **fails closed**: an unconfigured build
advertises nothing.

### ⚠ BLOCKING HANDOFF — the one human step

Live mode does nothing until these are set in Vercel (Production **and** Preview), then
redeployed. Names and expected prefixes only:

| Variable | Expected prefix | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_` | Stripe → Developers → API keys (live) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_` | Stripe → Developers → Webhooks → endpoint `we_1U6jHX1JRuUbwXlymoKwosK1` → *Signing secret* |

Only those two. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is declared optional in `lib/env.ts`
and used nowhere — checkout is redirect-based (the server returns `session.url`), so there
is no client-side Stripe.js and no publishable key to rotate. Both variables already EXIST
in Vercel Production and Preview; their VALUES are what change.

Until then the deployed build reports mode `test`, so **the promo banner correctly hides
itself** — the claim is no longer false either way.

Also worth a decision: the live account's statement descriptor is **`AGENTRISE PLATFORM`**.
A customer paying for PolicyWallet will not recognise that line on their statement, which
is a chargeback risk.

### Mandatory fixes
- **maxDuration 300 → 336** in vercel.json, on the route, and in
  `ANALYSIS_FUNCTION_BUDGET_MS`, from the only successful measured run (258s, 2026-08-14,
  run `cmsted5fb001uf566yax22h1b`) × 1.3. **That run predates the optimisation**, so 336
  errs high — the safe direction for a kill timer. The projection of ~205s is superseded;
  a true post-optimisation measurement is still blocked by the Gemini spend cap.
- **regions: cdg1** added (Supabase is eu-west-3).
- **agent-free re-based**: was 500,000 tokens — 3.3× the free consumer tier and 83% of a
  PAYING €39/yr consumer. Now 150,000 / 5 analyses, ph-free's basis, in code and both DBs.
- **The motor drift rule was reading a field the extractor is told to skip.**
  `policy.sumInsured` is documented as "for a line of business with no dedicated section",
  i.e. not motor. Added `vehicle.insuredValue` («ασφαλιζόμενη αξία»), gave
  `estimatedMarketValue` the description it never had, repointed the rule, and rendered the
  new field — a completeness guard caught that an extracted amount reached no screen.
- `canonicalize-plans.sql` deleted (held superseded v1 entitlements; running it would have
  reverted production pricing). No policies stuck `analyzing` in either database.

### GOAL 3 — renewals, now built
Effective period on the document (migration `20260821020000`, both DBs, 70 migrations /
1010 columns / zero bad checksums each). `addRenewalDocument` reuses the ordinary upload
path — same validation, same bucket, same orphan cleanup — authorised through
`getPolicyAccess` with `canAnalyze`. The differential reports premium/sum/term changes with
both source documents cited, treats silence as unchanged, calls an explicit `false` a
REMOVAL, and carries no severity and no advice. A renewal without its original reports
`incomplete_terms` rather than being refused.

**Not exercised against a real original+renewal pair** — that needs the analysis pipeline,
which the Gemini spend cap blocks. The logic is covered by crafted-pair tests.

### Still blocked
1. **Gemini monthly spend cap** — blocks the R5 re-measurement, proving a `value_drift`
   firing, and exercising renewals end-to-end.
2. **R3 prod** (9 of 11 orphans) needs `SUPABASE_SERVICE_ROLE_KEY`; Supabase exposes only
   anon/publishable keys via API, so it cannot be self-served.
3. Live Stripe env vars — the handoff above.

---

## Session wrap — 2026-08-21 (Preflight R1–R6, pricing v2 SHIPPED, insured-value adequacy SHIPPED)

**Both databases are provably identical.** Schema `b31387d7e6bb6a28f3d56582d8c1d78e`
(1008 cols), migrations `ba87dcbf5907bcb102703bdea99d0fb2` (69 rows, zero malformed
checksums), plans `8060e0fe9a3e27de52f12163c054dad6` — each hash computed on both sides.

### Preflight

**R1** — the ENTIRE dev↔prod schema delta had one cause:
`20260605120000_extraction_pipeline_schema`, from a `feat/pipeline-*` branch never merged,
applied to dev in June and never to prod. Archived (39 rows) and dropped. Three dev
migrations were recorded pending but their objects already existed — resolved, not re-run.
Eleven dev / six prod checksums held placeholder strings (one literally empty) from the
manual Supabase-MCP path; those **blocked `migrate deploy` on both databases** and are
re-stamped. `protection_score_history` dropped from both (archived): a user-keyed table
with no Prisma model, therefore outside the DSR export, so the drop IS the erasure.
**DPO sign-off unblocked.**

**P1** — the split-brain's real cause was not the duplicate `DIRECT_URL` (that one was
dev). It was `.env` holding `DIRECT_URL="DIRECT_URL="postgresql://…""`, which dotenv
parses into an invalid string — and **Prisma CLI reads `.env`, never `.env.local`**. That,
not the pooler port, is why `prisma migrate` "could never work here".

**R2** plans byte-equal (ag-starter had 6 dev subscriptions, repointed to agent-starter
before deletion). **R3** dev: 34 orphans removed, objects == rows. **R4** three guard holes
closed — the single-path matcher accepted a *comment* naming `getPolicyAccess`; the
server-action scan globbed only `actions.ts`, missing 9 files / 23 exports; a new axis
catches the `redeemInvite(token, userId)` shape — plus the first HTTP-level cross-tenant
spec. **R6** dev grants already closed, identical to prod.

### GOAL 1 — pricing v2, LIVE on policywallet.gr

B2C sells capacity: Free 3 / Plus €39yr 10 / Family €79yr 25, `aiAnalysisPerMonth: null`
everywhere. B2B monthly €29/€79/€199 with 50/150/400 analyses. All four truth defects
fixed. 84 tier-name occurrences renamed across 22 files — and the half that mattered:
sentences gating gaps behind a paid tier became false when v2 made analysis free, so each
was split along the real line (gaps → every tier; duplicates/portfolio/Q&A → Family).

Verified live: €0 / €39 / €4.99 / €79 / €8.99 / €29 / €199, zero v1 leftovers.

**Two Stripe findings that changed this goal.** Checkout never uses a Stripe Price object —
`createCheckoutSession` builds inline `price_data` from the plan row, so displayed and
charged price cannot disagree and v2 needed no Stripe Price to ship. And **production
Stripe runs in SANDBOX mode**: every prod subscription id carries the sandbox account
suffix, live mode has zero customers and zero products. No real money has ever moved.

ENDOFSUMMER26 exists (25% off, 12 months, first-time-only, expires 2026-08-31 20:59Z =
23:59 Athens). B2B-only by construction: `allow_promotion_codes` is set only for agent
plans, so consumer checkout has no field to type it into. **Remove the banner after
2026-08-31** — it removes itself, but the Stripe objects want cleaning up.

### GOAL 2 — insured-value adequacy, SHIPPED

New `value_drift` operator; two definitions live in both DBs. Motor over-insurance vs the
declared market value; home under-insurance vs the stated rebuild cost (όρος αναλογίας).
Threshold `DEFAULT_DRIFT_THRESHOLD_PCT = 20`. Provenance stores both operands **and the
computed driftPct**. **The depreciation-curve arm deliberately did not ship** — the only
data I could source is US-market, and a euro valuation shown to a Greek consumer must be
defensible. See `docs/planning/INSURED_VALUE_ADEQUACY.md`.

### GOAL 3 — STEP 0 only; one live defect found and fixed

The brief's premise was wrong: renewals do NOT sever the chain — `PolicyService` merges a
same-uploader duplicate silently. The defect was that it merged with a **shallow spread**,
so a renewal notice's silence deleted whole sections. A renewal mentioning only the
vehicle's value erased make, model, green-card expiry, `ownVehicleDamage` and
`glassBreakage` — the last two being exactly what two gap rules read, so the product could
report lost cover the customer still had. Fixed (`lib/services/acord-merge.ts`).
**The feature itself is NOT built**: no effective-period column, no «Προσθήκη
ανανεωτηρίου» action, no «Τι άλλαξε στην ανανέωση» differential.
See `docs/planning/RENEWAL_DOCUMENTS.md`.

### Blocked (facts, not permissions)
1. **Gemini project is at its monthly spend cap** — every analysis fails, which blocked R5.
   It also exposed a real defect, now fixed: that error arrives as HTTP 429, so every retry
   layer treated a billing wall as "slow down" — 20 attempts, 483s, past the 300s
   `maxDuration`, so production would kill the function and strand the policy `analyzing`.
2. **R3 prod** (9 of 11 orphans) needs `SUPABASE_SERVICE_ROLE_KEY`; Vercel returns empty
   for sensitive vars.
3. **R6 last item** — removing `public` from dev's exposed schemas is a dashboard setting.
   Dev returns 401/42501 where prod returns PGRST106; the security-relevant half (zero
   grants) already matches.

### Next 3 actions
1. Clear the Gemini spend cap, re-measure one analysis cleanly, size `maxDuration` from it.
2. Build GOAL 3 in the recorded order: effective-period migration → renewal upload action →
   differential.
3. Decide whether production should move to live-mode Stripe at all, given it has always
   been sandbox.

---

## Session wrap — 2026-08-20d (Paying subscribers unblocked; the pipeline stops wasting half its runtime)

Two defects from the verified 2026-08-14 dev run, both root-caused to mechanism before any code moved.

**A — an ACTIVE ph-pro subscriber was blocked (TOKEN_LIMIT_BLOCKED, 0 tokens spent).** Root
cause: `reserveTokens` bound the billing month as a JS `Date` into raw SQL. `date_column =
timestamp` only holds at exactly midnight server-TZ, so on any non-UTC host the guarded
UPDATE matched **zero rows** — the subscription budget was invisible to the step gate, which
fell through to a purchased balance the user didn't have. Accounting meanwhile addressed the
month as a string — hence the dev DB's twin rows (`2026-07-31` from the reservation path,
`2026-08-01` from accounting) and the asymmetry (gate says no; rollup credits
subscription_tokens). **Prod is NOT bitten by this arm** (Vercel TZ=UTC makes the equality
hold) but was one TZ away. All readers/writers now share `billingMonth()`; pinned by
`token-gate-subscription-funding.test.ts` (a Date bound into raw SQL fails the test).
**Second, prod-live defect:** ALL plan rows in BOTH DBs fail the `.strict()` entitlement
schema (ph-\* legacy snake_case, agent-\* a 3-key subset) — every budget ran on code
defaults and /admin/plans edits to limits were silently INERT. Rows canonicalized in dev
(11/11 verified, incl. the stale `ag-*` trio whose `normalizeAgentTier('Pro')→agent_free`
downgrade trap is now defused via explicit tier_keys); fallback log elevated to **error**;
new `npm run verify:plans` fails on any non-canonical row. **The prod negative balance
(-7,249, 0 purchased)** came from `recordUsageAtomically`'s INSERT arm creating
purchased=0/used=N rows with no floor; the draw is now a capped UPDATE
(`LEAST(used+delta, purchased)`) that never creates rows — pinned in
`token-split-logic.test.ts`.

**B — 336s analysis, ~half waste. The "11s dead time" was never a sleep or lease tick:**
each step boundary made ~9–11 *sequential* DB roundtrips (runtime-overrides, heartbeat,
3–4-query failing reservation, step insert/update, tail heartbeat) at this dev setup's
~1.3s/roundtrip — uniform ~10.2s on steps with ~1s of real work (verified from
policy_analysis_steps). Fixes: non-AI steps (5 of 8) skip reservation/model
resolution/provider probing entirely and no longer fail on provider outages they don't use;
the success-path tail heartbeat is gone; the A-fix makes reservation 1 query instead of 4.
Steps stay separate rows deliberately — the cost was the wrapper, not the rows.
**B.2:** new `getPolicyAnalysisStatus` (ONE owner-scoped raw query, ~200 B) replaces ~45
full-payload polls (~5.6 KB acordData + 2 queries + auth each); the heavy payload is fetched
exactly once on the terminal transition. Adding it exposed a guard blind spot — raw SQL over
owned TABLES was invisible to `policy-authorization-single-path` — now closed red-green.
**B.3:** the translation cache "never worked" because Gemini JSON-mode sometimes emits
`{el,en}` objects, the lenient fallback passes them through, `toLocalized` double-wrapped
them, the prompt got `[object Object]`, the model answered "N/A", and the write died on
Prisma's string type (13/17 writes DID land in the 08-14 run — the 4 objects failed).
"N/A" is NOT a sentinel; it's the model's answer to garbage, now never cached. Coercion at
the wrap/collect boundary, junk-output filtering, reads batched 17 findUniques→1 findMany,
writes 17 upserts→1 createMany. `translation-cache-repeat-run.test.ts` proves a repeat run
translates with ZERO AI calls. **B.4 (assessed, untouched by design):** metadata extraction
96.5s sends the full PDF (the one step allowed to), 120s timeout × 1 retry — the observed
"other side closed" retry behaved correctly.

**Wall-clock: measured-before, PROJECTED-after.** Before: 267.6s run-span (336s incl.
upload+polling). Projected after, same dev environment: ~205–215s run-span — boundary diet
~−30s, cache-loop batching ~−20s, reservation ~−12s; AI bodies (~120s) untouched. The <180s
target likely needs B.4 or prod-grade DB latency; a real re-upload of the same motor PDF is
the honest measurement and hasn't run yet (permission walls stopped scripted analysis runs).

**Guardrails:** `tsc` clean · **4737/4737 unit (439 files)** · lint / i18n-changed / utf8 /
encoding / api-auth green.

**⚠ Prod data repairs — OWNER is running these by hand** (agent-side execution was
permission-blocked): (1) plan canonicalization — the 7 UPDATE statements for
ph-free/plus/pro + agent-free/starter/pro/agency (behavior-neutral by construction: values
identical to the code fallback); (2) balance repair: `UPDATE token_balances SET
used_tokens=0 WHERE user_id=(SELECT user_id FROM users WHERE
email='moniaros@gmail.com')`. After both, `npm run verify:plans` against prod should print
7/7 OK.

---

## Session wrap — 2026-08-20c (Sentinel discard: verified live in production)

PRs #282 (phases 1–7) and #283 (sentinel discard) merged to `NEW-UI` and deployed at
**11:07 UTC** as `852a2b4c`. This session verified the discard work end-to-end and adds the
convention to CLAUDE.md/AGENTS.md. No code change — the code was already here.

**The fix was observed working in production, on a real upload, 8 minutes after deploy.**
Timeline from prod (`cquude…`, all UTC): `11:15:34` a real admin-account upload creates
`PENDING-1787224529142 / __PENDING_EXTRACTION__` (activity_logs) → analysis fails technically →
`11:19:48/49` `notifyUploadDiscarded` fires on both channels, «Το έγγραφο που ανεβάσατε δεν
μπόρεσε να αναλυθεί, οπότε δεν αποθηκεύτηκε», `related_object_id: null` because the policy is
already gone. A count query run inside that 4-minute window caught the row (1 sentinel policy);
minutes later: **0 rows, 0 document rows, 0 storage objects, 0 analysis runs**. That is
acceptance criterion 2 demonstrated in prod rather than in a test.

⚠️ **Correction to an earlier note in this session:** that mid-window row was NOT "manually
removed", and the fix was NOT undeployed — both claims were wrong, drawn from a stale branch
snapshot before checking what `NEW-UI` already contained. The discard did it.

**Guardrails re-run on the merged tree:** `tsc` clean · **4725/4725 unit (437 files)** ·
lint / i18n-changed / utf8 (1837) / encoding / api-auth green.

**Counts (2026-08-20 ~11:25 UTC).** Sentinel-valued policies: **dev 0, prod 0**. Orphaned
storage objects: **dev 34, prod 9** — the prod nine all date from 13–21 July (713–923h old),
i.e. all pre-fix; today's discard left none behind.

⚠️ **Prod orphan cleanup is BLOCKED on a credential, not on a decision.** Removing the bytes
needs `SUPABASE_SERVICE_ROLE_KEY` for the prod project; `vercel env pull` returns empty for
sensitive vars and the CLI has no `env get`. Deleting the `storage.objects` rows over SQL is
**not** an acceptable substitute — it drops the metadata and leaves the file in the backing
store, which is precisely the invisible-personal-data defect being cleaned up. Owner runs:
`set -a; source .prod-db-env; set +a; npm run cleanup:sentinels -- --apply --orphans-only`
(dry-run first; the script refuses to run if DB and bucket resolve to different projects).

⚠️ **Rotate the prod Postgres password.** A working-tree edit had appended the full prod
connection string *with its plaintext password* to tracked `.env.example`. Reverted, never
committed — but it sat in a shared checkout. Also still live: `.env.local` line 16 re-defines
`DIRECT_URL` to prod (dotenv last-wins) while storage/auth stay on dev.

**Next 3 actions:** 1) rotate the prod Postgres password; 2) run the prod orphan cleanup with
the service-role key; 3) fix `.env.local` line 16.

---

## Session wrap — 2026-08-14 (Marketing/auth assessment loop, rounds 12–13)

**Current phase:** shipped to prod. `NEW-UI` @ `b8fbc2f2`, deployed and verified live.

**Rounds 12 and 13 shipped — PRs #278, #279, #280.** Round 12: 7 candidates, 7
confirmed. Round 13: **44 candidates, 36 confirmed, 8 refuted** across six
dimensions (a11y, responsiveness, content/i18n, SEO/AEO, performance, conversion).

**The three that mattered most, all verified on production:**
1. **The cookie-consent banner covered the signup button at every viewport.**
   `fixed bottom-0 z-[120]`, auth card centred in `min-h-screen`, and the pages
   have 158px of scroll at 1280x800 and **zero** at 1440x900 — so no scroll
   position freed it. `/auth/signup` is the destination of every primary CTA, and
   the person seeing the banner is by definition the first-time visitor.
   `.pw-clear-consent` reserves the height the banner already publishes.
   21 blocked combinations → 24/24 reachable.
2. **English visitors were consenting to Greek legal documents.** On the English
   signup page only "sign up as an agent" carried `lang=en`; "Terms", "Privacy"
   and "Log in" were bare hrefs, so the consent checkbox sent them to the Greek
   documents. Fixed across all seven auth pages.
3. **Sign-in's identifier field had no programmatic label** — accessible name fell
   through to the placeholder (`nameFrom: ["placeholder"]`), so voice control
   could not address it and the visible label was not clickable.

Also: the Products mega-menu declared `role="menu"` with no menu keyboard model
(now a plain disclosure, Escape restores focus, focusout closes); the homepage
audience tabs went inert after one arrow press; `/needs` promised six questions
and asked twelve; the homepage Greek H2 was a different claim from the English,
misspelled and in the only informal-singular register on the whole Greek surface;
four auth cards shipped `opacity:0` in the server HTML and were blank until
hydration (LCP 5.2s on slow 4G).

**Guardrail note.** The rounds 6–12 funnel (28 → 12 → 7 → 7) looked like
convergence. It was not — it measured how narrow the briefs were. Widening them
in round 13 took the count from 7 to 36 on the same codebase. A falling finding
count is evidence about the search, not about the site.

**Top risks, ranked.**
1. **No legal entity is named anywhere** on a site selling €2.99–€99.99/month
   subscriptions and collecting insurance documents. Needs real company details
   (name, registration, address) — EU trader-identification duty.
2. `/auth/signup` server-renders only a spinner: `useSearchParams()` inside a
   `<Suspense fallback={<Loader2/>}>` means no form field exists for ~5s on slow
   4G, on the primary conversion endpoint.
3. All 63 English pages server-render `<html lang="el">`; only JS-executing
   clients see `lang="en"`.
4. "AI" carries feminine gender on 53 Greek strings and neuter on 16, across 26
   files. Both are defensible Greek; needs a decision, and it spans app/email/
   legal files outside the marketing scope.
5. `/api/health` is declared `auth: "public"` in the route inventory but is 307'd
   by `proxy.ts`; an uptime monitor pointed at it gets 307 → 200 **of the sign-in
   page** and reports healthy. `scripts/load/public-surface.js` measures that 307.

**Next 3 actions.**
1. Decide the legal-entity details and the "AI" gender convention (both blocked on you).
2. Thread `searchParams` into `app/auth/signup/{policyholder,agent}/page.tsx` so
   the signup form server-renders.
3. Resolve `/api/health`: either allowlist it in `proxy.ts` or correct the
   inventory and the e2e test that currently asserts the opposite.

**Not fixed, by decision:** "platform" / "risk analysis" appear in the site's own
voice sitewide. That conflicts with an explicit instruction to avoid those words,
but it is also a documented, shipped positioning decision (`CATEGORY_NAME`
docblock, `docs/audits/marketing-website-audit-2026-08.md` §2). Flagged, not
overturned.

## Session wrap — 2026-08-20 (PHASE 7 — rule catalogue + Gate 3b apparatus)

Full write-up: `docs/audits/phase7-rule-catalogue-and-gate3b-2026-08.md`. Taking the two
items Phase 6 handed to humans as far as code honestly can, on one distinction:
**detection is factual, severity is an underwriting judgement.**

**Catalogue 4 → 27 rules, 4 → 8 branches** (motor 5, health 4, home 4, motorbike 4,
group_health 3, pet 3, travel 3, life 1). All live in prod, all rule-bearing, **116 fixture
cases** — every rule must prove it stays silent on a field nobody extracted. Three new
branches by two routes: *travel* got the `AcordDataSchema` section it needed (the blocker was
the extraction schema, not the rule engine); *group_health* and *motorbike* needed nothing at
all — they map onto the existing `health` and `vehicle` sections, which the repo's own branch
content files have recorded for as long as they have existed. Nobody had asked.
Motorbike takes four of motor's five rules and **not** glass breakage: the content file
records that telling riders about glass while saying nothing about rider injury was
"actively misleading". New `all_missing` operator so the life-beneficiaries rule needs **both**
paths empty; an empty array counts as absent.

**Deliberately NOT authored:** a `medicalExpensesLimit < 30000` rule. The €30,000 Schengen
minimum is real but externally unverifiable here, and a threshold in detection logic is a
severity verdict wearing a rule's clothes.

**Latent defect found:** four `ai_check` definitions were still `isActive: true` in
`prisma/seed.ts` after Phase 3 deactivated them in prod — the next `db seed` would have
switched them back on, four "active" definitions that can never fire. One was
`home-earthquake`, which is why an audit reported earthquake had no rule. It has a real one
now.

**Gate 3b — still open, now openable.** It needs an underwriter and always did; what was
missing was everything that makes sign-off possible. Now: per-definition validation columns
(dev + prod), a per-definition caveat that fails safe, a real consumer
(`GET /api/v1/policies/[id]/gaps` returns `severity_validated` + `severity_caveat_key`), and
**`docs/reviews/severity-review-packet.md`** — generated from the LIVE catalogue, stating
what each rule asks, the fields it reads, the severity proposed, and the words the customer
sees. Recording an answer is one UPDATE per definition.

⚠️ **Owner action, 1 of 2:** the packet is the deliverable. Owner: licensed underwriter /
ΕΙΑΣ-qualified intermediary. **27 pending, 0 validated.**

⚠️ **Owner action, 2 of 2:** eight branches still have no rules, and it is a domain question,
not an engineering one. Every one of their content files already records that the meaningful
detail arrives as free text (legal expenses: *"scope, waiting periods and limits exist only as
free text"*; boat: *"hull value, navigation area, crew cover… only in the free text"*). The
answerable question is: **for branch X, which three or four facts does a Greek policy always
state?** Given that, the schema section and rules are an afternoon — travel is the worked
example.

Guardrails: `tsc` clean · **4723/4723 unit** · lint/utf8/encoding/i18n/api-auth green.
(`verify:migrations` fails locally on `DATABASE_URL`, identically without these changes.)
Commits `8600a873`, `7c670721`, `a3d7420f`, `+1`.

---

## Session wrap — 2026-08-20 (PHASE 6 iteration 2 — closing the remainders) — **81/100**, loop ends here

Iteration 1 recommended stopping. **Iteration 2 proved that premature**, which is the
useful result:

- **A seventh false public claim, which iteration 1 scored as true.** `/needs` says "six
  questions" and asks **twelve**, across six steps (2,2,1,3,3,1) — in both languages and
  in the SEO metadata. The sweep agent called it "fragile but currently TRUE" by
  conflating steps with questions, and I recorded that **without counting**. Headline now
  derives from `NEEDS_STEPS.length`; pinned by `needs-check.test.ts`. (That guard's first
  version failed on **its own comment** quoting the banned phrase — mention-vs-use, third
  time this programme.)
- **The guard blind spot is closed, not just disclosed.** `policy-authorization-single-path`
  now checks API routes **per HTTP handler** — which immediately caught the `DELETE` in
  `documents/[docId]` hand-rolling its own ownership filter behind a compliant `GET`, now
  on the single path with its deliberate owner-only narrowing kept — and scans the
  **server-action surface** for the first time. All 14 policy-touching actions audited:
  every one authorizes, several deliberately narrower than `getPolicyAccess`, **no live
  hole**; each listed with a reason. Both checks verified to fail against pre-fix source.
  `/trust` copy restored to the wider, now-true claim.
- **`MonetaryLimitSchema.unlimited` → `.optional()`.** `.default(false)` was being
  materialised by the AI SDK into stored data, recording "there is a cap" on every limit
  nobody determined — one rule away from load-bearing.

- **Retention was a disclosure gap, not an enforcement gap.** `TokenUsage`/`ConsentAudit`
  are *deliberately* retained (financial ledger / proof of consent, both documented
  exceptions in the eraser) — purging them on a timer would be the bug. The real defect:
  the privacy table was **silent** about session records and about public-form captures
  (24 months in `FormSubmission`). Both now listed, both locales, and
  `retention-copy-matches-code.test.ts` derives the stated windows from the job's own
  constants. Newsletter row verified correct — Brevo holds the authoritative list; the
  local row is a signup capture, now disclosed as one.
- **Severity caveats closed for every surface that names a severity.** "8 of 11 show no
  caveat" was wrong both ways: two already carried one, two print no severity word at all
  (colour only; `PolicyBriefCard`'s dot is `aria-hidden`). The four that name a severity
  to a person now render a single shared `<SeverityCaveat />` — one component so that
  **Gate 3b sign-off is a one-line change**. Gate 3b itself stays open and human-owned;
  the guard now asserts `SEVERITY_UNDERWRITER_VALIDATED === false`.

**Score 79 → 81** (F: 7 → 9). Gate is 85 and remains unreachable from inside the repo.
**Loop ends here**: every remaining item in the audit's §6 is either an external fact or
Gate 3b, both human-owned.

Guardrails: `tsc` clean · **4605/4605 unit** · lint/utf8/encoding/i18n/api-auth green.
Commits `60c022bf`, `e8ecbd6b`, `155138ff`, `caa15e9e`, `c5279c76`.

---

## Session wrap — 2026-08-20 (PHASE 6 — Adversarial re-score) — **GATE NOT PASSED (79/100)**

Full write-up: `docs/audits/phase6-rescore-2026-08.md`. Three adversarial agents, every
finding re-verified by hand before action.

**Category E failed on entry** — six false or unsupported public claims were live, two
of them created or missed by this loop:

- **`/trust` promised consent-gating that a live path did not do.**
  `app/api/policies/extract/route.ts` sent whole documents to Gemini with **no consent
  check** (bulk upload via `BatchUploadModal.tsx`). Not just a false sentence — an Art. 9
  disclosure without the basis the product claimed to require. **Fixed in code:** same
  `aiProcessingConsentVersion` gate as the deep pipeline, before the body is read, with a
  new bilingual `AI_CONSENT_REQUIRED` failure code.
- **`/platform` denied a behaviour a rule I seeded this phase exhibits.** "A gap appears
  only when the policy says so" is false for `operator: 'missing'`
  (`missing_coordination_centre`). Copy now separates "not recorded" from "not covered".
- **Live authorization hole, Phase-1 class.** `transferCustomer`
  (`lib/services/team.service.ts`) reassigned a relationship but never revoked
  `AccessGrant`s, so a reassigned agent kept `manage` (incl. **delete**) on that
  customer's whole book forever. Phase 1 fixed *termination* and never asked if that was
  the only way a relationship ends. Now atomic; pinned by
  `tests/unit/access-ends-with-relationship-change.test.ts`, **verified to fail against
  the pre-fix source**.
- **Self-inflicted regression:** removing `isDetected` in Phase 3 silently emptied the
  gap section of every branded/savings report and every run-to-run diff. Both now read
  the rule-decided set (`GapInstance` rows / new `decidedGapSlugs`). Dropping the filter
  would have been worse — `gapResults` is AI prose, not a detection list.
- Also: export-exclusion list corrected (advisor MEDIC data **is** exported), 1-hour
  signed URL cut to 5 min, CI-guard claim narrowed to what it scans, **Sentry disclosed
  as a subprocessor** (it was receiving scrubbed events undisclosed), dead
  `lib/honest-copy.ts` deleted.

**Score 79/100. Ceiling without new external facts ≈84 — the gate (85) is not reachable
from inside the repo.** Blocking facts, in order: underwriter validation of severity
(Gate 3b), a broader authored rule catalogue (**4 rules cover 4 of 16 branches**), ΓΕΜΗ
seat confirmation, court-venue decision, at-rest encryption attestation.

~~**Recommendation: stop the scoring loop at iteration 1 of 3.**~~ **Superseded** — see the
iteration-2 wrap above. Iteration 2 was not rewording: it found a seventh false claim this
wrap had scored as true, and closed the guard blind spot below.

**Known remainder, ranked #1 for the next security pass:** the authorization guard scans
`app/api` only, per-file not per-handler, and **not server actions** — three already
hand-roll their own checks (`agent/actions.ts:1629`, `coverage-insights/actions.ts:36`,
`wallet/actions.ts:1614`). All currently narrower than `getPolicyAccess`, none exploitable
today. Guardrails: `tsc` clean · **4590/4590 unit tests** · lint/utf8/encoding/i18n/api-auth green.

---

## Session wrap — 2026-08-20 (PHASE 5 — Trust & platform surface) — **GATE PASSED**, committed `8629e04f`

**`/trust` and `/platform` shipped** (+ `/en` mirrors, registry-derived so sitemap and hreflang
follow). One rule: every sentence describes what the code does today, with the citation in a
comment beside it. **No DPIA section — none has been carried out**, so per the hard constraint
it is BLOCKED-ON-FACT and stays unwritten. No certification badge, no "bank-grade" anything.

**The neutrality pledge is now a CONTRACTUAL TERM** — Terms §3, both locales: *we do not sell,
share, or transfer policyholder or portfolio data to insurers, banks, or third-party agencies*,
with the one honest carve-out (the advisor you connect yourself). Inserting it renumbered the
ten following sections in both languages.

**Deliberately narrower than a reader expects, twice:** access control says the check happens
in the **application** and that a CI test fails if a route bypasses it — it does **not** claim
database-enforced isolation, because Phase 1 proved there is none. And portability **lists what
does not come out** (payment methods, session/security records, the who-viewed-your-data
history, usage metering, advisor notes).

**`/platform` states its own limit:** the rules cover what someone has written a rule for, not
every gap in every branch. A page that explains a method and hides its boundary is an advert.

**AI incoherence resolved by naming it.** "AI" appeared **26 times in SEO metas and in zero of
the 16 product pages' visible copy** — so the first place a visitor learned a model reads their
document was the consent dialog. `/product` now says it in one sentence, with its limit, linking
to `/platform`.

**Checked and NOT changed:** `/compare` already bridges to the advisor (*"you go to your agent
knowing what to ask"* + *"that is why we also built tools for agents"*) — the channel-hostility
concern is already answered. The insurer reference data is claimed **nowhere** publicly, and the
`/platform` source records why it must stay that way.

**Two repo guards caught me and were right** — descriptions over the 160-char budget, and Title
Case in Greek. Fixing the latter surfaced two genuine detector gaps: `;` is the Greek question
mark and restarts a sentence, and `Παρίσι` is a proper noun like the `Αθήνα` already allowed.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1823 · i18n pass ·
**4584/4584 tests (434 files)**.

**BLOCKED-ON-FACT (unwritten, not claimed):** DPIA; any certification/attestation; database-level
isolation; "complete" export.

**Next:** Phase 6 — re-score against the red-team rubric, re-verifying in code rather than
trusting this loop's own claims.

## Session wrap — 2026-08-20 (PHASE 4 — Regulatory identity & truth defects) — **GATE PASSED**, committed `b3e4a329`

Report: `docs/audits/phase4-regulatory-truth-2026-08.md`.

**The entity is published.** «Insurance Martech Ι.Κ.Ε.» / Insurance Martech IKE, ΓΕΜΗ
188863359000, ΑΦΜ 302659440 (ΔΟΥ Χίου), seat Εντός Οικισμού Καλαμωτής, 82102, Χίος — on the
footer, Terms §1 and Privacy §1, both locales, from one source. Values verified against commit
`ec9d5f81`, which still carries the pre-suppression file headed *"These are the REAL corporate
registry values"*; **its ΓΕΜΗ matches the number the owner supplied independently.** The
concealment guards are **inverted** — the clauses must now contain name/ΓΕΜΗ/seat/ΑΦΜ, and no
"available soon" placeholder may survive.

**Deliberately NOT restored: the court venue.** The old record named the courts of Chios and
`law_venue` renders that field; restoring it would narrow where a consumer's dispute is heard
from "the courts of Greece" to the company's own island. That is a contract change, worse for
the consumer, and nobody asked for it. **Owner/legal decision.**

**Truth defects — all were still live, all fixed:** "Bank-grade security" (no attestation
behind it) → AES-256; "Takes 90 seconds" removed; bulk import said **50 files, which matches no
tier** (10/100/500/∞) → 100; Greek hero promised gap-finding without the Plus attribution the
English carried — and Greek is the binding language; the free-tier promise was hand-typed in
**17 files** → single-sourced; `/api/health` allowlisted (probes were getting a 307 to signin);
dead `/workbox-` removed.

**The guard that should have caught two of these scanned `app/(public)` only** — which is how
false claims lived on the signup and password-reset screens through a marketing audit that
closed with three consecutive zero-finding rounds. It now scans `app/auth`.

**DSR copy matches the machine:** export is immediate but **not complete** (payment methods,
session/security telemetry, the access-audit trail, usage ledgers, agent-authored records are
excluded); deletion is a **request** an admin executes within the statutory month. Chose
request-and-fulfil over automating an irreversible action. "Entire" appears nowhere. Greek
Terms/Privacy confirmed available.

**DSR DRILL RUN AND PASSED — 13/13**, 2026-08-20, dev project (the script refuses prod). Real
`eraseUserData` against a full PII footprint: auth identity deleted, storage PDF removed, Art. 9
profile scrubbed, consent row kept with IP scrubbed, export payload purged, **idempotent
re-run**. First post-remediation drill on record — the July doc describes the pre-fix state. It
also exercised the Phase 1 additions with no FK failure.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1822 · i18n pass ·
**4574/4574 tests (434 files)**.

**Not claimed:** that a grep of *every* numeric/superlative claim across ~120 public URLs in two
languages returns only traceable ones. I fixed the enumerated defects and widened the guard;
a full sweep is a separate audit. **The seat could not be confirmed against ΓΕΜΗ from here** —
it was live until 2026-07-22 and is internally consistent (ΔΟΥ Χίου matches); owner to confirm
it is current.

**Next:** Phase 5 (trust & platform surface) — now unblocked, since Phases 1–4 have all passed.

## Session wrap — 2026-08-19 (PHASE 3 — Gap engine) — **GATE 3a PASSED / 3b BLOCKED**, committed `92fdd155`, `480a082e`

Report: `docs/audits/phase3-gap-engine-findings-2026-08.md`.

**A coverage gap was a model's opinion wearing a severity badge.** Detection came from
`gapResults[].isDetected`, a boolean the LLM chose. Severity came from a hardcoded `"medium"`
at the write site, or from a `low|medium|high|critical` enum the clarity pass emitted **with no
rubric anywhere in the prompt** — and because gap_detection merged first, the literal silently
overrode the clarity value for any slug both flagged.

**Worse: the model authored the catalogue.** When clarity emitted an unknown slug, the
orchestrator CREATED a `GapDefinition` from model output. In prod that ran to completion —
**41 of 41 definitions AI-authored, 35 active**, none with evaluable logic. The drift is
visible: `cyber_risk_gap` (critical) / `cyber_liability` (medium) / `cyber-risk-gap` (medium)
are one risk under three spellings and two severities; `mental_health_exclusion` high vs
`mental-health-exclusion` medium. What a customer was told depended on the model's spelling.

**Now:** `decideGapsForPolicy` evaluates rules against the fresh `AcordData`; severity is the
definition's; the model is handed an existing gap and asked only to word it. `isDetected` and
`severity` are **deleted** from the interface, all three providers and the mock — not ignored.
The mint site is gone. Provenance (`ruleId`/`ruleInputs`/`engineVersion`) is persisted.
The dead third pipeline (`GapAnalysisService.analyzePolicy` + its unimported action) is removed.

**A defect underneath that would have made rules untrustworthy anyway:** `AcordDataSchema` had
`.default(false)` on six coverage booleans, and the SDK materialises defaults — so "the
extractor never mentioned leishmaniasis" was stored as "not covered", and `is_false` read
`!actual`. Unknown is representable now; only explicit `false` is evidence of absence. The
evaluator had **no executable test** before (only source-text regex); it has 15.

**Gate 3b:** `lib/gaps/severity-display.ts` is the single primitive — label, neutral tone,
rank, and the mandatory caveat, with one flag to drop it when an underwriter signs off.
Eleven surfaces still hand-roll severity (eight with no caveat) and are listed as **debt with a
ceiling** in a red-green-proven guard.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1818 · i18n pass ·
**4573/4573 tests (434 files)**. Migrations applied to prod + dev.

**⚠ Consequence, stated not buried:** prod's 41 AI-authored definitions are now **deactivated**
(they can never fire by construction), so **production produces no coverage gaps at all** until
a rule-bearing catalogue is seeded. `gap_instances` was already 0, so nothing was taken from a
user — but the capability is dark. Of ~78 AI-observed gap concepts, rules can decide a handful;
several branches (liability, income protection, group life, legal expenses, personal accident)
have **no typed `AcordData` section at all** to write a rule from.

**Not done:** a live three-gap trace — there is nothing to trace against until a catalogue is
seeded. "One path" is partial: `process-policy` and the manual refresh still call the older
entry point, though both now share the evaluator.

**Next:** seed a rule-bearing gap catalogue (owner + underwriter input), then Phase 4.

## Session wrap — 2026-08-19 (PHASE 2 — Accountability: make access observable) — **GATE PASSED, committed `d795ec05`**

Report: `docs/audits/phase2-accountability-findings-2026-08.md`.

**Every mutating admin action logged; reads did not.** The sharpest case:
`getUserDetails` pulled the whole `policyholderProfile` — chronic conditions, family medical
history, smoking status, income, mortgage — for any customer and wrote **no audit row**. It
was also **pure over-fetch**: its only caller reads 17 fields, none from that relation. So
every customer's health record was loaded into an admin page render and discarded. The
relation is gone; what remains is logged. **Minimise first, then log** — logging access to
data you never needed is the worse repair.

**A correction to my own Step 0, caught by the compiler.** I claimed the advisor playbook was
the same over-fetch ("uses only `profile.ownsHome`"). Wrong — `toLifeContext` consumes
`chronicConditions` and `familyMedicalHistory`. My narrowing would have been a silent
behaviour change; `tsc` rejected it. It is a **genuine Art. 9 read** and is now audited and
flagged instead.

**The right-of-access index backed nothing.** 18 `activityLog.create` sites, only 3 set
`targetUserId` — and **neither shared helper could**, so 15 structurally couldn't name the
subject. `logAdminAction` takes it now; new `logAdminRead` records subject + field **scope**
(classes, never values) + `specialCategory`. Nine read paths instrumented.

**Retention had the matching flaw:** the 5-year window keys on `metadata._audit`, which only
`logAdminAction` stamps — so read-access rows fell into the 12-month bucket and the
right-of-access trail expired four years before the admin-action trail for the same class of
event. Rows naming a subject are accountability records now; the short sweep is their strict
complement.

**`isBreakGlass` dropped** (migration `20260819120000`, applied to **prod and dev** via
Supabase MCP). One writer — a user filing their own deletion request, the opposite of an
emergency override — and zero readers. A column promising a control that doesn't exist reads
as evidence of one.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1816 · i18n pass ·
**4551/4551 unit tests (432 files)**. New guard `tests/unit/admin-reads-are-audited.test.ts`
**red-green proven**. Retention **observed to have run in prod** (an export payload purged
after expiry — and an earlier "unpurged payload" finding of mine was a SQL-NULL vs JSON-`null`
artifact, discarded).

**Two exclusions stated, not papered over:** (1) ~14 cron jobs still record only "the job ran",
never which subjects they touched — per-subject rows for a bulk sweep is the wrong design;
(2) in prod, all 60 `AGENT_VIEWED_CUSTOMER` rows lack `targetUserId` despite the code setting
it since 2026-07-17 — likely branch divergence; **confirm which build prod runs before
trusting any right-of-access report.**

**BLOCKED (owner/DPO):** notifying subjects of admin access (`registry.ts:1295` — deliberately
a policy decision); disclosing `ActivityLog` in the Art. 15 export; ratifying the 5-year window
for read-access rows.

**Next:** Phase 3 (gap engine — make "rules decide" true). `gap_instances` is 0 rows in prod,
so truncate-and-regenerate is free.

## Session wrap — 2026-08-19 (PHASE 1 — Security: authorization consolidation) — **GATE PASSED, committed `0ddb7605`**

Report: `docs/audits/phase1-authorization-findings-2026-08.md`. Every claim carries file:line
or a named prod query.

**⚠ This work was written on 2026-08-14, DESTROYED by a working-tree revert, and re-applied
on 2026-08-19.** The untracked files (guard test, audit docs) had never been staged, so git
could not recover them. It is now **committed**. In this shared tree, uncommitted security
work is not work — commit before handing off.

**A live IDOR, fixed.** `lib/agent-visibility.ts` granted sight of any policy where
`createdByUserId` matched, with **no relationship-status check**; termination revokes grants
but cannot revoke immutable history. A dismissed agent kept seeing every policy they had
uploaded for that customer across 15 files — including `branded-report`, which serves the
analysis itself — while `relationship-actions.ts:10` promised access had stopped.
`lib/policy-access.ts:140-141` had it right all along. **Live prod exposure: ZERO** (the one
terminated relationship's former customer owns 0 policies), so no data remediation.

**More severe:** `redeemInvite` was an **exported** function in a `"use server"` file taking a
caller-supplied `userId` with **no auth at all** — an unauthenticated path that consumed
invites and wrote AccessGrant/CustomerRelationship rows. Now session-derived. (A subagent had
called this flow SAFE by reading only the page caller, never the export.)

**Also:** `createUserTask` status filter and `requestAiConsent` scope filter (both claimed by
their own comments, neither implemented); orchestrator accepted a bare relationship to read
document bytes and spend tokens; **7 routes consolidated** onto `getPolicyAccess` (also
un-breaking grant-holding advisors); **441 lines of dead duplicate authorization deleted**.

**Erasure guard blindspot closed** — detection now derives User FKs from `@relation` shape,
not 5 hardcoded names, surfacing **8 invisible models**. Two leaked real subject data and are
now erased + exported; six exempt with verified reasons (`CollaborationParticipant`'s old
reason was factually false — threads are never deleted).

**Verified:** tsc clean · ESLint 0 · audit:api-auth 0/0/0/0 · utf8 1814 · i18n pass ·
**4538/4538 unit tests (431 files)**. The new guard is **red-green proven** and was hardened
mid-verification after a probe slipped through on a *comment* mentioning `getPolicyAccess`.
Cross-tenant checks are proven at the decision layer, **not** as live two-session HTTP calls.

**Premise corrections (do not re-inherit):** "Zero registered users" is **false** — prod has 5
auth users, 12 DB rows, 2 policies, 11 storage objects, and `pkaragian@outlook.com` is an
external person owning a policy. `gap_instances` **is** 0, so Phase 3 truncate is free. GO #1's
trio was **never in prod**; the real find was `e2e-money@policywallet.test`, **purged**
(survived the revert — it was a DB change). Storage is **healthier than documented**: all
buckets private with the July limits applied and **no SELECT policy**, so stored URLs are
inert — the feared unauthenticated PDF IDOR does not exist. **One migration unapplied in prod**
(`drop_dead_protection_score_history`), leaving a dead table with 3 rows of per-user scores
outside the DSR export path — Phase 2/4.

**Next:** Phase 2 (accountability) — log admin reads incl. `getUserDetails`; give
`isBreakGlass` a real semantic or remove it (one call site, on user-initiated deletion).

## Session wrap — 2026-08-14 (A failed upload must not leave a half-created policy behind)

**Current phase:** built on `feat/marketing-site-overhaul`, uncommitted. Full guardrail gate
green (audit:api-auth, lint, lint:i18n-changed, lint:utf8, type-check, **4,528 unit tests /
430 files**, production build). No migration, no schema change.

**The bug as reported.** A wallet upload writes the policy row *before* extraction knows
anything, filling the NOT NULL identity columns with placeholders. When analysis never
completed, those survived at `action_needed` and the wallet notice strip printed them raw:
"Αυτοκίνητο · **__PENDING_EXTRACTION__**: λείπουν στοιχεία από το έγγραφο."

**What the investigation actually found — three sentinel sources, not one.** Besides the add
form (`AddPolicyClient.tsx:100/103`) and `uploadAndParse` (`policy.service.ts:353/365`), **the
AI providers substitute `Unknown Insurer` / `PENDING-<epoch>` for an empty extraction on a
SUCCESSFUL run** (`gemini|anthropic|openai-ai.service.ts`), and `buildMetadata` keeps whatever
is stored when the evidence gate rejects a document. So a placeholder reaches perfectly healthy
`active` policies, and discarding failed ones does **not** close the hole on its own.

**Two more holes found on the way.** `runBackgroundAnalysis` awaited `extractBasicSummary` and
**threw the result away** — for every free/Starter user (the majority tier) a failed or
consent-blocked parse left the policy stuck `analyzing` forever, with nothing said. And process
death (`LEASE_EXPIRED`) had no discard path at all.

**Three dispositions, deliberately not collapsed into one.**
- **DISCARD** (technical: provider error, unreadable document, timeout, dead executor) on a
  policy whose identity is *entirely* placeholder → row, document rows and bucket objects all
  removed. **Storage first, database second**: an object that outlives its row is personal data
  no GDPR export can see, so a failed storage delete ABORTS the discard and keeps the row.
- **KEEP** — the same technical failure on a policy someone typed an insurer into is kept and
  marked `action_needed`. A provider timeout must not delete an agent's work.
- **INFORM** — quota / consent / permission never started the run: the upload is kept and the
  reason is said in Greek, from a stable code (`TOKEN_LIMIT_BLOCKED`, `AI_CONSENT_REQUIRED`,
  `ANALYSIS_NOT_PERMITTED`) the UI localizes. Silently deleting a quota-blocked file would make
  the product look broken.

A **96% (`completed_with_warnings`) run is still a success** — verified nothing anywhere
thresholds `overallSuccessPct`, and nothing was added that does.

**The sentinel is now unrenderable, centrally.** `lib/wallet/policy-identity.ts` is the single
owner of the literals (~20 unguarded surfaces adopted it; the 5 divergent inline copies were
replaced), `resolveInsurerDisplay` resolves a placeholder to `""`, and `emit()` scrubs every
notification title/message/subject as a backstop. A repo-scan test fails CI if any file outside
the primitive and the three writers learns the strings again.

**Storage rollback on the create path.** `createPolicy` now removes client-uploaded objects on
every non-persisting path (cap hit, Zod throw, rejected extension, over-cap, transaction
failure) — previously all of them orphaned.

**Counts measured today.** Sentinel-valued policies: **0 in dev, 0 in prod**. Orphaned storage
objects: **34 in dev, 9 in prod** — nine real customer PDFs in production reachable by no
export and no erasure request. `scripts/cleanup-sentinel-policies.ts` (`npm run
cleanup:sentinels`) reports them; **the prod cleanup has NOT been run — it needs the owner's
go-ahead.**

**Environment hazard found and guarded.** `.env.local` declares `DIRECT_URL` twice — dev first,
**prod second** — and dotenv keeps the last, so `npx tsx -r dotenv/config …` reads **production
Postgres** while the Supabase client talks to the **dev** bucket. The cleanup script hard-refuses
to run when the two refs disagree. Any new destructive script should copy that guard.

**Next 3 actions:** (1) decide on running the prod orphan cleanup; (2) fix the duplicate
`DIRECT_URL` in `.env.local`; (3) E2E the upload-failure path locally before merging.

## Session wrap — 2026-08-13b (Feature flags: the automation console's one missing pillar)

**Current phase:** built and gated on `feat/marketing-site-overhaul`. **The migration is
NOT applied to any environment yet** — see "What is left" below.

**The audit first.** Measured against the automation-console brief, this product already has
almost all of it: business events (`/admin/automation/events`), notification/email/push/in-app
templates with preview + test + clone + version, automation rules, **retry rules** and
**escalation rules** (`NotificationRuleOverride.retry*` / `escalation*`), coverage-gap rules
(`/admin/gaps`), AI rules (`/admin/ai/*`), schedules with pause/resume/run-now, queues,
localization, analytics, notification history, automation logs and delivery failures. Every
verb in the brief except one was already wired.

**Feature flags were the gap — and they already existed, as environment variables.**
`FF_AI_FAILOVER_OPENAI`, `FF_AI_DEGRADED_COMPLETION`, `FF_AI_REMEDIATION_ALERTS`,
`FF_AI_REMEDIATION_CANARY_MODE`, `AI_ALLOW_FULL_FAILOVER`, `ENFORCE_EMAIL_VERIFICATION`,
`EXTRACTION_CITATIONS`, each read straight from `process.env` at the call site. They work.
What they cannot do is change: a flip means editing the Vercel environment and redeploying,
so the one control you reach for while production is misbehaving costs a build.

**What shipped.** `FeatureFlag` + `FeatureFlagRevision` (migration
`20260813210000_feature_flags`, additive, new tables only), `lib/flags/registry.ts` (the
catalog), `lib/flags/config.ts` (the resolver), `lib/admin/flag-admin.ts` (pure form logic),
and `/admin/automation/flags`. Precedence on read is **override → environment variable →
the default declared in code**, so no row, or an unreadable database, leaves the product
behaving exactly as it shipped. `withCache` was extracted from `lib/notifications/config.ts`
to `lib/cache/tagged-cache.ts` so both loaders hold one contract rather than two.

Three rules keep it honest:
1. **A flag must be declared in code next to the call site that reads it.** A row for an
   undeclared key is inert. Operators tune flags; they cannot mint one, because a switch
   wired to nothing looks like control and isn't.
2. **NULL is "fall through", not "off".** Clearing an override restores what the deployment
   says. Collapsing those two is how someone disables a feature believing they undid a change.
3. **`extraction.citations` is listed read-only.** It is read synchronously while building the
   extraction prompt and response schema, so moving it into the database would make prompt
   construction async — a change to the extraction contract on the money path, which does not
   belong in an admin-console change. It is shown so its production value is *visible*
   (it IS set in prod), with the reason stated on the card.

**Wired, not decorative:** `remediation-policy.ts`'s five predicates now read the flag layer
(async; callers in `policy-analysis-orchestrator.service.ts` updated), and
`emailVerificationRequired` too. Checked prod env before touching the latter:
`ENFORCE_EMAIL_VERIFICATION` is **not set in production**, so the switch to a slightly wider
boolean parser cannot flip the gate on and lock unverified customers out.

**Also fixed on the way past:** the automation hub had a card titled "Feature flags &
settings" pointing at `/admin/notifications`, which has no flags — that is what sent someone
looking for a flag to the wrong page. It is now "Notification settings", with the real flags
card beside it.

**Verified.** 4,464 unit tests (426 files) green, +19 new pinning the precedence contract.
Full guardrail gate green: `audit:api-auth` 101/101, `lint`, `lint:i18n-changed`,
`lint:utf8` 1806 files, `type-check`. New E2E `tests/admin-feature-flags.spec.ts`, 6/6 under
`admin-chromium` — and deliberately passing in the **degraded** state, i.e. with the table
absent, which is the window this has to survive.

**Protection score rules are no longer hardcoded.** `lib/events/decision-engine.ts` judged
against literals — `current < 40` for the score band, `severity === "critical"` for gap
routing — so moving where "the lowest band" starts, an editorial judgement about Greek
customers rather than a constant, took a deploy. `EventContext` now carries a
`DecisionThresholds` object fed from the EXISTING `NotificationSetting` registry (which
already had a `thresholds` group and an admin surface), via two new settings:
`threshold.protectionScoreLowBand` (40) and `threshold.advisorTaskOnHighGaps` (off).
`DEFAULT_DECISION_THRESHOLDS` reproduces the old literals exactly, and `toContext` defaults to
them, so an empty, unreadable or unmigrated settings table decides what the engine always
decided. The hub gained a **Protection score rules** card showing the live band and deep-
linking to the anchored group.

The engine is still NOT a rules DSL, deliberately. Only numbers and switches moved; the rules
stay TypeScript, because a rule can say "critical, and only when the customer has an advisor
who can act on it" and a table cannot. One floor is deliberately not tunable: a **critical**
gap always reaches a human regardless of the setting — an operator quietly switching that off
would be a defect, not a preference.

**Dead letters can be revived.** Verifying the brief's action matrix rather than asserting it
turned up a real hole: `/admin/automation/queues` counted dead deliveries and stated they "do
not resolve on their own", then offered nothing — a diagnosis with no treatment. A delivery is
parked after 5 attempts with `nextAttemptAt` null, and the sweep only selects
`attempts < MAX_ATTEMPTS`, so it stays parked for ever; behind each row is a notification never
sent or an advisor task never raised for a critical gap. The page now lists them with event,
subscriber, attempts and the killing error, and a per-row Retry. `lastError` is kept on revive
(it is the most useful thing on the row until the retry succeeds) and the action refuses
anything not already dead, so a live delivery cannot be handed a fresh five tries against a
subscriber that is currently failing.

`lib/admin/flag-admin.ts` shipped untested in the flags commit; now 14 cases. Writing them
found a wording defect that would have appeared in every audit log entry ("Set Remediation
audience audience to 50").

**"Version" now holds for AI Rules too.** `aiPromptOverrideRevision` had been written on every
save since that page shipped and read by nothing, so the history existed in the database and
was invisible to the operator — for the setting that changes what the model is told about a
customer's insurance contract, which is the first thing anyone asks about after a bad
extraction. `/admin/ai/prompts/[overrideId]` now renders it in the same shape as templates and
rules. (An earlier draft of this note also claimed `planRevision` was unsurfaced; that was
wrong — `/admin/plans/[planId]` has always rendered it via the `revisions` relation, which is
why a grep for the model name missed it.)

**What is left — needs a decision, not more work:**
1. **The migration is unapplied**, on dev and prod both. Applying it was blocked here (both
   the raw-DDL script and Supabase MCP `apply_migration` were refused by the permission
   classifier). Until it runs, the flags console renders read-only with a banner saying
   exactly that, and every flag resolves through the environment as it does today. Both new
   DB reads degrade rather than throw, so **code and migration can land in either order** —
   there is no deploy-ordering trap. Note the threshold work above needs NO migration:
   `NotificationSetting` already exists.
2. **Not merged to `NEW-UI`**, which is what deploys production on CI-green.

**Next 3 actions:** 1) apply `20260813210000_feature_flags` to dev, then prod (Supabase MCP
`apply_migration` + a manual `_prisma_migrations` row — the Prisma migrate CLI cannot reach
this database); 2) merge to `NEW-UI` when ready, checking first which branch/sha the live
deploy is on, since parallel sessions share this prod alias; 3) next candidates for the same
treatment: the dunning ladder's attempt counts and the renewal-window day counts, both still
literals in the decision engine.
**Last updated:** 2026-08-13

---

## Session wrap — 2026-08-13 (E2E audit re-anchored; all three role sessions verified green)

**Current phase:** `feat/marketing-site-overhaul`, three commits (`11610540`, `f53c2978`,
`b58b82cc`) — **not pushed**. `ui-quality-audit` now runs per session against measured
coverage floors instead of one 75%-of-all-routes fraction, which used to fail on branches
that changed nothing.

**Verified green today, full sweeps on current HEAD:**

| session | routes fully scanned | redirected | overflow / touch / a11y / runtime | verdict |
|---|---|---|---|---|
| `chromium` (policyholder) | 71/94 (floor 71) | 23 | 0 / 0 / 0 / 0 | ✅ 15.2m |
| `agent-chromium` | 79/94 (floor 79) | 15 | 0 / 0 / 0 / 0 | ✅ 17.2m |
| `admin-chromium` | 95/108 (floor 95) | 13 | 0 / 0 / 0 / 0 | ✅ 18.6m |

**All three sessions green — the first time every role's surface has passed on one HEAD.**
Route accounting closes in all three (71+23=94, 79+15=94, 95+13=108) — no route left a sweep
silently. Each landed exactly on its floor, which is what the floors were measured from.
Baseline before `b58b82cc`: agent 10 touch + 18 a11y + 5 runtime; admin 46 touch (26
distinct) + 18 a11y + 1 runtime; chromium's own run never finished (see below).

**The admin-console "touch target" findings were never defects.**
`/admin/billing-reconciliation` (9–13×24), `/admin/insurers` (16×24) and `/admin/partners`
(11×24) are all `<input type="checkbox">` inside a `<label class="flex items-center gap-2">`
that wraps the text as well — clicking anywhere in the row toggles them, so the row IS the
target. The label rule added in `b58b82cc` exempts them correctly.

**The 75-minute budget was the fix it looked like.** The policyholder sweep had never
finished: its 14:45 run hit the then-45-minute budget at route 80 and named 14 routes as
never loaded (61/94 scanned), which is what prompted the raise in `b58b82cc`. Re-run tonight
on the raised budget it completed in **15.2 minutes** and reached all 71 — including the
alphabetical tail it had been dying in (`/product/pension` … `/wallet/add`, of which
`/wallet`, `/tasks`, `/renewals`, `/questionnaires`, `/upgrade` are role-dependent and so
had never been audited as a policyholder sees them). The 45→75 change bought headroom that a
warm `.next/dev` cache then made unnecessary; keep it anyway, since a genuinely cold sweep is
the case it exists for.

**`P1017` is the flake to expect here.** The agent sweep's earlier
`PrismaClientKnownRequestError` on `/dashboard/agent` (`getRecentNotifications` →
`getAuthenticatedUserOrNull`) is the remote dev DB closing an idle connection during a
30-minute sweep; it did not recur today. A red agent run on that line alone is the
environment, not the page.

**Next 3 actions:** 1) run the CI guardrails (`audit:api-auth`, `lint`, `lint:i18n-changed`,
`lint:utf8`, `type-check`, unit tests, build) and push the three commits; 2) the E2E audit is
now only meaningful as all four projects together — `--project=chromium --project=agent-chromium
--project=admin-chromium --project=sentry`, ~50 min warm; treat a single-project green as
partial; 3) unchanged from below — the seeded prod accounts still need deleting.
**Last updated:** 2026-08-13

---

## Session wrap — 2026-08-12 (Settings rebuilt: sub-routes, honest controls, one preference surface)

**Current phase:** built and gated. 4,390 unit tests, full guardrail gate and production
build green. Zero axe violations across all six settings routes at 375px and 1440px; zero
horizontal overflow at 320/375/390/430/768/1024/1440.

**What changed.** `/account` went from one route with three React-state tabs to a settings
shell with five real sub-routes (`/profile`, `/plan`, `/security`, `/notifications`,
`/privacy`), each with its own loading and error boundary and a focused loader in
`app/(protected)/account/data.ts`. Desktop gets a persistent rail with per-section
descriptions; mobile gets index → detail with a back header, switched in CSS. `/agent/settings`
renders in the same shell, so an advisor sees one settings IA. Legacy `?tab=` links redirect
(`lib/settings/sections.ts`), and the email footer now points straight at
`/account/notifications`. New shared primitives: `ui/form/Switch`, `settings/SettingsShell`,
`SettingsNav`, `SettingsSection`, `SettingRow`, `InlineEditRow` (idle→editing→saving→saved→
error, inline not toast).

**The honesty pass — controls removed because nothing backed them.** `ActiveSession` is
written **only in `prisma/seed.ts`**, so the "active sessions" list was always empty and
"sign out everywhere" deleted nothing and revoked no Supabase session; it now calls
`signOut({scope:'others'|'global'})`, which is real. The audit trail hardcoded device
"System", location "Unknown" and `success: true`, and had no label for `login_success` —
**the only login event anything writes** — so every sign-in printed the raw key to the user.
`Invoice` and `PaymentMethod` are written nowhere outside the seed (the invoice table and
saved-card panel could never fill); billing now points at the Stripe portal, where they
genuinely live. Also removed: always-zero wallet credits, the always-empty `usageMetrics`
block, a "Download report" button with no handler, an unrendered phone-edit state, and a
`mobileProps` prop costing two DB queries plus a full policy mapping that no component read.

**New capability wired to existing backends.** Change password (the `updatePassword` action
had worked with no UI for months — now behind a current-password re-auth and a rate limit),
phone editing, and consent history from `ConsentAudit`, which has recorded every acceptance
since launch and had never been shown to the person who gave it.

**Notification preferences consolidated.** `/notifications` shipped a second, contradicting
preferences UI whose catalog listed `pending_questionnaire` and `policy_reviewed` (no sender
reads either) and exposed `renewal_milestone` standalone while the settings group governs it —
so a stream switched off in one screen could be half-revived in the other. It now owns history
only; the sender registry is the single catalog.

**Latent CSS bugs fixed on the way past:** `.pw-btn` is not defined in `globals.css`, so the
quiet-hours and push buttons **inside Settings** rendered with no fill or radius
(`RiskReviewCard` too); `arc-text`/`arc-text-muted` were deleted from the stylesheet but still
used in `TokenUsageCard`, flattening its hierarchy.

**Open — owner decisions, not blockers:** email change still takes effect with no verification
(`email_confirm: true`); the UI now states the consequence and confirms, but auth is unchanged.
`wallet/[id]` still advertises a "free full analysis" that no code grants
(`aiAnalysisPerMonth: 0` on free/plus, `FREE_LIFETIME_QUESTIONS = 0`) — not surfaced in
Settings, worth fixing at the source.

## Session wrap — 2026-08-11 (Document storage: bulk-uploaded policies had no document at all)

**Current phase:** fixed and tested. **4,296 unit tests** pass (+20), all guardrails
green. **Not committed.** ⚠ **A production migration is required BEFORE deploy** —
see below.

**The finding, from production data.** Seven policies have no source document.
Not a corrupted link — no `policy_documents` row and no stored object. Every one
was created through bulk upload, and the timestamps line up exactly with the
batch-create runs (`14:50:28.499 → 14:50:30.665`, plus the single-file batch at
`08:50:02`). The three policies that DO have documents all came through the
single-upload path. Cause: `/api/policies/extract` read the bytes, sent them to
the model and dropped them; `batch-create` wrote a Policy row and nothing else.

**Second defect.** `PolicyDetailsClientView.handleDownloadPrimaryDoc` called
`window.open(document.fileUrl)` — a `getPublicUrl()` link into the PRIVATE
`policies` bucket. Storage answers 400. The page's primary "open my document"
action could never have worked, and it put a storage URL in the markup on the way
to failing. (The documents card beside it has always used the authorized
endpoint; this one button did not.)

**What was already right, and was left alone:** opaque UUID storage keys on both
upload paths, all three buckets private, original filename preserved in
`file_name`, `document_hash` populated, `deletePolicy` removing storage objects,
and the retrieval endpoint's authorization (`getPolicyAccess` + policy-scoped
lookup + short-lived signed URL + `no-store`).

**Changes**
- Bulk upload now attaches each file to the policy it became, via the existing
  per-policy documents route — no second upload path, and bytes are only sent for
  a file that already has a policy to own it, so nothing is orphaned.
- `storage_bucket` / `storage_key` / `mime_type` / `document_kind` / `version` /
  `superseded_by_id` on `policy_documents`, so retrieval stops re-deriving the
  object path by regex over the URL. Legacy rows fall back to the URL parse.
- The policy page shipped every document column to the browser (`fileUrl`,
  `storageKey`, uploader id, cached extraction). Narrowed to display fields.
- Retrieval failures now distinguish object-missing from misconfiguration, and
  render a readable page instead of a JSON blob in a browser tab.

**⚠ Deploy order (hard requirement)**
`20260811120000_policy_document_storage_keys` is applied to **dev only**. The new
code writes these columns, so deploying before the prod migration breaks every
document write. Apply via Supabase MCP to `cquudefwfwrmvpftuhyl` + the manual
`_prisma_migrations` row (the Prisma CLI cannot run here — `DIRECT_URL` is the
transaction pooler). The backfill expression was validated read-only against all
three production rows first.

**Top risks ranked**
1. The prod migration above, un-applied.
2. The 7 existing document-less policies are not repaired by any of this — the
   source PDFs were never stored, so there is nothing to recover. They need
   re-uploading by hand.
3. Document upload for a bulk batch re-sends the bytes once. Correct and
   orphan-free, but it doubles upload traffic for saved files.

**Next 3 actions:** apply the prod migration; commit and open a PR; decide what to
tell the affected user about the seven policies.

## Session wrap — 2026-08-11 (Bulk upload: four documents lost to a rate limit, not a save)

**Current phase:** root cause found and fixed, with a structured failure model
behind it. **4,276 unit tests** pass (+54 on a 4,222 baseline, zero regressions), guardrails green (`audit:api-auth`,
`lint`, `lint:i18n-changed`, `lint:utf8`, `lint:encoding`, `type-check`).
**Not committed.**

**Root cause — measured, not inferred.** The bulk-upload modal accepts **10**
documents and fires all ten at once; `/api/policies/extract` allowed **6 per
minute per user**. Four of every ten were rejected with a 429 *before any PDF was
opened*. The extract route writes an activity row only after that gate, and
production shows exactly six per attempt across four separate batches
(2026-08-10 08:46, 08:48, 14:49; 2026-08-11 09:12 — the screenshotted run).
So four uploads in that batch failed for no reason of their own. They lost a
race. (Their file names were quoted here in the original wrap and have been
removed: a file name is user-authored metadata that names a branch or a person,
and a status document is a sink like any other.)

**Why it read as a save failure.** Three independent defects, all fixed:
1. the client threw `new Error(response.statusText)` — always `""` on HTTP/2 —
   discarding the server's error body entirely;
2. `mapWalletErrorToMessage`'s fallback for the `batchUpload` context is
   `saveFailed`, so any unmatched failure was labelled a *save* failure;
3. the limiter answers `{ error: { code } }` — an object — and `normalizeError`
   returns `""` for anything that is not a string or an Error.

**Also found and fixed, unprompted by the screenshot**
- **Fabrication:** the route substituted `TEMP-${Date.now()}` for a missing
  policy number, `"Unknown Insurer"`, and `"motor"` for an unrecognised line.
  Rows looked complete and saved silently.
- **Partial success was a lie at the save step:** required-field checks lived in
  the array-level Zod schema, so one undated document 400'd the whole request and
  created **zero** policies.
- **No duplicate check** in batch-create (the single-upload path has always had
  one) — re-uploading produced a second copy, and retrying a partly-saved batch
  produced one per attempt.
- **"Add more files" replaced state**, destroying every result on screen.
- The recognition gate (`documentKind` / `assessExtractionEvidence`) existed but
  was never wired into this path, so a terms booklet became a policy.

**Top risks ranked**
1. The 30/day billable-extract backstop was sized for single uploads; three full
   batches exhaust it. Message is now truthful and distinct, but the *policy* is
   unchanged and is a product decision.
2. E2E written but not executed here (needs the dev server + provisioned users).
3. `lib/i18n/wallet-error.ts` still has the `saveFailed` fallback for other
   `batchUpload` callers; the bulk path no longer routes through it.

**Next 3 actions:** run the Playwright spec locally; decide the daily-cap policy;
commit and open a PR.

## Session wrap — 2026-08-11 (Insurance intelligence expansion: shipped, measured, migrated)

**Current phase:** complete and verified end to end against a real model. **4,208
unit tests** (+196 on the 4,012 baseline, zero regressions), production build exit
0, full guardrail gate green. The migration is **applied to both databases**.
**Code is not committed.**

**Verified on the configured default model** (`gemini-3-flash-preview`), scored by
the existing harness: **4/4 specialty cases at 100%** (7/7 fields), 97% aggregate.

- `ΚΛΑΔΟΣ ΜΕΤΑΦΟΡΩΝ` → `marine_cargo` — the case that used to resolve to `boat`
- `ΚΛΑΔΟΣ ΠΛΟΙΩΝ (YACHTS)` → `boat_hull`; `ΑΣΤΙΚΗ ΕΥΘΥΝΗ` → `liability`; cyber → `cyber`
- `documentKind: policy_schedule` on all four
- premium correct on all four, including where a sum insured sits alongside
  (€31,500 cargo value vs €55; €540,000 hull value vs €5,100)
- clause codes verbatim — ICC (C), strikes, sanctions, Institute Yacht + CL.332
- liability returned all **three limit towers** correctly typed; cyber returned
  per-claim and aggregate

**The full chain, on a real model:** hull document → `boat_hull` → €540,000
`per_event` limit → €15,000 worst-case deductible under `largest_applies` →
`assessAdequacy` verdict `adequate`. Scheduled tender and outboard, the vessel
block and the warranties all extracted alongside.

**Marine pack tuned to v1.1.0.** The hull cover was emitting its deductible
ladder but no limit, because a sum insured reads as a property of the vessel
rather than of a coverage — so `marineVessel.hullValue` was populated and
adequacy had nothing to judge. The pack now requires the limit on the coverage
as well.

**Database**

`20260811020000_building_manager_role` applied via Supabase MCP to **both**
`PolicyWallet-Prod` (`cquudefwfwrmvpftuhyl`) and the dev project
(`lzqvtvjggylcujenlelh`), with the `_prisma_migrations` row added to each.
Verified present as `boolean NOT NULL DEFAULT false`. Additive and defaulted, so
the currently deployed code is unaffected and no existing protection score moves
until a customer answers the new question.

`verify:migrations` validates the schema but cannot complete its `migrate status`
half here — `DIRECT_URL` is the transaction pooler, which the Prisma CLI cannot
use. The Supabase-MCP verification above is the stronger evidence.

**Observations, not defects introduced here**

- `gemini-3-flash-preview` is **intermittently very slow**: two of five extraction
  calls hit the 180s timeout and recovered on retry, while the same document
  completed in 17.5s on a direct call and `gemini-2.5-flash` never timed out.
  Worth watching; the retry ladder is currently absorbing it.
- RLS is disabled on 85 of 86 public tables in prod, including
  `policyholder_profiles`. Consistent with the Prisma-plus-app-guards
  architecture rather than an outlier, but worth knowing given that table now
  carries one more piece of personal data.

**Deliberately not done, and why**

`GREEK_COVERAGE_MATRIX` left alone: `analyzePortfolioGaps` is a pure
set-difference, so adding `boat` would recommend marine cover to everyone without
a vessel — the exact defect the risk-engine audit removed. Commercial premium
estimates omitted: `getEstimatedPremium` returning null renders as "not
estimated" rather than as a wrong figure.

**Top risks, ranked**

1. **The code is uncommitted, and the schema is already ahead of it.** The column
   exists in prod; nothing reads it until this ships. Safe in that order, but the
   two must not drift for long.
2. **The `obligation_due` cron starts on the next deploy.** Low blast radius — the
   scan is a no-op for any policy without ACORD v3 `conditions`, which is the
   whole existing book until re-analysed — but it is outward-facing.
3. `gemini-3-flash-preview` latency (above).

**Committed**

Two commits on `feat/insurance-intelligence-expansion`, branched from
`prod-readiness-2026-08` at `d2244351`:

- `e23d5bc4` — the expansion (74 files, +7,099/-227)
- `2f9fe698` — the AI timeout fix and the coverage-panel render tests

The parallel session's uncommitted work (auth pages, `instrumentation-client.ts`,
landing/guides content, `gap-report.ts` and its two tests) was NOT swept in — it
is still unstaged and intact in the working tree. **This file is also
uncommitted on purpose**: it carries that session's 2026-08-10 Sentry entry
alongside this one, and committing it would make the branch's documentation
claim work the branch does not contain.

**The timeout decision, resolved**

Not pinning to `gemini-2.5-flash`. The preview model is intermittently slow, not
wrong — 4/4 specialty cases at 100%, and FASTER than 2.5-flash when healthy
(17.5s vs 25.7s). The real defect was arithmetic: a 180s per-call timeout with
one retry needs 362s against a 300s function budget, so a transient hang killed
the run before the retry could rescue it. Now 120s, with `WORST_CASE_CALL_MS`
derived from the parts and a test that reads the route's own `maxDuration`.

**Next 3 actions**

1. Open a PR against `NEW-UI` and run the E2E suite locally (not in CI).
2. Re-analyse a few real policies so ACORD v3 `conditions` populate, then look at
   the coverage panel and conditions card in the running app — the render is
   covered by component tests, the end-to-end path is not.
3. Watch `gemini-3-flash-preview` latency now that a hang fails over at 120s.

---

## Session wrap — 2026-08-10 (Sentry triage: 22 unresolved → 12, and the live incident is closed)

**Current phase:** all 22 unresolved Sentry issues read, classified and either
fixed, resolved, or documented as not-actionable. Full guardrail gate green,
**4,012 unit tests** (+5). Two fixes here are **not yet committed**.

**The live production incident is over, and verified so.** When this triage
started, `prepared statement "s0"/"s2" already exists` (42P05) was firing on the
live release — POLICYWALLET-13 and -12, on `GET /wallet` and
`POST /api/v1/consents`. Production had moved onto the Supabase transaction
pooler at ~12:42 UTC without `?pgbouncer=true`; transaction pooling returns the
server connection after every transaction, so Prisma's PREPARE and EXECUTE could
land on different backends. **#266 (`eb306e12`) shipped the fix and has been live
since 15:09 UTC.** Confirmed rather than assumed: the last error event was
14:32:37 UTC on the old release `df5ba237`, and in the 4h40m since the deploy the
new release has served continuous `http.server` traffic with **zero error
events**. POLICYWALLET-13/12/11 and the 24-event POLICYWALLET-5 are all resolved.

**Still broken**

1. **A customer's email address is sitting in Sentry as an indexed tag** —
   POLICYWALLET-K carries `email_to` and `email_subject` for a GDPR
   *account-deletion completion* notice that timed out. The leak itself is closed
   going forward (call sites removed, `scrubEvent` shipped in #266), but the
   historical event is still in the index and should be deleted there. The
   functional half — that erasure-complete email may never have been delivered —
   is one handled event from 22 July and remains unverified.
2. **POLICYWALLET-6, the only genuinely open user-facing one.** Server Components
   render failure on `/wallet`, six events over a month, a real Greek customer in
   Chios. Its last occurrence (08:53 UTC) **predates** the pooler switch, so it
   was never fully explained by the incident above. Digest-only, no stack. It has
   now been quiet for 10 hours including 4h40m of live traffic on the new
   release — if it returns, the digest needs correlating server-side.

**Fixed here (uncommitted)**

- **POLICYWALLET-7 — 28 unmapped gap slugs, and only 3 still real.** The map had
  already grown to cover 25 of them; the live release still missed
  `maternity-coverage`, `no-glass-coverage`, `no-collision-coverage`. Each names
  a cover the map already held under another spelling, so they are added as
  concept *aliases*, not new concepts — otherwise a policy tripping both
  spellings renders two cards saying the same thing. `prisma/product-catalog.ts`
  sells «Ίδιες ζημιές / σύγκρουση» as one cover, which is what settles collision
  onto `own-damage` rather than letting it mint a fourth motor concept.
- **Our own Playwright audits were raising production incidents.**
  POLICYWALLET-V and -Z are HeadlessChrome on `/auth/forgot-password`, a path the
  `*-audit.spec.ts` suites enumerate. The client `beforeSend` now drops events
  when `navigator.webdriver` is set — the automation signal itself, not a
  user-agent guess. Safe against the E2E suites: every Sentry assertion in
  `tests/e2e/sentry-*.spec.ts` expects **zero** events.
- **Two noise classes the ignore-list missed:** Chrome's lowercase `network
  error` (the existing `NetworkError` entry is a case-sensitive substring match,
  POLICYWALLET-10) and React's `Connection closed` from a torn RSC stream
  (POLICYWALLET-Q). Scoped to the client: `sentry.server.config.ts` has no
  `ignoreErrors`, so server-side email timeouts like POLICYWALLET-K stay visible.

**Both new guards were proven to fail against the defect first** — the slug guard
against the pre-fix map, the webdriver guard against the pre-fix client init. The
existing PII guard pinned the literal `beforeSend: scrubEvent`, which my wrapper
broke; rather than relax it to a substring, `beforeSend` is now **executed** in
the test with a mocked SDK, which proves a wrapper still scrubs where a source
match cannot tell a call from a mention.

**Resolved as not-defects, with reasons on each issue:** POLICYWALLET-8
(hydration, killed by the #255 homepage rewrite — that section now ships no
client JS); J/P/M/H/N (one 22–23 July **vercel-preview** connection-exhaustion
burst, `EMAXCONNSESSION`, superseded release); R (one aborted-navigation session
on flaky Android, sharing a trace parent with Q — `react-hooks/rules-of-hooks` is
`error` repo-wide and passes clean, so there is no conditional hook to find).

**Triaged, deliberately NOT fixed:** POLICYWALLET-S/Y/X/T ("RangeError", "Error:
Ba/ga/Aa") — S, Y and X share **one replay on one iPhone**, carry no frames in
our bundles (`undefined:196:249`) and arrive as `onunhandledrejection` with
minified single-token messages. That is an injected third-party script, and
inventing a filter for it would only hide the next real one. POLICYWALLET-D
("Failed to find Server Action") is deployment skew and is left visible on
purpose: it means a user's submit silently failed.

**Blocked:** nothing.

**The "six migrations unapplied in prod" risk is CLOSED** — carried at the top of
this file for five sessions, and checked against the live database rather than
the doc: all six landed on `PolicyWallet-Prod` between 09:57 and 10:03 UTC today,
in order (`notification_bus`, `notification_admin`, `business_events`,
`notification_orchestrator`, `automation_console`, `risk_review`), which is
**before** #266 deployed at 15:09. The only local migration prod still lacks is
`20260809130000_drop_dead_protection_score_history`, which is the destructive one
deliberately held for an owner decision.

## Top launch risks (ranked — GA-gating only)
1. ~~**High — public site false claims**~~ **RESOLVED (verified 2026-08-20).** The fabricated stats and testimonials are gone; `lib/landing/content.ts:16-21` records the deletion and `lib/seo/team.ts` is `[]` by design. An exhaustive numeric/superlative/social-proof sweep this phase found **no** invented figures, testimonials or logo walls left. Remaining copy risk is narrower and tracked in `phase6-rescore-2026-08.md` §6: SEO metadata on several pages still implies broader gap-finding than **4 rules** support.
2. ~~**High — AI-processing consent gate (Art. 9)**~~ **RESOLVED (verified 2026-08-20).** Migration and `User.aiProcessingConsentVersion` shipped; **both** paths that send bytes to a provider are now gated — the deep pipeline *and* `app/api/policies/extract/route.ts` (the upload/bulk path, which was ungated until this phase). Pinned by `tests/unit/access-ends-with-relationship-change.test.ts`.
3. **High — seeded accounts in prod** (= GO #1; 5-minute human action).
4. **High — auth gaps**: no production passkey/biometric verification; 30-day session persistence untested.
5. **Medium — Privacy page over-claims**: "GDPR export/deletion workflows available" — DSR executors unconfirmed. Ship or soften wording.

**Top risks:** 1) `connection_limit` is still left to the hand-edited pooler URL —
the same class of omission that caused today's outage, deliberately not forced in
code because the right value depends on the pooler's `pool_size`;
2) POLICYWALLET-K's leaked address is still in the Sentry index even though the
code path that put it there is gone, and a GDPR-erasure email that may never have
been delivered is unverified; 3) VAPID keys still unset, so push stays honestly
unconfigured.

**Next 3 actions:** 1) commit the two fixes here on top of `NEW-UI` (both are pure
additions and apply cleanly); 2) delete the POLICYWALLET-K event so the address
leaves the index, and confirm whether that erasure-complete email ever sent;
3) decide `connection_limit` on the pooler URL.

## Production readiness assessment — 2026-08-10

**Six full assessment rounds across 20 areas. 14 issues found, explained, fixed
and validated; rounds 4, 5 and 6 were clean.** Every fix carries a guard that
was *proven to fail* against the original defect before being kept — 10 new
suites, 55 assertions. Full report:
[audits/production-readiness-2026-08.md](audits/production-readiness-2026-08.md).

**The three that mattered most.**

1. **Production served fabricated AI analysis when no API key was set.** The
   provider factory fell through to the mock in every environment, so a rotated
   or mistyped env var meant customers uploading real policies got an invented
   insurer, a €500 premium and invented coverages at 88–96% confidence — with one
   `warn` line and analyses showing as complete. For an insurance product that is
   the most harmful output the system can produce. Production now refuses;
   `AI_SERVICE_TYPE=mock` still works as a deliberate choice.
2. **Four personal-data stores survived GDPR erasure.** Erasure is
   anonymize-in-place, so the `User` row lives and **no FK cascade ever fires** —
   `push_devices`, `business_events`, `risk_reviews` and
   `user_notification_settings` simply outlived Art. 17 requests. The push one
   retained a live delivery endpoint and its encryption keys, so a forgotten
   customer could still be sent a notification. All four are now erased and
   disclosed, and the guard derives its model list from the schema rather than a
   hand-written list, which is why the old one could not see them.
3. **Customer emails were shipped to Sentry as indexed tags** on every send
   failure, defeating the codebase's own `sendDefaultPii: false`. Call sites now
   log a domain and a fingerprint; a `beforeSend` scrubber on all three runtimes
   is the net under that.

**Also fixed:** an unbounded in-memory rate-limit map that leaked precisely when
Redis was down; a dead `sentry.client.config.ts` that meant dev errors reached
production Sentry and the noise filter never ran; escalations that re-fired every
night for ever; three server-rendered dates and day-counts that were a day out
near the Athens boundary (compulsory motor cover); a DST hole that delivered
inside quiet hours once a year; the API-auth audit being blind to re-export
alias routes; an admin action that read the database before authorizing; and
`next-pwa`, which generated nothing under Turbopack while being configured to
overwrite the push service worker.

**Measured in a real browser:** the cookie consent banner's invisible full-width
wrapper was swallowing clicks on every bottom-right control at desktop widths,
and covered the entire bottom navigation on mobile. Both fixed and verified with
`elementFromPoint` before and after.

**Corrections I made to my own work:** two guards passed vacuously on first
write (an `indexOf(-1) < n` comparison, and an over-broad date matcher flagging
number formatting) and were rewritten; a portal attempt on the batch-upload modal
broke the page and was reverted.

**Known, measured, NOT fixed:** the consent banner still covers the batch-upload
modal's "Save all" button — the modal is trapped in an app-shell stacking
context, so raising its z-index does nothing and the real fix is a portal or a
deliberate restack. `tests/wallet-batch-upload.spec.ts` fails for this reason;
it is pre-existing (verified identical before and after every change here).

**Top risks:** 1) **six migrations unapplied in prod** — confirmed against the
live database, whose newest migration is `20260804140000_life_event_engine`;
2) the batch-upload modal overlap above; 3) VAPID keys unset, so push stays
honestly unconfigured.

**Next 3 actions:** 1) apply the six migrations to prod in order; 2) portal the
batch-upload modal (or restack the consent layer) and re-run its spec; 3) cut
over — delete the direct notification calls the decision engine now duplicates.


## Session wrap — 2026-08-10 (Risk Review: the platform now initiates)

**Current phase:** implemented and verified against dev. **Six migrations
unapplied in prod.** Spec + matrix:
[architecture/risk-review.md](architecture/risk-review.md).

**The audit found no review concept at all.** `scheduled_review` was an action
type that created a `UserTask` — no lifecycle, no deadline, no customer-facing
review, no record of whether reviewing helped. `scheduled_review_due` sat
`planned`, blocked on exactly the cadence policy this work decides.

**The sharpest finding: `age` is a declared risk factor** — it gates two risks in
the catalog and refines four more — **and nothing recomputed on a birthday.** A
customer's assessment went quietly stale every year with no trigger to notice.

**The design decision everything rests on:** *recalculation is automatic,
continuous and silent; a review is a human checkpoint.* Conflating them is the
obvious mistake — if every coverage gap opened a review, a review would become
the thing people dismiss unread. **Of the brief's 20 triggers, 16 open a review
and 4 deliberately do not**: a policy upload (the customer just acted; the
findings ARE the response), a questionnaire update (they have just reviewed
their own facts), an AI confidence drop (our reading failed, not their
circumstances — the work belongs to a human reading the document), and a travel
increase (a real but narrow exposure change).

**Reviews stay rare enough to be read.** A cooldown keeps a busy fortnight to one
conversation; a heavier trigger supersedes lighter open reviews rather than
queueing behind them, so a child being born is never silenced by a quarterly
check; and overdue reviews expire so a declined prompt does not become permanent
furniture blocking the next genuine one.

**Periodic cadence, each justified:** annual as the backstop; quarterly only
where assessment coverage is too thin to score honestly (prompting a complete
profile quarterly would teach people to ignore reviews); birthday only on a
**decade boundary**, with leap-day birthdays falling back to 1 March so the
trigger never skips three years in four.

**Measuring whether it helps.** Each review stores the score and open-finding
count at open and the score at close — the only way to answer "did reviewing
change anything?", and "no change" is a legitimate answer worth recording.

**UI:** the card sits above the onboarding checklist (a review responds to
something that happened; onboarding does not), mobile-first with full-width 44px
actions and the two justifying facts above the fold at 320px. **"Not now" is a
first-class action** — a prompt you cannot decline is one people resent, and a
dismissal is signal that we asked at the wrong moment.

**A guard caught my own change:** the bus-invariant test flagged
`scheduled_review_due` as live-with-no-emitter, because its scan predated the
orchestrator and only recognised `emit()`. Fixed to recognise `orchestrate()`
too — the sanctioned path.

**Verification.** 3,933 unit tests (+19 review-policy assertions) · full
guardrail gate · migration applied to dev and ledgered · **and the review rules
driven against the real dev database**: a recalculate-only trigger declined with
`policy`; a life event opened one; a lighter trigger was declined as `outranked`;
a heavier one superseded it and the lighter went to `superseded`; completing
recorded score-at-close beside score-at-open; an overdue review expired.

**Blocked:** claims — no `Claim` aggregate, so `claim` is declared with the
heaviest weight and honestly unwired.

**Top risks:** 1) **six migrations unapplied in prod** — `notification_bus`,
`notification_admin`, `business_events`, `notification_orchestrator`,
`automation_console`, `risk_review`; they must land in order before any deploy
including a Vercel Preview; 2) event publishers remain dual-written alongside the
direct calls; 3) VAPID keys unset, so push stays honestly unconfigured.

**Next 3 actions:** 1) apply the six migrations to prod in order; 2) cut over —
delete the direct notification calls now duplicated by the decision engine;
3) build the advisor "reviews across my book" surface.

## Session wrap — 2026-08-10 (Automation Console: the schedules can finally be seen)

**Current phase:** implemented and verified against dev. **Five
notification/event migrations are unapplied in prod.**

**Audited before building, again.** Most of the brief already existed —
templates (preview, test, version), automation rules, escalation, retry,
thresholds, feature flags, notification history, automation logs, delivery
failures. **The real gap was six things:** schedules, queues, clone,
per-schedule pause/resume, localization coverage, and business-event
enable/disable.

**The finding that mattered: 17 job routes with zero run history.** The console
could only have rendered `vercel.json` back at the operator — a list of cron
expressions with no evidence any of them executed. *A schedule you cannot
observe is a schedule you cannot trust*, and that is exactly how two job routes
came to exist for weeks that no cron had ever invoked. `JobSchedule` + `JobRun`
now record every run: status, duration, the job's own summary, and whether it
was cron- or operator-triggered — kept distinct, because an operator pressing a
button proves the job works, not that the schedule fires.

**Pause is recorded, not silent.** A paused job writes a `paused` run rather
than returning quietly: "this did not happen because you paused it" is precisely
what an operator needs when a customer asks why nothing arrived.

**Disabling a business event stops the reactions, not the record.** The event is
still written — the fact happened, and denying it would corrupt the log — but the
decision engine takes no actions. Deliberately different from disabling a
notification, which only stops the telling.

**Queues report age, not just depth.** A queue with a hundred items that drains
hourly is fine; one with three that has not moved since Tuesday is not. Each
queue shows its oldest waiting item, and deferred notifications are labelled as
*not a problem* — they are held for quiet hours and will send.

**Localization coverage is the number nobody had.** Not "how many templates
exist" but "how many exist in ONE language only" — a Greek-only template means
Greek readers get the operator's copy and English readers get the code's
fallback, for the same event on the same day. Invisible on the template list,
where both look like a template that exists.

**A clone arrives inactive.** A copy is almost always about to be translated;
publishing Greek copy to English readers the moment it is cloned is the obvious
way for that feature to cause harm.

**The console links out rather than rebuilding.** Templates, triggers, history,
workflows, AI prompts and gap definitions all already existed — a console that
recreated them would be two places to change one rule.

**A guard caught my own code again:** the design-system sweep rejected a
`grid-cols-3` at 375px (~105px per cell) on the localization page. Fixed to
`grid-cols-1 sm:grid-cols-3`.

**Verification.** 3,914 unit tests (+15 console assertions) · full guardrail gate
· production build exit 0 · migration applied to dev and ledgered · **and the
schedule contract driven against the real dev database**: first run created the
schedule and recorded the summary with a duration; pausing stopped the work and
recorded a `paused` run; resuming ran it again; a throwing job recorded `failed`
with its message and re-threw.

**Blocked:** nothing.

**Top risks:** 1) **five migrations unapplied in prod** — `notification_bus`,
`notification_admin`, `business_events`, `notification_orchestrator`,
`automation_console`; the code expects tables prod lacks and these must land in
order before any deploy, including a Vercel Preview; 2) event publishers remain
dual-written alongside the direct calls, so the cutover is still pending;
3) VAPID keys unset, so push stays honestly unconfigured.

**Next 3 actions:** 1) apply the five migrations to prod in order; 2) cut over —
delete the direct notification calls now duplicated by the decision engine;
3) build digest mode (`digestMode` exists in the schema and nothing reads it).

## Session wrap — 2026-08-10 (Notification Orchestrator: who, when, whether)

**Current phase:** implemented and verified against dev. **Four
notification/event migrations are unapplied in prod.**
Spec: [architecture/notification-automation.md](architecture/notification-automation.md)
§The Orchestrator.

**Audited before building.** Most of the brief already existed from earlier this
session — priority, expiration, localization, retry, deduplication, user
preferences, delivery status, read status, audit trail, templates, and the
in-app/email/push channels. Building those again would have been the duplication
the brief forbids. **The real gap was five things:** scheduling, quiet hours,
rate limiting, Slack/Teams, and multi-recipient fan-out.

**`emit()` answers *how*. The orchestrator answers *who*, *when* and *whether*,**
then hands delivery to the bus unchanged. Nothing in it re-decides a channel,
re-resolves a language or re-renders a template — a guard test forbids the event
layer from calling `emit` directly, because that would be a second delivery path
with none of the new policies.

**The registry's `recipients` field is finally load-bearing.** It has been
declared on every event since the registry was written and nothing read it —
which is why `policy_analyzed` was emitted twice from one function with two
copies of the copy. One event now reaches everyone it concerns, with the
recipient appended to the dedupe key so each is told once.

**Deferral, never suppression.** Quiet hours and the daily cap defer; they never
drop. *A policy about timing that silently discarded the message would be a
policy about existence* — and a customer would never learn their cover lapsed
because it lapsed at 23:40. A deferred notification is written immediately as
`queued` with `scheduledFor`, so the decision is auditable before the send, and
the existing retry sweep delivers it when its hour comes. Expiry is re-checked
then: a reminder deferred overnight can expire while it waits.

**Urgency overrides politeness.** Critical and transactional events — failed
payment, credential change, lapsed motor policy — ignore quiet hours and the cap
entirely.

**Quiet hours are timezone-real**, resolved through `Intl` rather than a fixed
offset: Greece observes daylight saving, so `+2` would put the window an hour
wrong for half the year. Deferral targets the *start of the morning*, so
notifications raised at 23:00 and 03:00 arrive together.

**One settings model, two defaults.** `UserNotificationSettings` serves customers
and advisors — same settings, role-derived starting points (an advisor is handed
work and wants it in working hours, with a higher ceiling). A null cap means "use
the role default", so raising a default reaches everyone who never overrode it.
Quiet hours default ON at 22:00–08:00.

**UI:** quiet hours in Settings, mobile-first (the two hour pickers sit side by
side from the smallest width because they are one thought), native `<select>` so
phones get the platform wheel, 44px targets, `aria-invalid`/`role="alert"` on the
equal-hours case, bilingual. Admin gets the global switches and the default cap.

**Verification.** 3,899 unit tests (+16 orchestrator assertions) · full guardrail
gate · production build exit 0 · migration applied to dev and ledgered · **and the
orchestrator driven against the real dev database**: quiet hours deferred both
channels rather than dropping them; `payment_failed` ignored quiet hours and
delivered; the sweep picked the deferred rows up and sent them (`scheduled: 2`);
`renewal_overdue` resolved its declared `["owner","advisor"]`; a cap of 1 deferred
rather than dropped.

**Blocked:** nothing.

**Top risks:** 1) **four migrations unapplied in prod** — `notification_bus`,
`notification_admin`, `business_events`, `notification_orchestrator`; the code
expects tables prod lacks and this must land before any deploy, including a
Vercel Preview; 2) event publishers are still dual-written alongside the direct
calls, so the cutover is the next real risk; 3) VAPID keys still unset, so push
stays honestly unconfigured.

**Next 3 actions:** 1) apply the four migrations to prod in order; 2) cut over —
delete the direct notification calls now duplicated by the decision engine, one
event at a time; 3) build the digest mode the schema reserves (`digestMode`
exists and nothing reads it yet).

## Session wrap — 2026-08-10 (Event-driven: the facts now drive the reactions)

**Current phase:** implemented and verified against dev. **Three notification/event
migrations are unapplied in prod.** Spec + implementation map:
[architecture/business-events.md](architecture/business-events.md).

**Two live defects fixed first**, because building an event architecture on top of
known bugs would encode them:

1. **Risk notifications rode a floating promise.** `runGapEngine` fired the version
   write — and therefore `GAP_DETECTED`, `protection_score_changed` and
   `risk_level_changed` — as `void import(…).then(…).catch(() => {})`. On Vercel a
   promise not awaited before the response may be terminated, so the
   customer-facing consequence of an upload could simply never fire. Now awaited
   and still non-fatal. *(Defect introduced earlier this same session: I hung
   notifications off a seam that was deliberately fire-and-forget because it
   carried only observability. It stopped carrying only observability.)*
2. **The life-event path left a stale score on screen.** It recorded a version but
   refreshed neither the cached score nor the recommendations, and the dashboard
   reads the cache — so a customer who declared "a child was born" was told a gap
   had opened, opened the dashboard, and saw the pre-event number. The documented
   reason (recursion) did not hold: `runGapEngine` writes only ProtectionScore,
   RecommendationInstance and RiskProfileVersion, none of which re-enter
   `declareLifeEvent`. `lifeEventId` is now plumbed through the full engine, so the
   causal link the timeline draws — the only thing the reduced path was really
   protecting — survives.

**Then the architecture.** Every workflow is now
**Business Event → Decision Engine → Actions**:

- **`BusinessEvent` outbox**, written in the same transaction as the fact, so the
  two cannot disagree. An in-process emitter has the exact failure mode fixed
  above, by construction.
- **`subject` vs `actor`** on every event — the field most systems omit and
  insurance cannot. An advisor uploading for a customer is actor=advisor,
  subject=customer; collapsing them misattributes the DSR record, misroutes the
  notification and loses the GDPR access log.
- **`occurredAt` vs `recordedAt`** — a life event declared today may have happened
  last year. Verified live: a lapse recorded 9 Aug, occurred 1 Aug.
- **27 live events** in a catalog that describes facts, not messages, with claims
  declared `planned` because no claims model exists.
- **Decision engine** with rules as typed functions, bounded by the catalog: an
  event cannot acquire a consequence it does not declare.
- **Twelve action executors**, each delegating to machinery that already exists —
  this changes how work is *triggered*, not how it is *done*.
- **Replays never reach a customer.** State actions still run; customer-facing ones
  are refused with reason `replay`, so backfilling a subscriber cannot email two
  years of notifications.

**First new capability: advisory work is now created by events.** `userTask.create`
had two call sites and neither was a coverage gap, a failed extraction, a lapsed
policy or a failed payment. All four now raise advisor tasks, priority-aware,
skipped honestly with `no_advisor` when there is nobody to assign to.

**A guard caught my own code.** The branch-family sweep rejected
`lineOfBusiness === "motor"` in a decision rule — the exact defect class it
documents, since a lapsed *motorbike* is as compulsory as a lapsed car. Now
`branchFamilyId`. A second guard caught a catalog entry whose rule planned an
action the entry did not declare.

**Verification.** 3,883 unit tests (+23 event-architecture assertions) · full
guardrail gate · production build exit 0 · migration applied to dev and ledgered ·
**and the whole workflow driven against the real dev database**: publish → dedupe
on re-publish → four actions decided from one fact → replay refuses the two
customer-facing ones → execute with risk recalculation ordered *before* the
notification → advisor task skipped `no_advisor` → sweep idempotent.

**Blocked:** nothing.

**Top risks:** 1) **three migrations unapplied in prod**
(`20260809120000_notification_bus`, `20260809140000_notification_admin`,
`20260810120000_business_events`) — the code expects tables prod lacks, and this
must land before any deploy including a Vercel Preview; 2) publishers are
dual-written alongside the direct calls, so nothing depends on events yet — the
cutover (deleting the direct calls) is the next real risk; 3) VAPID keys still
unset, so push stays honestly unconfigured.

**Next 3 actions:** 1) apply the three migrations to prod in order via Supabase MCP
+ `_prisma_migrations` rows; 2) cut over — delete the direct calls now duplicated by
the decision engine, one event at a time; 3) add the webhook subscriber, which turns
partner integrations into a subscription rather than a project.

## Session wrap — 2026-08-09 (Notification admin console: the rules left the code)

**Current phase:** implemented and verified against dev. **Neither prod
migration is applied.** Spec:
[architecture/notification-automation.md](architecture/notification-automation.md)
§Administration.

**The brief:** every notification, automation and trigger manageable from the
Admin Console, with no code change needed to modify business rules. The registry
shipped earlier in this session was code-only, so this is the override layer on
top of it.

**The design decision that carries everything else:** the registry stays the
source of truth for an event's SHAPE; the database overrides only its
OPERATIONAL parameters, merged at read time. Every override column is nullable
and **null means inherit**, so an override is a set of deltas rather than a copy
— an operator who retunes one threshold does not silently freeze the other nine
against future improvements to the code default. Same pattern as
`AiPromptOverride`, revisions included.

**What an operator may not change, and why.** `transactional`, `category` and
`recipients` are code-only, and a transactional event cannot be switched off —
enforced in the validator, in the toggle action, and by a test that sweeps every
security and billing event. *A rule the operator can bend must never be the rule
protecting the customer FROM the operator.* Channels can only be **narrowed** to
a subset of what the event declares; widening would let an operator route an
in-app-only event to email, which is a product decision, not a setting. The
validator also rejects a retry schedule that would outlive its own expiry — the
same invariant the registry guard test enforces on the code defaults, so a form
cannot reach a state the source forbids.

**Suppression stays honest.** An admin action never makes a notification vanish:
`trigger_disabled`, `automations_paused` and `channel_disabled` join
`preference_off` and `no_device`. That distinction is what tells a paused system
apart from a broken one when somebody asks why a customer heard nothing.
`channel_disabled` is deliberately separate from `transport_not_configured` —
one means an operator switched it off, the other that it was never built.

**Degradation is the point.** `getNotificationConfig` never throws; a DB error
resolves to registry defaults and the console says so in a banner. Templates
degrade the same way — missing, unparseable, or rendering empty all fall back to
the caller's own copy, with `flag.templatesEnabled` as the kill switch.

**Templates are closed over their variables.** `{{name}}` resolves from a
per-event allowlist; anything else renders empty. Handing a template the whole
payload would let a typo publish an internal id onto a lock screen. Test sends go
to the **administrator themselves** and the recipient is not a form field — a
test-send that can address anyone is a phishing primitive, not a preview.

**Shipped:** `/admin/notifications` (health, skip-reason breakdown, top failing
events, run-sweep-now, global settings), `/triggers` (all 74 with inline
enable/disable), `/triggers/[event]` (full rule editor + version history),
`/templates` (coverage grid across channel × language), `/templates/[event]`
(editor, live preview with fake sample data, test send, version history), and
`/history` (filterable delivery log with per-row retry). Thresholds that were
constants — score materiality, gaps named per notification, risk-change
notifications — are now settings, as are the channel toggles, retry/escalation
switches and batch size.

**Three guards caught real defects in my own work**, which is the useful part:
the design-system tests rejected arbitrary `text-[10px]` sizes and a 4.34:1
stone-500-on-stone-100 chip; seven suites failed because the config module
imported `unstable_cache` at module scope, making the whole delivery path depend
on a Next runtime that crons and scripts do not have (now lazily wrapped, and
reading through uncached outside a request); and a leaked mock implementation
between dispatch tests exposed that `clearAllMocks` does not reset
`mockResolvedValue`.

**Verification.** 3,857 unit tests (+34: override precedence, safety
invariants, settings validation, template allowlist, admin-driven suppression) ·
full guardrail gate · production build exit 0 · both migrations applied to dev
and ledgered · **and the whole admin loop driven against the real dev database**:
disable a trigger → both channels record `trigger_disabled`; override
priority+channels → one row at the new priority with
`overriddenFields: [priority, channels]`; write a Greek template → copy rendered
as «Έτοιμο: POL-9» while the untemplated channel kept the caller's own; global
pause → every channel `automations_paused` even on a critical transactional
event; delete the overrides → straight back to the registry default.

**Blocked:** nothing.

**Top risks:** 1) **neither notification migration is applied to prod** — the
code expects tables and columns production does not have, and this must land
before any deploy including a Vercel Preview (previews write to the prod DB);
2) VAPID keys still unset everywhere, so push stays honestly unconfigured;
3) the destructive `20260809130000_drop_dead_protection_score_history` remains
deliberately unapplied pending an owner decision.

**Next 3 actions:** 1) apply `20260809120000_notification_bus` then
`20260809140000_notification_admin` to prod via Supabase MCP + the
`_prisma_migrations` rows, exactly as on dev; 2) generate VAPID keys and set them
in Vercel; 3) decide on dropping the dead `protection_score_history` table.

## Session wrap — 2026-08-09 (Notification architecture: one bus, and the badge finally tells the truth)

**Current phase:** implemented and verified against dev. **Prod migration not
applied** — one command, listed under Next actions. Spec:
[architecture/notification-automation.md](architecture/notification-automation.md).

**The brief:** every notification must originate from a business event, the same
event must reach any channel, and business logic must never be duplicated per
channel. The audit found the opposite on all three counts.

**There was no bus — there were three ways to emit**, and which one a caller
reached for decided whether preferences were honoured and which channels were
reachable at all: `sendNotification` (11 sites, email+push), `notifyCounterparty`
(7 sites, email+in-app), and **~20 direct `db.notificationEvent.create` calls
that checked no preferences and hardcoded `channel: 'in_app'` at the call site**.
That is per-channel business logic copied across the codebase. All ~20 are now
migrated; a guard test forbids the pattern outside `lib/notifications/`.

**The read model was split across two columns, and both were live.** `status`
meant delivery state *and*, on the bell API, read state (`queued` = unread);
`readAt` meant read everywhere else. The two mark-read implementations wrote
**different columns**, so reading a notification in the bell never moved the
shell badge, and "mark all read" on /notifications never moved the bell's count.
Measured on **production**: the badge read **141 against a true count of 8** — 84
email rows (every marketing message ever sent), 45 real in-app rows, and 12
analytics rows. `readAt` is now the only definition of read, scoped to in-app.

**Analytics were being rendered to customers as notifications.**
`recordConversionEvent` wrote `channel: 'in_app'`, `title:
'conv_checkout_completed'` — a machine code as the user-facing subject — with a
JSON blob as the body. 26 such rows in prod. They now use an `analytics` channel
that every notification surface filters out.

**Push was declared everywhere and structurally dead.** Nothing registered a
token: no service worker, no permission prompt, and
`POST /api/v1/notifications/device-token` had **zero callers**, so
`User.pushToken` was null for every user in both environments — and the
dispatcher's `else if` fell through and recorded the row as **`sent`**, a
delivery record for a push never attempted. Now built on **standard Web Push
(VAPID/RFC 8291)** rather than FCM: no client SDK, and the only path that works
for installed PWAs on iOS 16.4+. `push_devices` replaces the single-token column
(registering a laptop used to evict the phone). `tests/unit/web-push-crypto.test.ts`
**plays the browser** — generates a subscription keypair, hands the public half
to our sender, and decrypts the result, because hand-rolled crypto that merely
"does not throw" produces well-formed records every push service silently rejects.

**Eleven required triggers emitted nothing.** The sharpest: a failed payment
flipped the subscription to `past_due` — which pauses entitlements — and told the
customer **nothing**; they lost paid features mid-session with no idea why (the
lifecycle handler's own comment conceded "no dunning"). Also silent:
protection-score movement (the daily cron recomputed everyone and notified
nobody), gaps found by the engine rather than an upload, renewal lapse,
recommendation lifecycle, life events, policy removal, advisor assignment. All
now wired. **Risk events hang off ONE seam** — `recordRiskProfileVersion`, which
already fires only on a material change — and reuse the timeline's own
`diffVersions`, so an alert cannot contradict the history it links to.

**Retry, expiry and escalation did not exist**: `failureReason` was written and
never read, so a failed notification was lost silently and for ever. New
`notification-retry` cron expires first (never spend a retry on a message that is
no longer true), then escalates, then retries on registry backoff. Two job routes
that no cron ever invoked (`billing-reconciliation`, `launch-readiness-snapshot`)
were also found; the former is now scheduled.

**The deliverable is `lib/notifications/registry.ts`** — 74 business events
declared once with all ten required fields, `live | planned` per event so a
missing trigger is visible and test-enforced instead of silently absent.
`docs/architecture/notification-automation.md` is **generated from it**
(`npm run docs:notifications`), so the matrix cannot drift.

**Deliberately NOT wired, and why:** claims (the product has no claims model —
inventing an emitter for an unreachable state is worse than the gap);
`profile_updated` (the risk consequence is already the notification that matters;
a second ping for an edit made ten seconds ago is noise);
`admin_action_on_account` and `scheduled_review_due` (both need a policy decision
first). Each is `planned` with the reason next to it, enforced by a test.

**Verification.** 3,823 unit tests (up from 3,785; 38 new across bus invariants,
dispatch behaviour and Web Push crypto) · lint · i18n · UTF-8 · encoding ·
audit:api-auth · production build exit 0 · migration applied to **dev** and
verified (6/6 columns, 3/3 indexes, FK `confdeltype=c` so GDPR erasure cascades,
backfill leaves 0 rows, row counts unchanged) · **and `emit` exercised against the
real dev database**: two rows written, dedupe returns `deduped: true` on the
repeat, priority and expiry denormalized from the registry, copy resolved to the
recipient's Greek, push correctly *not* attempted with VAPID unset — and unread
in-app went 0→1 while the old all-channel query counted 2, which is the 141-vs-8
bug reproduced and fixed in one line.

**Blocked:** nothing.

**Top risks:** 1) **the prod migration is not applied**, so the code expects
columns production does not have — this must land before any deploy, including a
Vercel Preview (previews write to the prod DB); 2) VAPID keys are not set in any
environment, so push stays honestly unconfigured until they are — the channel
records nothing rather than lying; 3) the destructive
`20260809130000_drop_dead_protection_score_history` is deliberately unapplied and
needs an explicit owner decision.

**Next 3 actions:** 1) apply `20260809120000_notification_bus` to prod via
Supabase MCP + the `_prisma_migrations` row, exactly as dev; 2) generate VAPID
keys (`node scripts/generate-vapid-keys.mjs`) and set them in Vercel; 3) decide
on dropping the dead `protection_score_history` table.

## Session wrap — 2026-08-07 (Homepage hero: the first screen is now the product)

**Current phase:** **shipped and verified live** — PR #255, squashed as
`434d9c04`, CI green, `deploy.yml` deployed it, and the new fold is confirmed on
www.policywallet.gr in both locales.

**Why.** A competitor-CEO review scored the live homepage 7.0/10: the first
screen *told* instead of *showed*, led with a category label nobody can act on,
and put AES-256/GDPR/EU-servers above the fold where they prove nothing. The
interaction shipped in #253 sat below all of it.

**Done.** The fold is now badge (the plain-language decode) → H1 → the six
life-change chips → the effect their own pick reveals → the argument → one
tracked CTA. `TrustRow` moved down beside the other "is this real" evidence;
`PricingPreview` moved below the FAQ; the mock is desktop-only so a phone leads
with the interaction rather than a screenshot. The widget's «Σκορ Προστασίας:
84%» and its three per-branch percentages are gone — it is a coverage map now
(Εντάξει / Κενό), and its summary chip is **counted off the tiles** rather than
invented. `WHAT_WE_DO` was deleted: the chips, `CATEGORY` and `STORY.matters`
now say all three of its sentences, and an unrendered claim in the claims file
misreports what the site promises.

**Two honesty findings, both caught before shipping.** The review asked for
"See your first gap free" and CTAs like *Reveal my gaps* — both false:
`gapAnalysisPerDay` is 0 on **Free and Starter**, so gap detection is
PolicyWallet Plus only. The planned replacement CTA («Δείτε τι δεν καλύπτει η
ασφάλειά σας») was **also** rejected mid-implementation, because
`COMPARISON_ROWS` already rules "shows you what is NOT covered" a `plus` job.
`PRIMARY_ACTION` is now «Δείτε τι λέει το συμβόλαιό σας», which Free genuinely
delivers. Separately, the hero mock says «Βρήκαμε ένα κενό» inches from a
free-tier promise — it now carries a plan-named caption, in the accessible name
too.

**Verification.** 3,770 unit tests · lint · i18n · UTF-8 · encoding ·
audit:api-auth · production build · prerendered HTML in both locales (one h1,
no heading skips, all six chips and all six effect lines in the server HTML,
trust row and pricing provably below the fold) · real Chrome at
320/390/390-short/768/1440 × both locales (zero horizontal overflow, 44px
targets, the reveal works, mock hidden below `lg`) · the repo's own
`public-anon` sweep, 63/63.

**CWV measured on production, finally** (390px, 4× CPU throttle, ~1.6 Mbps):
**LCP 1080 ms · CLS 0.0000 · FCP 1080 ms.** The long-standing "predicted green,
never measured" risk is closed — and it survived putting an interaction in the
fold.

**NEW — anonymous cookie consent is never recorded server-side (found while
verifying prod, pre-existing, NOT from this change).** `app/api/v1/consents`
is declared `auth: mode "public"` in the CI-enforced route inventory, but
`proxy.ts` does not allowlist it and fails closed — so every anonymous call is
307'd to `/auth/signin`, and the banner's POST dies as a **405**. Verified live
for GET, POST and `/consents/current`. **Visitor choice IS honoured**:
`CookieConsentBanner` writes the cookie and emits the change *before* the fetch
(the POST is commented as best-effort audit logging), so analytics start/stop
correctly. What is missing is the server-side record GDPR Art. 7(1) wants, plus
a console error on every visitor who touches the banner. Same class as the
documented cron 307 trap. One line in the `proxy.ts` allowlist — deliberately
NOT applied: `proxy.ts` is auth middleware, outside this brief's stated scope,
and widening a fail-closed allowlist is the owner's call.

**Assessment loop, against production.** Round 1 clean across axe (WCAG 2.1 AA,
8 page/viewport/scheme combinations × rest and selected states — zero
violations), a nine-breakpoint responsive sweep incl. landscape, real keyboard
Tab, reduced-motion, forced-colors, structured data (all 8 FAQ questions and all
3 HowTo steps verified visible with the JSON-LD stripped first), and payload.
Four apparent findings were **my own faulty checks** and were disproved rather
than "fixed": hreflang is present (Next emits `hrefLang`, my regex was
case-sensitive), the sitemap `<loc>` simply has no trailing slash, focus IS
visible (I had measured programmatic focus, which does not trigger
`:focus-visible`), and the "1651KB of JS" was uncompressed — the wire is 539KB
brotli with **0 long tasks and 0ms total blocking time**.

Round 2 found a real one, so the counter reset to 0: `AudienceTabs` hard-coded
the CTA label that `PRIMARY_ACTION` used to hold, so after the rename the
homepage showed **two different primary promises**, and the stale one claimed a
PolicyWallet Plus outcome on a free signup. It now reads the constant, and
`tests/unit/landing-primary-cta-single-source.test.ts` pins the invariant —
verified to fail against the old code before being accepted.

Rounds 3 and 4 were clean (accessibility tree proving the live region really
does announce, all-six-selected layout, client-side nav, a 21-route production
sweep, WCAG 1.4.4 reflow at 320/640 CSS px, and the 1.4.12 text-spacing
override). Two apparent findings there were again harness error, not product
defects, and were disproved.

Round 5 found the last real one: **the hero interaction was painted long before
it worked.** Measured against production, the chips were inert for **843ms on
fast 4G with 4x CPU throttling and 2,420ms on slow 4G with 6x** — and they are
now the first control on the page, so that is exactly when a visitor taps.
Rewritten from React state onto checkboxes plus a `:has()` rule: the same
measurement now reads **48ms / 70ms**, the section works with JavaScript
disabled, and it ships **no client JavaScript at all**. The reveal rules sit
inside `@supports selector(:has(*))`, so a browser without `:has()` shows every
effect line rather than none — degraded to a plain list, never a dead control.
Pinned by `tests/unit/life-change-discovery-no-js.test.tsx`.

**Round 6 ran as a 14-agent workflow** — six independent lenses against live
production, then an adversarial checker per finding instructed to refute it. It
produced 18 candidates, 8 verified, **5 confirmed and 3 refuted**. Four confirmed
findings were fixed here:

- **Dark-mode focus ring measured 2.74:1** on the six hero chips and eight FAQ
  summaries — under the 3:1 floor WCAG 2.1 SC 1.4.11 sets for focus indicators,
  on the one control the hero exists to have people use. axe reported zero
  violations throughout because it has no focus-indicator-contrast rule. Now
  15.98:1 and 20.49:1, pinned by
  `tests/unit/landing-focus-ring-dark-mode.test.ts`.
- **Shift+Tab parked focus entirely under the floating header** (WCAG 2.2 SC
  2.4.11) — the ring simply vanished, which a keyboard user cannot tell apart
  from focus being lost. Fixed once for the whole page with a `scroll-margin`
  rule rather than per component.
- **The FAQ answer "What if I do not have an agent?"** promised connecting an
  agent "with a single click" with no plan named, while the sibling card and the
  pricing table both fence `agentCollaboration` to PolicyWallet Plus. It shipped
  inside FAQPage JSON-LD too, so the unqualified claim travelled further than
  the page.
- **The cookie consent sheet rendered in Greek on /en**, covering the CTA on a
  phone. Cause: the banner is mounted in the ROOT layout, above the
  `StaticLanguageProvider` that gives /en its locale, so it read the global
  provider's Greek default. It now takes the language from the route, and its
  privacy/terms links stop hard-coding `?lang=el`.

The fifth confirmed finding is **not** fixed: from /en, every auth link drops
the locale, so the hero CTA lands on a Greek signup page — and `?lang=en` is
ignored there. The marketing half alone cannot fix it; the minimal repair is
either persisting the locale in `StaticLanguageProvider` or teaching the signup
route to read it, and both are outside a marketing-only brief. Recoverable in
one tap via the EN toggle, but it is the highest-intent moment on the English
journey.

**Round 7 deliberately looked away from the hero** — journeys between pages,
the other public pages, EL/EN meaning parity, the non-hero interactive
components, the transport layer, and structured data sitewide. 23 candidates,
8 verified, **6 confirmed, 2 refuted**. All six fixed:

- **The four Greek legal URLs served the ENGLISH document to any browser whose
  Accept-Language was not Greek** — /privacy, /terms, /cookies, /subprocessors.
  A Greek reader on an English-configured laptop (the norm in Greece) clicked a
  Greek-labelled footer link and got the English Privacy Policy **plus ~52 links
  silently relocated to /en/**, with no way back: the ΕΛ toggle was a no-op. The
  page still declared `<html lang="el">`, `hrefLang="el"` and a self-canonical
  while serving English. These are the GDPR privacy policy and the terms a Greek
  consumer is entitled to read in Greek. The URL now decides, as it already does
  for /en/*; `?lang=` stays an explicit override. The leaked-link count is now 1
  — the language toggle itself.
- **Both pricing segmented controls exposed no selected state** (WCAG 2.1 SC
  4.1.2) on the page where money is decided: a screen reader heard two plain
  buttons and no indication that €79 was the yearly figure. Now `aria-pressed`
  on each, inside labelled groups.
- **An English guide dropped the «από το πλάνο Starter» qualifier** its Greek
  twin carries, promising renewal alerts on a page whose CTA is "start free" —
  free has notifications off. Pinned by
  `tests/unit/guides-plan-qualifier-parity.test.ts`, which compares the COUNT of
  plan mentions per EL/EN pair (length comparison is useless: Greek runs longer).
- **A 404 under /en offered one door and it opened onto the Greek homepage.**
- **Escape closed the mobile drawer without restoring focus**, dropping it on
  `document.body` while the Close button did it correctly. Both paths now run
  one `close()`.

Three of the checks I wrote to verify these fixes were themselves wrong before
they were right — the language switcher is a group of LINKS using `aria-current`
(correct, and my assertion swept it in), unknown Greek paths are 307'd by
proxy.ts before any 404 renders, and my drawer selector matched a desktop
dropdown. Same pattern as every round: verify the harness before the finding.

**Not verified:** WebKit and Firefox engines are not installed locally, so the
`:has()` path is confirmed in Chrome only. The `@supports` guard is what makes
that acceptable rather than a gamble.

**Blocked:** unchanged — legal-entity details (ΓΕΜΗ/ΑΦΜ, registered office).

**Top risks:** 1) the consent-record gap above; 2) at 320×568 the last chip row
falls ~23px (EL) / ~75px (EN) below the fold — heading and first rows are above
it, and six Greek phrases cannot fit a 272px column, so this is accepted, not
unnoticed; 3) `/product`, `/compare`, `/company` and the OG cards still lead
with the category label, which the same review called unmemorable — the
homepage now leads with the decode, so those surfaces are inconsistent with it.

**Next 3 actions:** 1) decide the `proxy.ts` consent allowlist; 2) run the
seven-lens assessment loop against production — the clean-round counter resets
to **0**, because this is a structural change; 3) decide whether the
badge-leads-with-decode treatment should propagate to /product and /compare.

## Session wrap — 2026-08-08 (Round 11: converging — 7 candidates, one gating)

**Round 11: 7 candidates (28 → 12 → 7), 7 confirmed, 0 refuted.** One gating:
the **password-reset (OTP) modal on the English sign-in page showed raw Greek
server messages** — the API returns Greek-only strings in every branch and the
client rendered `payload.message` verbatim (with hardcoded-English fallbacks
that would leak the other way). The same defect class round 9 fixed on the same
page's main form, in the opposite direction, on the account-recovery path. The
API now returns stable machine codes alongside its (unchanged) messages, and
the modal maps codes to the bilingual dictionary.

The other six, all inconsistency-grade: /auth/verify-email had **no h1** (the
only such page in a 135-route sweep — its state cards used h2); the newsletter
field never got `aria-invalid`/`aria-describedby` when its error showed; the
footer CTA pair computed ~40px on mobile (`.pw-btn-sm` now floors at
`min-h-11`, which also fixes the header CTA); **apple-icon.png was JPEG data
served as image/png** (now a real 1.3KB PNG of the brand tile); and two EN copy
items on /product/motor — "Expires in 14 days" vs the site's "runs out", and
"Not only driving a car?", a word-for-word rendering of the Greek (now "More
than just a car?").

All verified against a production build, including driving the OTP modal on the
English UI (rejection now reads "OTP request failed.", not «Μη έγκυρο αίτημα»).
3,785 unit tests, full guardrail gate. **Counter: 0 of 3** — but the funnel is
converging hard: 28 → 12 → 7 candidates, and round 11's findings were all
polish-grade except the OTP modal.

## Session wrap — 2026-08-08 (Round 10: the favicon was still the Vercel triangle)

**Round 10: 12 candidates, 9 confirmed, 0 refuted** — half the candidate volume
of round 9, and the second consecutive round with a 100% confirmation rate.

**The install surface was unrebranded template debris.** The production favicon
was the **Next.js starter triangle**; the PWA icons were wrong-brand template
art; the manifest carried fabricated US-product screenshots with declared sizes
that did not match the files, an English-only description with stale "digital
wallet" positioning, and no `lang`. Now: a brand ICO (P-tile, 1.7KB vs 25KB),
an `app/icon.svg` for modern browsers, full-bleed maskable PWA icons with
purposes split honestly, the screenshots deleted rather than faked better, and
a Greek manifest aligned with the risk-check positioning.

**A dead end every invitee could hit:** an invalid/consumed/expired invite link
rendered an **English-only card with no navigation** on the Greek-default site
— and every redeemed invite email leaves a consumed link behind, so clicking
it twice landed there. Now bilingual (Greek leads, like the 404), with a home
link, a "ask for a fresh invitation" hint, and `noindex` on the whole token
route, which should never be indexed anyway.

**The rest:** the payments-guide FAQ promised reminders with no plan named —
the one remaining unattributed instance, sitting inside FAQPage JSON-LD; the
contact form's client-side validation announced nothing to a screen reader
(focus now moves to the first invalid field); forgot-password's error had no
aria linkage (now aria-invalid + describedby + role=alert, the signup
pattern); the newsletter form let the browser's native locale bubble preempt
its own localized error (noValidate); and the consent buttons shrank below
44px in phone landscape (min-h-11 floor).

All verified against a production build, plus 3,785 unit tests and the full
guardrail gate. **Clean-round counter: 0 of 3** — but candidate volume halved
and both remaining discovery lenses are converging.

## Session wrap — 2026-08-08 (Round 9: two of my own regressions, and seven more)

**Round 9 = a regression sweep of everything just shipped + five untouched
lenses** (guides/glossary, error states, mobile reality, social cards, copy
quality): 28 candidates, 9 verified, **9 confirmed, 0 refuted** — the first
round where nothing died in refutation, i.e. every finding was real.

**Two were regressions of this session's own work.** (1) `/auth/signin?lang=en`
rendered `<html lang="en">` over an entirely Greek page: in `app/auth/layout.tsx`
the TranslationsProvider sat ABOVE the language pin, so it chose the Greek
dictionary from the global default before AuthLanguageProvider set "en" below
it — and signin is the only auth page that consumes `t`, which is why its
siblings looked fine. Provider order swapped; pinned by
`tests/unit/auth-layout-provider-order.test.ts`. (2) The consent sheet was
still Greek on English AUTH pages: the banner read only the /en path prefix,
and the auth tree signals English via `?lang=en`. It now reads both signals.

**The rest:** guide comparison tables blew out PAGE-level horizontal scroll
(869px of blank white at 320px) — `[contain:paint]` on the scroll wrapper;
`/lexiko/prasini-karta` **wrongly said some EU countries require a Green Card**
(they never do inside the EU/EEA — corrected to match the car guide, in both
languages and in the FAQPage JSON-LD); `/lexiko/odiki-voitheia` listed
«Φροντίδα ατυχήματος» as a synonym — the exact confusion the entry exists to
correct — alias removed; two guides promised AI Q&A, advisor sharing and report
export with **no plan named** (all PolicyWallet Plus — now attributed in both
languages); `/auth/forgot-password` **hung forever** on any transport failure
(the awaited server action REJECTS, skipping `setSubmitting(false)` — now
try/catch/finally); and the Greek sign-in page showed **raw English Supabase
error text**, including the project hostname on network failures — error codes
now map to localized copy, generic fallback for everything unmapped.

All verified against a production build: signin English under ?lang=en and
Greek without, banner English on English auth pages, zero page-level scroll on
the guide at 320/375/1280, both glossary fixes live, and forgot-password
recovering with a visible error under a blocked POST.

## Session wrap — 2026-08-08 (Login & signup brought back into the product)

**A 12-agent consistency audit of the auth island: 26 candidates, 9 verified,
6 confirmed, 3 refuted. All six fixed.**

**The gating one: in dark mode, text typed into every auth field was 1.22:1.**
`.pw-input` set a background for both schemes but no text colour, leaving that
to the caller — the public pages remembered (`dark:text-white`, 14.63:1), the
auth forms supplied only the light half. A visitor whose OS is in dark mode
could not read the email address, phone number or reset code they were typing,
at the one moment the product asks them to type carefully. `defaultTheme:
"system"` means no action on their part was required to hit it. The colour now
lives in the utility, so a new caller inherits a readable field without knowing
any of this — and the light-only pins are gone from the three auth files,
because `:where()` keeps the utility at specificity 0 and a caller's own colour
would otherwise still win.

**Five consistency fixes**, all measured against the public header rather than
guessed: the wordmark was 24px/900 with a 2px word gap versus the header's
20px/700 tight — now identical; the signup submit was hand-rolled and the only
font-weight-700 button in the product, at the moment of conversion; the three
submits in one flow were three different sizes; password reset used a raw type
scale where its two siblings use the named ladder; and its back-link and
language switcher sat in a full-width header while sign-in and sign-up keep the
same two controls inside the 420px column.

**One root cause worth keeping.** The language switcher rendered at 16px in a
**24×24px** box — half the 44px the rest of the site enforces — because
`tailwind-merge` does not know this design system's named type ladder and was
silently DROPPING `text-caption` as an unrecognised class. `cn()` now registers
the ladder via `extendTailwindMerge`, so every `text-*` in the system resolves
instead of being discarded. That bug was invisible in source and only showed up
as a measured font size.

**Three findings were refuted** by the adversarial pass — a claim that the
cookie banner permanently covers the auth CTA on phones, one about hand-rolled
secondary buttons, and one about the card shadow.

**And a guard that lied.** The regression test written for the contrast bug
passed against the bug. `[^"]*` spans newlines, so a match started at an
unrelated quote pages earlier and swallowed everything up to the class string —
it matched nothing and reported success. Anchoring to `[^"\n]*` made it fail
correctly. Third guard this session to need its own bug fixed before being
trusted; see the browser-measurement-traps note.

## Session wrap — 2026-08-07 (Two owner decisions executed: consent records and locale)

**Both open decisions are closed, and both were one root cause wearing two faces.**

**Anonymous cookie consent is recorded again.** `/api/v1/consents` is declared
`auth: "public"` with a rate limit in the CI-enforced route inventory, but
`proxy.ts` fails closed and never allowlisted it — so the banner's POST was
307'd to `/auth/signin` and died as a **405 on every page of the site**. The
visitor's choice was always honoured (the banner writes the cookie and emits the
change *before* the fetch), so what was missing is the server-side record GDPR
Art. 7(1) wants. Added as a **prefix**, not an exact entry: `/consents/current`
is a second real route and exact matching would still have 307'd it. Measured
after: POST 200, `/current` 200.

Testing all nine declared-public routes turned up two more, neither a defect:
`/api/health` is blocked **deliberately** — `tests/e2e/sentry-api.spec.ts:56`
asserts it — so the inventory calling it `public` contradicts a passing test,
and `scripts/load/public-surface.js` measures a 307 in its pre-launch smoke set.
`/api/v1/auth/magic-link/request` is blocked and has **no caller anywhere** in
the repo; it will fail the day someone wires passwordless sign-in.

**The English journey no longer falls into a Greek signup form.** All 37 auth
links across 20 public files now carry the locale via a new `authHref`, and the
auth tree pins itself to it (`AuthLanguageProvider`). Persisting the language
instead would have been the obvious fix and the wrong one: the **Greek** tree has
no `StaticLanguageProvider` and relies on the global default, so writing "en"
into shared state would have turned Greek marketing pages English on the next
visit. The URL is the only signal that stays where it is put.

That exposed a two-layer clobber worth recording. `<html lang>` has **four**
writers, and the last one wins by design: `HtmlLang` renders last in `<body>`
precisely so it beats the providers on /en/*. Leaving /en for
`/auth/signup?lang=en`, its "restore the Greek default" branch overwrote the
English the auth provider had just pinned — and the global `LanguageProvider`
would have too. Both now stand down when `documentElement.dataset.langOwner` is
`"static"`. Ownership is the honest signal; the path check they used never was.

Verified end to end: the English hero CTA carries the locale, lands on an
English signup with `<html lang="en">`; the Greek journey is untouched, marker
free, `lang="el"`; and /, /pricing, /privacy and /product/motor are all still
Greek under an English browser locale.

## Session wrap — 2026-08-06 (Marketing site: launch-readiness loop closed — GO)

**Current phase:** marketing website **launch-ready**, uncommitted on NEW-UI
(parallel session shares the tree — stage selectively, never `git add -A`).

**Done.** The production-launch brief ran the audit loop to completion: six
findings waves (tier-honesty canon completed sitewide — «Ναι, με το Plus»
compare cells, Plus/Starter attributions on home, /product, motor, liability,
group-health, /solutions/agents and six glossary hooks; metas de-fused to
«Δωρεάν βασική σύνοψη»; legal `?lang=` metadata language-matched; HowTo
structured data made verbatim-visible; glossary title budget now
test-enforced), then **three consecutive zero-issue rounds** across five
components each (mechanical gate — 3,764 tests + 59/59 sweep — SEO+AEO, GEO,
consumer-persona and product-tree lenses), with explicit launch signoffs from
all four lenses. Executive Launch Report: `docs/audits/
marketing-launch-report-2026-08.md` §8; full round record in
`marketing-website-audit-2026-08.md` §"Launch-readiness loop".

**In progress:** nothing open on the marketing surfaces.

**Blocked:** legal-entity details (ΓΕΜΗ/ΑΦΜ, registered office) still
"coming soon" on /company + /privacy — owner input.

**Top risks:** 1) legal-entity placeholders at launch; 2) deploy-time env
verifications not yet run (NEXT_PUBLIC_SITE_URL origins, CWV on prod build,
preview noindex); 3) huge uncommitted working set shared with a parallel
session (selective staging required).

**Next 3 actions:** 1) owner supplies legal-entity details; 2) stage + commit
the marketing set selectively, run CI guardrails (`audit:api-auth`, `lint`,
`type-check`, `verify:migrations`, i18n/UTF-8); 3) after deploy, verify
origins/OG/sitemap on policywallet.gr and measure CWV.

## Session wrap — 2026-08-05 (Marketing site: 36 truth/positioning fixes + executive audit)

**Current phase:** marketing-website hardening, uncommitted on NEW-UI (a
parallel session shares the tree — stage selectively, never `git add -A`).

**Done.** Completed the risk-intelligence repositioning a prior session
started, then fixed **36 gate-level defects** found by rendered-page audits in
both languages: a FALSE "20 branches" claim shipping in FAQPage JSON-LD (now
derived from the catalog), a contradicting dead hero (~70 % of
`lib/landing/content.ts` deleted), document-manager SEO metas, four
contradictory speed claims (one canon: «σε λίγα λεπτά», codified as
`SPEED_CLAIM`), invented EN features and live-tracking implications, "fully
GDPR compliant" self-verdicts (×4, demoted to auditable behaviours), tier
overpromises (advisor sharing, reminders, guide CTAs promising free AI gap
detection Free doesn't ship), the agents page closing on B2C prices (price
band is now audience-aware and derives names/prices from `plan-defaults`), and
an EL/EN meaning-parity sweep of all 15 product pages. New permanent harness:
`tests/e2e/public-marketing.spec.ts` under a **`public-anon`** Playwright
project — ~70 routes × both locales × 320/1280 px: overflow, one-h1, heading
skips, `<html lang>`, console, global link integrity. **Final state measured
green:** 59/59 sweep, 3,724 unit tests, tsc/lint/i18n/utf8. Docs:
`docs/audits/marketing-website-audit-2026-08.md` (the deliverable — full
UX/SEO/AEO/GEO audit, scorecard, open-findings register) and
`marketing-launch-report-2026-08.md` (fix ledger + drift-prevention map).

**Loop completed (later the same session).** Two further briefs (content
rewrite; redesign pass) re-opened implementation: **all §11b items applied**,
plus 35 more findings across six audit-fix rounds — including a real
**`<html lang>` hydration race on /en/\*** (the global LanguageProvider could
stamp the Greek default over English pages after chunked hydration; fixed
with an ownership guard, caught and confirmed by the sweep) and a
group-pension meta promising "projections" the product doesn't have. The
validation loop then closed with **three consecutive zero-finding rounds
(7–9)**: each = full gate + 59/59 anonymous sweep + two independent
full-rubric auditors over every page pair, both languages. Round log in
`marketing-website-audit-2026-08.md` §"Validation loop — final record".

**Blocked:** nothing.

**Top risks (ranked):**
1. **Legal-entity vacuum** — /company and /privacy have no ΓΕΜΗ/ΑΦΜ/company
   name ("coming soon"): GDPR Art. 13 completeness + the biggest GEO
   groundability gap. Owner action, not code.
2. **CWV never measured on production** — architecture predicts green (RSC,
   zero raster images, few islands); predicts ≠ measured.
3. **LoBPageShell price band** reads `DEFAULT_PLAN_FACTS`, not the live
   catalog — an /admin/plans price edit updates /pricing but not the band
   (documented at source).
4. Vitest/tsc need Node **20.20.2** (`require(esm)`); the pinned 20.11.0 dies
   with ERR_REQUIRE_ESM — worth bumping `.nvmrc`.

**Next 3 actions:** (1) apply the §11b polish register (P1 grammar/claim items
first). (2) Add per-branch FAQ blocks to the 15 LoB pages (highest-leverage
AEO increment) + an axe pass in the public-anon sweep. (3) Fill in the legal
entity and verify `sameAs`/`NEXT_PUBLIC_SITE_URL` on the production deploy.

## Session wrap — 2026-08-05 (Playwright — the claims, measured)

**The gap flagged every round, closed.** Every responsive and accessibility
claim about the new surfaces was a *source-level* guard — a regex over the JSX
checking `min-h-11` appears. That catches a class being deleted. It cannot catch
a row that overflows because Greek runs ~30% longer than English, or a tap target
that computes to 38px because a parent constrained it, or a heading order that
only exists once components compose.

`tests/e2e/risk-intelligence.spec.ts` measures the rendered page: horizontal
overflow at **320px and 1280px**, computed tap-target heights, heading-level
ordering, and accessible names — across the risk profile, the timeline and the
cover page.

**What the measurement confirmed, and what it caught.** The overflow and
tap-target checks passed first time, on every surface at both widths — the
source-level discipline held up when actually measured. The heading test did not:

> **`UpgradeTriggerCard` rendered an `<h3>` directly under the page `<h1>`.**

A screen-reader user navigating by heading jumps h1 → h3 and cannot tell what was
skipped. It is a pre-existing defect in a shared monetization component used in
six places, invisible to source inspection because an `<h3>` in isolation is a
perfectly ordinary tag — the defect only exists in composition. The level is now
a prop defaulting to 2 (page level), with 3 passed where the card genuinely nests
under another heading.

**An unplanned confirmation.** The dev server logged Prisma failing on
`recommendation_instances.risk_id` — a column behind one of the two unapplied
migrations — and every page still rendered and passed. The fail-soft paths
written across this session work against a real database that is genuinely
missing those columns, which is the exact condition production is in today.

**Full regression: 84 passed, 1 flaky, 0 failed** (chromium, 40 min). The flaky
one — `money-path` locked-PDF-preview — waits 20s for an uploaded document
fixture and selects by button name; it touches no heading role, so the
`UpgradeTriggerCard` change is not implicated. Pre-existing timing flake.

**Playwright is no longer an outstanding gap — and neither are the migrations.**

**Both migrations are applied, to both projects** (2026-08-05, via Supabase MCP,
owner-authorised). Production `PolicyWallet-Prod` verified: 15/15 profile
columns, 7/7 recommendation columns, 1/1 score column, 2/2 tables, 5/5 indexes,
**2/2 foreign keys confirmed `ON DELETE CASCADE`** (`pg_constraint.confdeltype`,
checked explicitly because the GDPR erasure path relies on the cascade rather
than on a delete step someone has to remember). Row counts identical before and
after — 13 users, 8 profiles, 43 recommendations. Nothing altered, dropped or
backfilled. Both recorded in `_prisma_migrations` with the real SHA-256 of each
migration file, so Prisma sees them as applied rather than drifted. Dev
`PolicyWallet` migrated identically.

**Root cause of a recurring dead end, now understood.** `prisma migrate deploy`
and `verify:migrations` can *never* work in this repo: `DIRECT_URL` points at the
**transaction pooler (6543)**, and Prisma migrations need a session connection.
The `Environment variable not found: DIRECT_URL` error is a red herring — Prisma
loads `.env`, not `.env.local`, so fixing that only reveals the real failure, and
`verify:migrations` hangs rather than reporting. This is why the documented path
is MCP `apply_migration` plus a manual ledger row. Making the CLI work would
require the **session** pooler (5432) in `DIRECT_URL`.

**What this unlocks.** Life events, risk-profile versions, trends, timeline
causality and score history were all reading empty by design. They now have
tables behind them — so the causal chain the timeline draws, the trend arrows on
Risk DNA, and the score history all begin accumulating from the next engine run.
Nothing backfills: the history starts now, which is correct, since a fabricated
past would be the one thing this product must not do.

## Session wrap — 2026-08-05 (Time-to-Value — three questions, one true thing)

**The gap the CPO review named, closed.** A product whose thesis is *"we
understand your life, not your policies"* asked for a policy PDF or a
twenty-two-field wizard before it would say anything at all. Three questions now
sit in front of both: **where you live, do you have children who depend on you,
do you drive** — how an advisor actually opens a conversation, and answerable
without looking anything up.

The payoff is produced by the **real engine over the real catalog**, not a lookup
table of nice-sounding lines. A renter with children is told their household
would have to cover living costs from savings alone; an owner without children is
told what rebuilding after an earthquake costs. Every answer changes the outcome.

**7 issues found and fixed** across seven rounds. Three are worth naming, because
each was only visible by running the thing rather than reading it:

- **It accused drivers of having no compulsory cover.** At that moment the wallet
  is empty because *we have not looked yet*, not because they are uninsured —
  the engine cannot tell those apart. Motor TPL is compulsory and enforced in
  Greece, so the opening line was both very likely false and the fastest possible
  way to lose someone. Compulsory lines are now excluded from the first insight,
  and the screen says plainly that we have not seen their policies.
- **The middle question did nothing.** "Does anyone depend on your income" left
  the risk that needs it unreachable, because that risk requires *children* to be
  known too — so a customer with three children saw the identical finding to one
  with none, and two of their three answers appeared inert. Asking the narrower
  question answers both facts honestly.
- **The opener never disappeared.** Gated on the health index, which refuses to
  report below a third of the picture — three answers out of twenty-four factors
  is about a fifth. The customer answered, the page reloaded, and asked the same
  three questions again. It now has its own completion condition, which is a
  different question from "do we know enough to score this person".

Also: it returned a finding from zero answers (some risks apply to everyone in
Greece regardless of profile — true, but not what "from what you told us"
promises), and the write could overwrite a completed wizard with three coarse
answers, so it now never overwrites a fact already given properly.

**Validation:** 19 opener assertions · 3,392 unit tests, **zero regressions** ·
full guardrail gate · production build exit 0 · three consecutive clean rounds ·
the full reachable answer space swept exhaustively rather than sampled.

**Still outstanding, unchanged:** the two migrations remain unapplied, and
Playwright has not been run this session — all responsive and accessibility work
is guarded at source level, not measured in a browser.

## Session wrap — 2026-08-05 (CPO review — information architecture rebuilt)

**The finding was not a bug. It was a product failure.**

A policyholder had **ten navigation items, four of which answered "what are my
risks?"**. `/coverage-insights` stacked nine panels containing **four different
renderings of one assessment** — recommendations, the risk graph, a flat list of
all 21 risks, and a six-category score — and `/insights/risk-profile` added a
fifth in the nine dimensions. No customer can hold five models of their own risk
in their head, and reconciling them is our job, not theirs. A CEO would see it in
thirty seconds.

**What changed**

- **The dimension is now the drill-down.** Each of the nine carries its own risks
  in full — name, what the loss is, why it applies to *this* customer, and the
  mitigation ladder. The flat 21-risk panel is **deleted**, not hidden.
- **Two pages, two questions.** `/insights/risk-profile` → *Your risks* (the life),
  `/coverage-insights` → *Your cover* (what the documents say). Each links to the
  other instead of half-answering both. Nav labels say which is which, and risks
  now come before cover — the life before the paperwork.
- **The evidence view was preserved, not lost.** Removing the risk graph's old
  home would have deleted the only surface showing *why* we believe something,
  which is the product's whole claim to trust. It moved to the risks page, where
  it answers a genuinely different question from the dimensions: those are areas
  of life, this is the specific property, car or dependant.

**7 issues found and fixed** across seven assessment rounds:

five renderings of one assessment · the risk graph orphaned by the consolidation
(evidence view lost) · a health-index call to action that told a new customer to
answer questions and gave them **nowhere to go** — now a control · the household
panel rendering "People 1, Dependants 0, Assets 0, Obligations 0" at someone who
had told us nothing, when every other panel self-hides · `RiskAssessmentPanel`
left as dead code *with a test still guarding it*, which implies it is live ·
a dead local left behind on the cover page.

**Validation:** 3,373 unit tests, **zero regressions** · full guardrail gate ·
production build exit 0 · three consecutive clean rounds · ~31,000 fuzz cases
across two dozen seeds, asserting the nested risks stay consistent with their
dimension's counts and that no risk appears in two dimensions.

**What I did NOT do, and would do next.** The deepest weakness is still
**Time-to-Value**: nothing works until a customer uploads a PDF or completes a
22-field wizard, and the first thing a product built on "we understand your life,
not your policies" asks for is a policy. The strongest next move is a three-
question opener that produces one true, specific statement about their life
before any document exists — the engine already handles partial answers
correctly, so this is a UI flow, not an engine change. That is a bigger piece of
work than a review round should smuggle in, and it is the single highest-value
item on the backlog.

## Session wrap — 2026-08-05 (Risk Intelligence Platform — 3 clean assessments, 6 issues fixed)

**Current phase:** implemented, not deployed. No schema change, no new API route.
Spec: [architecture/risk-dna.md](architecture/risk-dna.md).

### Implemented

**Risk DNA** is the keystone — nine dimensions, and **Protection Score 2.0**,
**Risk Categories**, **Risk Trends** and the **Customer Health Index** are all
readings of the same single dimension pass, so they cannot disagree with each
other on screen.

- **The founding constraint holds: there is no second composite.** The nine
  dimensions do not roll into a "DNA score". The protection score remains the
  only composite, and a second one would immediately contradict it in front of
  the customer. Generous secondary membership is safe *because* primary
  membership is unique — asserted by a test over the whole catalog.
- **Financial Resilience** is the one dimension that is capacity, not cover: the
  denominator, with nothing to buy and no gap to close. It is the first thing a
  commercially-minded revision would drop, so a test pins that it never sells.
- **A dimension that does not apply scores `null`, never 0.** A childless renter
  has no Family exposure, and scoring that zero reports the safest position as
  the worst.
- **Customer Health Index** measures the *relationship*, not the cover — how much
  of a life we have established, how current it is, how much we could decide. It
  explicitly does not count policies, because the customer a traditional CRM
  ranks highest is the one with broad cover it cannot read.
- **Household Risk Overview**, **Continuous Risk Monitoring** (a standing watch
  that reports `clear` as a result, because a watch that only appears when
  something is wrong cannot be told from a broken one), and **Prediction Engine
  hooks** — a typed seam plus observations, with **no forecasts and no invented
  probabilities**. A predictor trained on a history this product has not
  accumulated is a random number with a confidence score attached.

**Advisor Opportunity Engine + Executive Dashboard — the CRM removal.** The
existing scorer ranked by `ConversionLikelihood`: gap severity because "critical
gaps convert better", engagement because "active users convert better". That is a
sales-lead queue with an insurance vocabulary, and it sinks the household that
never logs in and needs help most. The replacement ranks by **advisory impact** —
protection recoverable, exposure standing open, how many people a gap reaches,
and how much only a human can settle. Conversion is not a factor; a test forbids
the vocabulary in the model. The executive view counts households, people covered
and protection recoverable — never premium, commission or conversion.

**Every feature answers the five questions**, with `null` as a legitimate answer:
what changed (trend, absent without history rather than faked), why it matters
(the actual open risk's impact), what next (from the mitigation ladder, so it can
be "keep a fund instead"), confidence (with the reason it is limited), and how it
improves protection — **computed by re-running the real scorer**, never estimated,
and suppressed entirely when the movement is zero or negative.

### Architecture changes

Everything is derived on read; **no new tables, no migration**. `lib/services/
risk-dna/` — `dimensions` (data), `compute` (the five answers), `health-index`
(index, household, trends), `monitoring` (watch + prediction seam),
`advisory-impact` (advisor + executive), `book`, `service` (one read, one pass).
Two customer surfaces (`/insights/risk-profile`) and one advisor surface
(`/insights/book`), both in the primary nav.

### 6 issues found and fixed

A `protectionScore: null` field that could never be anything else · a dead
re-export promising an executive dashboard that did not exist yet · two features
built and unwired · the surfaces missing from navigation · and — the fourth
recurrence this session — **`typeof x === "number"` used as a finite check, which
`NaN` passes**, reaching the customer as "Property fell by NaN". `Number.isFinite`
is the guard that matters.

### Remaining technical debt

- **Two migrations remain unapplied** (`20260804120000`, `20260804140000`). Until
  they are, trend and history read empty everywhere and the risk-profile version
  table returns nothing — every consumer fails soft, by design.
- **Playwright has not been run this session.** All responsive and a11y work is
  guarded at source level, not measured in a browser.
- `opportunity-scoring.ts` still exists for the surfaces that speak it. Nothing in
  the new layer reads it; it should be retired once those surfaces move.
- `getAdvisorBook` computes full intelligence per household and is capped at 60,
  reported rather than silently truncated. Fine for tens, wrong for thousands.
- The `urgency`/`priority` alias on recommendations is still pending a rename.

### Future enhancement opportunities

- Feed the labelled outcome history the prediction seam needs, then fill it.
- Per-object intake (which property, which vehicle) — the ceiling on the risk
  graph's precision and on the limit dimension.
- Territorial and sum-insured extraction, which would let three protection
  dimensions resolve instead of reading `unknown`.
- A household view that models *members* rather than a dependant count.

**Validation:** 46 risk-DNA assertions · 3,373 unit tests, **zero regressions** ·
full guardrail gate · production build exit 0 · three consecutive clean
assessments · ~20,000 fuzz cases across two dozen seeds.

## Session wrap — 2026-08-05 (Life Timeline BUILT — 3 clean audits, 13 issues fixed)

**Current phase:** implemented, not deployed. No schema change, no new API route.
Spec: [architecture/personal-life-timeline.md](architecture/personal-life-timeline.md).

**What it answers.** Two questions the product could previously only answer with
"the engine decided": *why is this recommendation on my screen*, and *why did my
score move*. Both are recovered from data that already existed —
`RiskProfileVersion` stores a per-risk snapshot alongside the trigger that
produced it, so consecutive versions can be **diffed**. The score did not "go
down": three specific risks opened, and one opened because the customer declared
a mortgage on the 14th.

**The causal chain is real, not inferred:**

    recommendation → the version where its risk opened → the event that
    triggered that version

Three sources of truth, tried in order of how much each actually knows —
`version_event` (recorded fact), `version_trigger` (a recalculation, but nothing
the customer declared caused it), `exposing_event` (no history reaches back, but
a declared event this risk structurally depends on predates the finding).
**Returning nothing is the fourth answer and a legitimate one.** A wrong cause is
worse than no cause: it teaches the customer the explanations are decorative.

**Where it appears.** A `/timeline` page in the primary nav; a *What changed
lately* widget on the dashboard; and — the mission's core requirement — a **"Why
you are seeing this"** block on the recommendation card itself, on all three
surfaces that render one, linking back to where the cause sits in context.

**Claims are absent, deliberately.** The mission lists them; this product has no
claims model — no table, no thread category, nothing. An entry kind nothing can
produce is an unreachable state, not a placeholder, so the kind is simply not
there. Adding it later is one entry in the source registry. The other **eight
sources are all live**.

**13 issues found and fixed**, counter reset at each. The one worth naming first:
**risk rows crowded out everything else.** Twelve recalculations flipping eight
risks each filled the entire window — the timeline built to explain
recommendations showed **zero recommendations, zero life events, zero policies**.
Capped at three rows per version, ranked by consequence; nothing is lost, because
the score entry above states the full counts.

Others: a hidden `Date.now()` · the version history re-walked once per
recommendation · `/timeline` missing from the nav · **the repo's own expiry guard
caught me comparing milliseconds for a calendar question — the third time** · a
`react-hooks` lint error · duplicate entry ids from a repeated risk in a Json
snapshot (duplicate React keys, and "2 risks opened" for one risk) · an
unreadable date throwing through the page · **causes left dangling by the
unplaceable-entry filter**, so "Why this?" scrolled nowhere · a dead `variant`
prop nothing passed · non-finite scores printing "Protection score: NaN" · a
delta badge surviving as "+NaN" beside a sentence saying we knew too little to
say — now one predicate governs the title, the explanation and the badge.

**Validation:** 45 timeline assertions · 3,323 unit tests, **zero regressions**
(the same 4 pre-existing jsdom/env failures throughout) · full guardrail gate ·
production build exit 0 · three consecutive clean audits. Ad-hoc runs covered
**~50,000 fuzz cases** across two dozen seeds, asserting on every one that no
entry points at something absent, that nothing prints an unreadable value, and
that the ordering is deterministic.

## Session wrap — 2026-08-04 (Context-aware recommendations — 3 clean audits, 9 issues fixed)

**Current phase:** implemented, not deployed. No schema change, no new API route.

**What the audit found.** The rule "never recommend insurance because a policy is
missing" already held — applicability is decided before cover is consulted, the two
service-absence rules (`no_agent_connected`, `unclear_exclusions`) are deliberately not
pushed, and the score already gates on `scorableRisks`. All of it pinned by tests. The
real gaps were elsewhere.

**Four of the nine required fields did not exist**, and one of the five that did was a
lie:

- **Urgency was an alias for priority** — literally `urgency: a.priority`. Two names,
  one number, and neither told the customer what to do first. They are now separate
  axes. Priority asks how much the loss would hurt; **urgency asks whether there is a
  deadline**, and derives one only where a deadline really exists: cover that is
  compulsory and absent, cover that has expired, an exposure opened by a life event in
  the last 90 days, or a narrowing underwriting window. Everything else is
  `no_deadline` — the common case, and no badge. *A list where everything is urgent has
  no urgency in it.*
- **Evidence** now comes from the risk graph — the things in their life that produce the
  risk, and the cover that does or does not answer it.
- **Advisor opportunity** is derived from what we could NOT settle (market eligibility,
  unreadable cover, several objects to map, unanswered factors) and returns **null when
  nothing is unresolved** rather than manufacturing a reason to involve someone. Framed
  as the advisor's work, not a pitch — under IDD / Law 4583/2018 the regulated act is
  the advice, not our analysis. A test bans sales vocabulary.
- **Customer benefit** follows the mitigation ladder, so a risk whose best answer is
  "keep a fund instead" says that. A benefit field that always described a purchase
  would quietly turn the ladder back into a catalogue.

All four are **derived from the live assessment, never read off the persisted row** — so
they are correct the instant a profile changes, even before the row is rewritten.

**Which risks a life event opened is derived, not authored.** `ContextDelta.factor` and
`RiskDefinition.requires` already share a vocabulary, so an event exposes a risk when it
moved a factor that risk depends on. `birth → life_dependents`, `mortgage → life_debt`,
`pet_adoption → pet_costs`, with no second table to maintain.

**9 issues found and fixed**, counter reset at each. Besides the four missing fields:

- **Profile saves raced the page.** Both write paths fired the engine unawaited while
  the wizard called `router.refresh()`, so the customer answered "I have two children",
  watched the page reload, and saw the same recommendations — the one moment the product
  most needs to show that answering changes the advice. Both now await, still non-fatal.
- **Two pages read the raw rows.** The wallet policy page and the branch page called
  `getActiveRecommendations` directly and rendered cards missing four of the nine fields.
  A field set that depends on which function you happened to call is how surfaces drift;
  there is now one complete read, and a test that no page bypasses it.
- **Copy defects (2).** The English fabricated "your late 50s" for a 52-year-old (the
  decade was computed from the band's start), and the Greek used the closing age for
  both clauses so it read "harden as you approach 65 and stop around 65".
- **An unreadable event date threw** straight through the engine snapshot, with no
  per-row catch — one bad row would have taken the recommendations *and* the score off
  the page. Same class as the risk-graph date defect; now guarded.

**`urgency` is kept as a deprecated alias** for the fifteen surfaces that speak it
(agent dashboards, action queue, weekly digest, the persisted column). Both names are
assigned from one expression at one site and a test pins them equal, so they cannot
drift while the rename waits.

**Validation:** 36 recommendation-context assertions (including a 2,000-case seeded fuzz
over partially-answered profiles) · 3,278 unit tests, **zero regressions** · full
guardrail gate · production build exit 0 · three consecutive clean audits. Ad-hoc runs
during validation covered **~65,000 fuzz cases** across two dozen seeds, asserting on
every one that nothing reaches a recommendation without an exposure, that the score
contains only applicable risks, and that no card is missing a field.

## Session wrap — 2026-08-04 (Personal Risk Graph BUILT — 3 clean rounds, 22 issues fixed)

**Current phase:** implemented, not deployed. Spec + delta:
[architecture/personal-risk-graph.md](architecture/personal-risk-graph.md) §15.

**The idea, in one line:** *the app now models the customer's LIFE, and policies are
protections attached to it.* Rows are things — a property, a car, a dependant — not
products. `Policy`, `Cover` and `Claim` are **absent from the node vocabulary**, pinned
by a test, because one insurance node type is all it takes for a life model to slide
back into a product model.

**Derived, not stored — no third migration.** The graph is projected from the profile
and the wallet on every read. Nothing to backfill, nothing to keep in sync, every
existing surface still reads `LifeContext` untouched.

**What it can say that the flat model could not:**
- **Which one.** `propertiesOwned: 2` becomes two independently-coverable nodes, so one
  policy across two houses is `partially_protected` **with evidence saying why** —
  replacing the `minPolicies` count comparison.
- **How well.** Cover is judged per dimension (peril / limit / territory / period), so
  a home policy naming only fire stops reading as "covered".
- **On what basis.** Every risk carries structured evidence naming the node and the
  policy behind the verdict.

**One verdict per risk, everywhere.** `already_covered` is downgraded to `needs_review`
wherever the graph finds cover partial or unreadable — on **both** engine paths, so the
score, the risk list and the graph panel cannot disagree. One-way by construction: the
graph may lower a coverage claim, never invent one. **Scores will move**: a wallet whose
contents we cannot read now scores lower, because the old number counted an unread PDF
as protection.

**22 issues found and fixed**, counter reset at each. The dominant class, found six
times: **a node's existence condition drawn tighter than the applicability condition of
the risk anchored to it** — so a risk applied to a real person and pointed at nothing in
their life. `professional_liability` wanted a job title the risk never required ·
`landlord_letting` reserved property 1 as "the home" for people who rent, and needed a
property node at all for someone who only answered the letting question ·
`employer_liability` demanded `ownsBusiness` from someone who had declared five
employees · `income_interruption` demanded a salary figure from someone who had only
said they were employed · `life_debt` anchored to mortgages only, missing car loans ·
`pet_costs` produced no pet for "yes, I have pets" with a zero count.

Others worth naming: **two of the four states were unreachable** when first built
(territory was permanently unevaluable, and `period` being always-evaluable made
`unknown` impossible) · territory then still docked **every** insured motorist for
extraction we do not do · `limit` reported satisfied merely because a number was
readable, so €10k of cover on a €180k mortgage rolled up to `protected` · the
count-shortfall downgrade showed an amber badge beside three green dimensions and
**nothing explaining it** · the repo's own guard caught me hand-rolling expiry maths
instead of using the one Athens-calendar clock · an unparseable `endDate` threw
straight through the graph · evidence conjugated a label into a sentence ("You is
recorded in your profile", and Greek adjective agreement no template can do) · raw
extraction tokens ("home", "earthquake") sat inside Greek copy · condition and activity
ids rendered untranslated while both label maps already existed · the panel printed
every failed dimension twice.

**Search, not inspection.** Three independent strategies, all now permanent tests: 19
personas, a **~315-case axis sweep**, and a **3,000-case seeded fuzz over
partially-answered profiles** — the last found what the first two structurally could
not, because both always answered everything. Ad-hoc runs during validation covered
**1,137 pairwise combinations and ~70,000 fuzz cases** across a dozen seeds.

**Validation:** 74 risk-graph assertions · 3,242 unit tests, **zero regressions** (the
same 4 pre-existing jsdom/env failures throughout) · full guardrail gate · production
build exit 0 · three consecutive clean rounds.

**No schema change, no new API route, no new personal-data store** — so no migration
and no DSR wiring. The two migrations from earlier today still **must be applied before
merge**.

## Session wrap — 2026-08-04 (Life Event Engine BUILT — 3 clean rounds, 12 issues fixed)

**Current phase:** implemented, not deployed. Spec:
[architecture/life-event-model.md](architecture/life-event-model.md).

**The architecture, in one line:** *life events write to CONTEXT; the risk catalog
decides, unchanged.* An event's only channel is a `ContextDelta`. There is **no field
on a definition in which a product, premium or severity could be written**, so the
product-trigger pattern ("you got married → buy life insurance") is unrepresentable
rather than merely discouraged — asserted by a test.

**Extensible by construction.** `applyLifeEvent` is generic over `ContextDelta[]`;
there is no branch on an event id anywhere. **Adding an event is a registry row, never
a code change** — including the API schema, which validates against the registry.

**22 events** covering all 19 the brief required, plus the disposals that make risk
*reduction* expressible at all (`property_sale`, `vehicle_disposal`,
`mortgage_cleared`, `child_leaves_home`). A model with only acquisitions is a ratchet.

**Versioned risk profiles, recalculated automatically.** New `RiskProfileVersion` is
fingerprinted on status/priority/coverage — an unchanged assessment writes **no row**,
so the history records *changes* rather than cron ticks, and rewording a risk
explanation cannot manufacture a version.

**12 issues found and fixed**, counter reset at each:
- **DSR (3)** — `LifeEventInstance` and `RiskProfileVersion` absent from the Art. 15
  export; and because erasure is *anonymize-in-place* (the User row survives),
  `ON DELETE CASCADE` never fires — **life events would have outlived an erasure
  request**. `petsCount` was also missing from the export. Third occurrence of this
  defect class; now guarded.
- **A bug I introduced (1)** — the erasure summary reads results **positionally** out
  of a `Promise.all`; inserting two deletes shifted every count after them.
- **Engine semantics (4)** — `child_leaves_home` could *never* retire the life risk
  (`totalDependents` took `max(dependents, children)`, so the one event meant to reduce
  cover was inert) · `property_sale` left `residenceType: "owned"` so the buildings
  risk survived the sale · a letting flag with no property behind it kept the landlord
  risk open · `renting` wrongly claimed to retire the buildings risk.
- **Robustness (1)** — `set` wrote `NaN`/`Infinity` straight into the profile;
  `z.number()` accepts `Infinity` without `.finite()`.
- **Provenance (1)** — every automatic version was stamped `policy_change`, so a
  questionnaire submission and a nightly cron both appeared as policy changes. The one
  column that explains a score movement was saying the wrong thing.
- **UI (2)** — a hand-rolled primary button (design-system guardrail caught it) · a
  ~2,500px picker at 320px; descriptions moved into the expanded state → **1,583px**.

**Validation:** 405 risk-engine assertions · 3,213 unit tests, **zero regressions** ·
full guardrail gate · production build exit 0 · 320–1280 measured in Chrome (zero
overflow, zero sub-24px targets) · 31 controls accessibility-audited clean · event
semantics, adversarial and the 24-scenario risk suite all re-run against final code.

**Migration `20260804140000_life_event_engine`** — two additive tables, generated from
`prisma migrate diff` and verified column-for-column against Prisma's own DDL. Nothing
existing is altered, so every current surface keeps working. **Must be applied before
merge**, along with `20260804120000_life_context_risk_assessment`.

## Session wrap — 2026-08-04 (Recommendations are now risk-first, not product-first)

**Current phase:** delivered, not deployed. Backlog agreed before coding:
[audits/risk-centric-recommendations-backlog.md](audits/risk-centric-recommendations-backlog.md).

**The audit found the risk catalog already risk-centric — and three things that were not.**

1. **Insurance was the only mitigation the model could express.** All 21
   `suggestedSolution` entries named an insurance product, not because that was the
   judgement but because there was no field an author could write anything else in.
   Now every risk carries a **`Mitigation[]` ladder — avoid / reduce / retain /
   transfer** — and `suggestedSolution` is *derived* from the transfer entries so the
   two cannot drift. Three risks now lead with **retain**: for a healthy young pet,
   "keep a vet fund instead" is the honest advice, and a product that cannot say so
   is not advising.
2. **Two recommendations described no risk at all.** `no_agent_connected` ("you have
   no advisor") and `unclear_exclusions` ("we could not read your exclusions" — a
   statement about *our* extraction). Both occupied recommendation slots, counted in
   `gapCount` and dragged the score. Both removed; `noAgentRule` retained for
   whatever UI wants an advisor prompt, which is not a protection finding.
3. **Five real risks were titled from the policy's point of view.** "Motor policy
   appears to lack roadside assistance" → **"A breakdown would be towed at your own
   cost."** The reason strings were already risk-shaped; only the headline was
   inverted, and the headline is what the customer reads.

**Also:** **Current protection** is now stated on every card ("Καμία / None") rather
than left to be inferred from a status chip · exposure is quantified where we have
the number — «Έχετε 2 κατοικίδια», degrading to the boolean rather than inventing one
(new `petsCount`).

**Validation:** 361 risk-engine assertions · 3,167 unit tests, **zero regressions** ·
full guardrail gate · production build exit 0 · **320–1280 re-measured in Chrome with
the ladder expanded, in Greek: zero overflow, zero sub-24px targets.**

**Migration note:** the same unapplied migration now also adds `mitigations`,
`pets_count` and `assessment_coverage`. Still additive and idempotent; still must be
applied before merge.

**Left alone deliberately:** AI-detected policy gaps (`policy_gap:*`) describe a
specific document's contents, so the subject genuinely *is* the policy — rewriting
them risk-first would be miscategorisation.

## Session wrap — 2026-08-04 (Risk engine VALIDATED — 3 clean rounds, 17 issues fixed)

**Current phase:** the Life Context Risk Assessment Engine built earlier this
session has been validated end to end. Full report:
[audits/risk-engine-validation-2026-08-04.md](audits/risk-engine-validation-2026-08-04.md).
Still **not deployed**; the migration must be applied before merge.

**Result: three consecutive complete assessment rounds, zero issues** — after 17
found and fixed, with the counter reset at each discovery.

**A round** = 355 risk-engine assertions (24 scenarios × 11 invariant classes +
catalog integrity + a 3,072-combination reachability sweep + mobile + cross-surface
+ intake boundary) · full unit suite diffed against a pre-change baseline (3,163
passing, **0 regressions**) · the whole CI guardrail gate · production build exit 0.
Each round was preceded by *new* inspection — re-running the same assertions is not
an assessment.

**The 17, grouped by what they broke:**
- **Applicability (4)** — boat ownership was invisible (a *compulsory* liability in
  Greece); a skipped select became a declaration, dismissing both property risks;
  "never asked about your health" read as "no chronic condition"; "not an owner" was
  read as "tenant".
- **Actuarial (5)** — score compression (every uncovered profile in 19–46; a single
  renter 35 vs a landlord with two uninsured properties 25 — now 75 vs 47); fixed
  category weights ignoring actual exposure; a **confident 90 "Excellent" for someone
  we had never asked a question**; a convenience product (private treatment *speed*)
  outranking an uninsured business; a holiday home falsely reported as covered by one
  policy for two houses.
- **Cross-surface (4)** — three different definitions of "profile completeness"; the
  advisor playbook reading a legacy boolean; the **dashboard** still rendering a raw
  score; upgrading would have resurrected every dismissed card.
- **AI (1)** — `null` and `[]` rendered identically, telling the model someone had
  declared themselves free of chronic conditions when nobody had asked.
- **Copy/UX (3)** — the «Ζωή» tile showing a gap on 17 of 24 scenarios; Greek copy
  reading the customer's answer back in English; `"2 month(s)"`.

**Two candidates were chased down and found NOT to be defects** — the disclosure
chevron (Tailwind 4 sets `rotate`, not `transform`, and I was reading mid-transition)
and 40 apparent false positives (my harness compared branch *families*, so a
legitimate `renters` suggestion counted as a `home` one). Fixing either would have
been the error.

**Verification beyond the automated gate:** every one of the 21 recommendations read
end to end in both languages · **real browser layout measurement** — panel
server-rendered with production CSS, all cards expanded, in Greek, measured in Chrome
at 320/360/390/414/768/1024/1280: **zero overflow, zero sub-24px tap targets** · 14
adversarial input classes (null, NaN, Infinity, MAX_SAFE_INTEGER, markup injection,
500-policy portfolio) — no crash, no broken copy, no out-of-range score · a
three-questions pass over all 21 risks · two independently-written harnesses agreeing.

**Remaining risks (none a defect in what was built):**
1. **Migration must be applied before merge** (`20260804120000_life_context_risk_assessment`,
   additive + idempotent). `verify:migrations` cannot run on this network by
   construction; verified instead against `prisma migrate diff --from-empty` —
   **every column type, default and index matches Prisma's own DDL exactly.**
2. **Playwright E2E not run** (environmental). The component was measured in a real
   browser; the assembled pages were not.
3. **Adequacy still unmeasured** — a €10k life policy against €300k of debt still
   reads as covered. Disclosed in `scoreMethodologyLimits`; waits on F-05.
4. **The AI risk analysis still has no caller** and cannot see the new factors.
5. Score bands are calibrated judgement; `critical_illness` still absent from the
   taxonomy; no admin surface for the catalog (deliberate).

**Next 3 actions:** (1) apply the migration via Supabase MCP, then merge. (2) Run the
Playwright responsive sweep over `/coverage-insights` and `/branches`. (3) Decide
whether to wire the AI risk analysis — and if so, extend `RiskProfileInput` first.

## Session wrap — 2026-08-04 (Life Context Risk Assessment Engine — BUILT, not deployed)

**Current phase:** the audit below was executed. The recommendation engine is now a
**Life Context Risk Assessment Engine**. Not deployed; **one migration must be applied
before merge** (the deploy.yml contract).

**The architectural change, in one line:** cover is consulted **last**.
`assessRisks` asks, in order — are the deciding facts known → does the exposure exist →
is it already covered → can insurance answer it → essential or discretionary. A risk that
does not apply is never examined for cover, so it *cannot* become a recommendation. "Never
recommend for an exposure that does not exist" is now a property of the control flow, not
a rule each author has to remember.

**New modules** (`lib/services/gap-engine/`): `life-context.ts` (21 contextual factors,
each carrying a `known` flag), `risk-types.ts` (the six-status vocabulary),
`risk-catalog.ts` (20 risks, each a LOSS conditioned on life, never a product),
`risk-assessment.ts` (the classifier + selectors).

**Every recommendation now carries** risk explanation · why it applies · expected impact ·
priority · suggested solution · confidence — bilingual, from the catalog, persisted on
`RecommendationInstance`. Six statuses: applicable / not applicable / already covered /
needs review / protection gap / opportunity.

**Audit P0s, all closed:**
1. **R-01** `expectedLines` is now `relevantLines(assessments)` — only lines applicable
   risks call for. The dead, disagreeing duplicate `getExpectedLines` is deleted.
2. **R-02** the diabetic no longer gets a *critical* push for cover that excludes their
   condition — reframed onto hospital cash, with the pre-existing exclusion on the card.
3. **R-03** family history is now a priority *escalator*, never a life risk of its own.
4. **R-04** `no_health` is gone; `health_access_delay` is honest (waiting time, not absence
   of cover) and discretionary.
5. **R-05** income protection is unshadowable — a 3,072-combination sweep asserts **every**
   catalog risk can reach a user.
6. **R-06** `answeredFields` makes "we never asked" distinct from "no". Unknown →
   `needs_review`, never a gap. Backwards compatible; no backfill.

**Also:** the AI prompt no longer asserts defaults as facts (`Unknown (not asked)`) and
carries an Applicability section that outranks the rest · renters, business owners,
landlords, employers, valuables, cyber, activities and retirement are all reachable risks
now · occupation drives professional-liability priority · debt size drives life priority
(€900 ≠ €300,000) · `coverHeldElsewhere` stops us flagging a gap against the cover a Greek
lender already required.

**Same personas, before → after:** renter with a car had phantom **home/life** gap tiles →
now `motor` covered and home/pet/cyber/travel explicitly *not applicable* · 28-year-old
with a dog had **5** gap tiles, 4 wrong → now pet only · retired 72-year-old had a
**critical** life gap → life not applicable, score 25 → 78 · brand-new user scored **0
"Critical"** → 18 risks `needs_review`, **zero** gaps asserted, score 60 flagged
provisional.

**Validation:** 46 new unit tests (incl. the reachability sweep) · **zero regressions**
against a pre-change baseline (2851 passing; the 224 failures are a pre-existing local
jsdom breakage — `html-encoding-sniffer` requires an ESM module — identical before and
after) · full guardrail gate green (audit:api-auth, lint, i18n, utf8, encoding,
type-check) · **production build exit 0**.

**Found and fixed en route (the repo's own guards caught it):** the new personal-data
columns were absent from the **GDPR Art. 15 export** — `subject-access-completeness`
failed and now passes. Also: two of my label styles were below the WCAG AA contrast floor,
and my first cut read `answeredFields` *inside* the response transaction rather than
before it.

**Blocked / owner action:**
1. **Migration `20260804120000_life_context_risk_assessment` must be applied to prod and
   dev via the Supabase MCP path BEFORE merge.** Additive and idempotent throughout.
   `verify:migrations` could NOT be run — it hangs by construction on this network (the
   migrate engine takes a session-level advisory lock transaction-mode pgbouncer cannot
   hold). Verified instead by diffing against `prisma migrate diff --from-empty
   --to-schema-datamodel`: **every column type, default and index matches Prisma's own
   DDL exactly.**
2. **E2E not run** — the local jsdom/vitest breakage above is environmental; Playwright
   was not exercised. Worth a pass on `/coverage-insights` and `/branches` before merge.

**Deliberately not done:** `critical_illness` is still absent from the taxonomy (adding a
branch changes the policy Zod enum and the extraction prompt enum — wider blast radius
than R-03's fix needed) · true sum-assured **adequacy** still waits on F-05's
`PolicyCoverage` projection, since building it on `acordData` JSON would be the wrong
foundation · no DB-backed admin surface for the risk catalog (that is how the gap
definitions grew an auto-mint feedback loop) · wizard is still one form, not steps.

**Next 3 actions:** (1) apply the migration via Supabase MCP, then merge. (2) Run the
Playwright responsive sweep over `/coverage-insights` at 320–1920. (3) Decide R-07 — the
AI risk analysis is now safe to enable (R-08 landed) but still has no caller.

## Session wrap — 2026-08-04 (Risk-engine context-awareness audit — REPORT ONLY, no code changed)

**Current phase:** audit delivered, backlog not yet started. Full report:
[audits/risk-engine-context-awareness-2026-08.md](audits/risk-engine-context-awareness-2026-08.md).

**Question asked:** does a recommendation appear because the customer carries the risk, or
because a policy is absent from the wallet? **Verdict: context-aware in architecture, not
yet in content.** Findings were produced by *executing* the engine (esbuild-bundled, no DB)
over 8 personas and an exhaustive 18,432-combination enumeration — not by reading it.

**Broken (gates launch) — 6 items, P0:**
1. **`expectedLines` turns a category verdict into per-line verdicts**
   (`protection-score.ts:319`), so branch tiles show "gap" for lines the score itself rules
   inapplicable. Observed: a renter with a car is shown a **home** gap; a single 28-year-old
   with a dog is shown **home, life, travel, pet and cyber** gaps. The correct function,
   `getExpectedLines`, already exists in `profile-gap-rules.ts:427` **with zero callers**.
2. **`chronic_condition_no_health`** promises, at *critical*, private health cover for the
   declared condition — which Greek underwriting excludes as pre-existing. Only finding with
   direct customer harm.
3. **`family_history_no_life`** spends a morbidity signal on a mortality product; fires for
   people with no dependents and no debt, i.e. nobody to suffer the loss.
4. **`no_health`** discards its profile argument entirely — recommends from product absence,
   and is why an empty profile scores 0/100 "Critical".
5. **`income_no_protection` can never surface** (proven over all 18,432 combinations) — it is
   always shadowed by `dependents_no_life` on the same line. So «Προστασία Εισοδήματος», a
   weighted, labelled score category, has **no reachable rule**.
6. **DB defaults are indistinguishable from declarations** (`ownsHome:false` etc.), and the
   wizard's `useState` defaults write "single"/"employed" as facts if untouched.

**Also broken, not customer-visible:** the **AI risk analysis has zero callers** —
`ai_insights=true` appears only in the route that defines it, so `analyzeRiskProfile` is
fully built (3 providers, gateway, model pinning, prompt overrides, eval scorer) and never
runs. It is the only consumer of **11 of 23 profile fields**, including Art. 9 health data.

**Product (does NOT gate):** no needs analysis anywhere — a €300k mortgage with 3 dependents
scores **89/100 "Excellent"** because the score measures product ownership, not adequacy.
**This is honestly disclosed** in `scoreMethodologyLimits`, so it is a capability gap, not a
deception. Also: renters, business ownership (asked in onboarding, then discarded),
cover-held-elsewhere (banks mandate the very cover we flag as missing).

**UI/UX (separate backlog):** Greek category labels truncate to indistinguishable stubs in
the 320px `grid-cols-2` score grid; the "wizard" is one 23-field form with no steps and is
the engine's *only* B2C intake; free-tier users see a critical verdict with the evidence
paywalled. Responsive foundation itself is solid — nothing regressed.

**What's already right (don't "fix" it):** `pets_no_pet` is correctly gated on `hasPets`;
portfolio rules fire only against policies actually held; coverage liveness is derived;
prioritization ranks by protection weight not premium; `syncRecommendations` retires stale
rules; IDD framing holds throughout.

**Next 3 actions:** (1) R-01 — swap the `expectedLines` loop for the existing
`getExpectedLines`; smallest change, largest false-positive reduction. (2) R-02/R-03 —
re-severity and reframe the two clinically wrong rules. (3) R-07 — decide whether the AI
risk analysis gets wired or deleted; `/admin/ai` currently offers knobs for an operation
that cannot run.

**Correction to the 2026-08-03 entry below:** top risk #3 claims "no nvm/fnm/volta is
installed" and local node is v26.3.0. nvm 0.40.6 **is** installed and `node -v` reports
**20.11.0**, matching `.nvmrc`. That risk reads stale (the build itself was not re-run).

## Session wrap — 2026-08-03 (B2B Risk Intelligence audit + Waves 1–3 shipped)

**Current phase:** executing the B2B backlog in
[audits/agent-b2b-risk-intelligence-audit-2026-08.md](audits/agent-b2b-risk-intelligence-audit-2026-08.md),
which is the source of truth. The July production-readiness audit is stale in
the product's favour — 10 of its findings verified closed.

**Audit verdict:** the advisor product is operationally mature and strategically
mis-aimed. It is a well-fenced insurance CRM with per-policy AI attached, not
yet a Risk Intelligence Platform. 17 findings, four waves. Most of the required
signal is **already extracted and unused** — a harvesting problem, not a build.

**Shipped to prod this session (3 PRs, all verified live):**

- **#231 Wave 1 — the score is now true and advisor-movable.**
  - *F-04 (critical bug):* the gap penalty was computed from the GLOBAL count but
    subtracted inside the per-category loop, so one motor gap deducted from
    Health, Life, Income, Liability and Lifestyle too. **Every score was low by
    up to 5×, invisibly.** Scores RISE for anyone with gaps — that is the fix.
  - *F-01 (the headline finding):* questionnaire answers now reach
    `PolicyholderProfile`, which the score reads and which was writable only
    from B2C paths. Before this, a client who never self-onboarded scored
    ~44/100 forever and **no advisor action could move it**. Ships the Household
    Risk Profile template that asks the four fields deciding applicability.
  - *F-11:* AI-consent state shown before the upload; the attestation checkbox
    no longer appears where the server refuses to honour it.
- **#233 — agent private notes were stored PUBLIC.** Started as a fencing item,
  turned out to be a confidentiality defect: the UI posted `isPrivate`, the
  schema stripped it, and internal commentary about a client was readable by
  that client. Read filter was always correct; the write half never existed.
  Also fenced `privateNotes` (a real Pro+ differentiator) and stopped agents
  skipping all entitlement checks via a blanket role exemption.

**In progress — #232 (Wave 2), BLOCKED on a prod migration:**
F-06 exposes book-wide cross-sell (`runBulkCrossSell` existed for months with
zero callers — a top-3 revenue feature shipping nothing); F-08 adds
`ProtectionScoreHistory`, without which the score trend does not exist and
"your protection improved after we added life cover" is untellable.

**Blocked:** two migrations need applying to prod via the Supabase MCP path.
Until then: `20260803120000_risk_profile_system_questionnaire` (data, already
merged) means **F-01 is live but has no template to drive it — the fix delivers
nothing yet**; `20260803140000_protection_score_history` (schema) gates merging
#232. Merging it first would deploy code against a missing table.

**Top risks (ranked):**
1. **HIGH** — the two unapplied migrations above. Wave 1's headline fix is inert
   without the first one.
2. **HIGH / correctness** — Google Cloud billing lapse recurrence; no alert.
3. **HIGH / correctness** — eval thinness: model decisions rest on ONE synthetic case.
4. **MED / product** — F-03 (no bulk POLICY ingestion; `bulk-import` is contacts
   only and the multi-PDF modal is B2C-only) and F-05 (coverage lives in
   unqueryable `acordData` JSON, so no book-level risk question is answerable).
   These two cap Time-to-Value and keep `/insights` a sales dashboard.
5. **MED / cost** — the 3× extraction pin is live and unwatched.

**Corrected in the audit record:** `apiAccess` is `false` on every agent tier —
it is NOT sold. Both this audit and July's called it "sold but unbuilt".

**Next 3 actions:** (1) apply both migrations, merge #232. (2) F-03 bulk policy
ingestion — the Time-to-Value ceiling for all of B2B. (3) F-05 `PolicyCoverage`
projection, which unlocks real risk analytics.

**Sequencing rule (from the audit, still binding):** fix the arithmetic before
scaling the volume. Importing a large book onto wrong scores makes every later
correction read to advisors as a regression.

## Session wrap — 2026-08-03 (agent PDF upload was broken above 1 MB — shipped)

**Current phase:** post-launch ops. One production defect found via Sentry and fixed.

**Done this session:** POLICYWALLET-V (`An unexpected response was received from the
server.`, `/customers`) root-caused and fixed — PR #229 → `3a59a08`, deployed
(`dpl_AktqYACJdoMaFatVekdpi4AjL6Qa`, CI-green auto-deploy), issue resolved.

Two defects, both real:
1. **`next.config.ts` never set `experimental.serverActions.bodySizeLimit`**, so Next's
   **1 MB** default applied — while the upload actions validate to 10 MB
   (`agent/actions.ts:843,1071`) against a 15 MB `MAX_UPLOAD_SIZE_BYTES`. **Every policy PDF
   over ~1 MB was killed by the runtime before the action ran**, so the app's own
   size-rejection message could never fire. Real policy PDFs are routinely 1–5 MB. This hit
   *every* Server Action upload path (agent scan/commit, wallet, onboarding); API-route
   uploads were never subject to the cap. Now `16mb`.
2. **All four Server Action calls on `/customers` were bare `await`s.** A transport failure
   escaped to `window.onunhandledrejection` *and* skipped the `setLoading(false)` on the next
   line, pinning the modal on its spinner with no recovery but a page reload. Each now
   catches and shows an existing translated error key.

**In progress:** nothing active. Watches carried forward: (1) extraction p95 + cost on
`/admin/ai` under the 3.5-flash pin; (2) Sentry tripwires — `POLICYWALLET-7`/`-G`/`-V` all
resolved, so recurrence = regression.

**Blocked:** nothing.

**Top risks (ranked):**
1. **HIGH / correctness** — Google Cloud billing lapse recurrence; no billing alert. Owner action.
2. **HIGH / correctness** — eval thinness: model decisions rest on ONE synthetic text case.
3. **HIGH / tooling** — **`npm run build` cannot be run on this machine**: local node is
   v26.3.0, `.nvmrc` pins 20.11.0, and no nvm/fnm/volta is installed. The build dies at static
   prerender with a bogus `Cannot read properties of null (reading 'useEffect')` on randomly
   varying pages. Verified pre-existing (base commit `a4b2ed3` fails identically while being
   CI-green and live). **CI is currently the only working build gate, and E2E can't run either.**
4. **MED / cost** — the 3× extraction pin is live; unwatched, it's silent spend.
5. **MED / correctness** — CRM pipeline-memory code has zero production exercise (0 deals).
6. **MED** — gemini gap-analysis JSON emits string confidences (cleansed, pre-existing).

**Non-gating (UI/UX dislike, separate backlog):** the upload actions return
`REJECTION_MESSAGES` (`lib/security/file-upload.ts:219`), which are **English-only** and get
rendered straight into the Greek-default modal via `setError(res.error)` — an i18n gap, not a
break · Sentry captures no user context on client errors (`Users Impacted: 0`), which cost us
the ability to identify the affected agent · eval scorer rejects the insurer's long legal form
· `preview.yml` never fires (PRs target NEW-UI, it watches main) · `/admin/ai` tables are plain.

**Next 3 actions:** (1) Install Node 20.11.0 (or a version manager) so the prod build and E2E
are runnable locally again — risk #3. (2) Add 1–2 redacted-PDF extraction eval cases; re-run
`eval.yml`. (3) Set a GCP billing alert on the Gemini project.

**Not verified:** which of three possible causes produced POLICYWALLET-V's two events is
undeterminable — the transaction was sampled out (`client_sample_rate 0.1`, trace had 0 spans).
The 1 MB cap was the leading candidate and is fixed; the other two (expired session 307'd to
signin by `proxy.ts`, deployment skew) now degrade to a clean, recoverable error. The fix is
verified by construction and by CI, **not** by an observed absence of recurrence.

## Session wrap — 2026-07-31 → 08-02 (AI system + admin control panel, shipped)

**Current phase:** post-launch ops on the multi-model AI system. All planned work
(Phases 1–6 + follow-ups) is deployed to production; what remains is observation.

**Done this session:** Phase 6 admin AI control panel (`/admin/ai/settings`, `/admin/ai/prompts`,
`/admin/gaps`) built, migrated (prod+dev via Supabase MCP) and DEPLOYED · auto-deploy from
`NEW-UI` repaired and proven ×4 (secrets never existed + vercel-action's 2021 CLI dead — both
fixed) · Upstash provisioned by owner, verified via Sentry, override removed · MEDDIC branch
merged + deployed (migration-first) · gap-report unknown-slug defect fixed + `/admin/gaps`
badge · **gap-definition auto-mint feedback loop closed** (canonicalize-by-concept +
mint-inactive) · paid-eval workflow built; verdict: premium = identical accuracy at 3× cost →
NOT enabled · flash-preview extraction tail latency confirmed (2/3 attempts ≥179s) →
`extractPolicyData` pinned to `gemini-3.5-flash` in prod runtime config (v1, revertible in UI).

**In progress:** nothing active — two watches: (1) extraction p95 + cost on `/admin/ai` under
the pin; (2) Sentry tripwires (`POLICYWALLET-7`/`-G` resolved — recurrence = regression).

**Blocked:** nothing.

**Top risks (ranked):**
1. **HIGH / correctness** — Google Cloud billing lapse recurrence: a dunning state silently
   killed all Gemini calls once this session; no billing alert exists. Owner action.
2. **HIGH / correctness** — eval thinness: model decisions rest on ONE synthetic text case;
   a real redacted-PDF case is needed before the next model swap.
3. **MED / cost** — the 3× extraction pin is live; unwatched, it's silent spend.
4. **MED / correctness** — CRM pipeline-memory code has zero production exercise (0 deals).
5. **MED** — gemini gap-analysis JSON emits string confidences (cleansed, pre-existing).

**Non-gating (UI/UX dislike, separate backlog):** eval scorer rejects the insurer's long
legal form (cosmetic strictness); `preview.yml` never fires (PRs target NEW-UI, it watches
main); `/admin/ai` tables are plain but functional.

**Next 3 actions:** (1) after a few days of uploads, read `/admin/ai` — if extraction p95
dropped and cost is acceptable, keep the pin (or bake into env); else revert to auto.
(2) Add 1–2 redacted-PDF extraction eval cases + accept the insurer long form; re-run
`eval.yml`. (3) Set a GCP billing alert on the Gemini project (the dunning incident's
lesson).

> **Full record of the 2026-07-28/29 UI audit:**
> [audits/UI_AUDIT_2026-07-29.md](audits/UI_AUDIT_2026-07-29.md) — what was
> found, what was fixed, what still needs doing, and the five corrections where
> my own tooling was wrong rather than the product.

## Paid eval: premium extraction model — 2026-08-01 — VERDICT: don't enable

Ran the deferred premium-model eval (runs #4/#5 of the new manual `eval.yml` workflow;
`GEMINI_API_KEY` repo secret added by owner after a Google **billing dunning** denial on the
key's GCP project was fixed — first two attempts were refused by Google before any spend).
The premium question is exactly one comparison — the only MODEL_TIERS pair where premium ≠
standard is gemini · extractPolicyData: `gemini-3-flash-preview` (€0.50/€3 per 1M) vs
`gemini-3.5-flash` (€1.50/€9 per 1M, 3×).

| | standard 3-flash-preview | premium 3.5-flash |
|---|---|---|
| extraction accuracy | 86% (6/7) | 86% (6/7 — same miss) |
| extraction latency | **179.7s** | **9.4s** |
| gaps / QA (constant) | 100%R·75%P / 11/11 | identical |

- **Quality: identical.** Both missed only the insurer exact-match (extracted the full legal
  name «Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΟΣ…» vs expected short «Η ΕΘΝΙΚΗ») — scorer strictness, not model
  failure. **Enabling pro-tier premium would pay 3× for nothing measurable → not enabled;**
  `getDefaultModelForStep` keeps tier `"free"`. The eval did exactly its job.
- **Latency finding CONFIRMED (run #6, extraction-only baseline):** the standard
  flash-preview's problem is **tail latency, not uniform slowness**. Three attempts
  observed: ~179.7s (run #4, just under the timeout), **180s HARD TIMEOUT** (run #6 first
  attempt — "AI call timed out after 180000ms", killed by withTimeoutAndRetry), then the
  run #6 retry succeeded in **~16s on the same model**. So flash-preview sometimes answers
  in seconds and sometimes stalls past the 3-minute cap — 2 of 3 attempts hit ≥179s.
  Premium 3.5-flash: 9.4s (n=1). Accuracy identical in all runs (86%, same scorer-strict
  insurer miss). Production implication: every stalled extraction burns a full 180s
  timeout + retry from the remediation budget and inflates analysis wall time. The
  remediation ladder handled it exactly as designed (the retry salvaged the run) — but a
  standard model that times out this often is an operational liability. **Candidate fix,
  owner's call (3× extraction token cost):** `/admin/ai/settings` → pin
  `extractPolicyData` → gemini/`gemini-3.5-flash` (stable GA), watch latency + cost on
  `/admin/ai`, revert to auto if cost outweighs the tail-latency win.
- **PIN APPLIED (owner-approved, 2026-08-01):** `extractPolicyData` → gemini/
  `gemini-3.5-flash` is live in prod `ai_runtime_config` (v1, revision row with {from,to}
  diff, `changed_by='ops-eval-pin-2026-08-01'` — written via Supabase MCP mirroring the
  updateAiModelConfig write path, since the session has no admin browser login). One
  behavioral note vs the UI path: a direct DB write cannot call `revalidateTag`, so the
  pin lands within the cached reader's **300s TTL** per instance instead of instantly.
  Verify on `/admin/ai`: Active configuration shows extractPolicyData as "admin override"
  (v1); subsequent uploads meter extraction under `gemini-3.5-flash` in the routing
  distribution. Revert = set the row back to auto in `/admin/ai/settings` (one click,
  becomes v2 with its own revision).
- **Eval limits, stated:** 1 synthetic text/plain extraction case (not a real PDF), one run
  per model. To make future runs decisive: add 1–2 extraction cases incl. a redacted real
  PDF, and accept the insurer long-form as valid in the scorer.
- Also observed in both runs: gemini gap-analysis JSON mode emits string confidences where
  the schema wants numbers ("using cleansed raw" warn) — pre-existing, handled, noted.

## Gap-report content gaps (Sentry POLICYWALLET-7) — 2026-08-01

**Broken (user-visible), now fixed.** Three gap definitions live in the production
database with no `GAP_CONTENT_MAP` entry — `no-glass-breakage` (motor), `own-damage-gap`
(motor), `preventive-care-gap` (group_health). All three had live gap instances, so real
customers read a **generic Greek fallback heading instead of the actual finding**; the only
signal was a Sentry warning firing since 14 Jul (68 events).

- **Not a slug-convention bug.** The prod dump looks like a snake/kebab mismatch, but
  `normalizeGapSlug` already folds `_`→`-` and all 35 other prod slugs resolve. The three
  are genuinely absent from the map.
- **Why no test caught it:** they exist *only* in the database — not in `prisma/seed.ts`,
  not anywhere in the repo. They were created straight against the DB, so no repo-level
  assertion could have seen them.
- **Second, quieter defect:** two of them duplicate a concept whose twin definition also
  fires (`no-glass-breakage`≈`glass_breakage`, `own-damage-gap`≈`own_damage`/
  `own_vehicle_damage`), so those policies rendered **two cards for one finding**. Giving the
  new entries the existing `concept` (the `windscreen`→`glass-breakage` alias pattern) fixes
  the heading and the duplicate in one move. `preventive-care-gap` is genuinely new content,
  deliberately NOT folded into an unrelated concept just to silence the warning.
- **Guard against the next one:** `/admin/gaps` now shows a "no content entry" badge per
  definition. It uses a **pure map lookup, not `resolveGapContent`** — that function reports
  unknown slugs to Sentry as a side effect, so an admin opening the page would otherwise
  manufacture the very warning the badge surfaces.
- Regression tests pin all three as `known` and pin the concept collapse. 2749 unit tests +
  full gate + build (exit 0) green.
- **Left for the owner, deliberately:** the duplicate gap *definitions* themselves are still
  active in the DB. Deactivating them changes detection behavior for real policies — an
  owner call, not a side effect of a content fix. `/admin/gaps` is where to do it.
  Recommended first step: compare the twins' `detectionLogic` before touching anything — if
  the logic differs they are not true duplicates, and deactivating one would silently drop a
  real check.
- **DEPLOYED** as release `f69f4363` (auto-deploy run #9). `POLICYWALLET-7` resolved in
  Sentry so a recurrence arrives as a **regression** — which would mean a new unmapped slug
  was added straight to the database. Honest caveat recorded on the issue: the fix is
  verified *by construction* (map entries + regression tests), not by observed silence —
  `/wallet/[id]` traffic is sparse (68 events over 18 days, once per process per slug), so a
  quiet window proves little on its own.
- `POLICYWALLET-G` (Upstash) also resolved, for the same tripwire reason.

**Follow-up (same day): the "DB-only" definitions are AI-minted — and they feed back into
prompts.** Comparing the twins' `detectionLogic` before deactivating (the recommended first
step) found all five rows carry `{"source":"ai_clarity_pipeline"}` and **no check logic at
all** — nobody hand-created them. The orchestrator auto-upserts a `GapDefinition` for every
slug the clarity pipeline emits (`policy-analysis-orchestrator.service.ts:2625`/`:2708`),
with `description: "Auto-created from AI clarity analysis"`. The sting is the feedback loop:
`getGapDefinitionsForPolicy` (`:2394`) feeds every active definition into the deep
gap-detection prompt, using that junk description as the `checkCriteria` fallback — so each
slug the AI invents becomes a **permanent extra check in every future prompt for that LoB**,
which `GAP_RESULT_RULES` then forces the model to evaluate. Prompt bloat that only grows.
- **Done (prod, `changed_by='ops-dedupe-2026-08-01'`, version-bumped):** deactivated
  `no-glass-breakage`, `own-damage-gap`, and `own_damage` (keeping `own_vehicle_damage`, the
  higher-severity twin of the same concept). Nothing real was lost — none carried logic.
  Display-safe by construction: instance rendering filters on instance `status` only, never
  definition `isActive`, so existing gap cards keep rendering with the new content entries.
  Motor's deep prompt drops from 8 checks (3 redundant) to 5 distinct. Dev had none of
  these rows (they were minted by prod traffic).
- **Root cause FIXED (same day):** the auto-mint feedback loop is closed with two guards in
  the persist loop. (1) **Canonicalize before minting** — new pure
  `pickCanonicalGapDefinition` (lib/wallet/gap-report.ts) concept-matches each emitted slug
  against ALL of the LoB's definitions (active + inactive — filtering to active would
  re-mint the moment an admin deactivates a duplicate), preferring active then earliest
  `createdAt`; a vocabulary variant attaches its instance to the original row and mints
  nothing. Slug spellings stay as they are — matching happens at concept level, so the
  snake/kebab trap flagged earlier is sidestepped rather than migrated. (2) **Mint
  inactive** — a genuinely novel concept still gets a definition and a rendered instance
  (rendering ignores `isActive`), but joins prompts only when an admin activates it in
  `/admin/gaps`, where the "no content entry" badge flags it for a content entry at the
  same time. Plus: `gapRows` deduped by `definitionId` (no DB unique protects
  (policyId, gapDefinitionId); gap_detection wins over clarity since it populates the map
  first), and the dead active-minting `ensureGapDefinition` (zero callers) is deleted.
  Pinned by `tests/unit/gap-automint.test.ts` (mutation checks: reverting to
  `isActive: true` or filtering the lookup to active fails) + 5 helper cases in
  `gap-report.test.ts`. 2759 unit tests + full gate + build exit 0.
  Post-deploy watch signal: `SELECT count(*) FROM gap_definitions WHERE
  detection_logic->>'source'='ai_clarity_pipeline' AND is_active=true` stops growing.

**Also verified this pass:** production holds **0 opportunities**, so the MEDDIC
pipeline-memory code merged below is correct but *inert* — there is nothing to live-verify
until an agent has real deals.

## MEDDIC readiness review → opportunity pipeline memory — 2026-08-01 — merged into `NEW-UI`

Merged `claude/meddic-policywallet-crm-gqqcos` (2 commits, forked at `307f04f3`).
The full review is [audits/meddic-readiness-2026-07.md](audits/meddic-readiness-2026-07.md); the
short version is that **the finding, not the feature, was the deliverable**: MEDDIC is a poor fit
here — no buying-committee entity exists to hang an Economic Buyer or Champion on, deals are an
order of magnitude too small (reference deal €104.87), and commercial lines are largely a
marketing veneer (4 of 15 B2B branches `writeEnabled`). What shipped instead is the prerequisite
under either direction — the pipeline's missing memory:

- Append-only `OpportunityStageHistory`: stage changes were destructive overwrites, so
  `open→quoted→lost` and `open→lost` were indistinguishable and time-in-stage / funnel velocity
  were impossible **and unbackfillable**.
- Structured close on `Opportunity` (`outcome`/`outcomeNotes`/`outcomeAt`, the `PolicyRenewal`
  shape) with `outcomeAt` as the immutable close date; `Proposal.declineReason/declineComment/
  counterOfferNotes` persist a taxonomy the UI always collected and threw away.
- Proposal acceptance closes the deal in flight instead of creating a duplicate WON row; the
  commissions trend buckets on immutable dates, so editing a note no longer relocates revenue.

**Merge notes (4 conflicts, all from the 662-commit gap since the fork):** `prisma/schema.prisma`
and `app/(protected)/agent/actions.ts` were additive on both sides — kept both (the Phase 1 scan
guard/metering and the lifecycle helpers coexist). `OpportunityUpdateModal`'s `onUpdate` gained
the branch's 5th `outcome` param while keeping this line's `onMedicChange` callback. This file
kept the NEW-UI structure rather than the branch's older `## Done (recent)` block.

**DEPLOYED** 2026-08-01: merge commit `8d510bad` on `NEW-UI` → CI green → auto-deploy run #8
(`policy-wallet-5bwpmpa4w…`), the first release to ship through the repaired pipeline without a
manual `vercel --prod`. No new Sentry issues in the 2h after. **Not yet live-verified:** a stage
row actually being written on a close, and the proposal accept/decline paths end to end — worth a
manual pass on `/opportunities`, since no production traffic has exercised them yet.

**Migration applied before merge** (the deploy.yml contract): `20260801120000_opportunity_lifecycle_history`
is live on prod (`cquudefwfwrmvpftuhyl`) and dev (`lzqvtvjggylcujenlelh`) via the Supabase MCP path
— table + 3 opportunity columns + 3 proposal columns + 3 indexes + `_prisma_migrations` rows, all
verified. The SQL is additive and idempotent (`IF NOT EXISTS` throughout).

## Admin AI control panel (Phase 6) — 2026-07-31 — branch `claude/nifty-tesla-m80f2p`

Admins can now monitor usage, choose the models each operation runs on, and
edit the prompt content used per line-of-business analysis — three CI-green
commits on top of the Phase 1–5 multi-model system. Not yet deployed.

- **`/admin/gaps` (6a):** editor for `GapDefinition` — the `detectionLogic.check`
  text is per-LoB prompt content fed verbatim into the gap-analysis prompt.
  Wraps the previously ORPHANED versioned `updateGapDefinition` action; edits
  are uncached and apply to the next run. Save-time policy via the new shared
  `lib/services/ai/prompt-policy.ts` (`validateOperatorGuidance`): rejects
  advice language (EN+EL — `ADVICE_LANGUAGE` moved here, the eval scorer
  re-imports it), persona overrides («ασφαλιστικός σύμβουλος» is a licensed IDD
  role), reserved spotlight delimiters, and injection-scoring hits.
- **`/admin/ai/settings` (6b):** runtime model config. New `AiRuntimeConfig` +
  revision table (migration `20260731090000_ai_runtime_config`); rows are
  binary — `auto` (pure env) or fully pinned provider+model. Cached reader
  (`runtime-config.ts`, tag `ai-runtime-config`, never throws → env behavior).
  Precedence: explicit `req.provider` (failover ladder) > per-operation pin >
  primaryProvider pin > env; a pinned model applies ONLY when its provider
  matches the resolved provider, so failover never sends a model name to the
  wrong vendor. Threaded through the gateway, orchestrator (createRun + step
  attempts), quick extract route and batch translator (gemini-only row).
  Save-time: missing-API-key provider blocked; unknown-to-TOKEN_COSTS model
  warns. Writes are versioned + audited (`UPDATE_AI_MODEL_CONFIG`) and
  revalidate the tag, so pins land on the next request.
- **`/admin/ai/prompts` (6c):** operator-guidance overrides. New
  `AiPromptOverride` + revision table (migration
  `20260731120000_ai_prompt_overrides`; `lineOfBusiness` sentinel `__global__`,
  unique per (operation, LoB)). Guidance is **additive only** — rendered under
  an "OPERATOR GUIDANCE (…supplements but never overrides the rules above)"
  label after the canonical task rules, BEFORE the `<untrusted_policy_data>`
  envelope, in all five builders; it can never replace the test-enforced
  informational-assistant persona (validated at save, delimiters re-stripped at
  render). Resolution: exact (operation, LoB) → global → none; the deep
  pipeline resolves with `policy.lineOfBusiness`, Q&A passes the policy's LoB,
  risk and the quick extract use global-only. Cached reader
  (`prompt-overrides.ts`, tag `ai-prompt-overrides`, never throws).
- **Monitoring:** `/admin/ai` gained Active configuration (per-op
  provider/model + env-default vs admin-override source), Prompt overrides
  (identity only — never guidance text on the dashboard), and Usage by line of
  business (raw `token_usage JOIN policies` aggregate; policy-linked rows
  only). `/api/admin/ai-performance` returns the extended snapshot; no new API
  routes, so the auth inventory is unchanged.
- **Migrations APPLIED to both DBs (2026-07-31, Supabase MCP path):**
  `20260731090000_ai_runtime_config` and `20260731120000_ai_prompt_overrides`
  are live on PolicyWallet-Prod (`cquudefwfwrmvpftuhyl`) and dev
  (`lzqvtvjggylcujenlelh`) with matching `_prisma_migrations` rows carrying the
  migration files' real sha256 checksums. Verified on both: 4 new tables, 5 new
  indexes (incl. the unique `(operation, line_of_business)` key), 0 rows —
  every operation still resolves to env defaults until an admin pins one. The
  app code itself is on branch `claude/nifty-tesla-m80f2p`, not yet deployed.
- **Validation loop:** the admin UIs point at `npm run eval`
  (`EVAL_ALLOW_PAID=1` for real providers) to compare scores before/after a
  model pin or guidance change. ~35 new unit tests across prompt policy,
  reader/precedence contracts, admin parse rules, write-path source
  assertions, and prompt-position/wiring guarantees.
- **Promoted to `NEW-UI` (2026-07-31):** fast-forward `09a61f6a → 86634bb`,
  CI green on NEW-UI (run #542); the Vercel git integration built this exact
  commit successfully as a preview. **Auto-deploy rewired:** `deploy.yml` now
  fires on CI success on `NEW-UI` (was: the stale, diverged `main` — 5 runs,
  all failures, none since February) and deploys the CI-validated sha via
  `vercel --prod`. It no longer runs `prisma migrate deploy` (impossible
  through the pooler, P1017 — schema ships via the Supabase MCP path BEFORE
  merge, as recorded above); it preflights the `VERCEL_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets and fails with a named list
  if any is missing. Manual redeploys: workflow_dispatch from NEW-UI only.
- **DEPLOYED + auto-deploy proven end-to-end (2026-08-01):** production is
  `NEW-UI` @ `1c8a83ac` (deployment `policy-wallet-mstfc5x2r…`, run
  30678756560 green). Getting there surfaced two pipeline defects, both
  fixed: (1) the three `VERCEL_*` repo secrets had never existed — the
  cause of every historical deploy.yml failure; owner added them
  (`VERCEL_ORG_ID = team_QzKsHlvajknceItFyQlikMk2`, project id of the
  `policy-wallet` project, team-scoped token). (2) `amondnet/vercel-action@v25`
  pins Vercel CLI 25.1.0 (2021), whose project-settings call no longer
  resolves against today's API ("Could not retrieve Project Settings" even
  with correct IDs) — replaced with a direct `npx vercel@latest deploy
  --prod --yes` step (Vercel's documented CI pattern; same contract as the
  old manual `vercel --prod` flow). From here on, every CI-green push to
  NEW-UI deploys production automatically — the manual CLI step is retired.
  Note for sandboxed sessions: policywallet.gr is not reachable through the
  CCR egress proxy (403) — verify deploys via the workflow job log /
  deployment URL, not by curling the apex.

## Multi-model AI system: guardrails, routing, fallbacks, observability, evals — 2026-07-30 — branch `claude/nifty-tesla-m80f2p`

Built the multi-model AI system in five CI-green commits. Each phase passes the
full gate (audit:api-auth, lint, i18n, utf8, encoding, type-check, unit tests,
build). Not yet deployed.

- **Broken/insecure (now closed):**
  - **Zero-cost input guard** (`lib/services/ai/guard.ts` + `guard-patterns.ts`):
    deterministic, pre-LLM length caps + bilingual (EL/EN) prompt-injection
    scoring + control/zero-width/bidi sanitation. High-confidence injections
    block for €0 and write an `AI_INPUT_REJECTED` audit row (metadata only — no
    raw text, no email); medium signals flag-and-log (`AI_INPUT_FLAGGED`).
  - **Metering/backstop parity on every billable path.** Closed the three
    off-the-books spenders (`extractBasicSummary`, the legacy
    `/api/policies/extract` route — now migrated onto `getAIService()`, and the
    batch translator). Q&A gained a length cap + injection guard + rate limit;
    the agent scan gained an `AGENT_POLICY_SCANNED` audit row + DB backstop
    (the STATUS-flagged live money exposure). Every backstop is DB-count-based,
    so it holds even with prod's `RATELIMIT_ALLOW_LOCAL` / no Upstash.
  - **Prompt spotlighting**: extracted policy data is fenced in
    `<untrusted_policy_data>` with a "data, not instructions" directive and
    forged delimiters stripped — closes the poisoned-PDF indirect-injection
    channel. Scoped to document data only, to keep the MEDIC reuse of
    `buildQaPrompt` working.
- **Routing:** `lib/services/ai/model-router.ts` reworked into a per-call
  `resolveRoute` (deterministic tier table → provider + model + output cap) +
  `selectPrimaryProvider`; a new `gateway.ts` is the chokepoint for the
  interactive paths (Q&A, risk). Fixed the dead code: `analyzeRiskProfile`
  ignored `modelOverride` in all three providers; Gemini Q&A ignored it too and
  set no output cap; the orchestrator hardcoded `provider:"gemini"` and coerced
  Anthropic back to Gemini. **Behavior-neutral under the default env** — the two
  wired paths resolve to today's models at every tier; pro-tier deep-pipeline
  upgrades are tested but deferred until evals can validate them.
- **Fallbacks:** per-provider fallback models (`CLAUDE_MODEL_FALLBACK`,
  `OPENAI_MODEL_FALLBACK`) — Claude/OpenAI previously had none. In-process
  circuit breaker (`provider-health.ts`, per-instance, same serverless caveat as
  the incident cooldown). Anthropic is now a first-class primary via
  `AI_SERVICE_TYPE`. The remediation ladder itself is untouched.
- **Observability:** `/admin/ai` performance dashboard + snapshot service
  (`lib/services/ops/ai-performance.service.ts`) + guarded API
  (`/api/admin/ai-performance`). Success rate, degraded/failed/blocked, failure
  and remediation mix, p50/p95 step latency, cost/operation, **routing
  distribution** (truthful now the model field is real), and **blocked-attack
  counts** from the Phase-1 audit rows. All from already-persisted data; no
  migration. Aggregate ops metrics, not an advice surface (no AiDisclaimer).
- **Evaluation:** `evals/` — TS golden datasets (extraction/gaps/qa), pure
  scorers (field accuracy / gap recall+precision / Q&A compliance incl. an
  advice-language ban), and `evals/run.ts` (`npm run eval`). **CI runs only the
  deterministic pieces**: `tests/unit/eval-scorers.test.ts` (in the unit suite)
  and the mock harness (`npm run eval:ci`). Real providers are **refused unless
  `EVAL_ALLOW_PAID=1`**, so CI can never spend money.
- **Standing owner dependency (unchanged, not code):** production Upstash Redis
  is still unprovisioned (`RATELIMIT_ALLOW_LOCAL=1`), so Redis limits remain
  per-instance. The new DB-count backstops make every billable AI path
  instance-independent regardless; non-AI limits (auth, contact, invites) stay
  weakened until Upstash lands.
- **Deliberately deferred (not broken):** enabling pro-tier premium models on
  the deep pipeline (extraction/gaps/clarity) — the router supports it and it is
  unit-tested, but flipping it in production should wait for a golden-set eval
  run on real providers. An optional LLM-judge for clarity/QA quality is noted
  but not built.

## Insurer data verified against the Bank of Greece register — 2026-07-30

Checked the catalog against the BoG register of (re)insurance undertakings
(all 988 entries; the per-undertaking record carries registered seat,
telephone, email, website, LEI and licence status — it verifies far more than
the "legal name and classes" I assumed). Applied to prod AND dev; the source
dataset `prisma/greek-insurers.json` was corrected too, so a re-import keeps
the fixes rather than reverting them. **Stale values 57 → 32.**

- **Two records are wrong, not merely stale — both left flagged, not
  rewritten, because each needs a human decision.** `prime-insurance` does not
  appear in the register at all (not Greek-authorised, not among the five
  Cyprus branches, no freedom-of-services entry). `geniki-panelladiki`
  conflicts on every identifying field: the register has an **Α.Ε.**, not a
  Συν.Π.Ε., at Βουλής 7 Αθήνα on 210 321 7801, while our record describes a
  bus-owners mutual in Πυλαία Θεσσαλονίκη on 2310 474 422 — it appears to fuse
  two different organisations.
- **Corrected:** Groupama's mailbox (`info@groupama-phoenix.com` was dead →
  `info@groupama.gr`, as the dataset itself suspected); ΕΥΡΩΠΗ has **moved**
  (Φιλελλήνων 25 Αθήνα → Κηφισίας 340 Ν. Ψυχικό) and changed mailbox; wrong
  emails for Ατλαντική and Ιντερσαλόνικα; Ατλαντική's missing postcode
  (115 26); and four stale legal names — ERGO, ΜΙΝΕΤΤΑ (the «Ευρωπαϊκή Ένωσις»
  name is gone), ΟΡΙΖΩΝ (now **ΟΡΙΖΩΝ 1964**) and the 2ος Συνεταιρισμός
  (missing «Βορείου»). Groupama's note was wrong in the other direction:
  ΦΟΙΝΙΞ is the *current* registered name, not a former one.
- **16 stale values were right all along** and are now `verified_2026`
  (INTERLIFE, INTERASCO and Συνεταιριστική on all three of phone/email/
  address; ERGO's phone+email; Υδρόγειος's and Interamerican's email; etc.).
- **Left as ambiguous rather than overwritten:** Allianz (ours 210 699 9999 vs
  registered 210 690 5500) and Interamerican (210 946 2000 vs 210 946 1111)
  read like published customer lines vs registered switchboards — a phone call
  settles it, not a database write.
- **Roadside partners — I was half wrong about the register's scope.** It
  cannot say who contracts whom, but assistance is a licensed class, so it
  *can* say whether a named provider still operates here. **Europ Assistance
  shows Ceased on all three Greek registrations** (branch, freedom of
  services, and Europ Assistance Holding), which means the six insurers
  recorded as its clients — Generali, AIG, Interasco, NP Insurance, Personal
  and ΕΥΡΩΠΗ — **cannot** be current. Those dropped from `stale` to
  `unverified` ("treat as missing") with a note; no replacement was invented,
  because none could be sourced. The provider roster is now sourced rather
  than asserted: MAPFRE Asistencia also Ceased; Inter Partner Assistance
  branch Ceased but freedom-of-services still Active; **AWP P&C (Mondial /
  Allianz Partners) Active**; **Interamerican Βοηθείας Active and a licensed
  Greek undertaking in its own right**. Eurosos is absent from the register
  and that is *expected, not damning* — it is a roadside service operator, not
  an insurer, so the cover is written under the insurer's own class-18 licence.
- **Still genuinely out of scope:** `paymentGatewayUrl` (5 stale, 15
  unverified) — bank-hosted gateways the register has no view of.
- Net across both passes: **stale 57 → 26**, verified 66, and the remaining
  unverified values now mean "known missing" rather than "never looked".
- Context worth keeping: the register holds 73 Greek-authorised undertakings
  of which only **34 are in force** (34 in liquidation, 5 licence withdrawn),
  so a catalog built from marketing sources rather than the register carries
  dead companies very easily. `anytime` is correctly absent — it is an
  Interamerican brand, not an undertaking, exactly as our record says.

## Insurer reference data + admin editing — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `c225fe9`, deploy `dpl_CSjERdp7…` (`f76d9eglm`), Ready, apex+www.
The 29-record Greek-insurer research dataset now lives at
`prisma/greek-insurers.json`; **27 records imported to PROD and dev** (the two
`status='merged'` historic entities — AXA, Ευρωπαϊκή Πίστη — skipped by
design). Insurer model enriched (slug join key, bilingual/legal names, market
status, group parent, free-text contact channels, HQ address JSON, roadside
partner, 22-value LoB vocab, per-field confidence map); `/admin/insurers` is
now a full CRUD surface (list + `[insurerId]` edit page with confidence badges;
edits stamp changed fields `admin_edited`, provenance preserved).

- **Prod pre-check paid off:** prod did NOT hold the 5 dev-seed rows but 5
  admin-created ones (`Groupama`, `NN`, canonical «Εθνική Ασφαλιστική»…). The
  generator's claim pass was generalized to claim-by-canonical-name for every
  record, killing the unique(name) collision class; `Groupama`/`NN` added to
  the legacy-merge map. End state verified: prod 27/27 slugged, 0 orphans; dev
  28 rows (27 + inactive legacy AXA).
- Migration `20260730120000_insurer_reference_enrichment` (additive DDL)
  applied to BOTH DBs via Supabase MCP + `_prisma_migrations` rows with the
  file's real sha256. Seed SQL from `scripts/gen-insurer-seed-sql.ts`
  (idempotent; re-runs clobber dataset-owned fields, never is_active/logo).
- Verified live: list (27, status chips), ERGO edit page (stale/verified
  badges), no-op save → `UPDATE_INSURER` audit row + badges preserved,
  add-policy dropdown shows the canonical Greek names.
- **Re-import no longer destroys admin corrections — found from real prod
  data, not theory.** Minutes after deploy an admin filled in AIG's missing
  contact email, logo and postcode; the confidence map stamped exactly those
  `admin_edited`. The upsert as first written would have silently erased the
  email and postcode on the next seed run (the logo was already safe). Now
  every dataset-owned column is `CASE WHEN field_confidence->>'<field>' =
  'admin_edited' THEN <live> ELSE <dataset> END`, and the confidence map is
  merged so the stamps survive and keep protecting their fields. The dataset
  stays canonical for everything nobody has touched. Proven against a live DB
  (dev, then restored), not just asserted on the generated string — a
  string-level test would pass on SQL that does the wrong thing.
- **E2E added: `tests/admin-insurers.spec.ts`** (runs in `admin-chromium`,
  5/5 green). The `[insurerId]` route is invisible to every audit sweep —
  static-route enumeration never sees it and dynamic discovery only harvests
  hrefs from lists it already knows — so it is checked explicitly: console
  hygiene on both surfaces, all five sections + 22 LoB checkboxes present,
  **320px with no horizontal overflow** (the densest new layout in the app),
  and a full save round-trip asserting persistence, the `admin_edited` stamp,
  and that untouched dataset provenance survives the same save.
- 47 new unit tests incl. dataset-conformance (every imported row re-savable —
  URL/phone validation deliberately lenient: http:// sites and Greek short-code
  phones are real data). 2545 total green + full gate.
- **Correction to my own first note here.** I wrote "local pooler connectivity
  was dead". It was not: `db.insurer.count()` through the app's own Prisma
  client answers instantly (28 rows). What hangs is only the **migrate
  engine** (`migrate deploy` / `migrate status`, and therefore
  `verify:migrations`) — it takes a session-level advisory lock, which
  transaction-mode pgbouncer cannot hold, so it waits forever instead of
  erroring. `.env.local` points `DIRECT_URL` at the `:6543?pgbouncer=true`
  pooler because the direct host is IPv6-only and this machine has no IPv6
  route. So `verify:migrations` cannot pass locally on this network **by
  construction**, not by outage; the MCP path is the correct one and both DBs
  are confirmed at the same migration state. `prisma validate` green.
  - *Refinement from two independent runs (other session, 2026-07-30):* it does
    not actually wait forever — left alone it ends in **`Error: P1017: Server
    has closed the connection`** against `aws-1-eu-west-3.pooler…:6543` after
    several minutes. Same root cause, but worth knowing when diagnosing: the
    pooler drops the connection rather than the client hanging indefinitely, so
    the right move is to let it return and read P1017 rather than kill it and
    guess. Note the script also **exits 0 through a pipe** while printing
    "Migration verification failed" — check its output, not its exit code.


## /agent had no h1 for anyone without an advisor — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `ef0b191`, deploy `dpl_cesmHnRh…` (`bfn4yguyn`), Ready, all 5 aliases
+ apex/www verified. **Note for the next deploy:** `vercel --prod` exited
non-zero with `Not authorized` while the deployment itself built and went Ready
normally — `vercel whoami` was fine throughout. The CLI's exit code was not
trustworthy here; the deployment was confirmed via `vercel inspect` and live
liveness checks rather than by the command's status. Closed the UI audit's open item **"/dashboard and /agent
report no `<h1>` under the ADMIN session"** — whose diagnosis was wrong on both
counts, which is why it was right to leave it flagged rather than patched:

- `/dashboard` under an admin **redirects** to `/admin/dashboard`, which does
  have an h1. The sweep was measuring the redirect, not `DashboardClient`.
- `/agent` is the policyholder's "my advisor" page and early-returns
  `NoAgentEmptyState` when there is no linked advisor. That is **data**-gated,
  not role-gated — the admin fixture simply has zero advisor relationships
  (verified in the DB). So this hit **every new policyholder**, not admins.
- `/team`'s equivalent branch had already been fixed in an earlier pass.

Root cause: shared `components/ui/EmptyState` headlines at `h3` — correct when
nested under a page that owns an h1 (all 12 other consumers, checked
individually), wrong when the empty state IS the page. Added an optional
`headingLevel` (default `h3`, so nothing else moves) and `/agent` passes `h1`.
Styling identical at every level; the change is purely semantic.

**Checked and deliberately NOT changed:** `/wallet`'s empty state, which looks
like the same bug but takes its h1 from `PageHeader` above the early return.
The two h1s in `AgentClient` are in mutually exclusive branches, so this adds
no duplicate — the defect the audit fixed on `/onboarding/agent`.

4 unit tests (render-level + call-site), mutation-tested; E2E asserts exactly
one h1 on `/agent` under the no-advisor fixture — never zero, never two.

## MEDIC suggest metering + admin visibility review — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `c00ce21`, deploy `dpl_9rNz7GMk…` (`btlnbkp8f`), Ready, apex+www
verified. Final E2E: **16/16** (5 agent surfaces + full journey + 5 ladder
tests incl. the modal console check and the 320px strip), zero Chrome console
errors. 2498 unit tests + full gate green. **Re-verified after the insurer
batch landed** (head `8be0c15`): 16/16 again, zero console errors, 2546 unit
tests + full gate.

**Second pass over both areas came up clean** — the bar for closing this out.
Admin visibility: no impersonation feature exists anywhere, and `isBreakGlass`
is only an audit flag on deletion requests, not an access bypass — so neither
opens a route to qualification data. Metering: the token estimate was checked
against what is actually sent (the Q&A framing adds ~500 tokens and this path
passes no ACORD payload, so the 4000-token allowance covers framing plus the
size-capped JSON reply); the audit row is written whenever the billable call
succeeded, including when parsing later fails, so cost incurred always leaves
a trace.

**Metering — one real defect, fixed.** The suggest button was a real, billable
LLM call (up to 80K chars of notes, re-runnable forever) with **none** of the
four controls the B2C Q&A path enforces and no audit trail. "Reuses the metered
askQuestion path" was true and misleading: that helper RECORDS usage, it does
not GATE it. Now: 20/hour rate limit, a DB-backed hourly backstop that does not
depend on Redis, a token-budget check before spending (estimated from the real
payload), and a `MEDIC_SUGGESTION_REQUESTED` audit row with `targetUserId` —
userId only, no email (GDPR audit M3). Both refusals surface as advisor-readable
toasts. 8 unit tests pin the gates at source level incl. ordering; mutation-
tested by deleting the rate limit.

**Admin visibility — clean, no fix needed.** Every qualification surface scopes
by ownership (`ownerAgentUserId` / `relationship.agentUserId`) derived from the
session, never from a parameter and never by role; the admin console has no
opportunity surface at all; `isAgentRole` admits admins to the agent actions but
the ownership check still blocks any admin who is not the owning agent. The new
Art. 15 export section is scoped to the requesting policyholder.

**Chrome consoles.** New `tests/agent-console-clean.spec.ts` — console, page
errors and HTTP ≥400 across the five agent surfaces; the modal + edit-strip
check lives in the ladder block where a fixture exists (placed in the console
spec it would have silently skipped). Local-only noise is filtered by explicit
rule, each verified rather than assumed: the placeholder Sentry DSN (prod ships
a real encrypted one and serves no placeholder), `_vercel/*` scripts (absent
locally), and Next's `?_rsc=` prefetch aborts. Four probe defects were found and
fixed before any product conclusion was drawn — a filter that missed
`speed-insights`, `networkidle` hanging, a 404 reported without its URL, and an
assertion that matched the word "askQuestion" inside a comment.

## ⚠️ OWNER ACTION: production rate limiting is per-instance only

**Found 2026-07-30 while auditing MEDIC cost behaviour. Not fixable in code —
needs credentials.** Production has **no** `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` (0 of 59 env vars) and runs with
`RATELIMIT_ALLOW_LOCAL=1`, the escape hatch
[DEMO_DEPLOY_RUNBOOK](operations/DEMO_DEPLOY_RUNBOOK.md) documents for "a
single-instance demo". Vercel is not single-instance, so `lib/env.ts`'s own
warning applies verbatim: *"each serverless instance keeps its own in-memory
counter, so the effective limit multiplies by the instance count (near
fail-open at scale)"*.

This weakens **every** limit in the app, not just MEDIC's: auth endpoints,
contact/lead forms, agent invites, billable AI scans. Broken/insecure bucket —
not a preference item.

**To fix:** provision an Upstash Redis instance, set both env vars in
Production (and Preview), then remove `RATELIMIT_ALLOW_LOCAL`. `lib/env.ts`
already refuses to boot production without them once the override is gone, so
the guard verifies itself. I did not create credentials or change production
env on your behalf.

Mitigated meanwhile for the AI spend path: the MEDIC suggest cap is now
DB-backed (counts its own audit rows) and therefore instance-independent.

**The concrete money exposure until then** is `scanPolicyDocument`
(`app/(protected)/agent/actions.ts`) — a real billable AI extraction whose
30/hour cap is Redis-only, so it is currently per-instance. Deliberately left
as-is rather than given the same DB-backed backstop: it writes no audit row to
count, so that change is larger than it looks, and provisioning Upstash fixes
it properly along with every other limit. Worth revisiting only if the Upstash
work is postponed.

## MEDIC subject-access gap (GDPR Art. 15) — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `94270ec`, deploy `dpl_6EYcNhMq…` (`oqqu31pau`), Ready, apex+www
verified. **The sweep's "clean round" did NOT come up clean** — this round
found a sixth real defect, so the goal's completion bar is not yet met.

- **MEDIC data was invisible to a subject-access request.** The Art. 15 export
  builds 14 sections keyed by `userId`; `Opportunity` links to the policyholder
  only via `relationship.policyholderUserId`, so it was never queried. The
  profile the feature builds ABOUT a customer (need + severity, € at risk,
  decision criteria, qualification score) has been outside every DSR surface
  since 2026-07-26. Retention under the agent's IDD basis (erasure decision,
  audit H1) covers the ERASURE right and does not exempt the same data from
  ACCESS — different rights.
- Fix: `lib/medic/subject-view.ts` (subject-safe projection) + new
  `advisorOpportunities` export section + DSR runbook amendment 12. Third-party
  names in the stakeholder map (spouse, accountant — not the requester) are
  withheld under Art. 15(4) with the structure still disclosed and the
  withholding flagged in the payload. 6 unit tests; the no-name-leak property
  is mutation-tested. 2490 unit tests + full gate green.
- **Open for counsel:** the Art. 15(4) withholding is a judgement call, and
  whether free-text `Opportunity.notes` should also be disclosed was left
  undecided rather than guessed.

## MEDIC concurrency (CAS) + 320px edit strip — 2026-07-29 — MERGED + DEPLOYED

`NEW-UI` @ `39cf907`, deploy `dpl_2RMcYZ34…` (`nuh9ww1nf`), Ready, apex+www
verified. Sweep's last two angles closed:

- **Concurrent medic writers silently overwrote each other.** All four
  writers (€/EB patch, apply-suggestions, confirmGap sync, proposal-validate
  sync) did read→merge→write-whole-JSON unguarded: a patch could regress the
  pain-ladder mirror; a sync could drop a just-saved € figure. Fix:
  `lib/medic/cas.ts` — optimistic compare-and-swap on the existing
  `medicUpdatedAt` stamp (conditional updateMany; lost race → re-read,
  re-merge, 3 attempts; IO injected so the loop is pure). No schema change.
  5 unit tests incl. a race simulation proving both writes survive.
- **§F edit strip verified at 320px** (never rendered at phone widths before):
  no overflow, controls in-viewport, 24px tap floor — pinned as ladder E2E
  test 5 (5/5). 2484 unit tests + full gate green.

MEDIC issue-sweep tally so far: mirror desync, scorecard-empty, unreachable
`qualified`, row/reopen staleness, concurrent lost-updates — all fixed,
each with a regression guard. Next round must come up clean to close the goal.

## MEDIC row-staleness fix + audit's touch-target rule — 2026-07-29 — MERGED + DEPLOYED

`NEW-UI` @ `6dc2136`, deploy `dpl_EHqyAUaK…` (`7v2cgne0v`), Ready, apex+www
verified (www 200 / apex 308). Two commits:

- **fix(medic) `675ed8f`:** after saving € value-at-risk, an economic buyer, or
  applied AI suggestions, the opportunities row kept the OLD qualification
  score — and the modal re-seeds from the row on open, so close→reopen showed
  pre-save data (advisor's edits looked lost; affected apply-suggestions since
  it shipped). Modal now reports persisted medic changes via `onMedicChange`;
  row + selection update in place. Ladder E2E extended with a close→reopen
  guard (9/9). 2479 unit tests + full gate green. Swept and CLEARED:
  apply-suggestions cannot downgrade an advisor-identified stakeholder
  (append-only merge, name+stance dedupe).
- **fix(a11y) `6dc2136`:** committed the UI-audit session's uncommitted
  `globals.css` WCAG 2.5.8 touch-target floor (owner-approved) — the rule its
  recorded 498→~28 end state was measured with; git and prod are in sync again.

## Product UI/UX + responsive + a11y audit — 2026-07-29 — DEPLOYED

Reported from production: the `/wallet/[id]` header looked wrong in light mode.
It did, and the reason matters more than the fix.

**Why no audit caught it.** Every sweep enumerated static routes from
`app/**/page.tsx` and explicitly skipped the 17 dynamic ones as "covered by the
journey specs" — which do not check theming. `/wallet/[id]` had never been
rendered by any audit, so a 100%-green suite said nothing about it.

**The defect.** `PolicyHero` is dark in BOTH themes (`bg-[#111111]`,
`text-white`, `border-white/15`; not one `dark:` variant in the file). Its status
chip came from `getStatusColor()`, which returns light/dark PAIRS — correct for
a themed surface like `KeyDatesCard`'s `pw-card`, wrong here: in light mode the
light half won and rendered a `bg-green-50` / `text-green-700` chip, styling
meant for a white page, onto a black slab. Added `getStatusColorOnDark()`
following the on-dark idiom the hero already used for its renewal and gap
badges. Pinned with 5 unit tests.

**Coverage fix.** Both audits now DISCOVER dynamic routes at run time by
harvesting real detail hrefs from list pages. Live for `/branches/*`,
`/guides/*`, `/lexiko/*` (18 -> 24 routes, 90 -> 115 surfaces). `/wallet`,
`/customers` and `/tasks` yield nothing locally because the dev DB is
unreachable so no fixture policy exists — those now LOG "that route family is
NOT covered" instead of passing silently.

### New: responsive + a11y + runtime audit — 30 routes x 9 widths

320/360/390/414/768/1024/1280/1440/1920, loading each route once and resizing.
The old sweep's narrowest width was 390px, so 320 and 360 had never rendered.

| | before | after |
|---|---|---|
| horizontal overflow | 191 | **0** |
| accessibility | 18 | **0** |
| runtime/console | 121 | **1** (dev-only warning on a 404) |
| touch targets | 498 | 93 |

Two structural root causes, not per-page bugs:

1. **Greek compounds.** «ασφαλιστήριο» / «πολυασφαλιστήριο» are single words
   whose MIN-CONTENT width exceeds 320px, so a flex/grid child cannot shrink
   below them. Bisecting `/`, `/product` and `/product/business` all landed on
   nodes whose own boxes measured fine.
2. **Automatic minimum size.** Grid and flex children default to
   `min-width: auto`. On `/product` a decorative mock — a 36px icon tile and a
   label — set the width of the whole column while every box measured
   "correctly".

Both fixed in `globals.css` under `@media (max-width: 430px)`:
`overflow-wrap: anywhere` on text blocks, `min-width: 0` on grid/flex children.
Nothing at >=431px changes. **Verified on the live site**: 0 overflow at 320px.

Also fixed: `not-found.tsx` had no `<main>` landmark (every 404 in the app);
`/perks` repeated `| PolicyWallet` over the root layout's own title template;
the fake browser bar's unbreakable mono URL (`min-w-0 flex-1 truncate`);
`LegalDocumentPage`'s light-only hover.

### Full-application coverage — 108 routes

Both sweeps were expanded from a "representative" subset to **all 108 static
routes** (responsive: 30 -> 108; state cascade: 24 -> 108). Narrowing to a subset
is exactly what let the `/wallet/[id]` header defect ship green.

**108/108 routes fully scanned x 9 widths (320-1920): horizontal overflow = 0.**

The first 108-route attempt died on `page.evaluate: Execution context was
destroyed` — an admin route bouncing a policyholder killed the whole sweep. Each
scan is now guarded, and a route that does not complete all 9 widths counts as
incomplete rather than scanned, so coverage cannot silently shrink.

The 78 newly-covered routes carried real semantic defects no earlier sweep could
have seen: `/onboarding` and `/onboarding/agent` had no `<main>` landmark (the
first screen a new user meets, with no skip-link destination), and
`/auth/signup/confirmation` likewise. Both fixed.

### Accessibility — 18 findings down to 1

Fixed on routes no earlier audit had rendered:

- `/agent/settings` had `<label>` elements with no `htmlFor` and inputs not
  nested inside them — visually labelled, programmatically anonymous. Commission
  inputs were named only by an adjacent `<span>`, so the announcement never said
  which branch a rate belonged to.
- `/onboarding/agent` rendered TWO `<h1>`: the brand mark was one, and each step
  renders its own. Logo demoted to `<p>`.
- `/consent/ai` and `/wallet/add` had no `<h1>` at all — given sr-only headings,
  visible design unchanged.
- `<main>` landmarks added to `/onboarding`, `/onboarding/agent`,
  `/auth/signup/confirmation` and `not-found.tsx` (every 404 in the app).

**Final across 108 routes x 9 widths: overflow 0, a11y 1, touch 53.**

The 33 "incomplete" routes are admin pages correctly redirecting a policyholder
— detected and logged, never silently counted as passing.

### Coverage — three sessions, 95/108 routes

The audit runs under policyholder, agent AND admin sessions:

| session | routes fully scanned |
|---|---|
| policyholder | 73/108 |
| agent | 80/108 |
| **admin** | **95/108** |

The remaining 13 are genuine redirects (auth pages bounce a signed-in admin,
`/coverage` -> `/coverage-insights`, `/en/for-agents` -> `/en/solutions/agents`).

**I had recorded the dev DB as unreachable and the admin fixture as therefore
impossible. That was wrong** — the failure was a missing `DIRECT_URL` in the
shell, not connectivity. `E2E_ADMIN` is now provisioned by the existing
`provisionUser`, which writes the role into BOTH `raw_user_meta_data` and the
Prisma `roles` column (admin is gated on both).

### Results

| | start | now |
|---|---|---|
| horizontal overflow | 191 | **0** (incl. the admin console) |
| runtime/console | 121 | **1** (dev-only) |

### /wallet/[id] is now audited — the route that carried the defect

The wallet list navigates with `router.push()` on a card click, not an `<a href>`.
Discovery harvested hrefs, found none, and logged "/wallet ... NOT covered".
**That is exactly why the PolicyHero light-mode defect shipped while every suite
reported green.** Discovery now falls back to the app's own API with the session
cookie (plus a click-through). `/wallet` no longer appears in the NOT-covered
log.

**Two corrections to earlier entries in this file — both were my errors, not the
environment's:**

1. "Dev DB unreachable" — it was a missing `DIRECT_URL` in the shell. With
   `.env.local` loaded the DB answers fine. This had me record the admin fixture
   as impossible for several rounds.
2. "No fixture policy exists" — two exist. I queried `Policy.userId`; the column
   is `ownerUserId`. The query errored and I read that as "none".

Both times I treated a self-inflicted failure as a hard environmental limit.
Worth remembering: when a probe fails, check the probe before believing its
verdict.

### Design-system audit — every className in app/ and components/

Mostly consistent. Shadows use 6 standard values; icon sizes sit on the standard
scale; there are exactly **2** arbitrary spacing values in the whole codebase.

Two real problems, both fixed:

1. `text-[#92400E]` (amber-800) appeared **21 times with no dark partner**,
   several on `dark:bg-amber-900/30` — dark text on a dark surface, the same
   defect class as the reported PolicyHero header.
2. **Duplicate and conflicting `dark:` classes** left by an earlier codemod pass
   in this same session: 3 exact duplicates plus 6 files carrying two different
   values for one property (`dark:bg-amber-900/30 dark:bg-amber-500/15`), where
   the later silently won.

**Deliberately not changed:** 94 hex values without a dark partner are brand and
semantic FILLS that are correct in both themes — `bg-[#29685B]` with white text,
the fake browser chrome's traffic-light dots, status colours. The pixel contrast
audit across 108 routes x 2 themes reports 0 findings, and that is the ground
truth that matters. Converting them to tokens would be churn, not a fix.

### Theme switching — verified across 24+ routes

Three full light/dark toggle rounds per route (a surface that repaints only on
the FIRST switch shows as an unchanged fingerprint on a later pass), then a
refresh, then cross-page navigation and a return. **Passes: zero stale styles,
zero identical-fingerprint surfaces, theme persists cleanly across reloads.**

### Remaining low-priority debt

- **91 touch findings** at the 13-24px WCAG 2.5.8 boundary (44 admin, 39
  policyholder, 8 agent). The checkbox/radio cluster is fixed globally; the rest
  are 20px text links and inputs with explicit `w-3` utilities that correctly
  beat a base-layer rule — per-component work.
- **67 off-scale border radii** (10, 14, 20, 28, 32, 40, 48px). The 44 exact
  matches were collapsed onto the scale with no visual change; these seven are
  genuinely off-scale, so renaming them alters the design. **Needs a human
  decision on what the scale should contain** — a codemod would be guessing.
- `/team` reports no `<h1>` under the agent and admin sessions although
  `TeamClient` renders one unconditionally at line 165 — so those roles see a
  different view. Same for `/dashboard`, `/agent`, `/wallet/add` under admin.
  Not run to ground.
- `/tasks/[id]`, `/customers/[id]`: same `router.push()` navigation as the
  wallet; the API discovery fallback is wallet-specific and could be generalised.
- **No automation exists for UX journey review or performance** (re-renders,
  layout shift, duplicate CSS). Those two brief dimensions were not done and are
  not claimed.

### Checker corrections (each reported correct code as broken)

Left-edge overflow does not scroll in LTR, so a closed off-canvas drawer at
-272..0 is the pattern working; wide content inside its own `overflow-x` scroller
is deliberate; an `aria-hidden` off-screen honeypot needs no label; `sr-only`
skip links are not touch targets. The placeholder Sentry DSN and CSP-blocked
`va.vercel-scripts` are dev-only — **verified prod injects same-origin
`/_vercel/insights/script.js` (200), so the CSP was NOT loosened.**

## Theme & UI consistency audit — 2026-07-28 — MERGED + DEPLOYED

**Live in production.** `origin/NEW-UI` fast-forwarded `17a1b3f..e780e89` (18
commits, 72 files) and deployed via `vercel --prod`:
`dpl_Ab5iDG7KC9pEH2v9DqiMuAxD7DQr` (`kgk3zfa2p`), Ready, all 5 aliases moved
including apex + `www.policywallet.gr`. No DB work — zero `prisma/` changes in
the batch.

Post-deploy verification: 12 public routes 200, 4 protected 307, apex 308. All
three headline fixes confirmed in the shipped assets, not just the build:
`overflow-wrap:anywhere` on `/product/business`; `bg-amber-50
dark:bg-amber-900/20` and `text-amber-700 dark:text-amber-300` on `/product`;
and in the CSS bundle
`.dark .pw-app-canvas{background-image:radial-gradient(...),linear-gradient(to bottom right,#000,#111)}`.

Note: `verify:migrations` fails locally with `Environment variable not found:
DIRECT_URL` — the shell had not loaded `.env.local`. With it loaded,
`prisma validate` reports the schema valid. Environmental, not a defect.



**Full matrix green.** Theme audit (every route x desktop/tablet/mobile x
light/dark) plus theme-switch/stale-styles: **8/8 passed, 0 contrast findings**.
Layout audit (overflow, viewport escapes, clipped text): **4/4 passed, 0
findings**.

### Two "false positives" were real

The scanner fix that exposed them — sampling the background beside the glyph run
instead of across the whole element box — kept both alive, which forced a second
look at findings I had dismissed:

1. `ProductSections` warn branch: `border-amber-100 bg-amber-50` with no dark
   variant, beside an ok branch that correctly carried `dark:bg-slate-900`.
   Child text `text-[#0F172A] dark:text-white`. **White on amber-50, 1.04:1.**
2. `.pw-app-canvas` — the canvas under every authenticated page — painted
   `linear-gradient(..., #f8fafc, #ffffff)` with no `.dark` override, while its
   sibling `.pw-page-shell` had had one all along.

### Why every earlier sweep missed them — the durable lesson

- The static theme-pair audit reads a whole `className` body as ONE string. In
  `${warn ? "bg-amber-50" : "... dark:bg-slate-900"}` it sees both tokens and
  calls it covered. Those are two mutually exclusive elements: a dark variant on
  one branch masks its absence on the other. Making the audit **branch-aware**
  immediately surfaced 56 more. The same blind spot was in the *fixer*, whose
  "already paired?" lookahead read across the ternary boundary.
- A gradient paints via `background-image`, so a computed `backgroundColor`
  check reports `transparent` and never sees it. Only a composited pixel does.
  Anything translucent above it (a `/10` or `/15` wash) blended toward white and
  lost contrast in dark mode.

### Fixed

- 140 light-only surfaces paired with dark partners across 53 files
- `.dark .pw-app-canvas`; swept globals.css for other light gradients: none
- Tablet header overflow: PublicHeader showed nav + actions from `md:` but they
  need ~1024px; at 834px the CTA ran 84px off-screen on `/` and `/company`.
  Moved to `lg:`, keeping the hamburger that already existed.

### Scanner defects corrected

Background now sampled beside the glyph run. `sr-only` skip links no longer read
as truncated text — that guard's regex sat inside a template literal and reached
the browser with its escape stripped, so it split on the letter "s" and could
never match. Hover compared at 400ms rather than 120ms against 150ms
transitions, with the pointer parked between controls, `aria-current` items
exempt, and a pointer-reachability gate.

### Verified green

| Suite | Result |
|---|---|
| Theme audit (contrast, 3 viewports x 2 themes) | **8/8, 0 findings** |
| Layout (overflow, escapes, clipped text) | **4/4, 0 findings** |
| Interaction states (hover + focus) | **3/3, 0 findings, 0 unmeasured** |
| **State cascade** — every declared state, every element, 18 pages x 2 themes | **0 findings** |
| **Surfaces** — cards/dialogs/menus in dark mode | **0 light surfaces** (89/90/90 measured) |

Plus audit:api-auth, lint, i18n, utf8, type-check, 2469 unit tests, build.

**`tests/theme-state-cascade.spec.ts` is the one to keep.** Driving real mouse
events into controls cost ~1.5s each, so the button sweep never finished and two
runs were killed; it also only reached the handful of controls the sampler
picked. Reading the CSSOM instead — every rule carrying :hover, :focus-visible,
:focus, :active, :disabled, :checked, aria-pressed/selected/current or
[data-state] that sets a colour, resolved against live elements and scored on the
COMPOSITED surface — covers every element in every declared state and finishes in
15 minutes. It replaced theme-controls-audit.spec.ts, which measured 16 surfaces
and never completed a button run; this measures 90 and finishes.

### Full 108-route matrix — COMPLETE, zero findings

| Shard | Coverage | Result |
|---|---|---|
| desktop light + dark | 107/108 routes each | **0 findings** (33.5m) |
| tablet light + dark | 107/108 routes each | **0 findings** |
| mobile light + dark | 107/108 routes each | **0 findings** (1.1h) |

The single skipped route redirects after `goto` resolves, which destroyed the
execution context under the scanner's style injection and had been taking the
whole sweep down. Per-route try/catch + a 75% coverage floor fixed that — the
sweep was never timing out, and raising the budget could never have helped.

### Layout — COMPLETE, zero findings

108 routes x desktop/tablet/mobile: **4/4 passed, 0 findings** (43m). Covers
horizontal overflow, elements escaping the viewport, and text clipped without
an ellipsis.

The last open defect is FIXED. `/product/business` scrolled sideways at 390px
(scrollWidth 428). No element's rect exceeded the viewport, so the usual "find
the wide child" probe returned nothing. Bisecting — hide each subtree, watch
scrollWidth — found the hero `<h1>`: its box measures 342px and fits, but its
MIN-CONTENT width overflows, because «πολυασφαλιστήριο» is a single unbreakable
17-character word wider than the viewport at `text-h1`.

`overflow-wrap:anywhere` is the one value that shrinks intrinsic min-content
width (`break-word` does not). Applied to all 16 hero headings sharing the
pattern, since every LoB page carries Greek compounds of the same shape.
NOT fixed with `overflow-x:hidden`, which hides the symptom and silences the
audit.

### The lesson that cost the most

Four of the last five "defects" were the AUDIT failing, not the UI, and every one
had the same shape: **a failure to measure was reported as a failed component.**

- sr-only "truncation" on 12 routes — the guard's `/\s+/` sat inside a template
  literal, reached the browser as `/s+/`, and split on the letter "s"
- all 11 /account controls "no hover" — the snapshot returned `undefined`, and
  `undefined === undefined`
- 0 of 74 buttons measured — `evaluate()` given a STRING silently yields nothing;
  every real function reference worked

/account took eight rounds. What cracked it was not another hypothesis: the
finding count stayed byte-identical at 188 across five different edits, one of
which added an early `continue`. **A number that does not move when the code
moves is not measuring the code.** Both new suites now assert a minimum measured
count so this fails loudly instead of passing green.

**Not deployed** — 8 commits on `NEW-UI` awaiting go-ahead.

