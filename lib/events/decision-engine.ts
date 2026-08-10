/**
 * The Decision Engine.
 *
 *     Business Event  →  Decision Engine  →  Actions
 *
 * Every workflow in PolicyWallet has this shape. The event says what happened;
 * the engine decides what should follow; the actions do it. Nothing else is a
 * workflow, and a producer that reaches past this to send a notification
 * directly has re-created the coupling this exists to remove.
 *
 * ## What the engine is, and is not
 *
 * It **is** the one place that answers "given this fact, what should happen?".
 * It **is not** a rules DSL. Rules are TypeScript functions over a typed
 * context — testable, refactorable, and able to say things a table cannot, such
 * as "critical only, and only when the customer has an advisor who can actually
 * act on it".
 *
 * Three properties, each one a defect the audit found:
 *
 * 1. **Actions are bounded by the catalog.** An event may only produce actions
 *    its definition declares. A workflow cannot quietly acquire a new kind of
 *    consequence.
 *
 * 2. **Every decision is recorded** — including the ones that decided NOT to
 *    act, with the reason. "We deliberately did nothing" is what an operator
 *    needs when a customer asks why they heard nothing.
 *
 * 3. **A replay never reaches a customer.** Backfilling a subscriber must not
 *    email two years of notifications, so customer-facing actions are refused
 *    when `isReplay` is set. State-shaped actions still run — recomputing a
 *    score twice is harmless; emailing about it twice is not.
 */

import { logger } from "@/lib/logger"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { triggerForLifeEvent } from "@/lib/services/risk-review/policy"
import {
    getEventDefinition,
    permitsAction,
    type ActionType,
    type EventDefinition,
} from "./catalog"

/** The event as a rule sees it. */
export interface EventContext {
    eventId: string
    name: string
    definition: EventDefinition
    occurredAt: Date
    aggregate: { type: string; id: string }
    /** Whose data this is. Null for events with no single subject. */
    subjectUserId: string | null
    actor: { type: string; id: string | null }
    payload: Record<string, unknown>
    correlationId: string
    /** True when re-delivered from the log rather than happening for the first time. */
    isReplay: boolean
}

/** One thing the engine decided to do. */
export interface PlannedAction {
    type: ActionType
    /** Why, in one line. Recorded, and shown in the admin workflow view. */
    reason: string
    /** Action-specific parameters — the notification event key, the task title, … */
    params?: Record<string, unknown>
}

/** A decision not to act, which is as much a decision as acting. */
export interface SkippedAction {
    type: ActionType
    reason: string
}

export interface Decision {
    actions: PlannedAction[]
    skipped: SkippedAction[]
}

/**
 * A rule maps one event to zero or more actions.
 *
 * Pure and synchronous by design: a rule that can query the database is a rule
 * that can be slow, flaky and untestable, and the temptation to put business
 * logic in it becomes irresistible. Everything a rule needs is on the context.
 */
export type DecisionRule = (ctx: EventContext) => PlannedAction[]

/** Customer-facing actions — refused on a replay. */
const CUSTOMER_FACING: ActionType[] = [
    "email",
    "push",
    "in_app",
    "advisor_notification",
    "admin_notification",
]

/** Actions that only change internal state — safe to repeat. */
export function isStateAction(type: ActionType): boolean {
    return !CUSTOMER_FACING.includes(type)
}

// ── Shared helpers ───────────────────────────────────────────────────────────

const audit = (reason: string): PlannedAction => ({ type: "audit_log", reason })
const analytics = (reason: string): PlannedAction => ({ type: "analytics", reason })
const recalc = (reason: string): PlannedAction => ({ type: "risk_recalculation", reason })

/** Notify the subject through the notification bus, which owns channel choice. */
const notify = (notificationEvent: string, reason: string, vars?: Record<string, unknown>): PlannedAction => ({
    type: "in_app",
    reason,
    params: { notificationEvent, vars },
})

const advisorTask = (reason: string, params: Record<string, unknown>): PlannedAction => ({
    type: "advisor_notification",
    reason,
    params,
})

function num(payload: Record<string, unknown>, key: string): number | null {
    const v = payload[key]
    return typeof v === "number" && Number.isFinite(v) ? v : null
}

/** The big four life events deserve their own window and their own words. */
function lifeEventReviewTrigger(definitionId: string | null): string {
    return triggerForLifeEvent(definitionId ?? "")
}

function str(payload: Record<string, unknown>, key: string): string | null {
    const v = payload[key]
    return typeof v === "string" && v.length > 0 ? v : null
}

// ── The rules ────────────────────────────────────────────────────────────────
//
// One entry per event. The absence of an entry is meaningful: the event is
// recorded and audited, and nothing else follows. That is a legitimate and
// common outcome — most facts are worth knowing and not worth acting on.

export const DECISION_RULES: Record<string, DecisionRule> = {
    // ── Policy ───────────────────────────────────────────────────────────────

    "policy.created": (ctx) => [
        recalc("A new policy changes what is protected"),
        // The owner is told only when someone ELSE added it. Telling people what
        // they just did is noise, and noise is what makes the useful ones ignored.
        ...(ctx.payload.addedByAdvisor
            ? [notify("policy_added", "An advisor added a policy to the customer's wallet")]
            : []),
        analytics("Portfolio growth"),
        audit("Policy entered the wallet"),
    ],

    "policy.coverage_changed": (ctx) => [
        recalc("Cover, dates or premium moved — the assessment may change"),
        ...(ctx.payload.actorIsOwner
            ? []
            : [notify("policy_updated", "Someone other than the owner changed this policy")]),
        audit("Policy terms changed"),
    ],

    "policy.deleted": () => [
        recalc("The portfolio lost a line of cover"),
        // Destructive, and a managing advisor can do it. This is the
        // notification that lets someone notice.
        notify("policy_removed", "A policy was removed from the wallet"),
        audit("Policy deleted"),
    ],

    "policy.merged": () => [
        recalc("Two records became one"),
        notify("policy_merged", "Duplicate records were reconciled"),
        analytics("Deduplication"),
        audit("Policies merged"),
    ],

    "policy.analysis_completed": () => [
        recalc("A readable policy changes what we can assess"),
        notify("policy_analyzed", "The customer's document has been read"),
        analytics("Analysis funnel"),
        audit("AI extraction completed"),
    ],

    "policy.analysis_failed": (ctx) => [
        notify("policy_analysis_failed", "The customer is owed the outcome, good or bad"),
        // A failure the customer cannot fix belongs to a human, not to a retry
        // loop. Only for advisor-owned uploads: a self-serve customer with no
        // advisor has nobody to assign it to.
        ...(str(ctx.payload, "advisorUserId")
            ? [advisorTask("Extraction failed on a policy this advisor owns", {
                  title: "Policy analysis failed",
                  policyId: ctx.payload.policyId,
                  priority: "high",
              })]
            : []),
        analytics("Analysis failure rate"),
        audit("AI extraction failed"),
    ],

    "policy.extraction_flagged": (ctx) => [
        // The reading could not be trusted, so a human must look. Today this
        // notifies the flagging agent and creates no queue item, which is how
        // flagged extractions accumulate unowned.
        advisorTask("A reading was flagged as untrustworthy and needs review", {
            title: "Review flagged extraction",
            policyId: ctx.payload.policyId,
            priority: "high",
        }),
        audit("Extraction flagged for review"),
    ],

    "policy.renewal_approaching": (ctx) => {
        const days = num(ctx.payload, "daysUntilExpiry") ?? 999
        return [
            notify("policy_expiring", `Renewal is ${days} days away`),
            // The industry's own checkpoint: the one moment a customer is
            // already thinking about cover and can act without friction.
            ...(days <= 30
                ? [{
                      type: "scheduled_review" as const,
                      reason: "A renewal is the moment a customer is already deciding about cover",
                      params: { kind: "risk_review", trigger: "policy_renewal" },
                  }]
                : []),
            // Advisory work only inside the window where a quote is still
            // useful. A task raised 90 days out sits and rots.
            ...(days <= 30
                ? [advisorTask("Renewal is close enough for a quote to be useful", {
                      title: "Renewal approaching",
                      policyId: ctx.payload.policyId,
                      priority: days <= 7 ? "high" : "medium",
                  })]
                : []),
            analytics("Renewal ladder"),
        ]
    },

    "policy.lapsed": (ctx) => [
        notify("renewal_overdue", "Cover has lapsed — the customer may be uninsured"),
        // Motor is compulsory in Greece: a lapse is a legal exposure, not only
        // an uncovered one.
        advisorTask("A policy lapsed without renewal", {
            title: "Policy lapsed",
            policyId: ctx.payload.policyId,
            // The FAMILY, not the literal branch: a lapsed motorbike policy is
            // as compulsory — and as unlawful to drive without — as a lapsed
            // car policy, and comparing to "motor" would have missed it.
            priority:
                branchFamilyId(str(ctx.payload, "lineOfBusiness")) === "motor" ? "high" : "medium",
        }),
        recalc("A lapsed policy no longer protects anything"),
        audit("Policy lapsed"),
    ],

    "policy.shared": () => [
        notify("policy_shared", "Another person can now see this policy"),
        // The GDPR access record: who gained sight of whose data.
        audit("Policy access granted"),
    ],

    // ── Risk ─────────────────────────────────────────────────────────────────

    "risk_profile.recalculated": () => [
        // The derived consequences — score movement, gaps, recommendations —
        // are published as their own events by the risk subscriber, so they
        // carry their own decisions rather than being buried in this one.
        analytics("Assessment churn"),
    ],

    "protection_score.changed": (ctx) => {
        const delta = num(ctx.payload, "delta") ?? 0
        const current = num(ctx.payload, "currentScore")
        return [
            notify("protection_score_changed", "The score moved materially"),
            // A sustained fall into the bottom band is a different thing from
            // drift, and is the honest trigger for human contact.
            ...(delta < 0 && current !== null && current < 40
                ? [advisorTask("Protection fell into the lowest band", {
                      title: "Protection score dropped sharply",
                      priority: "medium",
                  })]
                : []),
            analytics("Score movement"),
        ]
    },

    "coverage_gap.opened": (ctx) => {
        const severity = str(ctx.payload, "severity")
        return [
            notify("GAP_DETECTED", "An exposure is unmet"),
            // Critical gaps get a human. This is the single largest missing
            // automation the audit found: `userTask.create` had two call sites
            // and neither was a coverage gap.
            ...(severity === "critical"
                ? [advisorTask("A critical coverage gap opened", {
                      title: "Critical coverage gap",
                      riskId: ctx.payload.primaryRiskId,
                      priority: "high",
                  })]
                : []),
            analytics("Gap detection"),
        ]
    },

    "coverage_gap.closed": () => [
        notify("risk_level_changed", "A risk became protected"),
        analytics("Gap resolution"),
    ],

    "risk_profile.risk_level_changed": () => [
        notify("risk_level_changed", "A risk changed status without opening or closing"),
        analytics("Risk churn"),
    ],

    "recommendation.generated": () => [
        // One notification for the run, never one per card: someone who gains
        // six recommendations has learned one thing, not six.
        notify("recommendation_generated", "New advice is available"),
        analytics("Recommendation supply"),
    ],

    "recommendation.accepted": (ctx) => [
        // The regulated act is the ADVICE, not our analysis — acceptance hands
        // off to a human rather than transacting.
        advisorTask("The customer wants to act on a recommendation", {
            title: "Customer accepted a recommendation",
            recommendationId: ctx.payload.recommendationId,
            priority: "high",
        }),
        analytics("Recommendation conversion"),
        audit("Recommendation accepted"),
    ],

    "recommendation.dismissed": () => [
        analytics("Recommendation rejection"),
        audit("Recommendation dismissed"),
    ],

    // ── Customer & household ─────────────────────────────────────────────────

    "life_event.declared": (ctx) => [
        recalc("A life change moves the whole assessment"),
        // A declared life change is also a statement that the REST of what we
        // hold may be stale. The review service decides whether to actually
        // open one — a customer who declared something last week does not need
        // a second card.
        {
            type: "scheduled_review" as const,
            reason: "A declared life change may have made other facts stale",
            params: {
                kind: "risk_review",
                trigger: lifeEventReviewTrigger(str(ctx.payload, "definitionId")),
            },
        },
        // Confirms we heard them. The CONSEQUENCE is a separate derived event —
        // "we recorded this" and "this changed your exposure" are different
        // claims, and collapsing them makes the confirmation sound like a finding.
        notify("life_event_recorded", "Confirm we recorded what the customer told us"),
        audit("Life event declared"),
    ],

    "customer.profile_updated": () => [
        recalc("Profile facts feed the assessment"),
        audit("Profile changed"),
    ],

    "questionnaire.completed": () => [
        recalc("Answers resolve previously unknown factors"),
        notify("questionnaire_completed", "The advisor's questionnaire came back"),
        analytics("Questionnaire completion"),
    ],

    "customer.became_inactive": () => [
        notify("churn_prevention", "The customer has stopped engaging"),
        analytics("Churn cohort"),
    ],

    // ── Advisor ──────────────────────────────────────────────────────────────

    "advisor.linked": () => [
        notify("advisor_assigned", "Both parties learn the relationship is active"),
        // Another person gained sight of insurance records.
        audit("Advisor relationship activated"),
    ],

    // ── Billing ──────────────────────────────────────────────────────────────

    "payment.failed": (ctx) => {
        const attempt = num(ctx.payload, "attemptCount") ?? 1
        return [
            notify("payment_failed", "The customer lost paid features and needs to know why"),
            // A dunning LADDER, not one notice. The escalation is time-based and
            // belongs to the scheduler, not to this decision.
            { type: "scheduled_review" as const, reason: "Schedule the next dunning step", params: { step: attempt + 1, kind: "dunning" } },
            ...(attempt >= 3
                ? [{ type: "admin_notification" as const, reason: "Dunning is exhausted; a human should look", params: { severity: "high" } }]
                : []),
            analytics("Payment failure"),
            audit("Payment failed"),
        ]
    },

    "subscription.expired": () => [
        notify("subscription_expired", "The account returned to the free plan"),
        analytics("Churn"),
        audit("Subscription expired"),
    ],

    "subscription.changed": () => [
        notify("subscription_upgraded", "The plan change is complete"),
        analytics("Plan change"),
        audit("Subscription changed"),
    ],
}

// ── The engine ───────────────────────────────────────────────────────────────

/**
 * Decide what should follow from one event.
 *
 * Pure. It performs nothing — it returns a plan, which the executor carries
 * out. That separation is what makes the whole workflow layer testable: a rule
 * can be asserted on without a database, a queue or a mail server.
 */
export function decide(ctx: EventContext): Decision {
    const actions: PlannedAction[] = []
    const skipped: SkippedAction[] = []

    const rule = DECISION_RULES[ctx.name]
    if (!rule) {
        // Not an error. Most facts are worth recording and not worth acting on,
        // and an event with no rule is still audited and still replayable.
        return { actions: [audit("Recorded; no rule declared for this event")], skipped }
    }

    let planned: PlannedAction[]
    try {
        planned = rule(ctx)
    } catch (error) {
        // A rule that throws must not lose the event. It is recorded as an
        // audit-only outcome so the failure is visible rather than silent.
        logger("error", "[events] decision rule threw", {
            event: ctx.name,
            error: error instanceof Error ? error.message : String(error),
        })
        return { actions: [audit("Rule failed; event recorded without consequences")], skipped }
    }

    for (const action of planned) {
        // The catalog bounds what an event may cause. A rule that plans an
        // undeclared action is a bug, and it is caught here rather than
        // producing an unexpected consequence in production.
        if (!permitsAction(ctx.name, action.type)) {
            logger("error", "[events] rule planned an undeclared action", {
                event: ctx.name,
                action: action.type,
            })
            skipped.push({ type: action.type, reason: "not_declared_in_catalog" })
            continue
        }

        // A replay must never reach a customer. Recomputing a score twice is
        // harmless; emailing about it twice is not.
        if (ctx.isReplay && !isStateAction(action.type)) {
            skipped.push({ type: action.type, reason: "replay" })
            continue
        }

        actions.push(action)
    }

    return { actions, skipped }
}

/** Build a context from a stored event row. */
export function toContext(row: {
    id: string
    name: string
    occurredAt: Date
    aggregateType: string
    aggregateId: string
    subjectUserId: string | null
    actorType: string
    actorId: string | null
    payload: unknown
    correlationId: string
    isReplay: boolean
}): EventContext | null {
    const definition = getEventDefinition(row.name)
    if (!definition) return null
    return {
        eventId: row.id,
        name: row.name,
        definition,
        occurredAt: row.occurredAt,
        aggregate: { type: row.aggregateType, id: row.aggregateId },
        subjectUserId: row.subjectUserId,
        actor: { type: row.actorType, id: row.actorId },
        payload: (row.payload ?? {}) as Record<string, unknown>,
        correlationId: row.correlationId,
        isReplay: row.isReplay,
    }
}
