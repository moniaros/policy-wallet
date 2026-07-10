# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-07-10 (evening)

## Current phase
**DEPLOYED TO PRODUCTION** (policy-wallet-omega.vercel.app, Vercel project `policy-wallet`, team moniaros-projects). PR #45 merged the full stack (product-revision + scale-hardening + seo-geo-aeo) into `NEW-UI` on 8 Jul; subsequent env/config fixes deployed via CLI. Greece GA go/no-go packet still `HOLD` on human sign-offs.

## Done (recent)
- **Smart recommendation cards SHIPPED (PR #53, deployed 10 Jul):** every coverage recommendation now shows risk + severity, plain-language explanation, a "From your policy data" evidence block quoting the user's own facts, a suggested next step, and Review-this / Ask-my-agent / Not-relevant CTAs. Five new portfolio rules (`lib/services/gap-engine/portfolio-rules.ts`, no DB migration): expiring motor (≤30d), low health limit (<€100k extracted), duplicate coverage per LOB, unclear exclusions (links to the extraction review), no agent connected. Evidence recomputed live per engine run; portfolio cards excluded from product matching (anti-salesy). 17 new unit tests (221 total).
- **Upload review screen SHIPPED (PR #51, deployed 10 Jul):** post-upload AI-extraction review with per-field confidence chips (surfaced for the first time — a persist-time bug was silently erasing them), inline editing of all key fields (incl. newly-extracted issue date / payment frequency / renewal date), Confirm & save, Flag-incorrect-extraction (notificationEvent + activityLog trail), "AI can make mistakes" microcopy. Soft gate: `acordData.extraction.reviewState` drives an amber "Review extracted data" chip across the wallet + detail-page banner until confirmed; review-later at `/wallet/[id]/review`. 31 new unit tests (204 total).
- **Premium empty states SHIPPED (PR #50, deployed 10 Jul):** shared `EmptyState` primitive (public-site design language) wired across wallet (desktop+mobile), My Agent (now with a working inline invite-code form — was a dead end), coverage-insights recommendations (no longer renders nothing), agent customers (zero-book + invited-tab), agent renewals, home renewals block. Claims intentionally excluded (no claims domain exists).
- **Agent-managed policies SHIPPED (PR #48, deployed 10 Jul):** agents upload policies for customers (scanned PDF now persisted), edit them per tier (previously-dead `maxPoliciesPerCustomer` + agent `monthlyTokenBudget` now enforced), and hand customers access via invites. Ownership stays with the customer; agent capability = auto-minted revocable `manage` AccessGrant. New central `lib/policy-access.ts` authorization (all policy read/write/delete paths routed through it; agent portfolio read tightened); analysis attribution unified to the initiating agent; AI consent via **agent attestation** for phantom customers (activity-log evidence, cleared on activation — ⚠️ pending counsel sign-off). Backfill migration applied+registered on prod (0 rows). 173/173 tests, all guardrails, zero runtime errors post-deploy.
- **UI repaint SHIPPED (PR #46, deployed 10 Jul):** logged-in app aligned to the marketing design language (deep green #29685B / mint dark mode / Inter), ~150 files, verified live.
- **Production launch ops (8–10 Jul):** PR #45 merged + deployed. PolicyWallet-Prod Supabase (`cquudefwfwrmvpftuhyl`) is the end-to-end prod stack: full 29-migration Prisma chain applied via MCP + registered in `_prisma_migrations` (59 tables, seed plans/templates); auth + DB env cut over (pooler URLs — direct `db.*` hosts are IPv6-only, unreachable from Vercel); CSP now derives Supabase origin from env. `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` set (custom auth links no longer localhost). GA active (`G-G9ZFY7QQX6`).
- **Auth email flow fixed:** Supabase Site URL → live site + 3 redirect allowlist URLs; duplicate built-in "Confirm email" disabled (app runs its own token flow via Brevo); **Brevo Authorised-IPs blocking deactivated** — it was rejecting all API sends from Vercel's dynamic IPs (root cause of missing branded emails). `info@policywallet.gr` is a verified sender; `BREVO_API_KEY`/`SENDER_EMAIL`/`SENDER_NAME` set. Supabase custom SMTP form prefilled (Brevo relay :587) — awaiting SMTP key (≠ API key) for magic-link emails.
- **SEO/GEO/AEO overhaul live** (responds to 7 Jul audit 4/4/5): robots/sitemap 200 on prod, unique Greek titles/canonicals, server-rendered JSON-LD, 1200×630 OG, `/guides`, proxy.ts allowlist fix. Post-deploy checklist in `docs/operations/SEO_STRATEGY.md` (Search Console submission pending).
- **Hobby-plan cron fix:** synthetic-launch-check cron now daily (sub-daily rejected at deploy).
- Prior passes: production hardening (Sentry, rate-limit, pooled DB), 3 endpoint scope-gap fixes, pricing-cutover copy, nodemailer 9, design-sync, monetization stack. All guardrails + 145/145 unit tests green.

## Blocked / user-gated
- **Supabase SMTP key** (Brevo → SMTP & API → SMTP tab, `xsmtpsib-…`) — paste into the prefilled Supabase SMTP form + username; only affects magic-link emails.
- **Stripe test keys + billing catalog** (`setup-billing-catalog.ts --apply`) — money path untested on prod. `GEMINI_API_KEY` unset → AI runs on mock. QStash keys unset → AI analysis inline.
- **Housekeeping:** Supabase "outstanding invoices" banner (pay to avoid disruption); Brevo API key + prod DB password passed through chat — rotate both cheaply; old Supabase project (`lzqvtvjggylcujenlelh`, 31 demo accounts) idle — decide keep/pause.

## Top risks (ranked)
1. **High — money path untested in prod**: signup→trial→paywall→checkout never exercised against real Stripe (keys unset).
2. **Medium — email deliverability fresh**: first branded sends just unblocked; Brevo free tier caps 300/day; sender domain DKIM state unverified via API (domains endpoint still propagating).
3. **Medium — scale**: upload path still inline (QStash follow-up), pooled DB unverified under load, no k6 run.
4. **Medium — governance HOLD**: legal/DPO/product + UAT + SRE-restore sign-offs pending; email-verify hard gate off (flip `ENFORCE_EMAIL_VERIFICATION=1` before real traffic).
5. **Low — Vercel git auto-deploy off**: pushes to `NEW-UI` don't build; deploys go via `vercel deploy --prod` CLI. Re-enable in Vercel Git settings or keep CLI discipline.

## Next 3 actions
1. Finish email: user pastes Brevo SMTP key in Supabase; e2e test — fresh signup → one branded email from info@policywallet.gr with live-site link; magic-link round trip.
2. Money path: add Stripe test keys, run `setup-billing-catalog.ts --apply`, walk signup→trial→paywall→checkout on prod; set `GEMINI_API_KEY` + QStash to exercise the real AI pipeline (also lights up real per-field confidence on the new review screen — mock provider until then).
3. SEO follow-through: Search Console property + sitemap submission; then apex-domain cutover (marketing → policywallet.gr, B2C/B2B subdomains) per SEO_STRATEGY.md. (Flagged-extraction admin triage shipped — `/admin/extraction-flags`.)
