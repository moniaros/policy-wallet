# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-06-01

## Current phase
Phase 1 — Core Journey Compliance (~68% per `docs/planning/V2_SPEC_ROADMAP_STATUS.md`, source-of-truth doc last refreshed 2026-02-23), tracking toward **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active branch: `NEW-UI` (UI redesign in flight).

## Done (recent)
- **Architecture review + behaviour-preserving refactor sweep** (`docs/audits/architecture-review.md`, branch `claude/codebase-architecture-review-jx2um9`). Reverse-engineered the whole system; cataloged problems split **broken/insecure** vs **quality/maintainability**; ranked a refactor plan and shipped the safe wins (full type-check + 120 unit tests green throughout — sandbox Prisma-engine block worked around by curl-fetching engines):
  - **§5.1** `toISODate()` helper → 15 duplicate date-format sites (`10db0fa`).
  - **§5.2** `lib/services/authorization.ts` `resolvePolicyAccess()` → **9** owner-or-grant checks centralized (gap-svc, both analysis-run routes, wallet actions), exact per-site query breadth preserved via optional `policyScopeId`; new `authorization.test.ts` (`41a6b42`, `e33bc54`).
  - **§5.3** Investigated the "55% duplicate AI providers" lead and **rejected** a base class — schemas/prompts are intentionally provider-tuned and feed model output. Extracted only the byte-identical `buildMessageParts()` (`56f4047`).
  - **§5.5** The planned `policy.service` split turned out to be **dead-code removal**: `share`/`getShares`/`revokeShare` were unreferenced (live path is inline in the actions); removed → 1012→685 lines. Did NOT wire actions to the old copy (IDOR-regression risk) (`6a56346`).
  - **§5.6/§5.7** Full el/en `i18n-key-parity.test.ts`; widened `.gitignore` (`b6219a9`).
  - **Deferred/flagged:** `safeFireAndForget` (borderline behaviour change → documented §4.4); dead root dev scripts flagged for maintainer-confirmed `git rm`; **§5.4 orchestrator decomposition NOT attempted** — high regression risk on load-bearing code under a "no functionality change" mandate (awaiting an explicit go/no-go).
- **Fixed Critical IDOR — `sharePolicy`** (`app/(protected)/wallet/actions.ts:376`): an owner gate now runs *before* any agent lookup / invite / AccessGrant / email — a non-owner gets `"You do not have permission to share this policy"`; share-invite tokens use `crypto.randomUUID()`. Tests in `tests/unit/share-policy.test.ts`. **Closes former Top-risk #1 (Critical IDOR).** _Committed (df12c77)._
- **Closed Critical #3 (parts 1+2)** — AI-advice disclaimer now renders on every gap/recommendation/protection-score surface + the savings-report export, via a new canonical `common.aiAdviceDisclaimer` i18n key (EL+EN) and shared `components/ui/AiDisclaimer.tsx`; AI prompts reframed from "personalized advice" to informational framing across all 3 providers + interface. Consent gate **designed, not built** → `docs/audits/ai-advice-compliance.md`. _Committed (1cc5576)._
- **Fixed Critical #1** — `app/onboarding/agent/actions.ts`: all 5 actions now derive identity from the session via a `requireAgent()` guard (agent role required), `userId` param removed, 8 call sites updated; new `tests/unit/onboarding-agent-actions.test.ts` (8 tests) proves unauthenticated/wrong-role callers are rejected with no DB write. _Committed (df12c77)._
- `CLAUDE.md` authored — repo guide + CI guardrail rules.
- Security/compliance audits → `docs/audits/idor-policyholder-data.md`: policyholder-data IDOR, server-action auth-guard, agent↔policyholder connection-join, and AI advice-labeling/compliance review.
- Phase 0 stabilization complete; agent experience (insights / activity / dashboard) complete (`docs/planning/pending.md`).

## In progress
- `NEW-UI` redesign branch (active, uncommitted UI work).
- Phase 1 login hardening — production passkey/biometric handshake (currently UI-first prefill only).

## Blocked
- ~~Greece GA sign-off gated by the Critical `sharePolicy` IDOR~~ **RESOLVED** — IDOR fixed (df12c77). Remaining pre-GA launch-risk to close: the **AI-processing consent gate** (GDPR Art. 9, Top risks #1).

## Top risks (ranked)
1. **High — AI-processing consent missing (GDPR Art. 9)**: disclaimer + prompt-framing resolved (Critical #3 parts 1+2, see Done). **Remaining:** policy documents — incl. special-category health data — are sent to LLMs with no explicit consent. Design ready in `docs/audits/ai-advice-compliance.md` (needs Prisma migration + gate at `orchestrator.createRun()`).
2. **High — auth gaps (Phase 1):** no production passkey/biometric verification; 30-day session persistence not enforced/tested.
3. **Medium — assorted scope gaps:** `analysis-runs/[runId]` grant check accepts *any* active owner→grantee grant, not one scoped to `policy:<id>` (`app/api/v1/policies/[id]/analysis-runs/[runId]/route.ts:36`); `share` GET AccessGrant trust chain; `createUserTask`/`submitQuestionnaireResponse` recipient/instance not ownership-checked. _(`process-policy` is **not** a cross-tenant hole — it has an owner gate at `app/api/v1/jobs/process-policy/route.ts:52` plus rate-limit + idempotency; residual concern is only that a `jobs/` route is user-callable at all.)_
4. ~~Critical — IDOR in `sharePolicy`~~ **RESOLVED** (df12c77) — owner gate + `crypto.randomUUID()` tokens; see Done.
5. ~~Low — pre-existing red CI~~ **RESOLVED**: `audit:api-auth` inventory reconciled (91/91); `@testing-library/user-event` installed (type-check + unit tests green); 4 react-hooks errors fixed; lint `no-empty`/`@ts-nocheck` cleaned. All guardrails now pass (one cosmetic lint warning remains in `DocumentPreview.tsx`).

## Next 3 actions
1. Implement the AI-processing consent gate (Prisma migration: `ai_processing` ConsentType + `User.aiProcessingConsentVersion`; capture UI; gate in `orchestrator.createRun()`) per `docs/audits/ai-advice-compliance.md`.
2. Add `scope: policy:<id>` to the `analysis-runs/[runId]` grant check; decide whether the user-callable `process-policy` `jobs/` route should be cron/admin-only.
3. Triage the motor broker-demo gaps before the demo — silent mock-mode fallback, no gap→Opportunity automation, and the agent-dashboard `createdByUserId` blind spot (`docs/demo/motor-demo-path.md`).
