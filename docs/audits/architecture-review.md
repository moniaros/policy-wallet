# Architecture Review — PolicyWallet

_A senior-engineer reverse-engineering pass over the codebase: how it actually fits
together, where the structure is fighting the team, and a ranked, low-risk path to
clean it up **without changing behaviour**._

**Author:** Codebase architecture review (branch `claude/codebase-architecture-review-jx2um9`)
**Date:** 2026-06-27
**Scope:** ~95k LOC across `app/`, `lib/`, `components/`, `prisma/`. Reverse-engineered
from source; line references are accurate at time of writing but treat them as
"approximately here" — the structural findings are the point, not the exact line.

> **Backlog discipline (per CLAUDE.md):** findings are split into
> **§3 Broken / insecure** (correctness or security — these can gate launch) and
> **§4 Quality / maintainability** (does *not* gate launch). The refactors in §5 are
> all in the second bucket: pure code-quality upgrades that preserve behaviour.

---

## 1. Clean architecture breakdown — how the system actually works

### 1.1 Stack & layering (as-built)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Next.js 16 App Router · React 19 · TS strict                          │
│                                                                        │
│  app/(public)        unauthenticated marketing/pricing                 │
│  app/(protected)     layout.tsx → getAuthenticatedUser() gate          │
│       └ admin/       admin/layout.tsx adds role gate                   │
│  app/api/**          route handlers (no middleware; per-route guards)  │
│  app/onboarding/     post-signup flows                                 │
│                                                                        │
│  ── server actions (actions.ts per feature) ── mutation entrypoints    │
│                                                                        │
│  lib/services/       business logic                                    │
│       ai/            provider factory + gemini/anthropic/openai/mock   │
│       analysis/      policy-analysis-orchestrator (the pipeline)       │
│       gap-engine/ + gap-analysis   coverage-gap detection              │
│       billing/ compliance/ translation/                               │
│  lib/api-auth · api-guard · api-utils · auth-helpers   cross-cutting   │
│  lib/db.ts           Prisma singleton (the only client)               │
│                                                                        │
│  prisma/             schema + migrations + seed                        │
│  Postgres · Supabase Auth · Stripe · Brevo · Upstash · Sentry          │
└──────────────────────────────────────────────────────────────────────┘
```

There is **no `middleware.ts`** — authentication is enforced in (a) protected layouts
and (b) each API route. This is a deliberate choice (documented in CLAUDE.md) and is
sound, but it puts the burden of consistency on every route author (see §3.1, §4.2).

### 1.2 The core domain

The system is a **document → analysis → gaps → recommendations** pipeline around three
roles (policyholder / agent / admin). The central entities:

- **User** — actor; `roles` is a **comma-separated string** (`"policyholder,agent"`).
- **Policy** — the insurance contract; owns documents, gaps, analysis runs, opportunities.
- **PolicyDocument** — uploaded PDF/image; tracks processing status + extraction cache.
- **PolicyAnalysisRun / PolicyAnalysisStep** — the orchestrated AI run and its 8 steps,
  with lease-based concurrency control and token budgeting.
- **GapInstance / GapDefinition** — detected coverage gaps vs. their templates.
- **RecommendationInstance / ProtectionScore** — derived outputs surfaced to the user.
- **AccessGrant** — policy/portfolio sharing between users (soft-deleted via `status`).
- **CustomerRelationship / Opportunity / CollaborationThread** — the agent CRM surface.
- **Token{Usage,Balance} / MonthlyTokenUsage / Subscription** — the metering + billing layer.

### 1.3 The golden path — a policy from upload to recommendation

1. **Upload** — client posts a file; a `PolicyDocument` (`processingStatus=pending`) and a
   placeholder `Policy` (`status=analyzing`) are created; control returns immediately.
2. **Store** — file lands in object storage; a `documentHash` is computed for dedup /
   extraction-cache reuse.
3. **Analyse** — `PolicyAnalysisOrchestratorService.createRun()` creates a run
   (`queued`), estimates a token budget, and gates on the user's monthly allowance.
   If allowed, it acquires an execution **lease** and runs an **8-step pipeline**:
   `load → extract → translate → coverage map → gap detect → savings → checklist → persist`.
   Steps 2/3/5 are AI-backed; the rest are deterministic assembly. Each step is retried
   with model-fallback → provider-failover → degraded-completion.
4. **Gaps** — step 5 creates `GapInstance` rows from matched `GapDefinition`s.
5. **Derived outputs** — `refreshProtectionScore()` and recommendation generation fire
   post-analysis; policy metadata is enriched and `status` flips to `active`.
6. **Dedup** — if the same policy number already exists for the owner, documents are
   merged into the existing policy and the placeholder is deleted.
7. **Agent loop** — gaps can become `Opportunity`s and `CollaborationThread`s.

### 1.4 The data-flow seam that matters

The pipeline is **token-metered end to end**: `MonthlyTokenUsage` reserves tokens before a
run, `TokenUsage` records per-operation spend, and the orchestrator releases reservations
on completion. This is the most operationally sensitive flow in the app — a leaked
reservation directly degrades a paying user's allowance (see §3.3).

---

## 2. What the structure gets right

Worth stating, because the refactors below should preserve these:

- **Single Prisma client** (`lib/db.ts`) — no rogue `new PrismaClient()`.
- **Centralised guards exist** — `requireApiUser`, `withApiGuard`, `getAuthenticatedUser`,
  `ensureOwnership` are good primitives. The problem is *inconsistent adoption*, not absence.
- **Retry/timeout is already shared** — `lib/services/ai/shared-utils.ts` `withTimeoutAndRetry`
  is used by all three providers, so retry semantics are uniform.
- **Centralised time constants** — `lib/constants/time.ts` already exists as the home for
  shared temporal helpers (we extend it in §5.1).
- **CI guardrails** — `audit:api-auth` forces every route into a policy inventory; i18n/utf8
  linting protects the Greek-default bilingual UI.

---

## 3. Critical problem areas — broken / insecure (can gate launch)

> These are correctness/security issues. They are **out of scope for the behaviour-preserving
> refactors in §5** and should be tracked as their own fixes. Several overlap with risks
> already in `docs/STATUS.md`.

### 3.1 Role check via substring match — privilege-escalation footgun
`User.roles` is a comma-separated string checked with `.includes('admin')`
(`lib/auth-helpers.ts`). A role literal that *contains* `admin` as a substring (e.g. a
future `"non_admin"` or `"adminassistant"`) would match. Today's role set is safe, but the
check is brittle by construction. **Fix:** parse to a set and compare exact tokens
(`parseRoles(user).has('admin')`), or migrate to a native `String[]` column.

### 3.2 Inconsistent API auth / response contracts
Routes mix `requireApiUser` (manual), `withApiGuard` (HOF), and raw
`getAuthenticatedUserOrNull` + hand-built `NextResponse.json` — sometimes within the same
file (`app/api/v1/policies/route.ts` GET vs POST). Several routes skip Zod validation
(`app/api/user/language`, `app/api/notifications/mark-read`) and emit a response shape that
breaks the `{ data, meta, error }` contract (`app/api/admin/tokens/usage`). This is a
correctness/security surface, not just style — unvalidated bodies and divergent error
shapes are where IDOR/edge-case bugs hide. **Fix:** standardise every route on
`withApiGuard` + Zod + `createApiResponse`/`createApiError`. (Overlaps STATUS risk #3.)

### 3.3 Token-reservation leak on mid-run failure
The orchestrator reserves tokens up front and releases them in the success/blocked paths,
but a crash *between* reserve and release (a throw inside a step that escapes the handler)
can orphan the reservation, permanently shrinking a user's monthly allowance. **Fix:** wrap
the run body in `try/finally` and release in `finally`. (Verify against current handler
coverage before changing.)

### 3.4 Policy-dedup race
Post-analysis dedup does read-then-delete with no unique constraint on
`(ownerUserId, policyNumber, lineOfBusiness)`. Two concurrent runs can both "win" and
delete each other's record. **Fix:** add a partial unique index and make the merge
idempotent. Needs a migration — coordinate with `verify:migrations`.

### 3.5 Scope-blind AccessGrant checks
Some grant checks accept *any* active owner→grantee grant rather than one scoped to the
specific policy (`analysis-runs/[runId]`). Already logged as STATUS risk #3; flagged here
for completeness because it lives in the same authorization seam as §3.2.

---

## 4. Critical problem areas — quality / maintainability (does not gate launch)

### 4.1 The 2,481-line orchestrator does ~11 jobs
`lib/services/analysis/policy-analysis-orchestrator.service.ts` mixes run lifecycle,
distributed leasing, token budgeting, step retry/remediation, document prep, extraction
caching, batch translation, persistence, failure classification, and telemetry. It is the
single biggest comprehension and test-surface risk in the repo. **Strategy in §5.4.**

### 4.2 Three near-duplicate AI provider services (~55% shared logic)
`gemini-ai.service.ts` (852), `anthropic-ai.service.ts` (670), `openai-ai.service.ts` (619)
repeat the same Zod schemas, prompt-assembly branching, capability checks, usage parsing,
and timeout wrapping. Only model selection, the SDK handle, and prompt wording genuinely
differ. **Strategy in §5.3.**

### 4.3 `policy.service.ts` is a God object (1,012 lines)
CRUD + upload + background-analysis orchestration + dedup/merge + sharing + invites +
email + notifications. Sharing/notification and analysis-orchestration are separable
responsibilities. **Strategy in §5.5.**

### 4.4 Duplicated cross-cutting logic
- **Date → `YYYY-MM-DD`**: the `.toISOString().split('T')[0]` idiom repeated **17×**
  (verified) across AI services, gap-analysis, the extract route, and a client component.
  **Fixed in §5.1.**
- **Owner-or-grant authorization**: the `isOwner || activeGrant` check is hand-rolled in
  `gap-analysis.service.ts`, `policy.service.ts`, and several `wallet/actions.ts`
  functions. **Strategy in §5.2.**
- **Swallowed errors**: `.catch(() => {})` appears **6×** (verified) in hot paths (token
  release, email, file cleanup) — failures vanish with no context. Replace with a typed
  `safeFireAndForget(fn, context)` that at least logs.
- **Currency/locale formatting**: `Intl.NumberFormat(... 'el-GR'/'en-US' ...)` is
  re-implemented in ~10 client components plus `lib/agent/format.ts`. Consolidate into one
  `formatCurrency(amount, locale)` (deferred — touches many components; do carefully).

### 4.5 Giant client components & i18n drift risk
`PolicyDetailsClientView` (753), `AddPolicyClient` (702), `AccountClient` (760) bundle many
tabs/sections into one client chunk — candidates for per-tab `dynamic()` splitting and
`React.memo` on large lists (`PolicyTable` renders unbounded `<tr>`s). The two 1,320-line
translation files (`el.ts`/`en.ts`) are hand-synced with **no CI guard against key drift** —
a missing `en` key ships silently as the raw key string. **Strategy in §5.6.**

### 4.6 Sequential AI calls that could overlap
Within a run, clarity (step 3) and gap-detection (step 5) both consume the *structured
extraction* and have no data dependency on each other — they could run with `Promise.all`,
shaving roughly one AI-call latency (~20–40s) off a 45–90s run. Behaviour-preserving but
needs care around the shared token budget; treat as a perf task after the structural
refactors land.

### 4.7 Repo hygiene
Root holds committed dev cruft: `test-gemini.ts`, `testApi.ts`, `listUsers.ts`, `script.py`,
`fix_policy_card.py`, plus assorted `build_output*.log` / `tsc-*.txt`. `.gitignore` covers
`*-debug.log` but not these. Low risk, high noise. **Strategy in §5.7.**

---

## 5. Refactoring strategy — ranked, incremental, behaviour-preserving

Ordered by **(value ÷ risk)**. Each step is independently shippable behind the CI
guardrails (`audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, unit
tests + build). Nothing here changes runtime behaviour.

| # | Refactor | Value | Risk | Status |
|---|----------|-------|------|--------|
| 5.1 | Extract `toISODate()` date helper (17 sites) | Med | **Very low** | ✅ done this pass |
| 5.2 | Extract `resolvePolicyAccess()` owner-or-grant helper | High | Low–med | ◑ in progress (9 sites done) |
| 5.3 | `BaseAIService` template; providers → ~150 LOC each | High | Med | planned |
| 5.4 | Decompose orchestrator into collaborators | High | Med–high | planned |
| 5.5 | Split `policy.service.ts` (extract sharing + analysis) | Med | Med | planned |
| 5.6 | i18n key-parity CI check; split client components | Med | Low | planned |
| 5.7 | Repo hygiene: remove root cruft, widen `.gitignore` | Low | Very low | planned |

### 5.1 Shared date formatter — DONE this pass
Added `toISODate(date: Date): string` to `lib/constants/time.ts` (co-located with
`daysFromNow`/`msFromNow`) and replaced **15 of the 17** `.toISOString().split('T')[0]`
call sites — the server-side ones in the AI services, gap-analysis, and the extract route.
Pure extraction: identical output, one definition to change if the format ever moves.

The **2 remaining sites live in `components/wallet/AddPolicyClient.tsx`** and were left
untouched on purpose: that file carries 4 _pre-existing_ `bilingual-ternary`/`literal-fallback`
i18n violations, and `lint:i18n-changed` scans whole changed files (`git diff --name-only HEAD`),
so editing it would drag unrelated i18n debt into this refactor's commit and fail CI. They get
swapped as part of §5.6 (the i18n pass), where fixing those 4 strings is in scope.

### 5.2 Authorization helper (in progress)
`lib/services/authorization.ts` now exports `resolvePolicyAccess(ownerUserId, userId,
{ includeAgentRelationship? }, client?)`, which returns a **decision** (`{ isOwner, hasGrant,
hasAgentRelationship, allowed }`) rather than throwing — so each call site keeps its own
error message and control flow, making the lift behaviour-preserving. The helper preserves
the original query ordering exactly (owner short-circuits with no query; the agent-relationship
lookup runs only when requested AND no active grant exists).

**Done this pass:** the 3 hand-rolled checks in `gap-analysis.service.ts` (`analyzePolicy`,
`resolveGap`, `dismissGap`) now call the helper. Critically, the original sites were *not*
identical — `analyzePolicy` allows an agent **relationship**, the gap mutations do **not** —
so each call passes the matching flag; a naive merge would have broadened gap-mutation access
(a security regression). Locked in with `tests/unit/authorization.test.ts` (6 tests covering
decision + query ordering). Full suite: 116 pass.

**Also converted (this pass):** both `analysis-runs/[runId]` routes (`route.ts` +
`retry-missing/route.ts`) and 4 `wallet/actions.ts` checks. The wallet sites revealed a second
grant-query shape — a `scope: policy:<id>`-narrowed lookup — so the helper grew an optional
`policyScopeId` rather than flattening both shapes into one (which would have changed query
breadth). Each site keeps its exact query and its own `{ error: "Unauthorized" }` / `403`
response. 2 new tests assert the scoped vs unscoped `where` clauses. **9 sites total now route
through the helper; full suite 118 pass.**

> Note: the helper is deliberately a *boolean decision*, so two sites that need the grant
> **record** itself (the share-revoke flows in `policy.service.ts` and `wallet/actions.ts`)
> are intentionally left as-is — forcing them through this helper would be a worse fit.

**Follow-up:** §3.5 (scope-blind grant on the analysis-run routes) is now a one-line change
in the helper's callers — pass `policyScopeId` there too — but that *tightens* access, so it's
a deliberate security fix tracked separately, not part of this behaviour-preserving pass.

### 5.3 `BaseAIService` template method
Lift the shared Zod schemas, prompt-assembly branching, capability map, and usage parsing
into an abstract base; leave only `buildModel()` / provider-specific prompt wording in each
subclass. Target ~150 LOC per provider. Keep the `IAIService` contract and `mock` provider
byte-for-byte compatible; the factory is the seam, so callers don't change. Snapshot a few
real prompts before/after to prove wording is preserved.

### 5.4 Decompose the orchestrator
Extract collaborators behind the existing public methods (`createRun`, `getRunStatus`,
`retryMissing`): `RunLeaseManager`, `TokenBudgeter`, `StepRunner` (retry/remediation),
`AnalysisPersistence`, `TranslationPostProcessor`. The orchestrator becomes a thin
sequencer. Do this *after* §5.3 so the AI seam is already clean. High value for testability;
move method-by-method with the existing tests green at each step.

### 5.5 Split `policy.service.ts`
Carve out `PolicyAccessService` (share/invite/notify/email) and route background analysis
through the orchestrator directly, leaving `PolicyService` as CRUD. Mechanical moves, no
logic change.

### 5.6 i18n + client-component hygiene
Add a `lint:i18n-parity` script that asserts `el.ts` and `en.ts` have identical key sets
(fail CI on drift). Independently, split the 700+ LOC client components per tab with
`dynamic()` and memoize large lists. Both are isolated and low-risk.

### 5.7 Repo hygiene
Delete root dev scripts and stray logs; widen `.gitignore` to cover `build_output*.log`,
`tsc-*.txt`, `*.log`, `.playwright-mcp/`. Confirm nothing imports the deleted scripts first.

---

## 6. How to verify each step

Run locally before every commit (CLAUDE.md guardrail order):
`audit:api-auth` → `lint` → `lint:i18n-changed` → `lint:utf8` → `type-check` →
unit tests → `build`. E2E (Playwright) is not in CI — run it locally for UI-touching steps
(5.6). For each refactor, the bar is **"same inputs → same outputs"**: prove it with the
existing unit tests plus a targeted test at the seam being changed.

---

_This document is the analysis deliverable. Code changes land incrementally on the review
branch; §5 rows flip to ✅ as they ship. See `docs/STATUS.md` for live phase status._
