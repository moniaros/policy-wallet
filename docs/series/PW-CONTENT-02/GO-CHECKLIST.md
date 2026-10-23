# Deploy checklist: PW-CONTENT-02 (`pw-customer` → `NEW-UI` = PRODUCTION)

**Rewritten as one list 2026-10-23 (round 7), with the FINAL interim budgets** · **Deployer:** Eli · **Status: NO-GO until every box under "Gate" is ticked.**
Merging into `NEW-UI` runs CI, then `.github/workflows/deploy.yml` ships to Vercel **production** (`www.policywallet.gr`) with `--force`. There is no automatic preview of this branch (`preview.yml` only runs for PRs into `main`/`develop`). The release has **no database migration and no plan-row write by me**; it changes copy, pricing-surface rendering, one Stripe Checkout field (`custom_text`), removes one account card, and applies Terms §5 (version `GR-GA-2026.10.22`).
A box is ticked by the owner, with today's date, after doing exactly the check written in it. "Owner-attested" means Eli's statement, not repo evidence. Read-only everywhere: no sign-up, no checkout, no plan edit other than item 1.

## Gate — must be closed before the merge button  [Eli does all of these]

### Money and limits
- [ ] **1. Budgets saved** — Production `/admin/plans`. Open each plan and read `monthlyTokenBudget` (Entitlements). Required: Family (`pro`) **8,700,000** · agent_free **2,000,000** · agent_starter **19,600,000** · agent_pro **58,700,000** · agency **156,300,000**; Free **150,000** and Plus **600,000** unchanged. All other entitlement keys stay as read on 2026-10-22 (they equal the code defaults: `production-rows-parse-as-entitlements.test.ts`). If a value differs, tell me the value; I change the code and fixture, not you. (Rule: `budget-reaches-published-count.test.ts`; the budgets assume verification is on and are an upper bound if it is off.)
- [ ] **2. `PREVENTION_PERSONALIZATION_ENABLED=0`** — Vercel → project `policy-wallet` → Settings → Environment Variables → filter `PREVENTION_PERSONALIZATION_ENABLED` → the **Production** entry reads `0` (click the eye/reveal; the value is encrypted and I cannot read it). At `1`, Free's 150,000 budget binds the basic path after about one scan a month (H-033, GA-blocking).
- [ ] **3. H-025** — decide which is true and tell me: no partner referral, affiliate or lead arrangement earns PolicyWallet money (then H-025 closes and C-37's commission sentence is approved), OR a referral earns money (then every no-commission claim in `docs/transformation/HALTS.md` H-025 is removed with no replacement wording).
- [x] **H-021** closed: production rows read 2026-10-22; code defaults equal them and the raw blobs parse (`plan-defaults-match-production-rows.test.ts`, `production-rows-parse-as-entitlements.test.ts`).

### Copy
- [ ] **4. COPY re-approvals** — the re-approval table at the end of `docs/content/COPY.md` (C-10, C-20, C-21, R3-1, R3-4, R4-3, R5-1..R5-12, the payment-method help article). Reply "approved all" or "except: <keys>". A row whose PROD flag is a "no" in items 5–10 is rewritten, not approved.

### Stripe, email, scheduler (not verifiable from the repo)
- [ ] **5. Stripe live portal** — Stripe Dashboard, **live mode** → Settings → Billing → Customer portal: *Cancel subscriptions* ON, cancellation timing *at end of billing period*; *Update payment methods* ON; *Update subscriptions / switch plans* OFF. Then cancel a subscription of a customer you own: it shows "Cancels <date>" and no further invoice appears. (Production currently runs Stripe **test** keys; paid buttons are withheld by `publicCheckoutAvailability()` until a live key exists.)
- [ ] **6. Stripe live webhook** — Dashboard (live) → Developers → Webhooks → the endpoint for `https://www.policywallet.gr/api/stripe/webhook` (the route that handles these four events, `app/api/stripe/webhook/route.ts:69-81`; the other, `/api/v1/billing/webhook`, does not handle them) lists `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and its recent deliveries for those events show **2xx**.
- [ ] **7. Trial-ending reminder** — Dashboard (live) → Settings → Billing → Subscriptions and emails → *Send emails about expiring trials* ON (the app sends no subscription-start or trial-ending email: H-032).
- [ ] **8. Brevo** — Brevo → Senders, domains & dedicated IPs → `policywallet.gr` shows Authenticated (SPF + DKIM); Vercel Production env has `BREVO_API_KEY` (I saw the name on 2026-10-23; not the value); Brevo → Security → Authorised IPs does not block Vercel (the 401 in Sentry POLICYWALLET-3 is gone). *Owner replied "yes" in the round-7 template without a date: tick it with the date.*
- [ ] **9. Renewal cron enabled and running daily** — Vercel → Settings → Cron Jobs: `/api/v1/jobs/renewal-check` (`0 5 * * *`) enabled; and in the production database (read-only): `SELECT started_at, status, trigger FROM job_runs WHERE job_name='renewal-check' ORDER BY started_at DESC LIMIT 7;` shows a `succeeded`, `cron` row on each of the last days; `SELECT count(*) FROM notification_events WHERE event_type='policy_expiring';` is > 0 once a policy has been inside a reminder window; and the notification setting `automation.paused` is not true (a paused run records `paused`, not `succeeded`). (COPY C-10/C-20/C-21/R3-1/R3-4 stay pending until this passes — H-034.)

### Legal
- [x] **Terms §5** applied (owner-approved draft, round 6); versions bumped together to `GR-GA-2026.10.22` (five literals). No re-consent flow (TERMS-RECONSENT queued).

### Review
- [ ] **10. Final adversarial review of the tip printed `CRITICAL: 0`** (history: `RESULT.md` §8–§13). Round 7 reviewed `20fad26b..HEAD`; see RESULT.md for any later docs/tests/comments-only commit.

## Pre-deploy
- [ ] CI green on PR #410 (`audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, unit tests, production build). Local: all pass.
- [ ] No migration and no plan-row SQL in this release: `git diff NEW-UI --stat -- prisma/` is empty.
- [ ] Rollback plan: Vercel instant rollback to the previous production deployment (currently `dpl_HYmFCK1U…`, PR #408 `95c8670a`), or `git revert` the merge commit on `NEW-UI` (deploy re-runs). Copy and config defaults only; the Terms version bump is recorded on new sign-ups.
- [ ] Check the live deploy's sha before deploying (parallel sessions have deployed divergent branches to the prod alias before).

## Deploy
- [ ] **11. View-only journey check on the non-production preview** (the URL is in my round-7 report; it reaches the PRODUCTION database: no sign-up, no checkout): `/`, `/pricing` (toggle monthly/annual: Family «Δωρεάν δοκιμή 14 ημερών. Μετά χρεώνεται 8,99 € τον μήνα…», annual «79 € τον χρόνο»; Plus/Free no trial; savings «περίπου 21 € / 29 € τον χρόνο»; Agent Free 5 analyses, table 5/50/150/400), `/product`, `/product/travel`, `/contact` (email only), `/trust`, `/compare`, `/legal/terms` (§5 two paragraphs, version GR-GA-2026.10.22).
- [ ] Merge to `NEW-UI` [Eli]; watch CI → deploy.yml.
- [ ] Verify the live CSS/JS is the new build (a stale build cache once shipped old CSS; deploy uses `--force`).
- [ ] Production smoke (owner session): `/pricing` both toggles; buttons per `publicCheckoutAvailability()`; `/account` has no token card; Stripe-hosted checkout (when live keys exist) shows the bilingual trial line.
- [ ] Monitor Sentry (`production`) and Vercel runtime errors for 15 minutes; watch `checkout_started` and any rise in `portalFailed`.

## Post-deploy
- [ ] `/pricing` ISR caches 30 minutes; re-check after expiry.
- [ ] Update `docs/STATUS.md`; close H-027 (Family p95 cross-check), H-025 and the COPY rows in `docs/transformation/HALTS.md`.

## GA blockers recorded (NOT merge blockers)
- [ ] **BUDGET-MEASURE** (QUEUE, under PW-ENTITLE-01): measured budgets replace EVERY interim value before GA: ((N−1)·A_p95 + R)·1.1, where A_p95 includes the ungated scan/upload extraction and the verification actuals. Budget sizing is closed in this series.
- [ ] **H-035**: Terms §12 Greek/English mismatch — separate legal commit (drafted in HALTS.md, now including the Greek «Μετά τον τερματισμό…» counterpart).
- [ ] Other queued items: PW-ENTITLE-01 (one trial per customer; `/api/v1/policies/share` entitlement, security-reviewer), LEGAL-VERSION-SINGLE-SOURCE (Privacy/Cookies/Subprocessors display 22 Oct 2026), SUBSCRIPTION-START-EMAIL, STRIPE-PORTAL-PLAN-SWITCHING, TOKEN-TOPUP-UI-REMOVED, AGENT-CANCEL-PATH, PREVIEW-USES-STAGING-SUPABASE (blocks PW-ASSET-01), PW-CLAIMREG-01, BOAT-LIABILITY-RULE-VERIFY, QA-BUDGET-SPLIT, VERIFICATION-CANARY-FLAG (information: `ai.remediation_canary` defaults to `internal`).

## Rollback triggers
- Any 5xx on `/pricing`, `/`, `/account`, `/upgrade`, `/legal/terms` after deploy.
- Stripe Checkout creation errors (`custom_text` is the only new session field): `createCheckoutSession` failures in Sentry → revert immediately.
- The Family card shows a trial sentence on a plan with no trial, or a wrong price/length.
- Console errors on `/pricing` or `/account` in the owner's session.
