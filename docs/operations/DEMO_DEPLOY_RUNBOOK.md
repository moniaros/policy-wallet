# Demo deploy runbook — internal / stakeholder staging

**Goal:** a working, observable staging deployment where the whole money path runs end-to-end — signup (both roles) → onboarding → one trial analysis → paywall → Stripe **test** checkout → paid features unlock — with errors visible in Sentry. **No real customers.** These are the credential-gated steps the engineering work can't do for you; run them in order.

> This is a demo/staging cutover. Do **not** point it at production data. Use a fresh Supabase project and Stripe **test mode**.

## 1. Provision infrastructure

- **Supabase (staging):** new project. Grab the pooled and direct connection strings and the anon key.
- **Upstash Redis:** new database (rate limiting is now required in production-mode boot — see step 2).
- **Vercel:** `vercel link` this repo to a new project (or a preview environment on an existing one).

## 2. Set environment variables (Vercel project settings)

| Var | Value / source |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `POOLED_DATABASE_URL` | Supabase **Supavisor pooler** (port 6543) `...?pgbouncer=true&connection_limit=10` — the app uses this at runtime |
| `DIRECT_URL` | Supabase **direct** (port 5432) — migrations only |
| `DATABASE_URL` | same as `DIRECT_URL` (fallback) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash (**required** — prod-mode boot refuses without them; or set `RATELIMIT_ALLOW_LOCAL=1` for a single-instance demo) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe **test mode** |
| `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`) | Sentry project (or reuse the built-in DSN); set `SENTRY_TRACES_SAMPLE_RATE=1.0` on staging to see everything |
| `GEMINI_API_KEY` (+ `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` if used) | AI providers — **or leave unset to use the mock provider** for a zero-cost demo |
| `AI_INCIDENT_SLACK_WEBHOOK_URL`, `AI_INCIDENT_PAGERDUTY_ROUTING_KEY`, `AI_INCIDENT_PAGERDUTY_EVENT_URL` | incident adapters (go/no-go item — can stub for demo) |
| `CRON_SECRET`, `BREVO_API_KEY`/SMTP, `REVENUECAT_WEBHOOK_AUTH_VALUE` | as needed for the flows you demo |

## 3. Apply the schema

```bash
# with DIRECT_URL pointing at staging
npx prisma migrate deploy
npm run verify:migrations   # expect "Migration verification passed."
npx prisma db seed          # insurers / types / gap definitions
```

## 4. Billing catalog (Stripe test mode)

```bash
node scripts/setup-billing-catalog.ts             # dry run — review the plan
node scripts/setup-billing-catalog.ts --apply     # creates products/prices (idempotent)
```
Commit the emitted `lib/billing-catalog.json`. Then configure RevenueCat per `docs/operations/BILLING_CATALOG_SETUP.md` (entitlements must match the tier strings). Point the Stripe webhook at `https://<staging>/api/v1/billing/webhook`.

## 5. Deploy + smoke

```bash
vercel deploy            # preview URL
curl https://<staging>/api/health    # expect {"status":"healthy"} 200
```
Trigger a deliberate error and confirm it lands in Sentry (server instrumentation is now live).

## 6. Money-path acceptance walk (the demo's pass/fail)

1. **Policyholder signup** at `/auth/signup/policyholder` (name/mobile/email) → onboarding: pick a goal → upload a policy PDF → **AI-consent modal** → the **one trial analysis** renders a health score + gaps → reminders step → home.
2. **Second analysis attempt** → `UPGRADE_REQUIRED` → upgrade prompt → `/upgrade`.
3. **Checkout** → Stripe **test** card (`4242 4242 4242 4242`) → subscription active → AI features unlock (run analysis / Q&A now succeed).
4. **Agent signup** at `/auth/signup/agent` → agent onboarding → dashboard; on a shared/granted customer policy, "Request client consent" sends the notification/invite.
5. Confirm `/pricing` and `/upgrade` copy matches the shipped quotas (Free = organizer + 1 trial, Plus 1M, Pro 3M).

Green on all six = demo-ready. File anything broken as a defect; re-deploys are cheap.

## Not in scope for the demo (gate before real traffic — see STATUS Phase 3)
Pooled-DB load verification, queued AI pipeline (QStash), k6 load run, auth hardening (email-verify hard gate / passkey / session), and the go/no-go human sign-offs.
