# AI Phase B Live Drill Runbook (GR-GA-2026.03)

## Purpose
1. Produce production-grade evidence for AI remediation readiness before go/no-go.
2. Validate incident dispatch adapters and step telemetry for two critical scenarios.

## Preconditions
1. Release baseline commit deployed: `14f75fd802f63a0ec2e783dcca08ae8aa54521a4`.
2. DB migration applied: `20260305120000_add_analysis_run_execution_lease`.
3. Env keys set in target environment:
4. `AI_INCIDENT_SLACK_WEBHOOK_URL`
5. `AI_INCIDENT_PAGERDUTY_ROUTING_KEY`
6. `AI_INCIDENT_PAGERDUTY_EVENT_URL`
7. Feature flags active for remediation canary cohort:
8. `FF_AI_FAILOVER_OPENAI=true`
9. `FF_AI_REMEDIATION_ALERTS=true`
10. `FF_AI_DEGRADED_COMPLETION=true`

## Drill A: Transient/Schema Recovery + Incident Dispatch
1. Trigger analysis run with synthetic transient/schema fault injection in canary scope.
2. Verify run progression includes retry/model-fallback/provider-failover attempts.
3. Verify threshold crossing dispatch appears in Slack and PagerDuty.
4. Capture artifacts:
5. `docs/operations/evidence/ai-drill-a-<timestamp>.json`
6. `docs/operations/evidence/ai-drill-a-<timestamp>.alerts.ndjson`
7. Acceptance criteria:
8. Incident dispatched once per cooldown window.
9. Run terminal state is `completed` or `completed_with_warnings`.

## Drill B: Degradable Failure -> completed_with_warnings
1. Trigger analysis run where one degradable step fails irrecoverably.
2. Verify terminal state `completed_with_warnings`.
3. Verify remediation metadata includes degraded step and missing artifacts.
4. Capture telemetry snapshots for:
5. step failure class distribution
6. failover usage
7. degraded completion rate
8. Capture artifacts:
9. `docs/operations/evidence/ai-drill-b-<timestamp>.json`
10. `docs/operations/evidence/ai-drill-b-<timestamp>.telemetry.ndjson`

## Sign-Off
| Role | Name | Decision (`Approved`/`Rejected`) | Date (YYYY-MM-DD) | Notes |
|---|---|---|---|---|
| Engineering Lead |  |  |  |  |
| SRE Lead |  |  |  |  |
| Product Owner |  |  |  |  |
