# Load tests (k6)

Baseline load scenarios for the ramp-to-traffic phase. **Run against staging only** — never production, never a shared DB you care about.

## Run

```bash
# install k6: brew install k6  (or https://k6.io/docs/get-started/installation/)
BASE_URL=https://<staging-url> k6 run scripts/load/public-surface.js
```

`public-surface.js` covers the unauthenticated hot paths (landing, pricing, product, `/api/health`) plus the public rate-limited `POST /api/v1/consents`. Thresholds: **p95 < 500ms**, **error rate < 1%**. A launch spike hits these first, so they're the smoke test before opening traffic.

## Extending to authenticated journeys

The money path (wallet list → upload → analysis trigger → checkout) needs a real Supabase session. To load-test it:

1. Seed N test users in staging (`prisma/seed.ts` / `scripts/seed-agent-demo.mjs`).
2. In a k6 `setup()`, log each in via the Supabase auth REST endpoint (`POST /auth/v1/token?grant_type=password`) and collect the access tokens.
3. Pass `Authorization: Bearer <token>` on the protected requests.
4. **Gate AI-triggering requests** — `runPolicyAnalysis`/`review` cost real provider tokens. Point staging at the **mock** AI provider (unset `GEMINI_API_KEY`, or set the mock flag) before load-testing analysis, or you'll burn budget and hit provider rate limits.

## Targets to validate before ramping traffic

- p95 < 500ms on reads; p95 < 2s on the analysis-trigger enqueue (not the full run).
- No connection-pool exhaustion in the DB (watch Supavisor metrics) — this is the specific reason `POOLED_DATABASE_URL` must be set (see `lib/db.ts`).
- Rate limiter holds across instances (Upstash reachable — no "degraded to in-memory" Sentry warnings).
