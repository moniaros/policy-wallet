# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-05-31

## Current phase
Phase 1 — Core Journey Compliance (~68% per `docs/planning/V2_SPEC_ROADMAP_STATUS.md`, source-of-truth doc last refreshed 2026-02-23), tracking toward **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active branch: `NEW-UI` (UI redesign in flight).

## Done (recent)
- **Closed Critical #3 (parts 1+2)** — AI-advice disclaimer now renders on every gap/recommendation/protection-score surface + the savings-report export, via a new canonical `common.aiAdviceDisclaimer` i18n key (EL+EN) and shared `components/ui/AiDisclaimer.tsx`; AI prompts reframed from "personalized advice" to informational framing across all 3 providers + interface. Consent gate **designed, not built** → `docs/audits/ai-advice-compliance.md`. _Uncommitted._
- **Fixed Critical #1** — `app/onboarding/agent/actions.ts`: all 5 actions now derive identity from the session via a `requireAgent()` guard (agent role required), `userId` param removed, 8 call sites updated; new `tests/unit/onboarding-agent-actions.test.ts` (8 tests) proves unauthenticated/wrong-role callers are rejected with no DB write. _Uncommitted._
- `CLAUDE.md` authored — repo guide + CI guardrail rules.
- Security/compliance audits → `docs/audits/idor-policyholder-data.md`: policyholder-data IDOR, server-action auth-guard, agent↔policyholder connection-join, and AI advice-labeling/compliance review.
- Phase 0 stabilization complete; agent experience (insights / activity / dashboard) complete (`docs/planning/pending.md`).

## In progress
- `NEW-UI` redesign branch (active, uncommitted UI work).
- Phase 1 login hardening — production passkey/biometric handshake (currently UI-first prefill only).

## Blocked
- Greece GA sign-off is gated by the open **Critical IDOR** (Top risks #1) — launch evidence cannot close until it is fixed.

## Top risks (ranked)
1. **Critical — IDOR in `sharePolicy`** (`app/(protected)/wallet/actions.ts:376`): any authenticated user can grant a third party standing access to a policy they don't own, and leak its details by email. **Unfixed.**
2. **High — AI-processing consent missing (GDPR Art. 9)**: disclaimer + prompt-framing now resolved (Critical #3 parts 1+2, see Done). **Remaining:** policy documents — incl. special-category health data — are sent to LLMs with no explicit consent. Design ready in `docs/audits/ai-advice-compliance.md` (needs Prisma migration + gate at `orchestrator.createRun()`).
3. **High — auth gaps (Phase 1):** no production passkey/biometric verification; 30-day session persistence not enforced/tested.
4. **Medium — assorted scope gaps:** `process-policy` global cross-tenant write (`jobs/process-policy/route.ts:27`); `analysis-runs/[runId]` grant check missing `scope` filter; `share` GET AccessGrant trust chain; `createUserTask`/`submitQuestionnaireResponse` recipient/instance not ownership-checked.
5. ~~Low — pre-existing red CI~~ **RESOLVED**: `audit:api-auth` inventory reconciled (91/91); `@testing-library/user-event` installed (type-check + unit tests green); 4 react-hooks errors fixed; lint `no-empty`/`@ts-nocheck` cleaned. All guardrails now pass (one cosmetic lint warning remains in `DocumentPreview.tsx`).

## Next 3 actions
1. Fix `sharePolicy` (`ownerUserId` gate + `crypto.randomUUID()` token) — last of the auth/IDOR Criticals.
2. Implement the AI-processing consent gate (Prisma migration: `ai_processing` ConsentType + `User.aiProcessingConsentVersion`; capture UI; gate in `orchestrator.createRun()`) per `docs/audits/ai-advice-compliance.md`.
3. Gate `process-policy` to cron/admin; add `scope: policy:<id>` to the `analysis-runs/[runId]` grant check.
