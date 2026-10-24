# Deploy checklist: PW-CONTENT-02 (`pw-customer` → `NEW-UI` = PRODUCTION)

**Rewritten as one list 2026-10-23 (round 7), with the FINAL interim budgets** · **Deployer:** Eli · **Status: NO-GO until every box under "Gate" is ticked.**
Merging into `NEW-UI` runs CI, then `.github/workflows/deploy.yml` ships to Vercel **production** (`www.policywallet.gr`) with `--force`. There is no automatic preview of this branch (`preview.yml` only runs for PRs into `main`/`develop`). The release has **no database migration**; the five budget rows were written to production on 2026-10-24 by the Supabase MCP on the owner's approved tool call (DECISIONS D30), not by the release; it changes copy, pricing-surface rendering, one Stripe Checkout field (`custom_text`), removes one account card, and applies Terms §5 (version `GR-GA-2026.10.22`).
A box is ticked with today's date and its evidence class: **owner-attested**, **MCP-verified** (read or written by the agent through an MCP on the owner's instruction), or owner-ticked. The owner ticks items 8, 9 and 11; items 1–4 were ticked on the owner's 2026-10-24 instruction. "Owner-attested" means Eli's statement, not repo evidence. Read-only everywhere: no sign-up, no checkout, no plan edit other than the item-1 write already made.

## Gate — must be closed before the merge button  [Eli does all of these]

### Money and limits
- [x] **1. Budgets saved** — Production `/admin/plans`. Open each plan and read `monthlyTokenBudget` (Entitlements). Required: Family (`pro`) **8,700,000** · agent_free **2,000,000** · agent_starter **19,600,000** · agent_pro **58,700,000** · agency **156,300,000**; Free **150,000** and Plus **600,000** unchanged. All other entitlement keys stay as read on 2026-10-22 (they equal the code defaults: `production-rows-parse-as-entitlements.test.ts`). If a value differs, tell me the value; I change the code and fixture, not you. (Rule: `budget-reaches-published-count.test.ts`; the budgets assume verification is on; `AGENT_INDEPENDENT_VERIFICATION` is unset in production (code default off), so they stay as set, an upper bound: DECISIONS D28.) **Verified 2026-10-24 — MCP-verified: written to production through the Supabase MCP on the owner-approved tool call (`evidence/b3-budgets-write.sql`, rollback `b3-budgets-rollback.sql`), re-SELECT shows ph-pro 8,700,000 · agent-free 2,000,000 · agent-starter 19,600,000 · agent-pro 58,700,000 · agent-agency 156,300,000, ph-free 150,000 and ph-plus 600,000 unchanged (versions 2, plan_revisions + UPDATE_PLAN activity_logs rows written; DECISIONS D30).**
- [x] **2. `PREVENTION_PERSONALIZATION_ENABLED=0`** — Vercel → project `policy-wallet` → Settings → Environment Variables → filter `PREVENTION_PERSONALIZATION_ENABLED` → the **Production** entry reads `0` (click the eye/reveal; the value is encrypted and I cannot read it). At `1`, Free's 150,000 budget binds the basic path after about one scan a month (H-033, GA-blocking). **Verified 2026-10-24 — MCP-verified: the Production value was revealed through the Vercel MCP (that one variable only) and reads `0`.**
- [x] **3. H-025** — decide which is true and tell me: no partner referral, affiliate or lead arrangement earns PolicyWallet money (then H-025 closes and C-37's commission sentence is approved), OR a referral earns money (then every no-commission claim in `docs/transformation/HALTS.md` H-025 is removed with no replacement wording). **Verified 2026-10-24 — owner-attested: no partner referral, affiliate or lead arrangement earns PolicyWallet money; H-025 closed, C-37 approved.**
- [x] **H-021** closed: production rows read 2026-10-22; code defaults equal them and the raw blobs parse (`plan-defaults-match-production-rows.test.ts`, `production-rows-parse-as-entitlements.test.ts`).

### Copy
- [x] **4. COPY re-approvals** — the re-approval table at the end of `docs/series/PW-CONTENT-02/COPY.md` (C-10, C-20, C-21, R3-1, R3-4, R4-3, R5-1..R5-12, the payment-method help article). Reply "approved all" or "except: <keys>". Rows that depend only on flags P and W (payment-method article, R5-7, the cancel claims) are approved on that basis (owner, 2026-10-23) and re-verified at the live-Stripe gate below. A row whose PROD flag is a "no" in items 8–9 is rewritten, not approved. **Verified 2026-10-24 — owner-attested: approved in full; rows tied to Brevo (owner-attested) stay conditional, cron run history is MCP-read (item 9, not yet ticked; `automation.paused` unread) and PREVENTION is `0` (item 2).**

### Email and scheduler (not verifiable from the repo)
- [ ] **8. Brevo** — Brevo → Senders, domains & dedicated IPs → `policywallet.gr` shows Authenticated (SPF + DKIM); Vercel Production env has `BREVO_API_KEY` (I saw the name on 2026-10-23; not the value); Brevo → Security → Authorised IPs does not block Vercel (the 401 in Sentry POLICYWALLET-3 is gone). *Owner-verified 2026-10-24 (owner-attested; box left for the owner). MCP evidence: DKIM CNAMEs brevo1/brevo2 and DMARC present; **the apex SPF lists only Zoho (`include:zohomail.com`), not Brevo**; no Brevo line in the 24h production runtime logs.*
- [ ] **9. Renewal cron enabled and running daily** — Vercel → Settings → Cron Jobs: `/api/v1/jobs/renewal-check` (`0 5 * * *`) enabled; and in the production database (read-only): `SELECT started_at, status, trigger FROM job_runs WHERE job_name='renewal-check' ORDER BY started_at DESC LIMIT 7;` shows a `succeeded`, `cron` row on each of the last days; `SELECT count(*) FROM notification_events WHERE event_type='policy_expiring';` is > 0 once a policy has been inside a reminder window; a `paused` run row means the job schedule is disabled (`job_schedules.enabled=false`), not a healthy run; and the SEPARATE notification setting `automation.paused` (Admin → notification settings) is not true: while it is true the job still records `succeeded`, but each notification is recorded as skipped (`SELECT status, count(*) FROM notification_events WHERE event_type='policy_expiring' GROUP BY 1;` shows no run of `skipped`). **MCP evidence 2026-10-24: `job_runs` shows `succeeded`, `cron` rows on each of 18–24 Oct (7 days, 181–348 ms); Vercel runtime logs show completed runs on 22, 23, 24 Oct (`errorCount` 0, 1 policy scanned, 0 notifications). Cron enabled in Vercel settings not read (box left for the owner).** (COPY C-10/C-20/C-21/R3-1/R3-4 stay conditional on this — H-034.)

### Legal
- [x] **Terms §5** applied (owner-approved draft, round 6); versions bumped together to `GR-GA-2026.10.22` (five literals). No re-consent flow (TERMS-RECONSENT queued).

### Review
- [ ] **10. Final adversarial review of the tip printed `CRITICAL: 0`** (history: `RESULT.md` §8–§13). Round 7 reviewed `20fad26b..21a38584`: `CRITICAL: 0`; the fix commit after it changed docs, tests and comments only (RESULT.md §13).

## Pre-deploy
- [ ] CI green on PR #410 (`audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, unit tests, production build). Local: all pass.
- [ ] No migration in this release: `git diff NEW-UI --stat -- prisma/` is empty. (The one-off budget SQL lives under `docs/series/PW-CONTENT-02/evidence/` and has already run.)
- [ ] Rollback plan: Vercel instant rollback to the previous production deployment (read 2026-10-24: `dpl_HKWEuSk7…`, PR #411 `91579018`; re-read before deploying), or `git revert` the merge commit on `NEW-UI` (deploy re-runs). Copy and config defaults only; the Terms version bump is recorded on new sign-ups.
- [ ] Check the live deploy's sha before deploying (parallel sessions have deployed divergent branches to the prod alias before).

## Deploy
- [ ] **11. View-only journey check on the non-production preview** (the URL is in my round-7 report; it reaches the PRODUCTION database: no sign-up, no checkout): `/`, `/pricing` (toggle monthly/annual: Family «Δωρεάν δοκιμή 14 ημερών. Μετά χρεώνεται 8,99 € τον μήνα…», annual «79 € τον χρόνο»; Plus/Free no trial; savings «περίπου 21 € / 29 € τον χρόνο»; Agent Free 5 analyses, table 5/50/150/400), `/product`, `/product/travel`, `/contact` (email only), `/trust`, `/compare`, `/terms` (§5 two paragraphs, version GR-GA-2026.10.22).
- [ ] Merge to `NEW-UI` [Eli]; watch CI → deploy.yml.
- [ ] Verify the live CSS/JS is the new build (a stale build cache once shipped old CSS; deploy uses `--force`).
- [ ] Production smoke (owner session): `/pricing` both toggles; buttons per `publicCheckoutAvailability()`; `/account` has no token card; Stripe-hosted checkout (when live keys exist) shows the bilingual trial line.
- [ ] Monitor Sentry (`production`) and Vercel runtime errors for 15 minutes; watch `checkout_started` and any rise in `portalFailed`.

## Post-deploy
- [ ] `/pricing` ISR caches 30 minutes; re-check after expiry.
- [ ] Update `docs/STATUS.md`; close H-027 (Family p95 cross-check), H-025 and the COPY rows in `docs/transformation/HALTS.md`.

## Before switching production to live Stripe keys  (GA blocker, NOT a merge blocker — owner decision 2026-10-23, DECISIONS D28)
Production runs on Stripe **test** keys and `publicCheckoutAvailability()` withholds paid checkout, so nobody can subscribe from this release. These are done before a live key is set in Vercel (former items 5–7), together with the live cancel test.
- [ ] **G1. Stripe live portal** — Stripe Dashboard, **live mode** → Settings → Billing → Customer portal: *Cancel subscriptions* ON, cancellation timing *at end of billing period*; *Update payment methods* ON; *Update subscriptions / switch plans* OFF. Then cancel a subscription of a customer you own: it shows "Cancels <date>" and no further invoice appears.
- [ ] **G2. Stripe live webhook** — Dashboard (live) → Developers → Webhooks → the endpoint `https://www.policywallet.gr/api/v1/billing/webhook` lists `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` (and `checkout.session.expired`), and its recent deliveries for those events show **2xx**. That is the CURRENT route (`app/api/v1/billing/webhook/route.ts:80-84` → `lib/services/billing/stripe-lifecycle.ts:19-24` `HANDLED_EVENTS`). `/api/stripe/webhook` is the DEPRECATED legacy route (it answers with deprecation headers pointing at the v1 route); if the live endpoint still points at it, tell me before you change anything.
- [ ] **G3. Trial-ending reminder** — Dashboard (live) → Settings → Billing → Subscriptions and emails → *Send emails about expiring trials* ON (the app sends no subscription-start or trial-ending email: H-032).
- [ ] **G4. Live cancel test** — included in G1: cancel a live subscription you own; "Cancels <date>", access continues to the end of the paid period, no further invoice. Then re-verify the COPY rows approved on flags P and W (payment-method article, R5-7, the cancel claims).

## GA blockers recorded (NOT merge blockers)
- [ ] **BUDGET-MEASURE** (QUEUE, under PW-ENTITLE-01): measured budgets replace EVERY interim value before GA: ((N−1)·A_p95 + R)·1.1, where A_p95 includes the ungated scan/upload extraction and the verification actuals. Budget sizing is closed in this series.
- [ ] **H-035**: Terms §12 Greek/English mismatch — separate legal commit (drafted in HALTS.md, now including the Greek «Μετά τον τερματισμό…» counterpart).
- [ ] Other queued items: PW-ENTITLE-01 (one trial per customer; `/api/v1/policies/share` entitlement, security-reviewer), LEGAL-VERSION-SINGLE-SOURCE (Privacy/Cookies/Subprocessors display 22 Oct 2026), SUBSCRIPTION-START-EMAIL, STRIPE-PORTAL-PLAN-SWITCHING, TOKEN-TOPUP-UI-REMOVED, AGENT-CANCEL-PATH, PREVIEW-USES-STAGING-SUPABASE (blocks PW-ASSET-01), PW-CLAIMREG-01, BOAT-LIABILITY-RULE-VERIFY, QA-BUDGET-SPLIT, VERIFICATION-CANARY-FLAG (information: `ai.remediation_canary` defaults to `internal`).

## Rollback triggers
- Any 5xx on `/pricing`, `/`, `/account`, `/upgrade`, `/legal/terms` after deploy.
- Stripe Checkout creation errors (`custom_text` is the only new session field): `createCheckoutSession` failures in Sentry → revert immediately.
- The Family card shows a trial sentence on a plan with no trial, or a wrong price/length.
- Console errors on `/pricing` or `/account` in the owner's session.
