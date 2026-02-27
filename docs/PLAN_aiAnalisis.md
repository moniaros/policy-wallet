# AI Policy Analysis Architecture Plan (Token Compliance + Gemini Clarity Pipeline)

## Summary
- Current implementation is **partially aligned**: token usage is tracked, Gemini extraction/gap analysis exists, and policy background analysis runs.
- Gaps against your 3 tasks are clear: no strict preflight token gating, no checklist-driven plain-language/savings output model, and no persisted step-level execution with success percentages + retries.
- Locked decisions from your input:
  - **Storage model:** Hybrid (dedicated run/step tables + compact `Policy.acordData` summary)
  - **Retry policy:** Bounded + fallback
  - **Token enforcement:** Hard block preflight

## Assessment (Current State vs Required)
1. Token tracking exists (`TokenUsage`, `MonthlyTokenUsage`, `TokenBalance`, `TokenPurchase`) but token **authorization is not enforced** before all expensive AI operations.
2. Policy review API route is still a mock trigger; no production-grade orchestration run lifecycle.
3. Gemini pipeline currently focuses on extraction + gap detection; it does not produce a structured “Insurance Clarity Checklist” result (plain language, savings, checklist pillar scoring).
4. Retries exist at model-call level, but not as a persisted step orchestration with attempt logs and step success percentages.
5. No dedicated DB model exists for analysis run + step telemetry.

## Implementation Plan

### Phase 1: Data Contract + Schema Foundation
1. Add Prisma enums:
- `AnalysisRunStatus`: `queued | running | completed | failed | blocked`
- `AnalysisStepStatus`: `pending | running | completed | failed | retrying | skipped`
2. Add Prisma models:
- `PolicyAnalysisRun`
- `PolicyAnalysisStep`
3. `PolicyAnalysisRun` fields:
- `id`, `policyId`, `userId`, `provider`, `model`, `status`
- `runAttempt`, `overallSuccessPct`
- `estimatedTokens`, `actualInputTokens`, `actualOutputTokens`, `actualTotalTokens`
- `blockedReason`, `failureCode`, `failureMessage`
- `resultJson` (full checklist output), `startedAt`, `finishedAt`, `createdAt`, `updatedAt`
4. `PolicyAnalysisStep` fields:
- `id`, `runId`, `stepKey`, `stepOrder`, `status`
- `attempt`, `successPct`
- `inputTokens`, `outputTokens`, `totalTokens`
- `logMessage`, `logJson`, `errorCode`, `errorMessage`
- `startedAt`, `finishedAt`, `createdAt`
5. Add indexes:
- `PolicyAnalysisRun(policyId, createdAt desc)`
- `PolicyAnalysisRun(userId, createdAt desc)`
- `PolicyAnalysisStep(runId, stepOrder, attempt)`

### Phase 2: Token Compliance Mechanisms (Task 1)
1. Create `lib/services/analysis/token-budget-estimator.ts` with per-step token estimates + 20% safety buffer.
2. Add strict preflight gate:
- Run-level check: `canUserUseTokens(userId, estimatedRunTokens)` before starting.
- Step-level check: `canUserUseTokens(userId, estimatedStepTokens)` before each step.
3. Behavior on insufficient tokens:
- Mark run `blocked`, persist reason (`monthly_limit_reached` or `insufficient_tokens`), do not call Gemini.
- Return structured error to API/action layer for UX messaging.
4. Enforce tracking coverage:
- Every successful Gemini step must write token usage via `trackTokenUsage`.
- Persist step token counts into `PolicyAnalysisStep`.
5. Tier normalization guard:
- Standardize tier names to `free | plus | pro` in all token gating/reporting pathways.

### Phase 3: Gemini Clarity Pipeline (Task 2)
1. Add checklist artifact:
- `lib/services/analysis/insurance-clarity-checklist.ts` derived from `Insurance Clarity Checklist.pdf` into explicit evaluation pillars and required outputs.
2. Extend AI interface:
- Add `analyzePolicyClarity(...)` to `IAIService`.
- Implement in `GeminiAIService` and `MockAIService`.
3. Define strict structured response schema (Zod):
- `plainLanguageSummary` (EN/EL)
- `coverageSnapshot` (`covered`, `notCovered`, `limits`, `deductibles`, `exclusions`)
- `savingsOpportunities` (action, rationale, estimated annual savings, confidence)
- `coverageGaps` (gap type, severity, evidence, recommendation)
- `checklistScores` (pillar, checksPassed, checksTotal, successPct, notes)
- `priorityActions` (next best actions by urgency)
4. Persist outputs:
- Full object into `PolicyAnalysisRun.resultJson`
- Compact UI summary into `Policy.acordData.analysis.clarity`
- Continue updating `GapInstance` entries for detected gaps
- Update `Policy.coverageSummary` + `lastAnalyzedAt`

### Phase 4: Step-Orchestrated Execution + Retries (Task 3)
1. Create orchestrator:
- `lib/services/analysis/policy-analysis-orchestrator.service.ts`
2. Pipeline steps (main pillars):
- Step 1 `document_load_and_validation`
- Step 2 `metadata_extraction_and_verification`
- Step 3 `plain_language_translation`
- Step 4 `coverage_mapping`
- Step 5 `gap_detection`
- Step 6 `savings_detection`
- Step 7 `checklist_scoring_and_actions`
- Step 8 `persistence_and_finalize`
3. Per-step success percentage:
- `successPct = round((checksPassed / checksTotal) * 100)`
- Persist in `PolicyAnalysisStep.successPct`
4. Retry behavior:
- Per step: max 3 attempts with exponential backoff (2s, 5s, 10s)
- On transient failure after max attempts: one fallback-model attempt
- If still failing: mark step `failed`, run `failed`
5. Run-level eventual retry:
- Auto-create new run attempt for retryable failures up to `MAX_RUN_ATTEMPTS = 5`
- Exponential delay between run attempts
- Stop at hard failures (auth, missing doc, insufficient tokens)
6. Logging:
- Each attempt writes `PolicyAnalysisStep` row with status/log/error
- Also emit structured app logs with `runId`, `stepKey`, `attempt`, `successPct`

### Phase 5: API and Action Integration
1. Replace mock behavior in `/api/v1/policies/[id]/review`:
- Create run via orchestrator and return `{ run_id, status, estimated_completion }`
2. Update wallet action `runPolicyAnalysis(...)`:
- Trigger orchestrator instead of directly calling monolithic analysis
3. Add run status endpoint:
- `GET /api/v1/policies/[id]/analysis-runs/[runId]` for progress polling
4. Keep existing route contracts stable where possible; only add run metadata fields.

### Phase 6: Migration + Backward Compatibility
1. Prisma migration for new models/enums/indexes.
2. Backward compatibility:
- Existing UI keeps reading `Policy.coverageSummary`, `GapInstance`, `acordData`.
- New clarity summary exposed under `acordData.analysis.clarity` so no hard UI break.
3. Optional backfill job:
- Re-run analysis for recent policies missing clarity outputs.

## Important Changes to Public APIs/Interfaces/Types
1. `IAIService` adds:
- `analyzePolicyClarity(document, metadata, checklist, options)`
2. New API endpoint:
- `GET /api/v1/policies/[id]/analysis-runs/[runId]`
3. Updated API response:
- `/api/v1/policies/[id]/review` returns persistent `run_id` tied to DB run tracking.
4. Prisma additions:
- `PolicyAnalysisRun`, `PolicyAnalysisStep`, plus status enums.

## Test Cases and Scenarios
1. Token compliance:
- Free user over monthly allowance is blocked before Gemini call.
- Paid user with subscription exhausted but purchased tokens available proceeds.
- Paid user with no remaining purchased tokens is blocked with correct reason.
2. Checklist analysis quality:
- Given uploaded policy, run returns plain-language summary, savings opportunities, and coverage gaps with non-empty checklist scores.
3. Persistence:
- Successful run writes `PolicyAnalysisRun`, all `PolicyAnalysisStep` rows, updates `Policy.acordData.analysis.clarity`, `lastAnalyzedAt`, and gaps.
4. Retry mechanics:
- Simulated transient Gemini failure succeeds on retry and logs attempts.
- Persistent failure reaches max attempts and marks run failed with reason.
5. Step success percentages:
- Each step stores `checksPassed/checksTotal`-derived percentage.
- Overall run stores weighted aggregate percentage.
6. API behavior:
- `/review` returns valid `run_id`.
- Run-status endpoint returns real-time step statuses and percentages.
7. Regression:
- Existing wallet detail and coverage insights still render using current fields after migration.

## Assumptions and Defaults
1. Existing policy upload and document storage flow remains unchanged.
2. Gemini remains the primary provider; fallback model is configured in env.
3. “Retry until success” is implemented as bounded step retries plus bounded run re-attempts (`MAX_RUN_ATTEMPTS = 5`) to prevent infinite cost loops.
4. No changes to business ownership/auth rules for policies.
5. Savings opportunities are advisory insights saved as analysis output; no automatic premium-changing actions are executed.
