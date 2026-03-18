# Auth and Session Incident Runbook

## Trigger Conditions
1. Sign-in failures spike above baseline.
2. Session validation errors affect protected routes.
3. Unauthorized access or role-escalation alerts are detected.

## Immediate Actions (0-15 min)
1. Verify `GET /api/health` and synthetic auth configuration check status.
2. Validate auth provider/env configuration and token signing secret availability.
3. Review recent auth route error logs and top failing paths.
4. Confirm rate-limit behavior is not incorrectly throttling normal sign-in traffic.

## Containment (15-60 min)
1. If a single auth route regresses, roll forward fix or roll back to last known-good release.
2. If token verification is degraded, invalidate compromised sessions and force fresh auth flow.
3. Communicate user impact scope and interim workaround to support.

## Recovery Validation
1. Sign-in synthetic check passes and failure-rate drops to baseline.
2. Protected route authorization success recovers across policyholder/agent/admin paths.
3. No unauthorized access events are detected after mitigation.

## Evidence
1. Error-rate and route-level auth metrics.
2. Mitigation timeline (detect -> contain -> recover).
3. Session invalidation scope and audit entries.
4. Post-incident preventive actions.
