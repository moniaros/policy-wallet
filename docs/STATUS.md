# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-07-07

## Current phase
**Pre-demo hardening → internal/stakeholder staging demo.** Product is feature-complete; remaining work is integration + deployment + sign-off. All engineering on branch `product-revision` (the whole body of work — `production-prep` + monetization + design-sync + this hardening pass — is stacked here; opening one PR → `NEW-UI`). Greece GA go/no-go packet still `HOLD` on human sign-offs.

## Done (recent)
- **SEO/GEO/AEO overhaul (branch `seo-geo-aeo`, responds to the 7 Jul external audit 4/4/5):** robots.ts + sitemap.ts; unique Greek titles/descriptions + canonicals on all marketing pages (client pages wrapped with server `page.tsx`); server-rendered JSON-LD (Organization, WebSite, FAQPage, HowTo, BreadcrumbList, SoftwareApplication+Offers, Article — was injected post-hydration, invisible to crawlers); 1200×630 OG images (was 1024×1024); `/guides` with 3 bilingual long-tail articles; free-tier copy contradiction fixed (3 policies); stat counters server-render real values; placeholder phone removed (env-driven NAP + socials, see `docs/operations/SEO_STRATEGY.md`). Root cause of the audit's critical finding was `proxy.ts` (Next 16 middleware) auth-gating robots.txt/sitemap/for-agents — allowlist fixed; takes effect on next deploy. Verified locally on a prod build (robots/sitemap 200, unique titles+canonicals, JSON-LD parses, og:image 1200×630, /wallet still auth-gated).
- **Production hardening (this pass):** re-enabled server/edge Sentry (was commented out — server errors were invisible), sampling 1.0→0.1, `sendDefaultPii` off (GDPR); rate-limiter now alerts on in-memory fallback + prod requires Upstash; `db.ts` pooled-connection-ready (`POOLED_DATABASE_URL`, opt-in) + Prisma client cached on global in all envs.
- **Security:** closed 3 endpoint scope-gaps (analysis-runs grant now policy-scoped; questionnaire-response recipient check; task-recipient relationship check) + 6 tests. Share trust chain audited sound.
- **Pricing-cutover copy** fixed (risk #1): `/pricing` + `/upgrade` now match the shipped paywall (Free organizer + 1 trial, Plus 1M, Pro 3M) — no more "Unlimited AI"/"10 analyses/month" contradictions.
- **nodemailer 7→9** (worst production vuln class gone; 10→9 vulns). k6 load scripts authored (`scripts/load/`). Demo deploy runbook: `docs/operations/DEMO_DEPLOY_RUNBOOK.md`.
- **Design system synced** to claude.ai/design (17 components, all previews graded good); inputs committed under `.design-sync/`.
- Prior: AI paywall + trial, token economics, agent consent-request flow, onboarding v2 + signup split, agency-tier gating, GDPR consent gate, billing catalog script.
- All guardrails + **136/136 unit tests** + build green; full migration chain replayed clean on ephemeral Postgres.

## Blocked (credential-gated — you execute, runbook ready)
- **Vercel env — partially set.** On project `policy-wallet` (`prj_J0Yk…`, team moniaros-projects) I set `AUTH_SECRET`, `CRON_SECRET`, `RATELIMIT_ALLOW_LOCAL=1`, `AI_ANALYSIS_PARALLELISM=5`, `SENTRY_TRACES_SAMPLE_RATE=0.1` (production + preview). **You must add the data-plane secrets** (I can't fabricate them): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `POOLED_DATABASE_URL`, `DIRECT_URL`, `DATABASE_URL`, Stripe test keys, `GEMINI_API_KEY` (or leave unset for mock), and QStash keys to activate the queue. Build fails until the Supabase pair is set.
- **Staging deploy**: enable the demo branch in Vercel Git settings; `prisma migrate deploy`; `setup-billing-catalog.ts --apply` (Stripe test) + RevenueCat; walk the money path. Full steps in `DEMO_DEPLOY_RUNBOOK.md`.
- **Real-DB migrations** (consent gate, trial/invite columns) still unapplied to any real DB.

## Top risks (ranked)
1. **High — nothing deployed yet**: the demo is the first real end-to-end exercise of signup→trial→paywall→checkout. Untested against a real Supabase/Stripe until the runbook runs.
2. **Medium — scale partially hardened** (branch `scale-hardening`, PR pending): AI pipeline now queued on QStash for manual-trigger paths (concurrency-capped, signed consumer) — **upload path still inline** (post-analysis dedup coupling; documented follow-up); pooled DB still unverified under load; no k6 run yet.
3. **Medium — auth gaps**: email-verification hard gate now **built, opt-in** (`ENFORCE_EMAIL_VERIFICATION=1`, off for the demo — flip on before real traffic); passkey/biometric still not production-wired, 30-day session untested.
4. **Medium — governance HOLD**: legal/DPO/product + UAT + SRE-restore sign-offs pending; `AI_INCIDENT_*` secrets missing.
5. **Medium — CI blind spot**: CI only triggers on `main`/`develop`, so `NEW-UI`/`product-revision` have never been CI-validated remotely.

## Next 3 actions
1. Merge PR #43 (`product-revision` → `NEW-UI`, CI green); then PR + merge `scale-hardening` and `seo-geo-aeo` (stacked on it). Deploy → verify `curl -I /robots.txt` = 200 on the live host; submit sitemap in Search Console (post-deploy checklist in `docs/operations/SEO_STRATEGY.md`).
2. SEO data you must provide (env, no code): `NEXT_PUBLIC_SITE_URL`, real phone/address (`NEXT_PUBLIC_CONTACT_*`), LinkedIn company page (`NEXT_PUBLIC_SOCIAL_LINKEDIN`). Decide apex-domain move (policywallet.gr) per SEO_STRATEGY.md.
3. Finish the queue migration (upload path onto QStash + k6 against staging) and start closing the go/no-go human sign-offs (issue #39 gate is built, opt-in).
