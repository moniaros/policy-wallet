# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-06-27

## Current phase
**Greece GA convergence — feature freeze.** Release branch: `claude/policywallet-greece-ga-edp5oe` (== `origin/NEW-UI` + launch fixes; contains RC baseline `14f75fd`). Strategy: restore green, close documented sign-offs, ship; NEW-UI redesign + `feat/pipeline-*` parked as v1.1. Target: GA by end of August (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`).

## Done (recent)
- **Week-1 baseline verified (committed `stale` error logs were stale).** Real state: `type-check` 0 errors, unit tests 115/115, `build` green (with env), `audit:api-auth`/`i18n`/`utf8` green. Confirmed already-resolved: gemini-ai.service.ts (0 tsc errors) and the `/pricing` duplicate (`/pricing` public vs `/agent/pricing` protected — no collision).
- **Fixed two real CI reds (minimal).** (1) `.github/workflows/ci.yml` build job was missing `AUTH_SECRET` (required by `lib/env.ts`) → build failed page-data collection; added dummy. (2) `eslint.config.mjs` didn't cover `**/*.mjs`, so `scripts/seed-agent-demo.mjs` threw 30 `no-undef` errors; added the glob + commented the empty catch. _Committed (dcd8f15)._
- **AI-processing consent gate — enforcement backbone (GDPR Art. 9).** `ai_processing` ConsentType + `User.aiProcessingConsentVersion` (migration `20260627120000`); `lib/compliance/ai-processing-consent.ts` (gate read + capture write); gate in `orchestrator.createRun()` throws `AI_PROCESSING_CONSENT_REQUIRED` before any document reaches a provider (covers manual/review/retry/rerun); consents API accepts `ai_processing`; 403 surfaced at both callers; 5 unit tests. **Capture UI still pending** (see Blocked). _Committed (097db27)._
- **Closed security residuals (former Top-risk #3).** analysis-runs grant check scoped to `policy:<id>`; `jobs/process-policy` now cron/admin-only (matched siblings; notifies owner not caller; no callers existed); `share` GET trust-chain check (owner==granter); `createUserTask` + `submitQuestionnaireResponse` ownership-checked. _Committed (6aec2de)._

### Earlier
- **Fixed Critical IDOR — `sharePolicy`** (`app/(protected)/wallet/actions.ts:376`): an owner gate now runs *before* any agent lookup / invite / AccessGrant / email — a non-owner gets `"You do not have permission to share this policy"`; share-invite tokens use `crypto.randomUUID()`. Tests in `tests/unit/share-policy.test.ts`. **Closes former Top-risk #1 (Critical IDOR).** _Committed (df12c77)._
- **Closed Critical #3 (parts 1+2)** — AI-advice disclaimer now renders on every gap/recommendation/protection-score surface + the savings-report export, via a new canonical `common.aiAdviceDisclaimer` i18n key (EL+EN) and shared `components/ui/AiDisclaimer.tsx`; AI prompts reframed from "personalized advice" to informational framing across all 3 providers + interface. Consent gate **designed, not built** → `docs/audits/ai-advice-compliance.md`. _Committed (1cc5576)._
- **Fixed Critical #1** — `app/onboarding/agent/actions.ts`: all 5 actions now derive identity from the session via a `requireAgent()` guard (agent role required), `userId` param removed, 8 call sites updated; new `tests/unit/onboarding-agent-actions.test.ts` (8 tests) proves unauthenticated/wrong-role callers are rejected with no DB write. _Committed (df12c77)._
- `CLAUDE.md` authored — repo guide + CI guardrail rules.
- Security/compliance audits → `docs/audits/idor-policyholder-data.md`: policyholder-data IDOR, server-action auth-guard, agent↔policyholder connection-join, and AI advice-labeling/compliance review.
- Phase 0 stabilization complete; agent experience (insights / activity / dashboard) complete (`docs/planning/pending.md`).

## In progress
- Nothing actively in code — remaining GA work is the migration deploy + human sign-offs (see Blocked). Hard feature freeze holds.

## Decisions settled (this session)
- **Release base = current branch (NEW-UI), NOT the RC baseline.** Re-basing on `14f75fd` was investigated and rejected: that commit (Feb 27) predates — and lacks — the DSR workflow, billing reconciliation, AI lease migration, and the compliance/billing-hardening migration (ConsentType enum), all of which the go/no-go packet marks Completed/APPLIED. Those landed interleaved with the redesign across 29 commits + 23 migrations and can't be cleanly peeled apart. ⚠️ **The NEW-UI redesign therefore ships in GA — it cannot be parked to v1.1.** Confirm with strategy owner.
- **Consent-capture UX = inline at Analyze** (built, see Done).
- **`process-policy` = cron/admin** (done, 6aec2de). **Passkey/biometric = deferred to v1.1** (Magic Link/Google login is functional; documented limitation).

## Blocked
- **Consent migration must deploy via Prisma, not the Supabase MCP.** DB state verified: `ConsentType` enum exists (`cookie,terms,privacy`); the new column does not — so `20260627120000` applies cleanly. There is **no staging project** (single prod DB `lzqvtvjggylcujenlelh`). Applying via `apply_migration` would desync Prisma's `_prisma_migrations` and break the next `prisma migrate deploy` (duplicate-column). → Apply via `prisma migrate deploy` + `verify:migrations` in the release pipeline.
- **Launch sign-offs** (legal/DPO, SRE restore-drill decision, UAT matrix, governance) still `Pending`/`Hold` per the go/no-go packet; incident adapter prod secrets (`AI_INCIDENT_*`) still `MISSING`.

## Top risks (ranked)
1. **High — launch evidence/sign-offs open:** legal/DPO signatures, SRE full-restore decision, UAT sign-off matrix, governance evidence, and `AI_INCIDENT_*` prod secrets all still pending in the go/no-go packet. This is now the critical path to GA.
2. **High — GA ships the unfinished NEW-UI redesign** (can't be parked, see Decisions). Needs UAT against the *actual* shipping UI, and a strategy-owner ack.
3. **Medium — auth gaps:** no production passkey/biometric verification; 30-day session persistence not enforced/tested. Deferred to v1.1.
4. ~~AI-processing consent (gate + capture)~~ **RESOLVED** (097db27 gate, ee7d041 capture UI).
5. ~~Security scope gaps~~ **RESOLVED** (6aec2de); ~~IDOR in `sharePolicy`~~ **RESOLVED** (df12c77).

## Next 3 actions
1. Apply `20260627120000_ai_processing_consent` via `prisma migrate deploy` + `verify:migrations` in the release pipeline; wire `AI_INCIDENT_*` secrets.
2. Get strategy-owner ack that GA ships with the NEW-UI redesign; run UAT (`el`/`en`) against the shipping UI.
3. Drive the go/no-go packet sign-offs (legal/DPO, SRE, UAT, governance) toward `Go`.
