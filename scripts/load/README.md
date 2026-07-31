# Load tests (k6)

Baseline load scenarios for the ramp-to-traffic phase. **Run against staging only** — never production, never a shared DB you care about.

## Run

```bash
# install k6: brew install k6  (or https://k6.io/docs/get-started/installation/)
BASE_URL=https://<staging-url> k6 run scripts/load/public-surface.js
```

`public-surface.js` covers the unauthenticated hot paths (landing, pricing, product, `/api/health`) plus the public rate-limited `POST /api/v1/consents`. Thresholds: **p95 < 500ms**, **error rate < 1%**. A launch spike hits these first, so they're the smoke test before opening traffic.

## Authenticated journey — `authed-journey.js`

The 50–100K profile: the three reads behind every session (`/api/v1/me`, the wallet list, the portfolio score) plus a policy detail and its gaps, and — only on request — the analysis enqueue.

```bash
BASE_URL=https://<staging> \
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon> \
LOAD_USERS='u1@example.com:pw,u2@example.com:pw' \
k6 run scripts/load/authed-journey.js
```

Seed the users first (`prisma/seed.ts` / `scripts/seed-agent-demo.mjs`); `setup()` exchanges each pair for a Supabase access token and the VUs round-robin over them.

Thresholds are **per operation**, not one global number — a fast read average would otherwise hide a slow enqueue, which is what breaks first: reads **p95 < 500ms**, analysis enqueue **p95 < 2s**, errors **< 1%**.

### What it refuses to do

- **Run against production.** It writes, and a load test is indistinguishable from an attack. The production hosts are denylisted behind a deliberately awkward override.
- **Spend the AI budget.** Enqueue is off unless `ENABLE_ANALYSIS=1`, and even then the target must report `services.aiProviderIsMock: true` from `/api/health`. Unknown counts as unsafe — the point is not to find out from the invoice.
- **Pass while measuring nothing.** If no user authenticates, every request 401s: uniform, fast, and invisible to a threshold that only counts 5xx. `setup()` aborts instead. Reads are checked for `200` exactly, never "below 500", for the same reason.

`tests/unit/load-scenario-safety.test.ts` holds these properties, and checks every path the scenario requests against `scripts/api-route-policy-inventory.json` — a load test aimed at a 404 reports excellent latency and means nothing.

## Targets to validate before ramping traffic

- p95 < 500ms on reads; p95 < 2s on the analysis-trigger enqueue (not the full run).
- No connection-pool exhaustion in the DB (watch Supavisor metrics) — this is the specific reason `POOLED_DATABASE_URL` must be set (see `lib/db.ts`).
- Rate limiter holds across instances (Upstash reachable — no "degraded to in-memory" Sentry warnings).
