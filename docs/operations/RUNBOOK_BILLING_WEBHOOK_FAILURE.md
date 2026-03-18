# Billing Webhook Failure Runbook

## Trigger Conditions
1. Billing reconciliation indicates failed/stale webhook events.
2. Stripe/RevenueCat webhook error-rate alert fires.
3. Subscription or invoice state diverges from expected lifecycle.

## Immediate Actions (0-15 min)
1. Confirm webhook endpoint health and signature/auth validation status.
2. Execute `POST /api/v1/jobs/billing-reconciliation` and capture snapshot.
3. Check recent `processedWebhookEvent` failures by provider and route.
4. Verify idempotency store entries are being written.

## Containment (15-60 min)
1. Replay failed webhook events from provider dashboard using safe idempotent path.
2. If route-level failure is isolated, temporarily route traffic to canonical `/api/v1/billing/*` handlers only.
3. If duplication risk exists, pause non-critical reconciliation jobs until event processing stabilizes.

## Recovery Validation
1. Reconciliation snapshot reports no stale failed webhook backlog.
2. Replay does not create duplicate side effects.
3. Subscription, invoice, and webhook states match on sample audit set.

## Evidence
1. Reconciliation snapshot before/after.
2. Provider replay logs and event IDs.
3. Idempotency verification output.
4. Rollback/forward decision record.
