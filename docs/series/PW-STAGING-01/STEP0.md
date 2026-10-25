# PW-STAGING-01 — STEP 0 — Preview deployments on a staging Supabase project

Investigation only. No product code, config, test, migration, env var or Vercel/Supabase setting was changed.
Date: 2026-10-24 · Branch `pw-staging` @ `25f3ff41` · Agent: `step0-investigator` (Opus 5.5)

**Constraints observed.** Vercel was read through `vercel` CLI GETs only: `env ls` (names, scopes, ages), `ls`, `inspect`, `api` GET. No env value was pulled, printed or decrypted. Supabase was not touched, because neither a Supabase MCP nor a CLI was available to this agent (see §7, blocked items). Every production figure below is a **count**; no row contents were read.

**Read first:** `docs/STATUS.md`, `CLAUDE.md`, `docs/transformation/DECISIONS.md` (the `pw-customer` copy, which is newer: D14 queued this item), `docs/series/00-RUN-PLAN.md`, `docs/transformation/QUEUE.md:1852`, `docs/build/policywallet-transformation-multiagent.md` §2 and §5, plus the memory notes on preview writes to production and Sentry environment tags.

---

## 0. The series file does not exist — scope used here

`docs/series/PW-STAGING-01.md` is not in this worktree, in any local or remote branch (checked across every ref with `git ls-tree`), in the `pw-customer` checkout's `docs/series/` (which holds 13 other series files), or anywhere under `~/Workspace`, `~/Downloads`, `~/Desktop`, `~/Documents` or `~/.claude`. Halt **H-040**.

So this Step 0 is scoped from the only written source for the work, the queue item that names it (`docs/transformation/QUEUE.md:1852`, on `pw-customer`):

> **PREVIEW-USES-STAGING-SUPABASE** — a Vercel preview deployment currently reaches the **production** Supabase project … Preview deployments must use the staging Supabase project BEFORE any series with migrations starts. **Blocks the PW-ASSET-01 build** … Scope: Vercel project env scoped to Preview (`DATABASE_URL`, `DIRECT_URL`, Supabase URL/anon/service keys), a staging project, and a journey check against it. The owner configures env values; this item is the work to wire and verify.

It is also scoped from run plan §3 step 5: "staging DB + RLS → preview deploy verification → five-step human GO checklist → prod flip last … confirm the email/push stub is in place so no real message can go out."

The caller's constraint "item 6 reports counts only" refers to an item list I could not see. I applied it to the **whole report**.

---

## 1. What the series assumes that turned out false

Ordered by how much they change the seriousness of the problem.

### 1.1 "The email/push stub is in place so no real message can go out" is false on every preview deployment (worse than assumed)

`lib/outbound/dispatch-guard.ts:75-77` defines production as `process.env.NODE_ENV === "production"`, and `:94` allows dispatch on that alone. Next.js assigns `NODE_ENV=production` to every command except `next dev`. The local Next 16.3.6 docs say: "If the environment variable `NODE_ENV` is unassigned, Next.js automatically assigns `development` when running the `next dev` command, or `production` for all other commands" (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:283`, read in the `policy-wallet` checkout). The repo already knows this: `instrumentation-client.ts:21` says "NODE_ENV is 'production' on a preview build too", and `tests/unit/sentry-environment-consistency.test.ts:56` says "Both are NODE_ENV=production. Only VERCEL_ENV separates them."

Preview has its own `BREVO_API_KEY` row (`vercel env ls`). So on any of the live preview deployments, `sendEmail` (`lib/email/email-service.ts:76`, `:84`), web push (`lib/push/web-push.ts:170`) and FCM push (`lib/services/push.service.ts:133`) all go out for real.

The stub's own guard cannot see this. `tests/unit/outbound-dispatch-stub.test.ts` tests only the vitest branch (throw), never a `VERCEL_ENV=preview` build.

### 1.2 Brevo contact-list writes sit outside the stub entirely

`lib/brevo.ts:19-27` (`deleteBrevoContact`) and `:47-57` (`createBrevoContact`) call `api.brevo.com/v3/contacts` and never call `outboundDispatchAllowed`. Callers:
- `app/auth/callback/route.ts:226-231` (every sign-in callback with a DB user),
- `app/api/contact/route.ts:170`,
- `app/api/v1/newsletter/subscribe/route.ts:69`,
- `lib/services/gdpr-erasure.service.ts:559` (erasure deletes the contact).

The enumeration guard's signatures (`tests/unit/outbound-dispatch-stub.test.ts:42-46`) match only `/v3/smtp/email`, Web Push and FCM, so this transport is outside the guard's universe. `BREVO_LIST_ID_NEWSLETTER` is a single row shared by Preview and Production. After a database split, a staging sign-up would therefore still write a real contact into the production newsletter list, and a staging erasure drill would delete a real one.

### 1.3 "Re-point `DATABASE_URL`, `DIRECT_URL` and the Supabase URL/anon/service keys" is too narrow, and doing only that produces a broken hybrid

`vercel env ls` gives 60 rows over 44 names. **20 rows are a single row scoped to both Preview and Production**, so they cannot differ between the two today:

| Class | Shared rows |
|---|---|
| **Environment-bound (must split): 11** | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `QSTASH_TOKEN`, `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `GEMINI_API_KEY`, `BREVO_LIST_ID_NEWSLETTER`, `ADMIN_NOTIFICATION_EMAIL` |
| Benign shared: 9 | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_PUBLIC_KEY`, `SENTRY_OTLP_TRACES_URL`, `SENTRY_VERCEL_LOG_DRAIN_URL` (environment tag separated by `resolveSentryEnvironment`), `PASSKEYS_ENABLED`, `VERCEL_GIT_COMMIT_SHA` |

The queue item names `SUPABASE_SERVICE_ROLE_KEY`, but it **is not a Preview row that can be re-pointed**; it is the production row. Every admin path pairs it with `NEXT_PUBLIC_SUPABASE_URL`:
- `lib/supabase/admin.ts:5-6`,
- `lib/storage.ts:113`, `:195`,
- `lib/supabase/storage-download.ts:111`, `:159`, `:171`,
- `app/auth/actions.ts:72`, `:497`,
- `app/api/auth/reset-password/route.ts:39`, `:190`.

Moving only the URL to staging sends the production service key to the staging project. That fails, so the split is mandatory, not tidying.

**16 rows are Preview's own**: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `BREVO_API_KEY`, `SENDER_EMAIL`, `SENDER_NAME`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `ALLOW_REGISTRATIONS`, `AI_ANALYSIS_PARALLELISM`, `SENTRY_TRACES_SAMPLE_RATE`.

**8 names are Production-only**, so Preview lacks them: `POOLED_DATABASE_URL`, `QSTASH_CALLBACK_BASE_URL`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_AUTH_GOOGLE`, `PREVENTION_HUB_ENABLED`, `PREVENTION_PERSONALIZATION_ENABLED`, `AGENT_REVIEW_WORKSPACE`, `EXTRACTION_CITATIONS`.

Two consequences:
- A preview cannot reproduce production's feature set: three flags, citations and Google sign-in are off. A "journey check against staging" therefore needs those flags mirrored.
- Preview still lacks the pooled URL, so it runs on the 15-client session pooler. That is the root cause of POLICYWALLET-5 (`lib/db.ts:76-86`, `:139-164`).

### 1.4 "Change the Preview env and previews stop reaching production" is false for every deployment that already exists

Vercel's docs: "Any change you make to environment variables are not applied to previous deployments, they only apply to new deployments." (https://vercel.com/docs/environment-variables, accessed 2026-10-24.)

There are **887 READY preview deployments** (`vercel ls --environment preview --status READY`, paginated to the end), created 2026-07-10 → 2026-10-24:

| Source | Count |
|---|---|
| Built from `NEW-UI` | 458 |
| Built from 206 other branches (unmerged code) | 413 |
| CLI uploads (no Git ref) | 16 |
| Created in the last 30 days | 44 |

Every one keeps the env it was built with. Anonymous requests get `302` to Vercel login (two sampled), and the project has `ssoProtection: all_except_custom_domains` and **1** protection-bypass entry. So they are not public, but they remain live, production-wired application versions for anyone on the team or holding the bypass secret. The split has to include a decision about them (H-043).

### 1.5 "Preview reaches the production database" — still true as far as anything short of the values can show, and it cannot be re-confirmed by reading

The Preview `DATABASE_URL`, `DIRECT_URL` and Supabase URL/anon rows are 106–107 days old (about 2026-07-09/10), which predates the 2026-07-14 observation of preview form submissions landing in production `form_submissions`. Nothing has been re-set since. The PW-CONTENT-02 GO-CHECKLIST item 11 (2026-10-24) restates it.

These rows are **Secret** type, and Vercel documents Secret values as "write-only after saving" (same page). The current target therefore cannot be verified by reading, not even by the owner. The design re-sets every Preview row explicitly instead of trusting any of them, and adds a runtime tripwire (§3.3) so the answer becomes measurable.

### 1.6 Preview analyses are not processed where the preview thinks they are

`lib/services/analysis/analysis-queue.ts:12-18` builds the QStash callback from `QSTASH_CALLBACK_BASE_URL || NEXTAUTH_URL`, then `VERCEL_URL`. Preview has the QStash token (shared row) and **no** `QSTASH_CALLBACK_BASE_URL` (Production-only), so it uses Preview's `NEXTAUTH_URL`, whose value is unknown and write-only. Either outcome is a defect:
- **If it names production**, a preview-created run is executed by *production* code (`/api/v1/jobs/execute-analysis`). After a database split, production would look up a staging `runId` in the production DB.
- **If it names a preview host**, QStash meets the SSO `302`, exhausts its 5 retries (`:54`), and the `failureCallback` (`:58`) is blocked too, so the run sits `queued`.

The same `NEXTAUTH_URL` builds every link in preview-sent emails: `app/auth/actions.ts:346`, `:407`, `:449` and `app/api/v1/invites/route.ts:87`.

### 1.7 Staging cannot be built from migrations alone

The 88 migrations enable RLS on 8 tables but contain **0** `CREATE POLICY` and **0** storage bucket statements. Prisma connects as the owner role, so the app does not depend on policies, but the buckets matter: `policies` and `uploads` (`lib/supabase/storage-download.ts:33`) exist in production and in no migration.

Reference data also lives outside migrations:
- plans (`scripts/gen-plan-seed-sql.ts`, a publication channel per CLAUDE.md),
- insurers (`scripts/gen-insurer-seed-sql.ts`),
- lookups (`scripts/gen-lookup-seed-sql.ts`),
- the gap catalogue (`npm run align:gap-catalogue`).

Supabase branches "do not start with any data or storage objects from your base project" (https://supabase.com/docs/guides/deployment/branching, accessed 2026-10-24), so branching does not remove this work either.

### 1.8 Staging does not unblock PW-ASSET-01 on its own

The production build applies migrations itself: `scripts/vercel-build.mjs:5-10` runs `scripts/release-prevention-schema.ts --apply` when `VERCEL_ENV=production`. That script refuses **any** pending migration outside the two reviewed prevention migrations (`:39` "Unexpected pending migration; release must be reviewed"), and accepts only two project refs (`:9`).

So the `insured_assets` migration would fail the production build even after a perfect staging rehearsal, unless the promotion mechanism changes. That belongs to H4 (H-044). Preview builds never migrate (`tests/unit/vercel-schema-before-build.test.ts:29-33`), which is correct and must stay so: 206 branches building previews must not each migrate staging.

### 1.9 Two adjacent findings

- **Vercel's Git production branch is `main`**, with Git deployments `enabled`. The tip of `main` is from 2026-02-16, and production actually ships from `NEW-UI` via `.github/workflows/deploy.yml:99` (`vercel deploy --prod`). A push to `main` would make the Git integration build a **production-target** deployment of February code. Nothing in this repo prevents it. Raised in H-043, not in scope to fix here.
- **The staging runbook is stale.** `docs/operations/DEMO_DEPLOY_RUNBOOK.md:7`, `:11` names team `agentrises-projects`, and `:15` says `deploy.yml` runs `prisma migrate deploy` (it no longer does). `.github/workflows/preview.yml:3-5` fires only for PRs into `main`/`develop`, so it never runs; the 871 Git previews come from the Vercel GitHub integration.

### 1.10 What turned out *less* serious than it might have

- **Crons.** Crons never run on a preview. "Vercel makes an HTTP GET request to your project's production deployment URL" (https://vercel.com/docs/cron-jobs, accessed 2026-10-24). The ten jobs in `vercel.json` cannot double-fire from previews, but they also cannot run on staging, so the journey must invoke them with Preview's `CRON_SECRET`.
- **Previews never migrate production.** `scripts/vercel-build.mjs:5`, guarded by the test above.
- **Previews are not indexable** (`lib/seo/site.ts:39-42` keys on `VERCEL_ENV`).
- **Sandbox checkout on preview is intended** (`lib/pricing/stripe-mode.ts:66-77`). But see §6: because `STRIPE_SECRET_KEY` is one shared row, a live key set for production would also arm every *new* preview.

---

## 2. What exists

### 2.1 Connection selection
- `lib/db.ts:23-26`: runtime URL is `POOLED_DATABASE_URL → DIRECT_URL → DATABASE_URL`.
- `:87-109`, `assessConnectionStrategy`: warns on a deployed fallback.
- `:139-164`, `capFallbackPool`: forces `connection_limit=2&pool_timeout=20` on a deployed session-mode fallback.
- `:182`: the effective URL.
- Nothing compares the URL's project with the deployment tier.

### 2.2 Build and migration path
- `vercel.json`: `buildCommand` is `node scripts/vercel-build.mjs`; region `cdg1`; 10 daily crons.
- `scripts/vercel-build.mjs:5-10`: production-only schema release.
- `scripts/release-prevention-schema.ts:9-11`: two-ref allowlist plus a URL/project match.
- `:39`: the reviewed-only pending-migration rule.
- `:43`: `prisma migrate deploy`.

### 2.3 Supabase clients
- `lib/supabase/client.ts:5`, `server.ts:8`, `admin.ts:5-6` and `:31`.
- `lib/supabase/storage-download.ts:33`: owned buckets.
- `:133-144`, `isOwnedStorageUrl`: compares the stored URL's host with `NEXT_PUBLIC_SUPABASE_URL`. Production rows copied into staging would therefore fail closed, which is good.

### 2.4 Outbound side effects
- `lib/outbound/dispatch-guard.ts:93-101`: the environment decision.
- Transports: `lib/email/email-service.ts:76`, `lib/push/web-push.ts:170`, `lib/services/push.service.ts:133`.
- Unguarded: `lib/brevo.ts:24`, `:54`.
- Guard: `tests/unit/outbound-dispatch-stub.test.ts:42-46`, `:115-130`.

### 2.5 Queue
- `lib/services/analysis/analysis-queue.ts:12-18` (base URL), `:24-31` (publishes only when a token and a base URL exist, otherwise the caller runs inline), `:39-58`.

### 2.6 Rate limiting
- `lib/rate-limit.ts:34`: prefix `@pw/rl:${cacheKey}`, with no environment component, on a Redis shared by Preview and Production.

### 2.7 Other environment-sensitive switches, all keyed on `NODE_ENV`
- `lib/env.ts:113` (production boot requires Upstash unless `RATELIMIT_ALLOW_LOCAL=1`).
- `lib/services/ai/ai-service.factory.ts:117` (refuses mock without `AI_SERVICE_TYPE=mock`).
- `lib/stripe.ts:18-25` (refuses a malformed key).
- 19 `NODE_ENV === / !== "production"` sites in app/lib/components in total. Most are cookie `secure` flags or dev-only pages, which are correct either way. The two that decide a **real-world side effect** are `dispatch-guard.ts:76` and `email-service.ts:158`.

### 2.8 Environment helpers that already use `VERCEL_ENV`
- `lib/pricing/stripe-mode.ts:68`, `lib/seo/site.ts:40`, `sentry.server.config.ts:18`, `sentry.edge.config.ts:16`, `instrumentation-client.ts:22` (via `resolveSentryEnvironment`, `lib/observability/sentry-scrub.ts:173`).
- There is no shared "deployment tier" module; each derives its own answer.

### 2.9 Health
- `app/api/health/route.ts:19-34`: public; says `database: 'connected'` and never *which* database.
- Inventory: `scripts/api-route-policy-inventory.json:303` (`auth: public`).

### 2.10 Registration gate
- `lib/auth/registration-gate.ts:25`: unset or unparseable means off.
- Preview has its own `ALLOW_REGISTRATIONS` row, value unknown. If it is on, previews are an unadvertised sign-up path into whatever auth project Preview uses.

### 2.11 Fixtures and production guards
- Production guards: `tests/measure/dashboard-fixtures.ts:267`, `:447-448`; `tests/measure/fixtures.ts:627`, `:1006`; `tests/global-setup.ts:195`. All are **denylists of the production ref**, so they would already run against a staging ref.
- Transformation doc §5.3 (`docs/build/policywallet-transformation-multiagent.md:475`): "Fixtures live in the local dev database only". Running them on staging needs an explicit decision (H-044).

### 2.12 Vercel project, read-only
- Team plan **pro**; **0** custom environments (Pro includes 1 per project, https://vercel.com/docs/deployments/environments, accessed 2026-10-24).
- `ssoProtection: all_except_custom_domains`, so a staging custom domain would be **public**.
- `gitForkProtection: true`; production branch `main`.

### 2.13 Supabase
Two refs are known to the repo:
- `cquudefwfwrmvpftuhyl`: production (`scripts/vercel-build.mjs:8`).
- `lzqvtvjggylcujenlelh`: dev, the "old" project used by `.env.local` and E2E.

No third ref appears anywhere in the tree, so **no staging project is known to the repo**. Whether one exists in the Supabase org could not be checked (no Supabase access in this run).

### 2.14 i18n and components
No environment banner, ribbon or i18n key exists (`components/`, `lib/i18n/translations/{el,en}.ts` searched for preview/staging/environment banner keys: none).

### 2.15 Frozen file
`lib/gap-detection.ts` sha256 starts `1d397fd9b04ced40` and matches the pin in `tests/unit/gap-severity-display-single-source.test.ts`. This series does not touch it.

---

## 3. Proposed design

Principle: **Preview is staging.** Every Preview deployment, whatever its branch, reaches only staging resources. No row is shared with Production except the 9 benign ones. A deployment that can tell it is a preview refuses to talk to production even if an env row is set back by hand.

The design does not require a Vercel custom environment. Re-pointing the whole Preview scope covers the 206-branch reality; a custom `staging` environment, which needs Pro and includes 1, is an optional later step for a persistent URL.

### 3.1 Target database (owner choice, H-041). Recommendation: **(A) a new Supabase project in the production project's region**

| Option | For | Against |
|---|---|---|
| **A. New project `policywallet-staging`** | Clean; prod-shaped config; own auth, storage and pooler | Compute cost per project; "You are granted two free projects" (https://supabase.com/docs/guides/platform/billing-on-supabase, accessed 2026-10-24), and prod plus dev already exist |
| B. Supabase branch of production | Migrations from the repo | Starts empty with no storage objects (cited in §1.7); plan and billing for branching **not verified** (the docs page did not state it); couples to the GitHub integration |
| C. Re-use dev (`lzqvtvjggylcujenlelh`) | Zero cost, today | Shares the 15-slot session pooler with local tooling and E2E; dev fixture users and 45 dev policies mix with preview traffic; 413 unmerged-branch previews would write into the database local work depends on |

### 3.2 Data model: no Prisma schema change

This series adds no table or column, and `prisma/schema.prisma` is unchanged. The only SQL is a **staging bootstrap**, applied to staging alone and never as a Prisma migration, because buckets and database labels are per-project state. Written, **not applied**:

```sql
-- STAGING BOOTSTRAP — run on the staging project ONLY, after `prisma migrate deploy`.
-- Not a Prisma migration: it must never reach dev or production through the migrations folder.

-- 1) Storage buckets the code owns (lib/supabase/storage-download.ts:33).
--    The settings below are PLACEHOLDERS: copy public / file_size_limit / allowed_mime_types
--    from production's rows first (read-only, counts/config only):
--      SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets
--      WHERE id IN ('policies','uploads');
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('policies', 'policies', false, NULL, NULL),
       ('uploads',  'uploads',  false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
--    Storage policies: production's INSERT policy on `policies` was DROPPED (document-gate
--    program, Sept 2026: uploads go through ingestPolicyDocument with the service role).
--    Mirror production's storage.objects policy set exactly — list it first:
--      SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'storage';
--    and create NONE that production does not have.

-- 2) A database-sourced identity label, so a deployment can PROVE which database it reached
--    (the env cannot be read back — Secret rows are write-only).
COMMENT ON DATABASE postgres IS 'policywallet:staging';
-- Production gets 'policywallet:production' and dev 'policywallet:dev' in the build step
-- (production is a one-statement metadata change; it needs the owner's go — H-044).
```

Reference data, in this order, all idempotent and all from the repo, **never copied from production rows**:
1. plans (`gen-plan-seed-sql.ts`), mirroring production's catalogue so the staging pricing page is coherent;
2. insurers (`gen-insurer-seed-sql.ts`);
3. lookups (`gen-lookup-seed-sql.ts`);
4. `npm run align:gap-catalogue -- --apply`, then `npm run verify:gap-catalogue`. The printed fingerprint **must equal production's printed fingerprint**: compare two printed values, never a value written in a document.

### 3.3 Code changes for the build session (small, listed so the reviewer can bound them)

1. **One deployment-tier module: `lib/deployment/tier.ts`.**
   - `deploymentTier(): "production" | "preview" | "development" | "test"`.
   - Logic: `VERCEL_ENV` when present; else `test` under vitest; else `development` for `next dev`; and **`next start` outside Vercel = `development` for side effects**. This closes the local `next start` + `.env.local` Brevo key hole as well.
   - It becomes the only module allowed to read `VERCEL_ENV` for a side-effect decision.
2. **`lib/outbound/dispatch-guard.ts`** switches from `NODE_ENV` to `deploymentTier() === "production"`. Behaviour off production is unchanged (skip and log). **`lib/brevo.ts`** routes both calls through the guard with a new channel `"contact"`. `email-service.ts:158` (`verifyEmailConfig`) also uses the tier.
3. **`lib/services/analysis/analysis-queue.ts:12-18`.** Off production, `appBaseUrl()` returns `null`, so the run executes inline through the existing `after()` path (`:24-31` already supports this). Previews are SSO-protected, and QStash cannot reach them without the bypass secret, which must not be handed to a third party.
4. **Wrong-database tripwire, in `lib/db.ts` beside `assessConnectionStrategy`.**
   - `assertDatabaseMatchesTier({ tier, url, supabaseUrl })` **throws at module load** when `tier !== "production"` and either URL names the production ref.
   - The production ref literal moves to one module, `lib/deployment/project-refs.ts`, which `scripts/vercel-build.mjs` and the fixture guards then import instead of their five copies.
   - The mirror rule, throwing when `tier === "production"` and the URL names the dev or staging ref, closes the reverse accident.
5. **Stripe arming.** In `lib/pricing/stripe-mode.ts`, a **live** key on a non-production tier is refused (`reason: "live_key_off_production"`), the mirror of `sandbox_in_production`. This matters because `STRIPE_SECRET_KEY` is shared today.
6. **Rate-limit namespace.** `lib/rate-limit.ts:34` prefix becomes `@pw/rl:${tier}:${cacheKey}`. This is harmless once Redis is split, and protective if the Upstash rows are ever re-shared.
7. **Not changed:** `scripts/vercel-build.mjs` (previews must never migrate) and `scripts/release-prevention-schema.ts`. Its allowlist and the promotion of future migrations are H-044, decided with PW-ASSET-01's H4.

### 3.4 Vercel Preview env: target state (the owner enters values; H-045)

| Action | Variables |
|---|---|
| **Split** the shared row into a Production row (existing value) and a Preview row (staging value) | `SUPABASE_SERVICE_ROLE_KEY`; `STRIPE_SECRET_KEY` (test key, permanently); `UPSTASH_REDIS_REST_URL` / `_TOKEN` (a staging Upstash DB, **or** remove from Preview and set `RATELIMIT_ALLOW_LOCAL=1`); `GEMINI_API_KEY` (a separate key with a spend cap, **or** `AI_SERVICE_TYPE=mock` for zero-cost journeys) |
| **Remove** from Preview | `QSTASH_TOKEN`, `QSTASH_URL`, both signing keys (inline path, §3.3-3); `BREVO_LIST_ID_NEWSLETTER`, `BREVO_API_KEY` (outbound off by tier anyway; removing the credential is defence in depth); `NEXT_PUBLIC_GA_MEASUREMENT_ID` (keeps staging traffic out of production analytics); `ADMIN_NOTIFICATION_EMAIL` |
| **Re-set** to staging values (do not trust the old ones) | `DATABASE_URL`, `DIRECT_URL` (5432 session, `?connection_limit=2&pool_timeout=20`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AUTH_SECRET` (new), `CRON_SECRET` (new), `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` (the staging host), `ALLOW_REGISTRATIONS` (explicit) |
| **Add** to Preview | `POOLED_DATABASE_URL` (staging 6543 `?pgbouncer=true`), so Preview leaves the session pooler; `PREVENTION_HUB_ENABLED`, `PREVENTION_PERSONALIZATION_ENABLED`, `EXTRACTION_CITATIONS`, `AGENT_REVIEW_WORKSPACE` mirroring production, for journey parity |
| **Supabase staging Auth** | Site URL plus redirect allowlist for the preview host pattern; email confirmations from staging's own SMTP or disabled. Supabase's own auth mail is outside our dispatch guard. |

Then **redeploy**: Vercel applies env only to new deployments.

### 3.5 API contract

No change to `/api/health`. It is public, and naming the database target there would be an information leak. Add one route instead:

- **`GET /api/v1/admin/deployment-identity`**
  - Auth: `requireApiUser({ roles: ['admin'] })`; inventory entry `auth: role`, methods `GET`; no request body.
  - `200`:
    ```json
    { "tier": "preview", "databaseLabel": "policywallet:staging", "supabaseTarget": "staging", "outbound": "off", "analysisQueue": "inline", "stripeMode": "sandbox" }
    ```
  - `databaseLabel` comes from `SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname = current_database()`. It is read from the database itself, not from env. `supabaseTarget` is a class (`production|staging|dev|unknown`), never the ref.
  - `503` when the label is missing.
  - This is what the journey check asserts. It turns "preview reaches staging" from an inference into a reading.

### 3.6 Components (optional; UI/UX backlog, not launch-gating)

A non-production ribbon, so a journey screenshot can never be mistaken for production.

| Piece | Primitive | i18n keys (new; Greek needs `greek-copy-reviewer` and Eli) |
|---|---|---|
| `components/shell/EnvironmentRibbon.tsx` (server; renders only when `deploymentTier() !== "production"`) | `.pw-pill` in a fixed top strip; shell item, so it is excluded from the overlap metric per CLAUDE.md | `environment.nonProduction.label`: el «Περιβάλλον δοκιμών», en "Test environment". Avoids «δοκιμαστικό», which §2.4 lists as leakage |

### 3.7 Journey check (the series' acceptance, as I infer it)

On a fresh preview after the env switch:
1. `GET /api/v1/admin/deployment-identity` returns `databaseLabel = policywallet:staging`, `outbound = off`, `analysisQueue = inline`.
2. A fixture sign-up, upload and analysis completes on staging; the production row counts of `users`, `policies` and `form_submissions` taken before and after are **unchanged**.
3. No Brevo or push request leaves the deployment (runtime logs show the `[email:dev] not sent` line).
4. The cron routes are invoked by hand with Preview's `CRON_SECRET`.

---

## 4. Fixtures

Each fixture must be able to produce the defect it targets.

### 4.1 Series-specific (unit level; each is red on today's code)

| ID | Setup | Reproduces today | Green when |
|---|---|---|---|
| S1 `preview-email` | `VERCEL_ENV=preview`, `NODE_ENV=production`, `BREVO_API_KEY=x`, `fetch` spy; call `sendEmail` | `fetch` called (`dispatch-guard.ts:94`) | not called; `messageId: "dev-outbound-blocked"` |
| S2 `preview-push` | Same env; `sendWebPush` and the FCM path | dispatched | skipped |
| S3 `preview-brevo-contact` | Same env; `createBrevoContact`, `deleteBrevoContact` | `fetch` to `/v3/contacts` (`brevo.ts:24`, `:54`) | skipped; enumeration guard's signature list includes `/v3/contacts` |
| S4 `preview-qstash` | `VERCEL_ENV=preview`, `QSTASH_TOKEN=x`, `NEXTAUTH_URL=https://www.policywallet.gr`; `enqueueAnalysisRun` | publishes to the production host (`analysis-queue.ts:13`) | returns `false` (inline) |
| S5 `preview-prod-db` | `VERCEL_ENV=preview`, `DIRECT_URL` naming the production ref; import `lib/db` | boots silently | throws at load |
| S6 `prod-nonprod-db` | `VERCEL_ENV=production`, URL naming the dev ref | boots silently | throws |
| S7 `preview-live-stripe` | `VERCEL_ENV=preview`, live-shaped key | `available: true` | `live_key_off_production` |
| S8 `env-scope-snapshot` | Committed JSON of `vercel env ls` **names and scopes only** (today's 60 rows); a checker flags any environment-bound name whose single row spans Preview and Production | 11 flagged | 0 |
| S9 `next-start-local` | No `VERCEL_ENV`, `NODE_ENV=production`, Brevo key set | sends | skipped |

Probes per CLAUDE.md "Guards must enumerate": the tier guard enumerates every `NODE_ENV === "production"` site in app/lib from the filesystem, and fails if one sits in a file that also matches a transport signature, a queue publish or a provider call. It ships with a `tests/fixtures/guard-probes/deployment-tier-*.ts.txt` probe proven red.

### 4.2 The six mandatory fixtures (they exist; the series runs them on staging to prove parity with local dev)

| Fixture | Where | Produces |
|---|---|---|
| Empty portfolio | `tests/measure/dashboard-fixtures.ts:63` (`"empty"`) | all-clear-over-nothing |
| All-expired | `dashboard-fixtures.ts:189` (`"all-expired"`) | «Εντάξει» over lapsed cover |
| Failed analysis | `tests/measure/fixtures.ts:129` (`failedLatestRun`), `dashboard-fixtures.ts:92` (`failedRun`) | failure banner over an earlier run's body |
| Extractor placeholder | `fixtures.ts:146-154` (`defect-placeholder-identity`, `__PENDING_EXTRACTION__` at `:151`) | sentinel rendered as identity |
| Longest Greek insurer name | `dashboard-fixtures.ts:33` (`LONG_INSURER`, «ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ «Η ΕΘΝΙΚΗ»»), used at `:125` | clipping at 320px |
| English summary left in storage | `fixtures.ts:102-109` (`defect-english-summary`), `:643-648` deletes `summaryLanguage` | English body under a Greek heading |

Staging-specific risks for these fixtures:
- Their production guards are denylists, so they run on staging unchanged. That is allowed only after H-044. The build replaces the five regex copies with an **allowlist** import from `lib/deployment/project-refs.ts` (dev, staging).
- The fixture owner accounts must be created in **staging** Supabase auth (`tests/global-setup.ts` provisions by SQL into `auth.users`). No production account is reused.

---

## 5. Measurement plan

### 5.1 Series metrics (new; the transformation doc defines none for infrastructure)

These are **not** from the transformation doc. They are defined here once, to be reused verbatim in RESULT.md.

| Metric | Definition | Before (2026-10-24) |
|---|---|---|
| **Shared environment-bound rows** | Count of Vercel env rows whose single row is scoped to both Preview and Production and whose name is in the environment-bound list of §1.3 | **11** (of 20 shared) |
| **Preview rows of unknown target** | Count of Preview-own rows of the classes DB, Supabase, auth secret or app URL not re-set since the switch | **9** (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`) |
| **Preview lacks pooled URL** | `POOLED_DATABASE_URL` absent from the Preview scope (0/1) | **1** |
| **Live pre-switch previews** | READY preview deployments created before the switch timestamp | **887** (458 NEW-UI / 413 other branches / 16 CLI) |
| **Side-effect paths open on a preview build** | Of S1–S4 and S9, the number whose transport is reached | **5 of 5** (by code reading; the fixtures make it executable) |
| **Production rows written by a staging journey** | Δ of `count(*)` on production `users`, `policies`, `policy_documents`, `form_submissions`, `activity_logs` across one journey run (counts only) | not taken (no Supabase access in this run) |
| **Deployment identity** | `databaseLabel` returned by `/api/v1/admin/deployment-identity` on a fresh preview | not measurable today (no label, no route) |

### 5.2 Staging parity

On the six fixtures of §4.2, staging must produce the same values as local dev at 320/390/430. Definitions are copied verbatim from `docs/build/policywallet-transformation-multiagent.md` §5.2:

| Metric | Definition |
|---|---|
| **Scroll height** | `document.documentElement.scrollHeight` in CSS px after settle, per width. For paginated or virtualized surfaces, measure both initial and fully-loaded. |
| **Count-consistency failures** | `data-count="<namespace>.<key>"` keys whose rendered instances disagree without a label explaining the difference. |
| **Internal-token leakage** | Occurrences in rendered text **and in rendered outbound templates** of sentinels (`__…__`), `PENDING-<digits>`, `E2E-*`, fixture-shaped ids, bare UUIDs, raw snake_case enums, or placeholder markers («δοκιμαστικό», test, sample, draft). |
| **Locale purity failures** | Latin-script sentences (≥3 consecutive Latin words) in `el` output, with a narrow allowlist for brand names and acronyms. Applies to outbound templates. |
| **Truncation failures** | Elements sourced from the `el` bundle where `scrollWidth > clientWidth`, plus any server-side string slicing on Greek content, plus mid-word breaks on brand names. |

A parity difference is a staging-fidelity defect (missing flag, catalogue drift, bucket), not a product defect, and is reported as such.

---

## 6. Risks to CLAUDE.md invariants

| Invariant | How this series could break it | Prevention in the design |
|---|---|---|
| Env precedence: one dev `DATABASE_URL` / `DIRECT_URL` locally | A staging URL pasted into `.env` / `.env.local` points local tooling at staging, a third database | Staging URLs live only in Vercel's Preview scope; staging scripts take `EXPECTED_DB_PROJECT` explicitly as `release-prevention-schema.ts:9-11` does; the tripwire (§3.3-4) names the mismatch |
| Session-pooler cap (15) | Preview on staging's 5432 without a pooled URL repeats POLICYWALLET-5 on staging | Preview gets `POOLED_DATABASE_URL` (6543); `capFallbackPool` stays as the floor |
| DEV FIRST, then PROD; prod is the schema reference | Staging diverges from both, or becomes a second reference | Staging conforms to production like dev does; migrations flow dev → staging → prod by `migrate deploy` only; never `migrate dev`/`reset` on staging. Inserting staging into the chain needs the owner (H-044) |
| Gap catalogue: repo decides, content-not-counts | Staging runs a different active set, so the journey shows different gaps | `align:gap-catalogue --apply` then `verify:gap-catalogue`; fingerprint compared to production's **printed** value |
| Plans table is a publication channel | Staging plan rows "publish" on the staging pricing page; a live Stripe key on the shared row would make previews charge real cards | Staging rows from the repo seed; `STRIPE_SECRET_KEY` split with a permanent test key on Preview; S7 refuses a live key off production |
| No AI without consent, on every path | Staging journey uploads reach a provider | Consent checks are code, unchanged; staging users accept consent like anyone else; separate capped key or `AI_SERVICE_TYPE=mock` |
| Document gate / `policies` bucket single path | Missing staging bucket makes the gate pass and storage fail, or someone adds a bucket policy production lacks | Bootstrap mirrors production's bucket and policy set exactly, listed first, none invented (§3.2) |
| GDPR / DSR; zero real users | Copying production rows to staging puts personal (Art. 9) data in a third store no export or erasure reaches | Staging holds fixtures only; **never** a production dump; `deleteBrevoContact` from staging is blocked by §3.3-2 |
| Absence of a detected problem is not reassurance | "Preview reaches staging" claimed from env names alone (the env is unreadable) | Only the database-sourced label (§3.5) counts as evidence; a missing label returns 503, not "ok" |
| Guards must enumerate, not assume | A tier guard scoped to the three known transports | Enumerates every `NODE_ENV` production check and every transport signature from the filesystem; ships a probe |
| The gate checks code; journeys check the product | Unit fixtures green while the preview still reaches production through an un-redeployed build | §3.7 asserts outcomes on a *fresh* preview, plus production row-count deltas |
| Sentinels / identity / lifecycle / severity display | Not touched | None needed; the six fixtures re-verify them on staging |
| `lib/gap-detection.ts` frozen | Not touched (sha `1d397fd9…` matches the pin) | — |
| `"use server"` exports are public | No new server action | The new surface is an API route with `requireApiUser({ roles: ['admin'] })` and an inventory entry |
| Never publish a public claim the code does not support | A staging custom domain is **public** under `all_except_custom_domains` | Use the generated preview hosts (SSO-protected), or change protection before attaching a domain; `isIndexableDeployment` keeps noindex either way |

---

## 7. Questions only Eli can answer (appended to `docs/transformation/HALTS.md`)

| Halt | Question | Run-plan decision |
|---|---|---|
| **H-040** | The series file `docs/series/PW-STAGING-01.md` was not found. Confirm the scope used here (§0) or supply the file. | none |
| **H-041** | Which database backs Preview: new Supabase project (recommended), a Supabase branch, or the dev project? Includes the cost. | none fits; nearest **H6** (accounts and providers) |
| **H-042** | Confirm that no real email, push or Brevo contact write ever leaves a non-production deployment, staging included, rather than an allowlisted test inbox. | **H1** (send-side notification policy) applies in part |
| **H-043** | What to do with the 887 live preview deployments built with the old env; and whether Vercel's Git production branch should stay `main` (stale since 2026-02-16, Git deployments enabled). | none |
| **H-044** | Put staging in the promotion chain (dev → staging → prod) and amend CLAUDE.md "DEV FIRST, then PROD"? Allow measurement fixtures on staging (transformation doc §5.3 line 475 says "local dev database only")? How do future migrations reach production, given `release-prevention-schema.ts:39` refuses all but two? Also the one-statement `COMMENT ON DATABASE` label on production. | **H4** (schema migration approvals) |
| **H-045** | Owner-only actions: create the staging project, Upstash DB and capped AI key; enter and split the env values listed in §3.4; configure staging Auth; redeploy. The agent cannot read or write these values under this run's constraints. | **H6** |

### Blocked in this run
- **Supabase reads.** No Supabase MCP or CLI was available to this subagent, so I could not take the production count baseline (§5.1 row 6), the production bucket/policy listing (§3.2), or check whether a staging project already exists. The SELECTs needed are written in §3.2; the counts need only `count(*)`.
- **Preview env values.** These are write-only (Secret) and, by constraint, not pulled. Every claim about their *targets* is an inference from row ages and the 2026-07-14 observation, and is labelled as such.

### Greek-rule facts
None consulted, and none needed: this series involves no deadline, fee or legal obligation. Platform facts are cited inline with URLs and access dates.

STEP0 COMPLETE — awaiting approval
