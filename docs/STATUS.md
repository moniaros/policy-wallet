# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-07-06

## Current phase
**Pre-demo hardening → internal/stakeholder staging demo.** Product is feature-complete; remaining work is integration + deployment + sign-off. All engineering on branch `product-revision` (the whole body of work — `production-prep` + monetization + design-sync + this hardening pass — is stacked here; opening one PR → `NEW-UI`). Greece GA go/no-go packet still `HOLD` on human sign-offs.

## Done (recent)
- **Production hardening (this pass):** re-enabled server/edge Sentry (was commented out — server errors were invisible), sampling 1.0→0.1, `sendDefaultPii` off (GDPR); rate-limiter now alerts on in-memory fallback + prod requires Upstash; `db.ts` pooled-connection-ready (`POOLED_DATABASE_URL`, opt-in) + Prisma client cached on global in all envs.
- **Security:** closed 3 endpoint scope-gaps (analysis-runs grant now policy-scoped; questionnaire-response recipient check; task-recipient relationship check) + 6 tests. Share trust chain audited sound.
- **Pricing-cutover copy** fixed (risk #1): `/pricing` + `/upgrade` now match the shipped paywall (Free organizer + 1 trial, Plus 1M, Pro 3M) — no more "Unlimited AI"/"10 analyses/month" contradictions.
- **nodemailer 7→9** (worst production vuln class gone; 10→9 vulns). k6 load scripts authored (`scripts/load/`). Demo deploy runbook: `docs/operations/DEMO_DEPLOY_RUNBOOK.md`.
- **Design system synced** to claude.ai/design (17 components, all previews graded good); inputs committed under `.design-sync/`.
- Prior: AI paywall + trial, token economics, agent consent-request flow, onboarding v2 + signup split, agency-tier gating, GDPR consent gate, billing catalog script.
- All guardrails + **136/136 unit tests** + build green; full migration chain replayed clean on ephemeral Postgres.

## Blocked (credential-gated — you execute, runbook ready)
- **Staging deploy**: provision staging Supabase + Upstash + Vercel; set env; `prisma migrate deploy`; `setup-billing-catalog.ts --apply` (Stripe test) + RevenueCat; deploy; walk the money path. Full steps in `DEMO_DEPLOY_RUNBOOK.md`.
- **Real-DB migrations** (consent gate, trial/invite columns) still unapplied to any real DB.

## Top risks (ranked)
1. **High — nothing deployed yet**: the demo is the first real end-to-end exercise of signup→trial→paywall→checkout. Untested against a real Supabase/Stripe until the runbook runs.
2. **High — scale gaps are fast-follow, not done** (gate before real traffic, not the demo): pooled DB unverified under load; AI pipeline still inline via `after()` (QStash installed, unused); no load run yet.
3. **High — auth gaps**: email-verification still soft (issue #39), passkey/biometric not production-wired, 30-day session untested.
4. **Medium — governance HOLD**: legal/DPO/product + UAT + SRE-restore sign-offs pending; `AI_INCIDENT_*` secrets missing.
5. **Medium — CI blind spot**: CI only triggers on `main`/`develop`, so `NEW-UI`/`product-revision` have never been CI-validated remotely.

## Next 3 actions
1. Open the consolidated PR (`product-revision` → `NEW-UI`), review the diff, merge; add `NEW-UI` to CI triggers so it validates remotely.
2. Run `DEMO_DEPLOY_RUNBOOK.md` end-to-end on staging; complete the money-path acceptance walk; file defects.
3. Kick off the fast-follow scale + auth-hardening work (Phase 3) in parallel with demo feedback: queue the AI pipeline on QStash, verify pooled DB under a k6 run, land issue #39 (email-verify hard gate).
