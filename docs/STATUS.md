# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-06-06

## Current phase
Phase 1 — Core Journey Compliance (~68% per `docs/planning/V2_SPEC_ROADMAP_STATUS.md`, source-of-truth doc last refreshed 2026-02-23), tracking toward **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active branch: `NEW-UI` (UI redesign in flight).

## Done (recent)
- **Document ingestion → extraction → Gap Engine pipeline (Phases 0–7)** — `lib/services/ingestion/` (`0acc7de..aeedfeb`): triage (text-layer vs scanned) → local text / OCR (sharp + tesseract, hybrid coverage-page scoping) → extraction (Greek-locale `€50.000`/dd-mm-yyyy + per-insurer template + cheapest-model **last-resort**) → permanent content-hash cache (**$0 hits**) → **deterministic `detectGaps`** → bilingual explanations (templated, cached by gap-type). Models `DocumentExtraction`/`CoverageTaxonomy`/`InsurerTemplate`/`CoverageEnvelope` + migration **applied** (`20260605120000`); no `any`.
- **Orchestrator slice 1 (composition)** — `runIngestionPipeline` (`002357e`) wires all 8 phases with Sentry on extraction-failure / OCR / low-confidence. **Composed but NOT connected to any route/job** — the active upload→analysis path still runs the LLM gap-detection (see Top risk #2).
- **Test backfill (Gates 1–4)** on `feat/pipeline-tests` (`0e287eb..31da235`, local): ~205 unit tests (202 pass / 3 skip), cost-guardrail **negative assertions** (model/OCR not called on cheap paths), committed anonymized Greek PDF fixtures + generator, `TEST_DATABASE_URL` harness (P5 + RLS skip-guarded), Postman/Newman HTTP boundary + CI job. Coverage high on the deterministic core.
- **Project "brain" externalized** — lean `CLAUDE.md` + `.claude/rules/{conventions,cost-guardrails,testing,workflow}.md` so continuity doesn't depend on account memory (`docs/project-brain`).
- **Fixed Critical IDOR — `sharePolicy`** (`app/(protected)/wallet/actions.ts:376`): an owner gate now runs *before* any agent lookup / invite / AccessGrant / email — a non-owner gets `"You do not have permission to share this policy"`; share-invite tokens use `crypto.randomUUID()`. Tests in `tests/unit/share-policy.test.ts`. **Closes former Top-risk #1 (Critical IDOR).** _Committed (df12c77)._
- **Closed Critical #3 (parts 1+2)** — AI-advice disclaimer now renders on every gap/recommendation/protection-score surface + the savings-report export, via a new canonical `common.aiAdviceDisclaimer` i18n key (EL+EN) and shared `components/ui/AiDisclaimer.tsx`; AI prompts reframed from "personalized advice" to informational framing across all 3 providers + interface. Consent gate **designed, not built** → `docs/audits/ai-advice-compliance.md`. _Committed (1cc5576)._
- **Fixed Critical #1** — `app/onboarding/agent/actions.ts`: all 5 actions now derive identity from the session via a `requireAgent()` guard (agent role required), `userId` param removed, 8 call sites updated; new `tests/unit/onboarding-agent-actions.test.ts` (8 tests) proves unauthenticated/wrong-role callers are rejected with no DB write. _Committed (df12c77)._
- `CLAUDE.md` authored — repo guide + CI guardrail rules.
- Security/compliance audits → `docs/audits/idor-policyholder-data.md`: policyholder-data IDOR, server-action auth-guard, agent↔policyholder connection-join, and AI advice-labeling/compliance review.
- Phase 0 stabilization complete; agent experience (insights / activity / dashboard) complete (`docs/planning/pending.md`).

## In progress
- Ingestion pipeline → **orchestrator cutover**: `runIngestionPipeline` is composed but not wired into the upload→analysis path; the LLM gap-detection at `gap-analysis.service.ts:257` + the orchestrator `gap_detection` step are not yet replaced by `detectGaps`.
- Pipeline + tests + brain docs live on unmerged branches (`feat/pipeline-*`, `feat/pipeline-tests`, `docs/project-brain`); only `feat/pipeline-p7-explanations` is pushed. `master`/`main` are stale.
- `NEW-UI` redesign branch (active, uncommitted UI work).
- Phase 1 login hardening — production passkey/biometric handshake (currently UI-first prefill only).

## Blocked
- ~~Greece GA sign-off gated by the Critical `sharePolicy` IDOR~~ **RESOLVED** — IDOR fixed (df12c77). Remaining pre-GA launch-risk to close: the **AI-processing consent gate** (GDPR Art. 9, Top risks #1).

## Top risks (ranked)
1. **Critical — RLS disabled on ALL 63 Postgres tables (Supabase)**: anyone with the anon key can read/modify every row (critical `get_advisors` advisory, surfaced 2026-06-05). Pre-existing; the new pipeline tables inherit it. Needs **owner-scoped RLS policies** — a blanket `ENABLE ROW LEVEL SECURITY` would block Prisma's own access. Gating before any client-side Supabase access.
2. **High (cost guardrail) — LLM still in gap DETECTION**: the deterministic `detectGaps` is not wired into the active paths. `gap-analysis.service.ts:257` (`aiService.analyzeGaps`, via the `analyzeGaps` server action) and the `gap_detection` step of `policy-analysis-orchestrator.service.ts` still call the model; `runIngestionPipeline` (deterministic) is unwired. Cutover is Next action #1; tracked by `it.fails` markers in `tests/unit/ingestion-cost-guardrails.test.ts` (flip RED when fixed).
3. **High — AI-processing consent missing (GDPR Art. 9)**: disclaimer + prompt-framing resolved (Critical #3 parts 1+2, see Done). **Remaining:** policy documents — incl. special-category health data — are sent to LLMs with no explicit consent. Design ready in `docs/audits/ai-advice-compliance.md` (needs Prisma migration + gate at `orchestrator.createRun()`).
4. **High — auth gaps (Phase 1):** no production passkey/biometric verification; 30-day session persistence not enforced/tested.
5. **Medium — assorted scope gaps:** `analysis-runs/[runId]` grant check accepts *any* active owner→grantee grant, not one scoped to `policy:<id>` (`app/api/v1/policies/[id]/analysis-runs/[runId]/route.ts:36`); `share` GET AccessGrant trust chain; `createUserTask`/`submitQuestionnaireResponse` recipient/instance not ownership-checked. _(`process-policy` is **not** a cross-tenant hole — it has an owner gate at `app/api/v1/jobs/process-policy/route.ts:52` plus rate-limit + idempotency; residual concern is only that a `jobs/` route is user-callable at all.)_
6. ~~Critical — IDOR in `sharePolicy`~~ **RESOLVED** (df12c77) — owner gate + `crypto.randomUUID()` tokens; see Done.
7. ~~Low — pre-existing red CI~~ **RESOLVED**: `audit:api-auth` inventory reconciled (91/91); `@testing-library/user-event` installed (type-check + unit tests green); 4 react-hooks errors fixed; lint `no-empty`/`@ts-nocheck` cleaned. All guardrails now pass (one cosmetic lint warning remains in `DocumentPreview.tsx`).

## Next 3 actions
1. **Wire the existing `runIngestionPipeline` into the upload→analysis path** and **replace the LLM gap-detection at `gap-analysis.service.ts:257` + the orchestrator `gap_detection` step with `detectGaps`** (closes Top risk #2 / the cost-guardrail violation); end-to-end smoke. Then seed reference data (`prisma db seed`) + tune `InsurerTemplate.fieldPatterns` per insurer; remove the legacy 24h JSON cache.
2. **Decide + apply owner-scoped RLS** for the new pipeline tables (and the sensitive existing ones) — Top risk #1.
3. Implement the AI-processing consent gate (`ai_processing` ConsentType + gate in `orchestrator.createRun()`) per `docs/audits/ai-advice-compliance.md` — still required pre-GA.
