# PW-ENTITLE-01 — Step 0 (investigation only; no product code changed)

Date: 2026-10-24 · Investigator: step0-investigator (Fable 5.1) · Worktree: `pw-entitle` @ `25f3ff41` · Code read from: **`pw-customer` @ `2e64e82a`** (see §1.1 for why)
Status: **not approved** — add `Approved: <date> — Eli` here when the §7 questions (HALTS H-050…H-058) are answered.

Series source: there is **no `docs/series/PW-ENTITLE-01.md`** on any branch. The series exists only as the stub
`docs/transformation/QUEUE.md:1824-1834` on `pw-customer` («STUB, not started … No acceptance criteria written
yet; do not start until they are»), plus the items QUEUE.md files «under PW-ENTITLE-01»: FREE-UPSELL-SLOT-ANALYSISCARD
(:1841), SHARE-ROUTE-ENTITLEMENT-GAP (:1844), PLAN-FEATURE-GATE-VS-ENFORCEMENT (:1845), ANNUAL-SWITCH-RETRIAL (:1859),
QA-BUDGET-SPLIT (:1872), BUDGET-MEASURE (:1880). The three numbered items of the stub (owner, 2026-10-22):

1. **One trial per customer, lifetime** (decision PW-C02-D10; H-028).
2. **`/api/v1/policies/share` entitlement bypass** — marked for the `security-reviewer`.
3. **Free = 1 lifetime full analysis; Plus + Family = full analysis on all policies** (H-019 intent).

Decisions already settled and NOT reopened here (DECISIONS.md, read first): PW-C02-H019 (copy = enforced code; future
policy is this series), PW-C02-H020 (no analysis limit published), PW-C02-H023 (exclusions follow code; packaging → H3),
PW-C02-D10 (Family keeps the 14-day trial; no «νέοι συνδρομητές» while code grants it to everyone), D12/D19/D21/D25
(tokens internal; published count is the cap; budgets are interim until BUDGET-MEASURE), D28 (live-Stripe items are a GA
gate), D30/D31 (round-7 budgets are on production rows; production SQL is `ask` per call).

**Gating legend used below:** `[MIGRATION → PW-STAGING-01]` = needs DDL, so it waits for preview deployments on a staging
Supabase project (QUEUE «PREVIEW-USES-STAGING-SUPABASE»; no `PW-STAGING-01.md` exists either). `[H3]` = waits on run-plan
decision H3 (packaging). `[no gate]` = code-only, reversible, can be built once acceptance criteria exist.

---

## 1. What the series assumes that turned out false (read this first)

### 1.1 This worktree cannot build the series as written — the code it names is not on this branch
`pw-entitle` is `25f3ff41` = `NEW-UI` HEAD. Every PW-CONTENT-02 artefact the stub references — `lib/pricing/trial-disclosure.ts`,
`lib/marketing/plan-claims.ts`, the round-7 budgets in `plan-defaults.ts`, `plan-gating-parity`'s A1 arm,
`trial-disclosure-everywhere.test.ts`, the whole `docs/series/` tree, HALTS H-012…H-035 — exists only on `pw-customer`
(PR #410, «ready for review, DO NOT MERGE until Eli does», STATUS.md). `git diff --stat pw-entitle pw-customer -- . ':!docs'`
= **159 files, +3,744/−1,375**. This worktree has **no `node_modules`** and **no `.env`**, so nothing here can run tests or
reach a database. **Consequence:** the build step starts from `pw-customer` (or from `NEW-UI` after #410 merges), never from
this tree; and `docs/transformation/HALTS.md` here ends at the OLD H-011 — the H-050… block appended below must be ported onto
`pw-customer`'s file at build time.

### 1.2 Item 1 is a code defect no customer can hit today — GA gate, not a live defect (severity DOWN)
`createCheckoutSession` (`lib/billing.ts:91,117`) does pass `trial_period_days` to every checkout, but the function refuses
on line 63-64 whenever `publicCheckoutAvailability().available` is false, and production runs on Stripe TEST keys (D28; memory
«Stripe: prod still on TEST keys»). STATUS.md risk #2 adds that paid consumer checkout must stay withheld until the statutory
online withdrawal function exists (§1.6). So «the live checkout grants the trial to every checkout» is true of the code and
false of production behaviour. It belongs on the live-Stripe gate, with its copy consequence («νέοι συνδρομητές», D10) tied
to the same deploy.

### 1.3 Item 2 is bigger than «an API route» — the UI's own write path has no gate either (severity UP)
The stub names `app/api/v1/policies/share/route.ts:125`. Read in full (§2.3):
- The route's POST creates the grant with no entitlement check (`:107-134`) — as stated.
- **The server action the UI actually calls, `sharePolicy` (`app/(protected)/wallet/actions.ts:1127-1270`, invoked by
  `components/wallet/CollaborationPanel.tsx:97`), has no `agentCollaboration` check at all.** The only thing keeping a Free
  owner from sharing is that `PolicyDetailsClientView.tsx:260-263` hides the panel. Every `"use server"` export is a public
  endpoint (CLAUDE.md), so the bypass is reachable from the UI path, not only from the API.
- The route and the action **diverge in substance**: the action creates or revives the `CustomerRelationship` in the same
  transaction as the grant (`:1208-1270`, PW-BRIDGE-01 I-03); the route mints a bare grant (`:125-133`) with **no
  relationship** and invite `relationshipType: 'policy_share'` (vs the action's `'client_agent'`). A route-made grant to an
  advisor therefore has nothing the «access dies with the relationship» invariant can end — only an explicit revoke.
- The route has **no caller in the repo** (`git grep` → only `app/api-docs/page.tsx:21` lists it under the Agent persona).
- `lib/invites/redeem-invite.ts:210` mints the grant at redemption with no re-check of the inviter's entitlement.
- A ready-made gate already exists and is NOT used here: `requireCollaborationEntitlement` (`lib/api-entitlements.ts:29-52`),
  roles-aware (admins exempt; agents resolved against the agent catalogue — the «D3 trap» of `resolveUserEntitlements`
  resolving agents to `free`), used by the three collaboration routes only.

### 1.4 Item 3 is not «write the column» — Free's token budget refuses the free analysis before the paywall is reached (severity UP)
`users.trial_analysis_used_at` exists (migration `20260704000000`), is read (`wallet/[id]/page.tsx:142-152`), threaded to
`AnalysisCard.tsx:740`, counted on the admin dashboard (`admin/actions.ts:100`), reset by `tests/global-setup.ts:242-245`,
mocked in `ai-processing-consent-gate.test.ts:370` — and **never written** (`git grep` over `app lib`: zero writers; the comment
at `page.tsx:134` «claimed atomically by the orchestrator» is false). So far as expected. What the stub does not say:

- The ONE predicate `canRunDeepAnalysis(tier)` (`feature-gates.ts:224-226`) is a function of tier alone; a lifetime grant needs
  a second input, and `deep-analysis-gate-single-predicate.test.ts` enumerates three gate sites (orchestrator,
  `app/onboarding/actions.ts`, `lib/services/policy.service.ts`) plus every display that compares `tier` to a literal.
- **The token gate binds first.** After `createRun` passes the tier gate it calls `canUserUseTokens(userId, R)`
  (`orchestrator:708`, rule `used + R ≤ limit`, `token-tracking.ts:398`). Free's `monthlyTokenBudget` is **150,000**
  (`plan-defaults.ts:98`; production row identical, D13/D26). R is 142,800–151,200 by branch (H-033), and the upload-time
  extraction is **recorded against the same monthly row** without a gate (QUEUE BUDGET-DRAW-SCAN-UPLOAD; 102,000). A Free
  user who uploaded one policy this month has ~102,000 used → `102,000 + 142,800 > 150,000` → `TOKEN_LIMIT_BLOCKED`, which
  the wallet renders as «μηνιαίο όριο ανάλυσης» (`el.ts:1335,2594`). Even at zero usage, home/renters (151,200) are refused.
  **The one free analysis cannot run on today's Free budget.** D17 says the budget «never binds first» because Free never
  reaches the gate; item 3 makes it reach the gate. The fix is a Free budget ≥ 253,200 (× 1.1 ≈ 280,000) — a plan-row write
  on production under the catalogue-coupling order (code first, rows after), and `budget-reaches-published-count.test.ts`
  must gain a Free arm (the published count becomes 1).
- The same arithmetic hits the **Plus unlock**: Plus = 600,000 (`plan-defaults.ts:115`) → about two batch-path runs
  (253,200 each) before a 10-policy plan is refused on its third policy. D19's rule («the published count is the cap; the
  budget never binds first») requires ≈ 10 × 253,200 × 1.1 = **2,785,200** for Plus. `[H3]` for whether Plus gets it at all.
- The admin KPI at `admin/actions.ts:100` renders a count from a column nothing writes: a **0 that is not a measurement**
  (CLAUDE.md «absence … must never render as reassurance», applied to an admin number).

### 1.5 The onboarding and post-upload auto-triggers would spend the one free analysis without the customer choosing
`canRunDeepAnalysis` is also read by `app/onboarding/actions.ts` and `lib/services/policy.service.ts` (the post-upload trigger),
per `deep-analysis-gate-single-predicate.test.ts:24-28`. If the predicate becomes true for a Free user with an unused grant,
both auto-triggers fire on the first upload — the lifetime analysis is consumed by whichever document came first, possibly a
«menu» that the document gate let through as a scan. Decision needed (H-053).

### 1.6 A Greek statutory requirement sits between item 1 and any live checkout — read from the Gazette, not from memory
**Law 5317/2026, Article 69** adds **Article 3ζα** to Law 2251/1994 («Άσκηση του δικαιώματος υπαναχώρησης από συμβάσεις που
συνάπτονται από απόσταση μέσω επιγραμμικής διεπαφής»). Read from the official Gazette PDF, ΦΕΚ Α' 108/10.07.2026, pages
5205–5206 (text extracted with `pdftotext` on 2026-10-24; mirror URL
https://www.greekecommerce.gr/wp-content/uploads/2026/07/20260100108.pdf, accessed 2026-10-24; the repo's legal audit cites the
same Gazette at `docs/audits/public-language-legal-2026-10-21.md:38`). Quoted:
> «1. Στις συμβάσεις που συνάπτονται από απόσταση μέσω επιγραμμικής διεπαφής, ο προμηθευτής διασφαλίζει ότι ο καταναλωτής
> μπορεί να υπαναχωρήσει από τη σύμβαση και μέσω λειτουργίας υπαναχώρησης. Η λειτουργία αυτή φέρει την ένδειξη «Πατήστε εδώ
> για υπαναχώρηση» ή άλλη εξίσου σαφή και ευανάγνωστη διατύπωση. … 3. … μέσω ειδικής λειτουργίας επιβεβαίωσης … φέρει μόνο
> την ένδειξη «Επιβεβαίωση υπαναχώρησης» … 4. … βεβαίωση παραλαβής της υπαναχώρησης σε σταθερό μέσο, η οποία περιλαμβάνει το
> περιεχόμενο της δήλωσης, καθώς και την ημερομηνία και ώρα υποβολής της.»
Commencement, Article 143 §1: «η ισχύς του παρόντος νόμου αρχίζει από τη δημοσίευσή του στην Εφημερίδα της Κυβερνήσεως, εκτός
αν ορίζεται διαφορετικά» (same PDF). The 14-day withdrawal period itself: Directive 2011/83/EU Art. 9(1) «the consumer shall
have a period of 14 days to withdraw from a distance or off-premises contract, without giving any reason», Art. 9(2)(a)
«in the case of service contracts, the day of the conclusion of the contract» (read at
https://www.legislation.gov.uk/eudr/2011/83/article/9, accessed 2026-10-24 — EUR-Lex returned an empty body to three fetch
attempts today; the repo's audit cites EUR-Lex CELEX 32011L0083 for Arts. 8(8), 9, 13, 14). What I did NOT find: any official
source on how a free trial interacts with the withdrawal period, or on whether PolicyWallet's subscription is in the law's
financial-services carve-out (ν. 2251/1994 art. 3 §1β lists 3ζα as applying there too). I am not asserting either; H-056
asks. **No sentence in this series' copy may describe cancellation as withdrawal** (the trial sentence says «ακυρώσετε»).

### 1.7 What could not be verified
- **No database was read.** This worktree has no `.env`, no `node_modules`, no `psql`; the Supabase MCP tools are not
  loadable in this session (`ToolSearch` unavailable), and production `execute_sql` is `ask` per call (D30). Dev and
  production counts of subscriptions, grants and `trial_analysis_used_at` are therefore **not** reported. CLAUDE.md records
  zero real users; D30/D31 record the plan rows. No production data was found that a fixture cannot reproduce, because no
  production data was read — stated, not assumed.
- `lib/gap-detection.ts` SHA-256 = `1d397fd9b04ced40eb853b9c682185a332bbce3f96883c454e026084d20a31f1` in BOTH trees
  (`shasum` 2026-10-24), equal to `FROZEN_GAP_DETECTION_SHA256` at
  `tests/unit/gap-severity-display-single-source.test.ts:197-198`. **This design does not touch it** (§6).

---

## 2. What exists (read, with references — `pw-customer` tree)

### 2.1 Billing: how a trial is granted and how a subscription is recorded
| Path | What it does |
|---|---|
| `lib/billing.ts:38-148` `createCheckoutSession` | refuses when `publicCheckoutAvailability()` says unavailable (`:63-64`); `trialDays = plan.trialDays ?? TRIAL_DAYS_BY_PLAN[planId]` (`:91`); `subscription_data: trialDays ? { trial_period_days } : undefined` (`:117`); hosted-page sentence from `trialDisclosure(trialDays ?? 0, periodPrice, period)` (`:120-123`); passes `customer_email`, **not** `customer` (`:132`) — so Stripe creates a NEW Customer per checkout and Stripe-side trial dedup is unusable; our DB is the only source of truth for «had a trial». **No prior-subscription check.** |
| `app/api/stripe/checkout/route.ts:50-81` (deprecated, no callers) | the only place with `hasPriorSubscription = count(subscriptions where userId, planId ≠ 'ph-free')` → trial only when 0 (`:79`). Inventory `scripts/api-route-policy-inventory.json` `stripe/checkout/route.ts` `auth: user`, POST (live). |
| `app/api/v1/billing/checkout/route.ts:22-93`, `app/(protected)/account/actions.ts:27-69` `upgradeSubscription` | the two live callers; the action refuses a checkout for the plan the user is already on (`:45-48`) but not a monthly→annual switch (QUEUE ANNUAL-SWITCH-RETRIAL). |
| `lib/billing.ts:460-587` `handleSubscriptionSuccess` | idempotent grant; retrieves the Stripe sub (`:493`), refuses `canceled`/`incomplete_expired` (`:497-503`), persists `stripeCustomerId` (`:519`), creates the `active` row and EXPIRES priors in one transaction (`:540-558`), cancels prior Stripe subs best-effort (`:574`), writes an admin `activity_logs` row only (`:577-584`, H-032: no customer email). |
| `lib/billing.ts:419-458` `expireAndCancelPriorSubscriptions` | marks priors `expired` (never deletes) — **rows survive**, which is what a lifetime check needs. |
| `lib/services/billing/stripe-lifecycle.ts:19-35,42-66` | handles `customer.subscription.updated/deleted`, `invoice.paid/payment_failed`; `trialing` maps to `active` (`:31`); **no `customer.subscription.trial_will_end`** (H-032). |
| `prisma/schema.prisma:889-913` `Subscription` | `status`, `stripeSubscriptionId @unique`, `currentPeriodStart/End`, `autoRenew`, `provider`; **no `trialEnd`**, no «trial consumed» marker. `User.stripeCustomerId @unique` (`:92`). `Plan.trialDays Int @default(0)` (`:854`). |
| `lib/subscription-entitlements.ts:111-124,149-176` | `isSubscriptionLive` and `resolveUserEntitlements` (latest `active` non-agent row → tier via `resolveB2cPlanLimits`). |
| `lib/pricing/trial-disclosure.ts:20-33` | THE trial sentence; guard `tests/unit/trial-disclosure-everywhere.test.ts` enumerates every file that starts a checkout. |
| `lib/billing/trial-plans.ts`, `plan-defaults.ts` `DEFAULT_TRIAL_DAYS_BY_PLAN`, `feature-gates.ts:201` `PLAN_PRICING.pro.trialDays: 14` | client-safe fallbacks of the row's `trial_days`. |

### 2.2 The deep-analysis entitlement
| Path | What it does |
|---|---|
| `lib/monetization/feature-gates.ts:84-99` | `full_ai_policy_analysis.requiredPlan: "pro"` (= Family); `:224-226` `canRunDeepAnalysis(tier)`. `advanced_gap_detection`, `multi_insurer_insights`, `agent_collaboration`, `export_report`, `unlimited_ai_questions`, `protection_monitoring`, `partner_offers` are also `pro`; `policy_upload_limit`, `pdf_preview`, `token_topup`, `advanced_renewal_reminders` are `plus`. |
| `lib/services/analysis/policy-analysis-orchestrator.service.ts:625-655` | tier gate → `blocked / free_tier_ai_locked / UPGRADE_REQUIRED` with message «Full AI analysis is a Family feature…»; `:657-674` missing document; `:679-682` estimator; `:693-704` run row; `:708-745` token gate → `TOKEN_LIMIT_BLOCKED`, policy `action_needed`. Agents skip the tier gate (`:635,640`). |
| `app/onboarding/actions.ts`, `lib/services/policy.service.ts` | the other two readers of the predicate (per `deep-analysis-gate-single-predicate.test.ts:24-28`); `policy.service.ts:554` reads `free_tier_ai_locked`. |
| `lib/token-tracking.ts:380-420` | `canUserUseTokens`: `used + estimated ≤ limit`, then purchased balance for non-free. |
| `lib/pricing/plan-defaults.ts:93-141` | Free 150,000 / Plus 600,000 / Family 8,700,000 (round 7). Production rows equal (D13/D26/D30). `agentCollaboration` false/false/true (`:101,118,141`). |
| `prisma/schema.prisma:99` `User.trialAnalysisUsedAt @map("trial_analysis_used_at")` | added by `prisma/migrations/20260704000000_trial_analysis_and_invite_relationship/migration.sql`. |
| Readers of the column | `app/(protected)/wallet/[id]/page.tsx:133-154` (`trialAnalysisAvailable`, owner + Free + not agent), `PolicyAnalysisTabs.tsx:32,46,110`, `AnalysisCard.tsx:73,105,735-749` (post-trial `UpgradeTriggerCard` branch, unreachable today), `components/wallet/PolicyDetailsClientView.tsx:140,184,1105`, `components/account/types.ts:153`, `app/(protected)/admin/actions.ts:100` (KPI). **Writers: none** (tests only: `tests/global-setup.ts:242-245` resets it). |
| Blocked-run rendering | `lib/wallet/record-status.ts:49-62` (`free_tier_ai_locked → "plan"`, `insufficient_tokens → "tokens"`), `lib/wallet/policy-detail.ts:330-335` (`analysisBlockedUpgradeTitle/Hint`, `el.ts:642-643` «Η πλήρης ανάλυση AI είναι δυνατότητα του Family»), `AnalysisCard.tsx:320-330` (`UPGRADE_REQUIRED → feature_locked`, `TOKEN_LIMIT_BLOCKED → token_limit`), `el.ts:1334-1335,2592-2594`. |
| Guards | `tests/unit/deep-analysis-gate-single-predicate.test.ts` (one predicate, allow-list by file); `tests/unit/plan-gating-parity.test.ts:113-135` (A1: no in-app string may promise a free full analysis «because nothing grants it»); `tests/unit/ai-processing-consent-gate.test.ts:332,364-378` (expects `free_tier_ai_locked`; agent path asserts `user.updateMany` NOT called — the harness already anticipates an atomic claim via `updateMany`); `tests/unit/budget-reaches-published-count.test.ts` (D25 rule; no Free arm); `tests/unit/plan-defaults-match-production-rows.test.ts` + `tests/fixtures/production-plan-rows-2026-10-22.json` (pins defaults to production rows — a budget change must land on production the same day as the code, D30 order). |

### 2.3 Sharing with an advisor (`agentCollaboration`)
| Path | What it does |
|---|---|
| `app/api/v1/policies/share/route.ts` | POST (`:24-166`): owner check (`:40-47`), unknown email → Invite (`:58-105`), known user → `accessGrant.findFirst/update/create` (`:107-134`) — **no entitlement check, no relationship**; GET (`:169-241`) lists grants received; DELETE (`:244-292`) revokes by granter. Inventory: `auth user`, `policy-mutation` rate limit, zod. `policy-authorization-single-path.test.ts:207-208` exempts it as «mints/revokes grants as the policy OWNER». |
| `app/(protected)/wallet/actions.ts:1127-1270` `sharePolicy` | owner check (`:1131-1140`), invite or grant+relationship in ONE transaction (`:1237-1270`) — **no entitlement check**; `ACTION_EXEMPT` reason at `policy-authorization-single-path.test.ts:414`. Caller: `components/wallet/CollaborationPanel.tsx:97`. |
| `components/wallet/PolicyDetailsClientView.tsx:260-263` | `canUseCollaboration = tierLimits?.agentCollaboration !== false` — the only gate, a display one. |
| `app/(protected)/wallet/collaborationActions.ts:55-61`, `wallet/actions.ts:2063-2067` (`notifyAgentAboutGap`), `lib/api-entitlements.ts:29-52` (three `/api/v1/collaboration/threads*` routes) | the EXISTING roles-aware entitlement gates for the same feature; guard `tests/unit/collaboration-entitlement-gate.test.ts` (routes only). |
| Other `accessGrant.create` writers | `app/(protected)/agent/actions.ts:979,1127` (agent-created policy → `manage` grant inside the relationship transaction; not a customer-side share), `lib/invites/redeem-invite.ts:210` (invite redemption; no inviter re-check). |
| `lib/policy-access.ts:117-176` `computePolicyAccess` | derives read/write/delete from the grant level ALONE (`:124-126`); the relationship gates only the managing-agent arm (`:134-135`). |
| Family wallet (a different mechanism) | `app/(protected)/account/family/actions.ts:30-31` `inviteFamilyMember` refuses `tier === "free"` only (Plus and Family allowed); `WalletMembership` (`schema.prisma:2640-2656`). Public copy says advisor sharing is Family (`plan-claims.ts:129 advisorCollaboration`). |
| i18n | `el.ts:3421` «Συνεργασία με τον ασφαλιστικό σας σύμβουλο», `subscription-copy.ts:113-116`, `upgrade-copy.el.ts:104-112` (`agent_collaboration` upsell copy exists), `el.ts:4408` family-invite `UPGRADE_REQUIRED`. No `wallet.share.*` upgrade error key exists yet. |

### 2.4 RLS
Eight migrations carry `ENABLE ROW LEVEL SECURITY` (listed by `git grep` on `prisma/migrations`); **zero `CREATE POLICY`**
statements exist anywhere, by design (HALTS H-014: the app connects as the table owner; authorization is enforced in code —
`computePolicyAccess`, the single-path guard, the HTTP cross-tenant spec). None of `users`, `subscriptions`, `access_grants`,
`plans` is RLS-enabled. This series adds no table and changes no RLS posture.

### 2.5 Design-system primitives available
`components/monetization/UpgradeTriggerCard.tsx` (`featureKey`, `triggerSource`, `variant: "card" | "inline"`, `headingLevel`),
`components/monetization/UpgradeModal.tsx`, `components/monetization/PlanBadge.tsx`, `components/ui/StatusPill.tsx`; tokens and
utilities `.pw-card`, `.pw-pill`, `.pw-kicker` in `app/globals.css` (MASTER.md).

---

## 3. Proposed design (not applied)

### 3.1 Data model
**No DDL is required for items 1–3.** `users.trial_analysis_used_at` exists; subscription history survives as `expired` rows;
`Plan.trial_days` is the trial's source.

Optional, only if H-051 chooses «carry the remaining trial across a monthly→annual switch» AND wants it locally recorded:

```sql
-- OPTIONAL — [MIGRATION → PW-STAGING-01]. NOT applied. Not needed if the build reads Stripe's
-- subscription.trial_end at checkout time instead (recommended: zero DDL, reversible).
ALTER TABLE "subscriptions" ADD COLUMN "trial_end" TIMESTAMP(3);
```

Required but NOT a migration — production **plan-row writes** (catalogue coupling; code deployed first, rows after, one
guarded statement per row, `plan_revisions` + `activity_logs` rows as D30/D31 did):

```sql
-- NOT applied. Values are the §1.4 arithmetic; H-054 confirms the Free figure, H-055 the Plus one.
-- ph-free: the one lifetime analysis must clear used(upload 102,000) + R_max 151,200 = 253,200 → ×1.1
UPDATE plans SET entitlements = jsonb_set(entitlements, '{monthlyTokenBudget}', '280000')
 WHERE plan_id = 'ph-free' AND (entitlements->>'monthlyTokenBudget')::int = 150000;
-- ph-plus [H3]: 10 policies × 253,200 × 1.1 = 2,785,200 → 2,800,000
UPDATE plans SET entitlements = jsonb_set(entitlements, '{monthlyTokenBudget}', '2800000')
 WHERE plan_id = 'ph-plus' AND (entitlements->>'monthlyTokenBudget')::int = 600000;
```

QA-BUDGET-SPLIT (QUEUE :1872, «under PW-ENTITLE-01»), if pulled into this series, is the only item that needs DDL:

```sql
-- QA-BUDGET-SPLIT — [MIGRATION → PW-STAGING-01]. NOT applied. Splits the monthly row by draw type so the
-- analysis gate ignores Q&A usage and vice versa. Entitlement keys monthlyAnalysisBudget / monthlyQaBudget
-- are JSON (plan rows + strict Zod schema), not DDL.
ALTER TABLE "monthly_token_usage" ADD COLUMN "qa_tokens" BIGINT NOT NULL DEFAULT 0;
```
Recommendation: keep QA-BUDGET-SPLIT and BUDGET-MEASURE OUT of this series' acceptance (they need measured actuals and a
staging-rehearsed migration), and let this series ship the three stub items + the two budget rows.

### 3.2 API contract
| Surface | Change |
|---|---|
| `createCheckoutSession` (`lib/billing.ts`) | new `trialEligibility(userId, plan)` (one function, `lib/billing/trial-eligibility.ts`): eligible iff **no `subscriptions` row of the same `planType`** exists for the user (any status — `expired`/`past_due` rows are a consumed trial or a paid period; `handleSubscriptionSuccess` never creates a row for a checkout that died `incomplete_expired`, `:497-503`). `trialDays` becomes `eligible ? row.trialDays : 0`; `custom_text` therefore disappears for the ineligible (`trialDisclosure(0,…) → null` already). Also pass `customer: user.stripeCustomerId` when present instead of `customer_email` (one Stripe Customer per person; both fields together are invalid in Stripe — exactly one). `[no gate]` |
| `POST /api/v1/billing/checkout` | request unchanged; response `details` gains `trial_days_applied: number`. |
| `GET /api/v1/me/subscription` | adds `trial: { eligible: boolean, days: number }` for the B2C paid plans and `analysis: { lifetime_free: { available: boolean, used_at: string \| null } }` (replaces the `creditBalance` leftover, `:69`). |
| `upgradeSubscription` (server action) | unchanged signature; H-051 decides the monthly→annual case (carry `trial_end` from the live Stripe sub via `subscription_data.trial_end`, or no trial). |
| Trial sentence | `trialDisclosure(days, price, period)` is unchanged; callers pass `days = eligible ? row.trialDays : 0` from the server. Anonymous surfaces (/pricing, home preview, sign-up confirmation) keep the general sentence and gain «για νέους συνδρομητές» ONLY after this ships (D10). Guard `trial-disclosure-everywhere` gains an arm: every signed-in selling surface must receive eligibility from the server (probe: a surface typing `14`). |
| `POST /api/v1/policies/share` and `sharePolicy` | ONE service `lib/sharing/share-policy.service.ts` (owner check → entitlement → invite or grant+relationship in one transaction, exactly the action's body) called by both; entitlement via a non-Response twin of `requireCollaborationEntitlement` (`lib/api-entitlements.ts` refactored to return a reason; admins exempt, agents resolved on the agent catalogue). Route 403 `UPGRADE_REQUIRED` «Agent collaboration is available on the Family plan» (same code as the collaboration routes); action `{ error: "UPGRADE_REQUIRED" }` (same as `collaborationActions.ts:60`). H-052 decides whether POST is retired instead (no caller) and what happens at invite redemption. **Security review: yes** (stub). `[no gate]` |
| `redeemInvite` | re-evaluates the INVITER's entitlement at redemption; if lapsed, mints nothing and notifies both (copy for Eli) — or mints anyway: H-052. |
| Orchestrator `createRun` | predicate becomes `canRunDeepAnalysis({ tier, trialAnalysisUsedAt })` → `{ allowed, via: "plan" \| "lifetime_trial" }`; for `via === "lifetime_trial"` the claim is atomic: `db.user.updateMany({ where: { id, trialAnalysisUsedAt: null }, data: { trialAnalysisUsedAt: now } })`, `count === 1` or blocked `free_tier_ai_locked`. Keep ONE blocked reason (`record-status.ts:53` already maps it to «plan»); `trialAnalysisUsedAt` tells the UI which message. On a **technical** failure of that run (provider, `MISSING_DOCUMENT`, discard via `policy-discard.ts`) the claim is released (`trialAnalysisUsedAt: null`) — H-053 confirms; quota/consent blocks are KEEP-AND-INFORM and do not consume it (the consent gate runs before the tier gate, `ai-processing-consent-gate.test.ts`). `[H3 for Plus; no gate for Free]` |
| Auto-triggers (`onboarding/actions.ts`, `policy.service.ts` post-upload) | NEVER consume the lifetime grant; they keep `via === "plan"` only. The Free customer starts the one analysis explicitly from `AnalysisCard` (H-053). |
| Admin KPI `admin/actions.ts:100` | keeps the query (it becomes live with the writer) but the label states the denominator («Free accounts that used the one free analysis, last 30 days»). |

### 3.3 Components, mapped to existing primitives
| Component | Primitive | Notes |
|---|---|---|
| `AnalysisCard` offer slot (Free, `trialAnalysisAvailable === true`) | existing run button + `.pw-kicker` line | copy new («1 δωρεάν πλήρης ανάλυση — διαθέσιμη για ένα ασφαλιστήριο»; Eli signs it); identity through `policyLabel`; NO advice verb. |
| `AnalysisCard` post-use slot (already wired, `:740-749`) | `UpgradeTriggerCard featureKey="full_ai_policy_analysis" variant="inline" triggerSource="post_trial_analysis"` | becomes reachable; copy exists (`upgrade-copy.el.ts:40-48`) but says «Η βασική σύνοψη είναι έτοιμη» — must say the free one was used («Χρησιμοποιήσατε τη δωρεάν πλήρη ανάλυση στις {date}»). |
| `/account` `PlanSection` row | `StatusPill` | «Δωρεάν πλήρης ανάλυση: διαθέσιμη / χρησιμοποιήθηκε {date}». Date through the Athens formatter, never `Date.now()` maths. |
| Trial sentence surfaces (UpgradeModal, CarriedPlanCard, `/upgrade`, sign-up confirmation, hosted checkout) | unchanged components | receive `trialDays` from the server (0 when ineligible). |
| `CollaborationPanel` locked state (Free/Plus owner) | `UpgradeTriggerCard featureKey="agent_collaboration"` | copy exists (`upgrade-copy.el.ts:104-112`); error toast key new `wallet.share.errors.upgradeRequired`. |
| Blocked-run copy for a Free user who used the grant | `policy-detail.ts:330-335` | `analysisBlockedUpgradeHint` currently says the feature «περιλαμβάνεται στο Family» — after `[H3]` it must say Plus ή Family, derived from `FEATURE_GATES`, never typed. |
| Public pricing table | `plan-claims.ts` | `deepAnalysis` claim for Free needs a third value («1 δωρεάν», not boolean); `ClaimValue` gains `"once"` — overlaps PW-CLAIMREG-01; `plan-gating-parity` A1 arm is re-pointed when the writer exists. |

### 3.4 Guards (each shown red first with a committed probe)
1. **Grant-writer single path** — enumerate `accessGrant.create|upsert|createMany` across `app/ lib/` from the filesystem; each site is the service or exempt with a reason (agent-created `manage` grant, redeem-invite). Probe: a file with a bare `db.accessGrant.create`.
2. `collaboration-entitlement-gate.test.ts` extended to `POST /api/v1/policies/share` and `sharePolicy` (Free → refused; admin → allowed; agent-on-agent-catalogue → not trapped).
3. `trial-eligibility.test.ts` — lapsed Family (`expired` row) → no `subscription_data`; first-time → `trial_period_days: row.trialDays`; `customer` vs `customer_email` exactly one.
4. `trial-disclosure-everywhere` arm for server-provided eligibility.
5. `deep-analysis-gate-single-predicate` updated for the new signature; `lifetime-trial-claim.test.ts` (atomic `updateMany`, release on technical failure, never consumed by auto-triggers).
6. `budget-reaches-published-count` gains a Free arm (count 1, R_max + upload extraction) and, `[H3]`, a Plus arm.
7. `plan-gating-parity` A1 flips from «no string promises» to «the promise names the count and the condition».

### 3.5 Order of build (each reversible)
(a) item 2 single service + gate + guards 1–2 → (b) item 1 eligibility + guards 3–4 → (c) Free budget row write (prod, guarded by
before-value, archived) **after** (d) item 3 code deploys → (e) copy (`νέοι συνδρομητές`, offer/post-use lines) with the same
deploy as (b)/(d), never before → (f) `[H3]` Plus unlock + Plus budget row + public table change, together.

---

## 4. Fixtures (dev-only; refuse a production project ref; `monthly_token_usage` via `billingMonth()` only)

None was RUN from this worktree (§1.7). Each states what it produces.

| # | Fixture | Produces |
|---|---|---|
| F1 **Empty portfolio** | Free user, 0 policies, consent given, `trial_analysis_used_at NULL` | `/account` renders the lifetime-analysis row as «διαθέσιμη» with nothing to run it on; no AnalysisCard exists → proves the offer never renders as a verdict or a promise outside a policy. Negative control for guard 7. |
| F2 **All-expired** | reuse `tests/measure/dashboard-fixtures.ts` state `all-expired` (4 policies, `endInDays −400…−30`, one `LONG_INSURER`) on a Free owner with the grant unused | the offer renders on a dead policy — the H-057 case (spend the one analysis on expired cover?). Also: the monitoring/all-clear surfaces must not read «Εντάξει» (existing `all-clear-honesty`). |
| F3 **Failed analysis** | (a) Free owner, grant CLAIMED, latest run `failed` (provider) → claim must be released (H-053) and the offer return; (b) Free owner, grant claimed, run `completed`, second attempt → `blocked / free_tier_ai_locked` and the `post_trial_analysis` `UpgradeTriggerCard` (`AnalysisCard:740`) — the first time that branch is reachable; (c) Free owner with `monthly_token_usage.totalTokens = 102,000` (one upload) at today's 150,000 → `TOKEN_LIMIT_BLOCKED` → **reproduces §1.4** (the budget trap) and reads «μηνιαίο όριο ανάλυσης» for a user who never had an analysis. |
| F4 **Extractor placeholder** | reuse `tests/measure/fixtures.ts` `defect-placeholder-identity` (`__PENDING_EXTRACTION__`, `PENDING-1700000000000`) on a Free owner with the grant unused | the offer line must render identity via `policyLabel` (guard `policy-sentinels-unrenderable`); and a technical failure that discards the policy (`policy-discard.ts`) must release the claim, not consume it on a row that no longer exists. |
| F5 **Longest Greek insurer name** | reuse `defect-long-insurer` (134 chars, `prisma/greek-insurers.json` `deuteros-allilasfalistikos`) at 320/390/430 | truncation of the offer kicker, the post-use `UpgradeTriggerCard` inline variant and the `CollaborationPanel` locked card beside the identity header. |
| F6 **English summary left in storage** | reuse `englishSummary` (`fixtures.ts:643-649`: English `coverageSummary`, no `summaryLanguage`) on a Free owner with the grant unused | the summary stays refused by `lib/wallet/summary-language.ts` while the offer renders above it — proves the offer does not re-expose the English text; and a re-run via the grant replaces it with a tagged Greek one. |
| F7 Lapsed Family | Free-resolved user with one `subscriptions` row `status: 'expired'`, `stripeSubscriptionId` set, plan `ph-pro` | `createCheckoutSession` → no `subscription_data`, no `custom_text`; `/upgrade` and `UpgradeModal` show no trial sentence (today: both show it — the H-028 defect, reproduced). |
| F8 Trialing monthly → annual | `active` `ph-pro` row, Stripe sub `trialing` (mock) → `upgradeSubscription('ph-pro','annual')` | today: a second 14-day trial (ANNUAL-SWITCH-RETRIAL); after: H-051's choice. |
| F9 Free owner shares via the action | Free owner, `sharePolicy(policyId, agentEmail)` | today: grant + relationship minted (§1.3); after: `UPGRADE_REQUIRED`. Same with `POST /api/v1/policies/share` → today 200 + bare grant with no relationship; after 403. |
| F10 Dual-role agent owner | user `roles: 'agent,policyholder'`, no B2C sub, shares their OWN policy | must not be trapped by `resolveUserEntitlements → free` (the D3 trap); resolved on the agent catalogue. |
| F11 Pre-existing Free grant | Free owner with an `active` grant created before the gate | H-052: keep (advisor still sees) or revoke; the panel is hidden but `computePolicyAccess` still grants read. |
| F12 Plus unlock `[H3]` | Plus owner, 10 policies, budget 600,000, zero usage | third batch-path run refused (`2 × 253,200 + 151,200 > 600,000`) — reproduces the Plus budget trap before the row write. |

---

## 5. Measurement plan

Surfaces: `/wallet/[id]` (AnalysisCard + CollaborationPanel) in states F1–F6, F9, F11; `/account`; `/upgrade`; `/pricing`
(both locales). Widths 320/390/430. Settle procedure exactly as `docs/build/policywallet-transformation-multiagent.md` §5.1.
Harness functions imported from `tests/measure/metrics.ts`, never copied (`duplicateBlocks`, `internalTokenLeaks`,
`latinSentences`, `truncationFailures`, `smallTapTargets`, `contrastFailures` + `nonTextContrastFailures`, `duplicateFacts`,
`duplicateActions`).

**Definitions copied word for word from `docs/build/policywallet-transformation-multiagent.md` §5.2:**

> **Duplicate-fact count** — `data-fact="<namespace>.<key>"` values appearing more than once. Until instrumentation exists, run a parallel value scan counting visible elements whose own text contains each named fact value, and record **both**, because an attribute scan on an uninstrumented page returns a vacuous zero.

> **Duplicate-action count** — `data-action="<verb>"` values appearing more than once. Distinct from duplicate facts, with a different fix. A prior audit found one quote CTA rendered three times and six AI entry points on one page.

> **Duplicate-block count** — Text blocks of ≥80 characters rendered more than once on one surface. Catches boilerplate proliferation — the AI disclaimer paragraph currently renders two to three times on the dashboard.

> **Internal-token leakage** — Occurrences in rendered text **and in rendered outbound templates** of sentinels (`__…__`), `PENDING-<digits>`, `E2E-*`, fixture-shaped ids, bare UUIDs, raw snake_case enums, or placeholder markers («δοκιμαστικό», test, sample, draft).

> **Locale purity failures** — Latin-script sentences (≥3 consecutive Latin words) in `el` output, with a narrow allowlist for brand names and acronyms. Applies to outbound templates.

> **Truncation failures** — Elements sourced from the `el` bundle where `scrollWidth > clientWidth`, plus any server-side string slicing on Greek content, plus mid-word breaks on brand names.

> **Sub-44px targets** — `a, button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])` with a rendered box under 44px in either dimension. Excludes links inside running text and off-canvas chrome. State the selector; note where it differs from any pre-existing viewport spec so the two counts are not confused.

> **Contrast** — WCAG 1.4.3 (text, 4.5:1 body / 3:1 large) **and 1.4.11 (non-text boundaries, 3:1)**. 1.4.11 is mandatory in this phase, not deferred — a near-black card on a near-black background was previously missed precisely because only text contrast was automated, and the harness reported zero failures on a page containing it.

> Record every metric at 320/390/430, in every portfolio state, for every surface.

**New definitions (not in the transformation doc; written once here, recorded in DECISIONS.md at close-out):**

| Id | Metric | Definition | Baseline (read today) |
|---|---|---|---|
| M-T1 | Grant-writer sites outside the single path | `accessGrant.create\|upsert\|createMany` call sites under `app/ lib/` not in `lib/sharing/share-policy.service.ts` and not exempt with a reason | **5** (`agent/actions.ts:979,1127`, `wallet/actions.ts:1252`, `share/route.ts:125`, `redeem-invite.ts:210`) → target ≤3 exempt |
| M-T2 | Unentitled share paths | server actions + routes that can mint a `policy:` grant for a caller whose `agentCollaboration` is false (non-admin) | **2** (`sharePolicy`, `POST /share`) → 0 |
| M-T3 | Trial granted to a prior subscriber | unit-level: checkouts created with `subscription_data.trial_period_days` for a user with an existing same-`planType` row (mocked Stripe; production unobservable on test keys) | **every such checkout** → 0 |
| M-T4 | Writers of `users.trial_analysis_used_at` | `git grep` over `app/ lib/` | **0** → 1 (the claim) + 1 (the release) |
| M-T5 | Free deep runs refused by the token gate at zero prior usage, per branch | `estimateAnalysisRunBudget(branch) > Free budget` across the 14 authored branches | **2 of 14** (home, renters at 151,200 > 150,000); at 102,000 recorded (one upload): **14 of 14** → 0 after the row write |
| M-T6 | Admin KPI numbers with no writer | `/admin` KPIs that count a column nothing writes | **1** (`admin/actions.ts:100`) → 0 |
| M-T7 | Deep-analysis predicate readers | sites reading `canRunDeepAnalysis` (guard universe) | **3 gates + displays** → unchanged (the predicate changes shape, not its reader count) |

---

## 6. Risks to CLAUDE.md invariants

| Invariant | How this series could break it | How the design prevents it |
|---|---|---|
| Authorization — one path (`getPolicyAccess`); no hand-rolled checks | a second grant-minting path with its own rules (the route already is one) | one `share-policy.service.ts`; guard 1 enumerates grant writers from the filesystem; share route's single-path exemption keeps its reason |
| An agent's access dies with the relationship | route-made grants have no relationship (§1.3) | the service always writes grant + relationship in one transaction (the action's body); H-052 for existing bare grants |
| Every `"use server"` export is a public endpoint | `sharePolicy` ungated | entitlement inside the service, not in the panel |
| Catalogue coupling — rows never ahead of code | Free/Plus budget rows written before the code that needs them; public table changing with `plan-claims` before the gate flips | order in §3.5; `plan-defaults-match-production-rows` pins the same-day pairing; archive + before-value guard per row |
| Nothing reaches a model without AI-processing consent | a lifetime grant bypassing the consent gate | consent gate precedes the tier gate in `createRun` (consent-gate test); the claim happens after consent |
| Absence of a detected problem ≠ reassurance | the post-use upsell rendering because `trialAnalysisUsedAt` is non-null for a FAILED run; the admin KPI's 0 | release-on-technical-failure; KPI label states its denominator (M-T6) |
| Severity is the rule's; `lib/gap-detection.ts` frozen | none — no rule, operator or severity changes | SHA verified equal in both trees (§1.7); the series never imports or edits it |
| Policy identity may be a placeholder | the offer line printing `__PENDING_EXTRACTION__` | `policyLabel` only (F4; existing sentinel guard) |
| Status/expiry from ONE call | «χρησιμοποιήθηκε στις {date}» recomputed client-side | server-formatted date passed down (F2 uses `resolvePolicyLifecycle` for the expired state) |
| The product reads and explains; the partner advises (PW-VOICE-01) | «σας προτείνουμε να αναλύσετε…» in the offer | copy is a bare offer of a function; `voice-guards` advice-verb arm covers the new strings |
| i18n — no hardcoded strings; one term per concept | toast literals for the new errors | keys under `wallet.share.errors.*`, `analysis.*`; «ασφαλιστής»/«Σύμβουλος» per LEXICON |
| Published count is the cap; the budget never binds first (D19) | Free's 1 (and Plus's 10) refused by the token gate | M-T5 = 0 is an acceptance condition; `budget-reaches-published-count` Free/Plus arms |
| A document reaches a model only through the document gate | none — no upload path added | the grant triggers the existing orchestrator path only |
| Guards must enumerate, not assume | a share gate test scoped to the route | guard 1 enumerates grant writers from disk; guard 2 covers action + route; probes committed |
| GDPR erasure covers new stores | none — no new store; `trial_analysis_used_at` is on `users` and erased with it | `erasure-covers-personal-data` is schema-derived; unchanged |

---

## 7. Questions only Eli can answer (appended to `docs/transformation/HALTS.md` as H-050…H-058)

- **H-050** (sequencing) — build from `pw-customer`/post-#410 `NEW-UI`, and write the stub's acceptance criteria; this tree cannot host the build (§1.1).
- **H-051** (item 1, run-plan: none) — trialing monthly → annual: carry `trial_end` (no DDL) or no trial; and confirm «any prior row of the same planType = no trial».
- **H-052** (item 2, security-reviewer) — retire `POST /share` (no caller) or route it through the service; pre-existing Free-owner grants keep or revoke; inviter lapsed before redemption: mint or refuse.
- **H-053** (item 3, **H3**) — which policy consumes the free analysis (explicit choice vs first upload); release the claim on technical failure.
- **H-054** (item 3) — Free `monthlyTokenBudget` 150,000 → ~280,000 on production (plan-row write); or stop recording upload-time extraction against Free's row.
- **H-055** (**H3**) — Plus unlock scope (gaps display, multi-insurer, export, monitoring?), Plus budget ~2,800,000, and the public table changing WITH the code.
- **H-056** (legal) — the withdrawal function (ν. 2251/1994 art. 3ζα) vs the 14-day trial: who owns the function, and whether the trial sentence needs a withdrawal counterpart. Not a Greek-rule assertion; a question.
- **H-057** (item 3) — the one free analysis on an EXPIRED policy: allow, warn, or refuse.
- **H-058** (**H4**, QA-BUDGET-SPLIT) — in or out of this series; if in, the `monthly_token_usage.qa_tokens` migration waits for PW-STAGING-01.

Items by gate: **item 1** `[no gate]` (optional column `[MIGRATION → PW-STAGING-01]`); **item 2** `[no gate]` + security review;
**item 3 Free** `[no gate]` + plan-row write (H-054); **item 3 Plus** `[H3]` + plan-row write; **QA-BUDGET-SPLIT**
`[MIGRATION → PW-STAGING-01]`; **BUDGET-MEASURE** out of scope (needs measured actuals on fixtures, GA blocker, QUEUE :1880).

Sources cited: ΦΕΚ Α' 108/10.07.2026 (mirror https://www.greekecommerce.gr/wp-content/uploads/2026/07/20260100108.pdf, accessed
2026-10-24, pages 5205–5206 and art. 143); GRECA note https://www.greekecommerce.gr/news/nea-toy-syndesmoy/enimerosi-sxetika-me-to-withdrawal-button/
(accessed 2026-10-24; secondary, used only to locate the article); Directive 2011/83/EU art. 9 via
https://www.legislation.gov.uk/eudr/2011/83/article/9 (accessed 2026-10-24; EUR-Lex returned empty bodies today);
e-nomothesia https://www.e-nomothesia.gr/sunegoros-tou-katanalote/nomos-5317-2026.html (accessed 2026-10-24; article text behind subscription — not used).

STEP0 COMPLETE — awaiting approval
