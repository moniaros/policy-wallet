# AI Policy Analysis Assessment and Improvement Plan (2026-03-05)

## Execution Update (2026-03-07, live drill rerun)
1. Drill A and Drill B were re-run and blocked artifacts were replaced with live results:
2. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json`
3. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.alerts.ndjson`
4. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json`
5. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.telemetry.ndjson`
6. Drill execution command:
7. `npx ts-node -T -P prisma/tsconfig.seed.json -r tsconfig-paths/register scripts/run-ai-phase-b-live-drills.ts`
8. Readiness artifact was updated to reflect configured adapters in drill execution context:
9. `docs/operations/evidence/ai-env-readiness-2026-03-06T10-57-43-117Z.json`
10. Important environment note:
11. Drill runner applied fallback adapter values because incident keys were missing in the shell/.env context at execution time.
12. Follow-up for strict production evidence is still required: confirm real staging/production secret manager values and capture export/screenshot proof.

## Execution Update (2026-03-06, Day 1 operational closure)
1. AI incident adapter environment readiness captured:
2. `docs/operations/evidence/ai-env-readiness-2026-03-06T10-57-43-117Z.json`
3. Live drill evidence artifacts initialized for strict runbook execution:
4. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json`
5. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json`
6. Target DB migration status verified via Prisma:
7. `docs/governance/evidence/migration-status-2026-03-06T11-02-38-533Z.md`
8. Day 1 blocker has been superseded by the 2026-03-07 rerun:
9. live drill evidence now exists, but strict production adapter-secret verification is still pending.

## Execution Update (2026-03-05, Phase A)
1. Wallet legacy trigger convergence implemented:
2. `app/(protected)/wallet/actions.ts` now routes deprecated `analyzeGaps(...)` calls through orchestrator-driven `runPolicyAnalysis(...)`.
3. Failure classifier hardened:
4. `lib/services/analysis/failure-classifier.ts` now uses structured error extraction (`status`, `statusCode`, `code`, `name`, `cause`, `response`) before bounded message heuristics.
5. Polling endpoint guard hardening implemented:
6. `GET /api/v1/policies/[id]/analysis-runs/[runId]` migrated to `withApiGuard` + zod params validation + explicit per-user polling rate limit.
7. OpenAI payload-shape regression test added:
8. `tests/unit/openai-ai-message-payload.test.ts`
9. Greek fallback text hardening applied in orchestrator:
10. centralized fallback localized summary constants in `lib/services/analysis/policy-analysis-orchestrator.service.ts`.
11. Validation evidence:
12. `npx vitest run tests/unit/analysis-failure-classifier.test.ts tests/unit/gemini-ai-message-payload.test.ts tests/unit/openai-ai-message-payload.test.ts`
13. `npm run type-check`
14. `npm run audit:api-auth`

## Execution Update (2026-03-05, Phase B)
1. Run execution lease/idempotency implemented in orchestrator:
2. `PolicyAnalysisRun` now uses `executionLeaseId`, `executionLeaseExpiresAt`, and `leaseHeartbeatAt`.
3. `executeRun(...)` acquires lease, heartbeats through attempts, and releases lease in `finally`.
4. Duplicate concurrent execute calls are now safely skipped when an active lease exists.
5. Step telemetry instrumentation added:
6. New `lib/services/analysis/step-telemetry.ts` emits step/run telemetry + metric logs.
7. Orchestrator now emits per-step start/success/failure telemetry with latency/tokens/failure class.
8. Incident dispatch adapters added:
9. `lib/services/analysis/incident-dispatcher.ts` now dispatches threshold alerts to Slack/PagerDuty with window dedupe.
10. New environment keys wired:
11. `AI_INCIDENT_SLACK_WEBHOOK_URL`
12. `AI_INCIDENT_PAGERDUTY_ROUTING_KEY`
13. `AI_INCIDENT_PAGERDUTY_EVENT_URL`
14. Prisma schema + migration added for lease fields:
15. `prisma/migrations/20260305120000_add_analysis_run_execution_lease/migration.sql`
16. Validation evidence:
17. `npx prisma generate`
18. `npx vitest run tests/unit/analysis-failure-classifier.test.ts tests/unit/openai-ai-message-payload.test.ts tests/unit/analysis-remediation-policy.test.ts tests/unit/analysis-incident-dispatcher.test.ts tests/unit/analysis-step-telemetry.test.ts`
19. `npm run type-check`
20. `npm run audit:api-auth`

## Execution Update (2026-03-05, Phase B operational closure pass)
1. Capability guardrails added to AI provider contract and orchestrator pre-dispatch checks:
2. `IAIService` now exposes capability metadata/check methods for model/media compatibility.
3. `lib/services/ai/ai-service.interface.ts`
4. `lib/services/ai/gemini-ai.service.ts`
5. `lib/services/ai/openai-ai.service.ts`
6. `lib/services/ai/mock-ai.service.ts`
7. Orchestrator now validates provider/model/media compatibility before provider invocation and fails fast with classified errors:
8. `lib/services/analysis/policy-analysis-orchestrator.service.ts`
9. Failure classification expanded for capability mismatch codes:
10. `lib/services/analysis/failure-classifier.ts`
11. New unit coverage:
12. `tests/unit/ai-service-capabilities.test.ts`
13. `tests/unit/analysis-failure-classifier.test.ts` (capability mismatch branches)
14. Migration deployed in target DB configured by local `.env`:
15. `npx prisma migrate deploy` applied `20260305120000_add_analysis_run_execution_lease`.
16. Validation rerun:
17. `npx vitest run tests/unit/analysis-failure-classifier.test.ts tests/unit/ai-service-capabilities.test.ts tests/unit/openai-ai-message-payload.test.ts tests/unit/analysis-incident-dispatcher.test.ts tests/unit/analysis-step-telemetry.test.ts`
18. `npm run type-check`
19. `npm run audit:api-auth`
20. Remaining Phase B evidence blocker:
21. Live incident adapter drill and telemetry dashboard evidence still pending because `AI_INCIDENT_SLACK_WEBHOOK_URL` and `AI_INCIDENT_PAGERDUTY_ROUTING_KEY` are not set in current environment snapshot.

## Scope
1. Assess current orchestrated AI analysis runtime for extraction, clarity, gap detection, failover, degraded completion, and UX signaling.
2. Define prioritized improvements for launch hardening and post-launch reliability.

## Evidence Reviewed
1. `lib/services/analysis/policy-analysis-orchestrator.service.ts`
2. `lib/services/analysis/failure-classifier.ts`
3. `lib/services/analysis/remediation-policy.ts`
4. `lib/services/analysis/incident-dispatcher.ts`
5. `lib/services/ai/gemini-ai.service.ts`
6. `lib/services/ai/openai-ai.service.ts`
7. `app/api/v1/policies/[id]/review/route.ts`
8. `app/api/v1/policies/[id]/analysis-runs/[runId]/route.ts`
9. `app/(protected)/wallet/actions.ts`
10. `tests/unit/gemini-ai-message-payload.test.ts`

## Current Strengths
1. End-to-end orchestrator exists with persisted step records, run status, retries, model fallback, provider failover, and degraded completion.
2. Token preflight gates exist at run and step boundaries with explicit `blocked` run state.
3. Remediation metadata is persisted (`providerAttempts`, `degradedSteps`, `missingArtifacts`, final user message key).
4. Polling endpoint exposes remediation details required by UI.
5. Gemini message payload regression test exists for file-part shape.

## Risk Status (2026-03-05)
1. Resolved in code:
2. Trigger path convergence to orchestrator.
3. Structured failure classifier hardening.
4. OpenAI payload-shape regression coverage.
5. Polling route `withApiGuard` + rate limit hardening.
6. Run lease/idempotency + heartbeat.
7. Incident dispatch adapters (Slack/PagerDuty) with cooldown dedupe.
8. Step/run telemetry instrumentation.
9. Provider/model/media capability pre-dispatch guardrails.
10. Remaining go/no-go risk is operational evidence closure:
11. Production incident adapter env key configuration.
12. Live drill A/B evidence and operator sign-off.

## Key Risks and Gaps

### P0: Pre-Go/No-Go Must-Fix
1. Dual pipeline behavior still exists:
2. Orchestrator is canonical for review runs, but legacy `GapAnalysisService` path is still callable from wallet actions (`analyzeGaps`), creating inconsistent reliability/remediation behavior.
3. Risk: users can hit divergent behavior and error mapping paths depending on trigger entrypoint.
4. Classifier is string-heuristic heavy and over-broad for document/auth terms.
5. Risk: misclassification can choose wrong remediation path (no retry, wrong failover, wrong user message).
6. OpenAI failover payload contract is not covered by dedicated message-shape tests.
7. Risk: failover can regress silently while Gemini tests still pass.
8. Run-status polling endpoint is not on `withApiGuard` and has no explicit route-level rate limit.
9. Risk: aggressive client polling can increase load and cost during incident windows.
10. Greek fallback strings in degraded/fallback paths contain mojibake artifacts in orchestrator helper text.
11. Risk: degraded experience quality regression in primary launch language.

### P1: Should-Fix Before GA If Time Allows
1. Incident threshold dispatcher currently logs threshold events but does not dispatch to external incident channels.
2. Risk: delayed operator awareness outside log/Sentry workflows.
3. No explicit distributed lock/lease for `executeRun`.
4. Risk: duplicate concurrent execution of same run under race conditions.
5. Provider/model capability guardrails are limited (for file/document modality support by selected models).
6. Risk: failover succeeds at routing level but fails at provider capability level.

### P2: Post-GA Optimization
1. Prompt/version governance and deterministic prompt snapshots are not centrally versioned.
2. Per-step latency/cost budget alerts are limited; focus is currently terminal state thresholds.
3. Regression harness does not yet include synthetic cross-provider replay packs for real policy fixtures.

## Phased Improvement Plan

## Phase A (Immediate, 2-3 days, pre-go/no-go)
1. Converge trigger paths:
2. Route wallet analysis triggers to orchestrator only; mark legacy `GapAnalysisService.analyzePolicy` path as deprecated/internal-only.
3. Harden classifier:
4. Replace broad substring checks with structured provider error mapping first, then bounded fallback heuristics.
5. Add OpenAI payload-shape tests:
6. Mirror Gemini payload-shape tests for `extractPolicyData`, `analyzeGaps`, `analyzePolicyClarity`, and `askQuestion`.
7. Protect status polling route:
8. Move `GET /api/v1/policies/[id]/analysis-runs/[runId]` to `withApiGuard` + explicit per-user rate policy.
9. Fix Greek fallback text:
10. Replace mojibake fallback strings in orchestration fallback helpers with dictionary-backed translated keys.

Exit criteria:
1. No production path can trigger legacy non-orchestrated gap analysis.
2. Failover payload tests pass for both providers.
3. Polling endpoint is guarded and rate-limited.
4. Greek fallback text renders correctly in degraded scenarios.

## Phase B (1 week, reliability and operations)
1. Add run execution lease/idempotency key for `executeRun`.
2. Add capability checks per provider/model for document inputs before attempt dispatch.
3. Add external incident dispatch adapters (Slack/PagerDuty webhook) in `incident-dispatcher` with per-window dedupe.
4. Add step-level telemetry counters/histograms for:
5. step success/failure by class
6. failover rate
7. degraded completion rate
8. mean/95th latency by step and provider

Exit criteria:
1. Duplicate execution races are prevented or safely rejected.
2. Alert dispatch is observable outside logs.
3. Dashboards can isolate provider vs schema vs token failure trends.

## Phase C (Post-GA, 2-3 weeks)
1. Prompt/version registry with checksum and release labels.
2. Replay harness with redacted fixture corpus across providers.
3. Step-level cost and latency budgets with automated regression thresholds in CI.

Exit criteria:
1. Prompt drift is auditable.
2. Provider swaps can be validated on fixed fixtures before production rollout.
3. CI fails on material latency/cost regressions.

## Test Additions
1. Unit: classifier branch coverage for ambiguous error strings and provider-specific structured errors.
2. Unit: OpenAI payload message shape parity with Gemini tests.
3. Integration: orchestrator entrypoint parity test ensuring all wallet/runtime analysis actions resolve to orchestrator.
4. API: poll endpoint auth/rate-limit behavior and remediation fields contract.
5. E2E smoke: degraded completion and retry-missing UX in Greek and English.

## Rollout and Controls
1. Keep failover/degraded behavior feature-flagged (`FF_AI_FAILOVER_OPENAI`, `FF_AI_DEGRADED_COMPLETION`, `FF_AI_REMEDIATION_ALERTS`).
2. Canary sequence:
3. internal -> 10% -> 50% -> 100%.
4. Rollback:
5. disable failover and/or degraded completion flags independently.
6. retain orchestrator baseline with same-provider retries.

## Success Metrics
1. Reduce terminal `failed` runs from transient/schema classes by at least 60% versus pre-remediation baseline.
2. Keep malformed provider payload incidents at `0`.
3. Ensure 100% of `failed`/`blocked`/`completed_with_warnings` runs include mapped user message key + remediation trail.
4. Keep p95 run latency increase within 15% during failover canary.
