# AI Provider Degradation Runbook

## Trigger Conditions
1. `AI_ANALYSIS_FAILURE_RATE_HIGH` threshold alert fires.
2. `AI_SCHEMA_FAILURE_SPIKE` or `AI_FAILOVER_USAGE_HIGH` fires.
3. User-facing analysis failures exceed launch SLO.

## Immediate Actions (0-15 min)
1. Confirm alert window and affected tenant segments from logs/Sentry.
2. Execute `POST /api/v1/jobs/synthetic-launch-check` and capture output.
3. Verify AI remediation feature flags:
4. `FF_AI_FAILOVER_OPENAI`
5. `FF_AI_DEGRADED_COMPLETION`
6. `FF_AI_REMEDIATION_ALERTS`
7. If primary provider is degraded, ensure failover flag remains enabled for canary/all cohorts as per incident scope.

## Containment (15-60 min)
1. If errors are schema-related, validate prompt payload shape against current provider SDK contract.
2. If token blocks spike, coordinate with product/monetization and surface blocked-state UX guidance.
3. If provider outage is sustained, shift cohort to failover provider and monitor completion latency and warning rate.

## Recovery Validation
1. Re-run synthetic launch checks.
2. Confirm analysis terminal `failed` rate returns under threshold.
3. Confirm no increase in malformed payload incidents.
4. Document exact timestamp of mitigation and recovery.

## Evidence
1. Alert screenshots/timestamps.
2. Flag state before/after mitigation.
3. Snapshot payloads and error-rate metrics.
4. Incident summary with owner and follow-up actions.
