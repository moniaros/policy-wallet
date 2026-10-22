# Deploy checklist: PW-CONTENT-02 (`pw-customer` → `NEW-UI` = PRODUCTION)

**Date:** drafted 2026-10-22 · **Deployer:** Eli · **Status: NO-GO until every box under "Gate" is ticked.**
Merging into `NEW-UI` runs CI, then `.github/workflows/deploy.yml` ships to Vercel **production** (`www.policywallet.gr`) with `--force`. There is no automatic preview of this branch (`preview.yml` only runs for PRs into `main`/`develop`). The release has **no database migration and no plan-row write**; it changes copy, pricing-surface rendering, one Stripe Checkout field (`custom_text`) and removes one account card.

## Gate — must be closed before the merge button
Who acts is in brackets.

- [ ] **H-027 closed** [Eli]: agent budgets are resolved in config (see "Manual items added in round 5" below: 850,000 / 8,400,000 / 25,000,000 / 67,000,000). Still open: run `docs/series/PW-CONTENT-02/evidence/h027-token-per-analysis-prod.sql` (read-only) on production and size the FAMILY `monthlyTokenBudget` from `analyses_at_p95`. **Catalogue coupling:** plan-row edits publish to the live pricing page within ~30 min (ISR).
- [ ] **H-025 closed** [Eli]: confirm or reword every public "no commission / subscription-only revenue" claim (file:line list in `docs/transformation/HALTS.md` H-025). Nothing was changed by this series.
- [ ] **H-021** is closed (production rows read 2026-10-22, 9/9 equal). Re-read production and refresh `tests/fixtures/production-plan-rows-2026-10-22.json` if any plan row changed since.
- [ ] **COPY.md fully signed off** [Eli]: every `pending re-approval` and `eli` row in COPY.md (round 5 table at its end); reply by key; flip to `approved` in `COPY.md`.
- [ ] **Stripe trial-ending reminder email enabled** [Eli, Stripe dashboard → Settings → Billing → Subscriptions and emails → "Send emails about expiring trials"], because the app sends no subscription-start or trial-ending email (H-032).
- [ ] **Live-mode cancel path verified** [Eli]: (a) the Stripe **customer portal configuration exists in live mode** (test mode has 0; the portal call fails without it); (b) in live mode, start a Family trial with a test customer you own and use «Διακοπή αυτόματης ανανέωσης» (`cancelSubscription`, sets `cancel_at_period_end`): confirm the subscription shows "cancels at period end" and no charge follows trial end; (c) confirm the live webhook endpoint is registered for `customer.subscription.updated|deleted`, `invoice.paid`, `invoice.payment_failed`. Production currently runs on Stripe **test** keys (memory 2026-09-11): while it does, paid buttons are withheld by `publicCheckoutAvailability()` and (b)/(c) cannot be exercised on the live site.
- [ ] Review: `adversarial-reviewer` printed `CRITICAL: 0` on `3d91abb8..HEAD` (see the report).
- [ ] Legal [Eli]: Terms §5 promises in-app cancel to every role, but agent plans have no cancel control (QUEUE LEGAL-TERMS-CANCEL-FOR-AGENTS); decide before agent plans are sold in live mode.
- [ ] Legal/consistency [Eli, optional but recommended]: `lib/legal/legal-content.ts:187` vs `:672` disagree on what account deletion does to an active subscription (H-030); not changed here.

- [ ] **Renewal reminders work in production** [Eli] (COPY C-10/C-20/C-21/R3-1/R3-4 stay pending until this is checked; H-034): `BREVO_API_KEY` set and the sender domain verified; `JobSchedule` for `renewal-check` and `automation.paused` not pausing it; recent `job_runs` / `notification_events` rows for `policy_expiring`; production plan rows parse (not the code fallback); not on a daily-only-cron plan if sub-daily is ever needed.
- [ ] **Keep `PREVENTION_PERSONALIZATION_ENABLED=0`** in production until budgets are resized: at 1, Free's 150,000 budget binds the basic path (about one scan a month) — GA-blocking (H-033).
- [ ] Re-approve the pending COPY rows: C-10, C-20, C-21, R3-1, R3-4, R4-3 and R5-1..R5-8; C-37's commission sentence stays held with H-025.

### Manual items added in round 5 [Eli]
- [ ] **Stripe live portal configured:** cancel at period end **ON**, payment-method update **ON**, plan switching **OFF** (the public copy promises cancel and a payment-method path and no plan switching; QUEUE STRIPE-PORTAL-PLAN-SWITCHING).
- [ ] **Stripe trial-ending reminder email on.**
- [ ] **Brevo:** `BREVO_API_KEY` present in production, sender domain authenticated (SPF/DKIM), the IP-allowlist 401 (Sentry POLICYWALLET-3) closed; **renewal cron enabled with run history** (`/api/v1/jobs/renewal-check`, `job_runs`/`notification_events` rows, `JobSchedule` and `automation.paused` not pausing it).
- [ ] **`PREVENTION_PERSONALIZATION_ENABLED=0` in production** (at 1, Free's 150,000 budget binds the basic path).
- [ ] **Agent budgets set in /admin/plans** to agent_free 850,000 · agent_starter 8,400,000 · agent_pro 25,000,000 · agency 67,000,000 (rule: budget ≥ published count × 151,200; `tests/unit/budget-reaches-published-count.test.ts`; update `tests/fixtures/production-plan-rows-2026-10-22.json` after the save). Family waits for the H-027 query.
- [ ] **`AGENT_INDEPENDENT_VERIFICATION` is 0 in production** (or the budgets are re-sized): at 1, every agent deep run also reserves 102,000 and records a second extraction's actual tokens (`policy-analysis-orchestrator.service.ts:1602-1612`, `independent-verification.ts:51-52`), so Agent Free honours about 3 runs, not 5. `AGENT_VERIFICATION_PROVIDER=openai` is pre-filled in `.env.example:180`.
- [ ] **Terms §5 for agents:** approve `docs/series/PW-CONTENT-02/TERMS-5-DRAFT.md` (then the edit + a bump of `LEGAL_CONTENT_VERSION` AND the four `LEGAL_DOC_META` versions, `lib/legal/legal-content.ts:58-61`, which the legal pages display) — nothing applied yet.

## Pre-deploy
- [ ] CI green on the PR: `audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, unit tests, production build (run locally on `a5d673d7`: guardrails pass, unit suite green).
- [ ] No migration, no `prisma migrate`, no plan-row SQL in this release (verify `git diff NEW-UI --stat -- prisma/` is empty).
- [ ] No feature flag changes. `PREVENTION_PERSONALIZATION_ENABLED` stays `0` in production.
- [ ] Rollback plan: Vercel instant rollback to the previous production deployment, or `git revert` the merge commit on `NEW-UI` (the deploy re-runs automatically). Copy-only; no data to undo.
- [ ] Check the live deploy's branch/sha before deploying (parallel sessions have deployed divergent branches to the prod alias before).

## Deploy
- [ ] Journey check on the **non-production deployment** of `pw-customer` (view-only: no sign-up, no checkout; it reaches the production database — do not write): `/`, `/pricing` (monthly and annual toggle: Family card shows «Δωρεάν δοκιμή 14 ημερών. Μετά χρεώνεται 8,99 € τον μήνα…», annual «79 € τον χρόνο»; Plus/Free show no trial; savings read «~21 €» / «~29 €»; Agent Free shows 5 analyses, table 5/50/150/400), `/product`, `/product/travel`, `/contact` (email only, no phone/hours), `/trust`, `/compare`.
- [ ] Merge to `NEW-UI`; watch CI → deploy.yml.
- [ ] Verify the **live** CSS/JS is the new build (a stale build cache once shipped old CSS; deploy uses `--force`).
- [ ] Production smoke (owner session): `/pricing` renders both toggles; the pricing buttons behave per `publicCheckoutAvailability()`; `/account` has no token card and no «Απεριόριστες»; Stripe-hosted checkout (when live keys exist) shows the bilingual trial line above the pay button.
- [ ] Monitor Sentry (environment `production`) and Vercel runtime errors for 15 minutes; watch checkout-start events (`checkout_started`) and any rise in `portalFailed`.

## Post-deploy
- [ ] ISR: `/pricing` caches for 30 minutes; re-check after expiry.
- [ ] Update `docs/STATUS.md`; close H-027, H-025 and the COPY.md rows in `docs/transformation/HALTS.md`.
- [ ] Follow-ups already queued in `docs/transformation/QUEUE.md`: PW-ENTITLE-01 (one trial per customer — item 1; `/api/v1/policies/share` bypass — item 2, security-reviewer), SUBSCRIPTION-START-EMAIL, STRIPE-PORTAL-PLAN-SWITCHING, TOKEN-TOPUP-UI-REMOVED, PREVIEW-USES-STAGING-SUPABASE (blocks PW-ASSET-01), PW-CLAIMREG-01, BOAT-LIABILITY-RULE-VERIFY.

## Rollback triggers
- Any 5xx on `/pricing`, `/`, `/account` or `/upgrade` after deploy.
- Stripe Checkout creation errors (`custom_text` is the only new session field): `createCheckoutSession` failures in Sentry → revert immediately.
- The Family card shows a trial sentence on a plan with no trial, or a wrong price/length (the sentence is read from the plan row).
- Console errors on `/pricing` or `/account` in the owner's session.
