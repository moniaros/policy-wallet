# CLAUDE.md

Lean entry point for Claude Code in this repo. **Detail lives in `.claude/rules/` and
`docs/STATUS.md` — keep this file short.**

## Project identity

**PolicyWallet** — a Greek-market insurance portfolio hub with three surfaces:
**policyholder**, **agent**, **admin**. It ingests policy PDFs, runs an AI pipeline to
extract + translate coverage, detects coverage **gaps** deterministically, scores
protection, and surfaces recommendations. Fully bilingual (**Greek default**, English).

**Voice:** premium Greek-fintech — clear, trustworthy, never alarmist. Trust-first UI:
never surface "Unknown Insurer", `null`, or broken state (see conventions).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript `strict` · Prisma 5 + PostgreSQL ·
Supabase (Auth + Storage) · Tailwind 4 · Vitest + Playwright · Stripe · Brevo · Upstash
Redis · Sentry. AI via the `ai` SDK with pluggable Gemini / Anthropic / OpenAI / mock
providers. **Node 20.11** (`.nvmrc`). Path alias `@/*` → repo root.

## Source of truth

- **`docs/STATUS.md` is the current-state source of truth.** Read it first, every session.
- This file is stable orientation; STATUS is what's actually done / in-flight / blocked.

## Repo map

```
app/        (public)/ (protected)/ api/ auth/ onboarding/   — no middleware.ts; auth in layouts + API routes
components/ ui/  ui/brand/ (BrandCard, BrandStat, …)  wallet/ agent/ admin/ …
lib/        db.ts (Prisma singleton)  auth-helpers.ts  api-auth.ts api-guard.ts api-utils.ts
            i18n/  subscription-entitlements.ts  services/{ai, analysis, gap-engine, ingestion}
prisma/     schema.prisma  migrations/  seed.ts  seeds/
tests/      unit/  helpers/  fixtures/    postman/   — Vitest; @ alias; tests/setup.ts
```

**The document pipeline lives in `lib/services/ingestion/`:**
`triage.ts` → `text-extraction.ts` / `scan-extraction.ts` → `field-extractors.ts` +
`greek-locale.ts` + `extraction.ts` → `extraction-cache.ts` → **`gap-detection.ts`
(deterministic `detectGaps`)** → `gap-explanations.ts` → `pipeline.ts`
(`runIngestionPipeline`, the composed orchestrator). Contracts + Zod in `contracts.ts`.

> ⚠️ Legacy LLM gap-detection still lives in `lib/services/gap-analysis.service.ts:257`
> and the `gap_detection` step of `lib/services/analysis/policy-analysis-orchestrator.service.ts`.
> The cutover to deterministic `detectGaps` is **pending** — see `docs/STATUS.md` + cost-guardrails.

## Commands

```bash
npm run dev | build | start
npm run test:unit          # vitest run tests/unit   (CI suite)
npm run type-check         # tsc --noEmit
npm run lint | lint:utf8 | lint:i18n-changed | lint:encoding
npm run audit:api-auth     # API routes vs scripts/api-route-policy-inventory.json
npm run verify:migrations  # schema <-> migration sync (needs DB)
npm run test:newman        # Postman HTTP-boundary collection (needs a running server)
npx prisma migrate dev | db seed | studio
```

## CI guardrails (blocking — run before committing)

`audit:api-auth` · `lint` · `lint:i18n-changed` · `lint:utf8` · `type-check` ·
unit tests · build. E2E (Playwright) and Newman run outside the default unit CI.

## Rules (read the relevant one before working)

- **`.claude/rules/conventions.md`** — TS strictness, reuse-before-creating (real
  primitives), Greek locale, trust-first UI.
- **`.claude/rules/cost-guardrails.md`** — the pipeline's forbidden patterns ($0 common case).
- **`.claude/rules/testing.md`** — tests ship with changes; cost guardrails as negative assertions.
- **`.claude/rules/workflow.md`** — phase-gate discipline, conventional commits, prompt structure.
