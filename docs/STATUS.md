# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-07-04

## Current phase
**July 2026 product revision — monetization + persona flows** on branch `product-revision` (stacked on `production-prep`, PR #38 → `NEW-UI` still open). Tracking toward Greece GA (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`, decision still `HOLD` on human sign-offs).

## Done (recent)
- **AI paywall + one trial analysis**: free tier is organizer-only (token budget 0, AI entitlements 0/false); exactly one complimentary analysis per user, claimed atomically in `orchestrator.createRun()` (`User.trialAnalysisUsedAt`); every AI entry point returns `UPGRADE_REQUIRED` → `UpgradePrompt` → `/upgrade`; agents exempt (metered by agent budgets). Modal reasons fixed (`token_limit` added); CTAs unified on `/upgrade`.
- **Token economics recomputed at real 2.5-Pro prices** (`docs/planning/TOKEN_ECONOMICS_2026-07.md`): old top-ups sold below cost — repriced (€1.99/500K, €3.99/1M, €16.99/5M, €29.99/10M, single source `lib/billing/token-packages.ts`); Pro budget 5M→3M; clarity/translation steps default to Flash (blended −40%); CAC-avoidance + per-analysis price-optimization strategies documented (agent-sponsored acquisition, cheap-model trials, cache dedupe, local text extraction, batch API).
- **Agent consent-request flow**: `requestAiConsent` — in-app notification + email (`/consent/ai` approval page) for account holders, typed signup invite for placeholder customers; AnalysisCard shows "Request client consent" for agents instead of a dead-end.
- **Onboarding v2** (5 steps: 6 goals incl. control/review/investments-reminders · upload+consent · labeled trial analysis · smart reminders · advisor) and **signup split** (`/auth/signup/policyholder` + `/agent`; agent minimum name+mobile+email, license/agency moved to onboarding; role-correct onboarding redirect — agent flow no longer orphaned).
- **Agency = plan upgrade**: team creation/invites gated on the `teamMembers` entitlement (`UPGRADE_REQUIRED` → `/agent/pricing`). Invite links now carry `relationshipType`; two weak `Math.random()` invite tokens upgraded to `crypto.randomUUID()`.
- **Billing catalog**: idempotent `scripts/setup-billing-catalog.ts` (dry-run/apply, lookup_keys) + `docs/operations/BILLING_CATALOG_SETUP.md` (RevenueCat mapping). Run with real `STRIPE_SECRET_KEY` at deploy time.
- Personas/actions/trigger reference: `docs/planning/USER_PERSONAS_ACTIONS_AND_UPGRADE_TRIGGERS.md`. GitHub issues #39 (freeze auto-signup), #40 (AI-agents epic), #41 (RoleSwitcher/role-source), #42 (admin permissions).
- All guardrails + 130/130 unit tests + build green; migrations (incl. `20260704000000_trial_analysis_and_invite_relationship`) verified via full replay on ephemeral Postgres.

## Blocked
- **Real-DB migrations unapplied** (consent gate + trial/invite columns): `npx prisma migrate deploy` with production `.env` at deploy time.
- **Stripe/RevenueCat catalog**: script authored, needs a machine with keys (`--apply`) + RC dashboard config.
- Browser-level E2E of trial → paywall → checkout needs a real Supabase env.

## Top risks (ranked)
1. **High — pricing cutover sequencing**: paywall code ships before Stripe catalog/plan copy update on `/pricing` & `/upgrade` pages reflect new quotas — existing free users lose AI mid-session without messaging. Plan the cutover (migrate deploy → catalog apply → announce → deploy).
2. **High — auth gaps (Phase 1)**: passkey/biometric handshake; 30-day session persistence untested; email verification still soft until #39 lands.
3. **Medium — scope gaps**: `analysis-runs/[runId]` grant not policy-scoped; `share` GET trust chain; `createUserTask`/`submitQuestionnaireResponse` ownership.
4. **Medium — npm vulns (10 remain)**: nodemailer 7→9 major is the worst production one.

## Next 3 actions
1. Review/merge PR #38, then open the `product-revision` PR into `NEW-UI`; plan the pricing cutover (risk #1) incl. updating `/pricing`//`/upgrade` copy to the new quotas.
2. On a prod-connected machine: `prisma migrate deploy`, run `setup-billing-catalog.ts --apply` (test mode → live), configure RevenueCat per `BILLING_CATALOG_SETUP.md`, browser-pass trial → paywall → checkout.
3. Implement issue #39 (verification hard gate) and the local-PDF-text-extraction cost lever (−~55% per analysis, `TOKEN_ECONOMICS_2026-07.md` §5.2).
