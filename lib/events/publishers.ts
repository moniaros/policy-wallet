/**
 * Publishing helpers, one per business fact.
 *
 * Thin wrappers over `publish()` that fix the aggregate, the subject and the
 * payload shape for each fact, so a call site says WHAT HAPPENED in one line
 * and cannot get the envelope wrong.
 *
 * Every one of them:
 *
 * - never throws — a fact that happened has happened, and failing to record it
 *   must not roll back the action that caused it;
 * - dispatches inline so the consequence follows immediately, with the cron
 *   sweep as the backstop if that does not run;
 * - carries an idempotency key built from the thing, never from the clock.
 *
 * Call them AFTER the transaction that committed the fact, or pass the
 * transaction client so the outbox row commits with it.
 */

import { publish, type ActorRef, type PublishResult } from "./publish"
import { dispatchNow } from "./dispatcher"
import { logger } from "@/lib/logger"

/** Publish, then run the consequences now rather than waiting for the sweep. */
async function publishAndDispatch(
    params: Parameters<typeof publish>[0]
): Promise<PublishResult> {
    const result = await publish(params)
    if (result.eventId && !result.deduped) {
        // Awaited, not floated. The audit found risk notifications lost to a
        // floating promise in a serverless function; the outbox makes the event
        // durable, but the customer should not have to wait for a daily cron to
        // see the result of their own upload.
        await dispatchNow(result.eventId).catch((error) =>
            logger("warn", "[events] inline dispatch failed; sweep will retry", {
                eventId: result.eventId,
                error: String(error),
            })
        )
    }
    return result
}

// ── Policy ───────────────────────────────────────────────────────────────────

export async function publishPolicyCreated(args: {
    policyId: string
    ownerUserId: string
    actor: ActorRef
    insurerName?: string | null
    policyNumber?: string | null
    lineOfBusiness?: string | null
}) {
    return publishAndDispatch({
        name: "policy.created",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: args.actor,
        payload: {
            policyId: args.policyId,
            insurerName: args.insurerName ?? null,
            policyNumber: args.policyNumber ?? null,
            lineOfBusiness: args.lineOfBusiness ?? null,
            // Drives whether the owner is told: nobody needs a notification
            // about something they did themselves ten seconds ago.
            addedByAdvisor: args.actor.type === "advisor",
        },
        idempotencyKey: `policy.created:${args.policyId}`,
    })
}

export async function publishPolicyCoverageChanged(args: {
    policyId: string
    ownerUserId: string
    actor: ActorRef
    changedFields: string[]
}) {
    return publishAndDispatch({
        name: "policy.coverage_changed",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: args.actor,
        payload: {
            policyId: args.policyId,
            changedFields: args.changedFields,
            actorIsOwner: args.actor.id === args.ownerUserId,
        },
        // No idempotency key: a policy can legitimately change more than once,
        // and a key would silently swallow the second edit.
    })
}

export async function publishPolicyDeleted(args: {
    policyId: string
    ownerUserId: string
    actor: ActorRef
    insurerName?: string | null
    policyNumber?: string | null
}) {
    return publishAndDispatch({
        name: "policy.deleted",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: args.actor,
        payload: {
            policyId: args.policyId,
            insurerName: args.insurerName ?? null,
            policyNumber: args.policyNumber ?? null,
        },
        idempotencyKey: `policy.deleted:${args.policyId}`,
    })
}

export async function publishPolicyMerged(args: {
    mergedIntoPolicyId: string
    ownerUserId: string
    actor: ActorRef
    policyNumber?: string | null
}) {
    return publishAndDispatch({
        name: "policy.merged",
        aggregate: { type: "policy", id: args.mergedIntoPolicyId },
        subjectUserId: args.ownerUserId,
        actor: args.actor,
        payload: { mergedIntoPolicyId: args.mergedIntoPolicyId, policyNumber: args.policyNumber ?? null },
        idempotencyKey: `policy.merged:${args.mergedIntoPolicyId}`,
    })
}

export async function publishAnalysisCompleted(args: {
    policyId: string
    ownerUserId: string
    runId: string
    actor: ActorRef
    insurerName?: string | null
    policyNumber?: string | null
    confidence?: number | null
    provider?: string | null
}) {
    return publishAndDispatch({
        name: "policy.analysis_completed",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: args.actor,
        payload: {
            policyId: args.policyId,
            runId: args.runId,
            insurerName: args.insurerName ?? null,
            policyNumber: args.policyNumber ?? null,
            confidence: args.confidence ?? null,
            provider: args.provider ?? null,
        },
        // Keyed on the RUN, not the policy: re-analysing a policy is a new fact
        // and the customer should hear about it again.
        idempotencyKey: `policy.analysis_completed:${args.runId}`,
    })
}

export async function publishAnalysisFailed(args: {
    policyId: string
    ownerUserId: string
    runId: string
    reason: string
    advisorUserId?: string | null
}) {
    return publishAndDispatch({
        name: "policy.analysis_failed",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: { type: "system" },
        payload: {
            policyId: args.policyId,
            runId: args.runId,
            reason: args.reason,
            advisorUserId: args.advisorUserId ?? null,
        },
        idempotencyKey: `policy.analysis_failed:${args.runId}`,
    })
}

export async function publishExtractionFlagged(args: {
    policyId: string
    ownerUserId: string
    actor: ActorRef
    reason: string
    overallConfidence?: number | null
}) {
    return publishAndDispatch({
        name: "policy.extraction_flagged",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: args.actor,
        payload: {
            policyId: args.policyId,
            reason: args.reason,
            overallConfidence: args.overallConfidence ?? null,
        },
    })
}

export async function publishPolicyLapsed(args: {
    policyId: string
    ownerUserId: string
    renewalId: string
    endDate: Date
    lineOfBusiness?: string | null
}) {
    return publishAndDispatch({
        name: "policy.lapsed",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: { type: "system" },
        // The fact happened when the cover ended, not when the cron noticed.
        occurredAt: args.endDate,
        payload: {
            policyId: args.policyId,
            renewalId: args.renewalId,
            endDate: args.endDate.toISOString(),
            lineOfBusiness: args.lineOfBusiness ?? null,
        },
        idempotencyKey: `policy.lapsed:${args.renewalId}`,
    })
}

export async function publishRenewalApproaching(args: {
    policyId: string
    ownerUserId: string
    milestone: number
    daysUntilExpiry: number
    endDate: Date
}) {
    return publishAndDispatch({
        name: "policy.renewal_approaching",
        aggregate: { type: "policy", id: args.policyId },
        subjectUserId: args.ownerUserId,
        actor: { type: "system" },
        payload: {
            policyId: args.policyId,
            milestone: args.milestone,
            daysUntilExpiry: args.daysUntilExpiry,
            endDate: args.endDate.toISOString(),
        },
        // One event per policy per milestone, so a cron re-run does not chase
        // the same customer twice about the same rung of the ladder.
        idempotencyKey: `policy.renewal_approaching:${args.policyId}:${args.milestone}`,
    })
}

// ── Customer, household, life ────────────────────────────────────────────────

export async function publishLifeEventDeclared(args: {
    lifeEventId: string
    userId: string
    definitionId: string
    occurredAt: Date
    label?: string | null
    backfilled?: string[]
}) {
    return publishAndDispatch({
        name: "life_event.declared",
        aggregate: { type: "life_event", id: args.lifeEventId },
        subjectUserId: args.userId,
        actor: { type: "customer", id: args.userId },
        // The life change happened when it happened — often long before it was
        // declared — and every date-dependent rule reads that.
        occurredAt: args.occurredAt,
        payload: {
            lifeEventId: args.lifeEventId,
            definitionId: args.definitionId,
            label: args.label ?? args.definitionId,
            backfilled: args.backfilled ?? [],
        },
        idempotencyKey: `life_event.declared:${args.lifeEventId}`,
    })
}

export async function publishProfileUpdated(args: {
    userId: string
    actor: ActorRef
    changedFields: string[]
}) {
    return publishAndDispatch({
        name: "customer.profile_updated",
        aggregate: { type: "customer", id: args.userId },
        subjectUserId: args.userId,
        actor: args.actor,
        payload: {
            changedFields: args.changedFields,
            actorIsSubject: args.actor.id === args.userId,
        },
    })
}

export async function publishQuestionnaireCompleted(args: {
    instanceId: string
    userId: string
    templateId?: string | null
    answeredCount?: number | null
}) {
    return publishAndDispatch({
        name: "questionnaire.completed",
        aggregate: { type: "questionnaire", id: args.instanceId },
        subjectUserId: args.userId,
        actor: { type: "customer", id: args.userId },
        payload: {
            instanceId: args.instanceId,
            templateId: args.templateId ?? null,
            answeredCount: args.answeredCount ?? null,
        },
        idempotencyKey: `questionnaire.completed:${args.instanceId}`,
    })
}

// ── Advisor ──────────────────────────────────────────────────────────────────

export async function publishAdvisorLinked(args: {
    relationshipId: string
    customerUserId: string
    advisorUserId: string
    actor: ActorRef
}) {
    return publishAndDispatch({
        name: "advisor.linked",
        aggregate: { type: "advisor", id: args.relationshipId },
        subjectUserId: args.customerUserId,
        actor: args.actor,
        payload: { relationshipId: args.relationshipId, advisorUserId: args.advisorUserId },
        idempotencyKey: `advisor.linked:${args.relationshipId}`,
    })
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function publishPaymentFailed(args: {
    userId: string
    subscriptionId: string
    stripeEventId: string
    attemptCount?: number
}) {
    return publishAndDispatch({
        name: "payment.failed",
        aggregate: { type: "payment", id: args.subscriptionId },
        subjectUserId: args.userId,
        actor: { type: "system" },
        payload: {
            stripeEventId: args.stripeEventId,
            subscriptionId: args.subscriptionId,
            attemptCount: args.attemptCount ?? 1,
        },
        // Stripe retries across process boundaries; the event id is what makes a
        // redelivery silent rather than a second dunning step.
        idempotencyKey: `payment.failed:${args.stripeEventId}`,
    })
}

export async function publishSubscriptionExpired(args: {
    userId: string
    subscriptionId: string
    stripeEventId: string
}) {
    return publishAndDispatch({
        name: "subscription.expired",
        aggregate: { type: "subscription", id: args.subscriptionId },
        subjectUserId: args.userId,
        actor: { type: "system" },
        payload: { stripeEventId: args.stripeEventId, subscriptionId: args.subscriptionId },
        idempotencyKey: `subscription.expired:${args.stripeEventId}`,
    })
}

export async function publishSubscriptionChanged(args: {
    userId: string
    subscriptionId: string
    stripeEventId: string
    previousPriceId?: string | null
    currentPriceId?: string | null
}) {
    return publishAndDispatch({
        name: "subscription.changed",
        aggregate: { type: "subscription", id: args.subscriptionId },
        subjectUserId: args.userId,
        actor: { type: "system" },
        payload: {
            stripeEventId: args.stripeEventId,
            subscriptionId: args.subscriptionId,
            previousPriceId: args.previousPriceId ?? null,
            currentPriceId: args.currentPriceId ?? null,
        },
        idempotencyKey: `subscription.changed:${args.stripeEventId}`,
    })
}

// ── Derived (published by the risk subscriber) ───────────────────────────────

export async function publishRiskProfileRecalculated(args: {
    userId: string
    version: number
    trigger: string
    lifeEventId?: string | null
    overallScore: number
    previousScore: number | null
    openFindingCount: number
    cause?: { eventId: string; correlationId: string }
}) {
    return publish({
        name: "risk_profile.recalculated",
        aggregate: { type: "risk_profile", id: args.userId },
        subjectUserId: args.userId,
        actor: { type: "system" },
        payload: {
            version: args.version,
            trigger: args.trigger,
            lifeEventId: args.lifeEventId ?? null,
            overallScore: args.overallScore,
            previousScore: args.previousScore,
            openFindingCount: args.openFindingCount,
        },
        // One event per version. The version is written only when the assessment
        // MATERIALLY changed, so this inherits materiality for free.
        idempotencyKey: `risk_profile.recalculated:${args.userId}:${args.version}`,
        correlationId: args.cause?.correlationId,
        causationId: args.cause?.eventId,
    })
}
