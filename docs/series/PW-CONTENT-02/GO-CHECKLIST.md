# Deploy checklist: PW-CONTENT-02 (`pw-customer` → `NEW-UI` = PRODUCTION)

**Rewritten as one list 2026-10-22 (round 6)** · **Deployer:** Eli · **Status: NO-GO until every box under "Gate" is ticked.**
Merging into `NEW-UI` runs CI, then `.github/workflows/deploy.yml` ships to Vercel **production** (`www.policywallet.gr`) with `--force`. There is no automatic preview of this branch (`preview.yml` only runs for PRs into `main`/`develop`). The release has **no database migration and no plan-row write**; it changes copy, pricing-surface rendering, one Stripe Checkout field (`custom_text`), removes one account card, and applies Terms §5 (version `GR-GA-2026.10.22`).
Each item has ONE instruction. A box is ticked by the owner with the evidence named in it; items marked "owner-attested" are recorded as Eli's statement, not as repo evidence.

## Gate — must be closed before the merge button  [who acts in brackets]

### Money and limits
- [ ] **Interim token budgets saved in /admin/plans** [Eli]: Family `pro` **5,700,000** · agent_free **1,700,000** · agent_starter **16,800,000** · agent_pro **50,000,000** · agency **134,000,000**. Rule: `tests/unit/budget-reaches-published-count.test.ts` (agents N × (151,200 + 102,000), Family 25 × 151,200 + 100 × 15,000). After the save, re-read the rows and refresh `tests/fixtures/production-plan-rows-2026-10-22.json`. Free 150,000 and Plus 600,000 stay.
- [ ] **`AGENT_INDEPENDENT_VERIFICATION` confirmed** [Eli]: the interim agent budgets are sized for it being **1** (each agent run then also reserves 102,000, `independent-verification.ts:51`). It only takes effect when the verification provider is authorised: `ai.full_failover` enabled AND the `ai.remediation_canary` flag covers agents (default `internal`: admin/internal roles only; `FF_AI_REMEDIATION_CANARY_MODE`, `lib/flags/registry.ts:153`, `remediation-policy.ts:48-55`). At the default canary an ordinary agent does not pay it and the budgets are simply generous. Leaving the flag at 1 with the OLD round-5 budgets (850,000 …) would not honour the published counts.
- [ ] **`PREVENTION_PERSONALIZATION_ENABLED=0` in production** [Eli]: at 1, Free's 150,000 budget binds the basic path (about one scan a month) — GA-blocking (H-033).
- [ ] **H-025 closed** [Eli]: confirm or reword every public "no commission / subscription-only revenue" claim (list in `docs/transformation/HALTS.md` H-025; C-37's commission sentence is held with it).
- [x] **H-021** closed: production rows read 2026-10-22; the code defaults equal them and they parse (`plan-defaults-match-production-rows.test.ts`, `production-rows-parse-as-entitlements.test.ts`). Refresh the fixture if any row changed.

### Copy
- [ ] **COPY.md re-approvals** [Eli]: every `pending re-approval` and `eli` row (the re-approval table at the end of `COPY.md`: C-10, C-20, C-21, R3-1, R3-4, R4-3, R5-1..R5-12, the payment-method help article). Reply by key.

### Stripe, email, scheduler (not verifiable from the repo)
- [ ] **Stripe live portal** configured [Eli]: cancel at period end **ON**, payment-method update **ON**, plan switching **OFF**; and the live webhook registered for `customer.subscription.updated|deleted`, `invoice.paid`, `invoice.payment_failed`. Verify a live cancel with a customer you own: the subscription shows "cancels at period end" and no charge follows. Production currently runs on Stripe **test** keys (while it does, paid buttons are withheld by `publicCheckoutAvailability()` and this cannot be exercised).
- [ ] **Stripe trial-ending reminder email on** [Eli] (Stripe dashboard → Settings → Billing → Subscriptions and emails → expiring trials): the app sends no subscription-start or trial-ending email (H-032).
- [ ] **Brevo** [Eli]: `BREVO_API_KEY` present in production, sender domain authenticated (SPF/DKIM), the IP-allowlist 401 (Sentry POLICYWALLET-3) closed.
- [ ] **Renewal cron enabled with run history** [Eli]: `/api/v1/jobs/renewal-check` (daily 05:00 UTC, `vercel.json`), recent `job_runs` and `notification_events` rows for `policy_expiring`, `JobSchedule` and `automation.paused` not pausing it. (COPY C-10/C-20/C-21/R3-1/R3-4 stay pending until this is checked — H-034.)

### Legal
- [x] **Terms §5** applied (owner-approved draft, round 6): policyholders cancel in-app, agents by email to info@policywallet.gr, both at the end of the paid period. Versions bumped together to `GR-GA-2026.10.22` (five literals). No re-consent flow (TERMS-RECONSENT queued): existing accounts keep their recorded version.

### Review
- [ ] Final adversarial review of the tip printed `CRITICAL: 0` (history: DECISIONS/RESULT §8–§12). Commits after the last review that changed only docs/tests/comments are listed in RESULT.md.

## Pre-deploy
- [ ] CI green on the PR (`audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, unit tests, production build). Local: all pass.
- [ ] No migration and no plan-row SQL in this release (`git diff NEW-UI --stat -- prisma/` is empty).
- [ ] Rollback plan: Vercel instant rollback to the previous production deployment, or `git revert` the merge commit on `NEW-UI` (the deploy re-runs). Copy and config defaults only; the Terms version bump is the one change that is recorded on new sign-ups.
- [ ] Check the live deploy's branch/sha before deploying (parallel sessions have deployed divergent branches to the prod alias before).

## Deploy
- [ ] View-only journey check on the non-production deployment (it reaches the production database: no sign-up, no checkout): `/`, `/pricing` (toggle monthly/annual: Family shows «Δωρεάν δοκιμή 14 ημερών. Μετά χρεώνεται 8,99 € τον μήνα…», annual «79 € τον χρόνο»; Plus/Free no trial; savings «περίπου 21 € / 29 € τον χρόνο»; Agent Free 5 analyses, table 5/50/150/400), `/product`, `/product/travel`, `/contact` (email only), `/trust`, `/compare`, `/legal/terms` (§5 two paragraphs, version GR-GA-2026.10.22).
- [ ] Merge to `NEW-UI` [Eli]; watch CI → deploy.yml.
- [ ] Verify the live CSS/JS is the new build (a stale build cache once shipped old CSS; deploy uses `--force`).
- [ ] Production smoke (owner session): `/pricing` both toggles; buttons per `publicCheckoutAvailability()`; `/account` has no token card; Stripe-hosted checkout (when live keys exist) shows the bilingual trial line.
- [ ] Monitor Sentry (`production`) and Vercel runtime errors for 15 minutes; watch `checkout_started` and any rise in `portalFailed`.

## Post-deploy
- [ ] `/pricing` ISR caches 30 minutes; re-check after expiry.
- [ ] Update `docs/STATUS.md`; close H-027 (Family p95 cross-check), H-025 and the COPY rows in `docs/transformation/HALTS.md`.

## GA blockers recorded (NOT merge blockers)
- [ ] **BUDGET-MEASURE** (QUEUE, under PW-ENTITLE-01): measured token budgets replace the interim ones: ((N−1)·A_p95 + R)·1.1, where A_p95 must include the scan/upload extraction and the verification actual.
- [ ] **H-035**: Terms §12 Greek/English mismatch — separate legal commit (drafted in HALTS.md).
- [ ] Other queued items: PW-ENTITLE-01 (one trial per customer; `/api/v1/policies/share` entitlement, security-reviewer), SUBSCRIPTION-START-EMAIL, STRIPE-PORTAL-PLAN-SWITCHING, TOKEN-TOPUP-UI-REMOVED, AGENT-CANCEL-PATH, PREVIEW-USES-STAGING-SUPABASE (blocks PW-ASSET-01), PW-CLAIMREG-01, BOAT-LIABILITY-RULE-VERIFY, QA-BUDGET-SPLIT.

## Rollback triggers
- Any 5xx on `/pricing`, `/`, `/account`, `/upgrade`, `/legal/terms` after deploy.
- Stripe Checkout creation errors (`custom_text` is the only new session field): `createCheckoutSession` failures in Sentry → revert immediately.
- The Family card shows a trial sentence on a plan with no trial, or a wrong price/length.
- Console errors on `/pricing` or `/account` in the owner's session.
