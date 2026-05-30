# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-05-31

## Current phase
Phase 1 — Core Journey Compliance (~68% per `docs/planning/V2_SPEC_ROADMAP_STATUS.md`, source-of-truth doc last refreshed 2026-02-23), tracking toward **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active branch: `NEW-UI` (UI redesign in flight).

## Done (recent)
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
2. **Critical — AI advice unlabeled (regulatory)**: gap/recommendation output renders with no "informational / not insurance advice" disclaimer (the correct text exists only on the Terms page); prompts frame output as personalized advice; health data sent to LLMs without explicit consent. Launch-blocking for the Greek market.
3. **High — auth gaps (Phase 1):** no production passkey/biometric verification; 30-day session persistence not enforced/tested.
4. **Medium — assorted scope gaps:** `process-policy` global cross-tenant write (`jobs/process-policy/route.ts:27`); `analysis-runs/[runId]` grant check missing `scope` filter; `share` GET AccessGrant trust chain; `createUserTask`/`submitQuestionnaireResponse` recipient/instance not ownership-checked.
5. ~~Low — pre-existing red CI~~ **RESOLVED**: `audit:api-auth` inventory reconciled (91/91); `@testing-library/user-event` installed (type-check + unit tests green); 4 react-hooks errors fixed; lint `no-empty`/`@ts-nocheck` cleaned. All guardrails now pass (one cosmetic lint warning remains in `DocumentPreview.tsx`).

## Next 3 actions
1. Fix `sharePolicy` (`ownerUserId` gate + `crypto.randomUUID()` token) — last of the auth/IDOR Criticals.
2. Surface the existing `ai_disclaimer` (EL+EN) at every gap/recommendation/score render surface; soften AI prompt "personalized advice" framing; add AI-processing consent.
3. Gate `process-policy` to cron/admin; add `scope: policy:<id>` to the `analysis-runs/[runId]` grant check.
