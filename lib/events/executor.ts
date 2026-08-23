/**
 * Carrying out what the Decision Engine decided.
 *
 *     Business Event  →  Decision Engine  →  **Actions**
 *
 * Every executor here delegates to machinery that already exists. That is
 * deliberate: this layer changes how work is *triggered*, not how it is *done*.
 * The notification bus, the gap engine, the task table and the activity log are
 * unchanged, and each keeps its own guarantees.
 *
 * One executor per action type, and the list is closed. An action outside the
 * catalog's twelve means a workflow is doing something the architecture has not
 * accounted for, and the engine refuses it before it reaches here.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { ActionType } from "./catalog"
import type { EventContext, PlannedAction } from "./decision-engine"

export interface ActionOutcome {
    type: ActionType
    status: "done" | "skipped" | "failed"
    reason?: string
    detail?: string
}

type Executor = (ctx: EventContext, action: PlannedAction) => Promise<ActionOutcome>

const done = (type: ActionType, detail?: string): ActionOutcome => ({ type, status: "done", detail })
const skip = (type: ActionType, reason: string): ActionOutcome => ({ type, status: "skipped", reason })

/**
 * Notification actions.
 *
 * All four customer- and staff-facing channels route through ONE executor,
 * because the notification bus already owns channel choice: the registry
 * decides which channels an event uses, preferences narrow it, and the admin
 * console can override it. Re-deciding channels here would be a second opinion
 * about the same question, which is the duplication the whole exercise removes.
 *
 * The decision engine names a NOTIFICATION event; the bus does the rest.
 */
async function executeNotification(
    ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    const notificationEvent = action.params?.notificationEvent
    if (typeof notificationEvent !== "string") {
        return skip(action.type, "no_notification_event")
    }
    if (!ctx.subjectUserId) {
        return skip(action.type, "no_subject")
    }

    const { orchestrate } = await import("@/lib/notifications/orchestrator")
    const { getEventDefinition: getNotificationDefinition } = await import(
        "@/lib/notifications/registry"
    )
    const definition = getNotificationDefinition(notificationEvent)
    if (!definition) return skip(action.type, "unknown_notification_event")

    // The registry's bilingual customer copy is the ONLY content this generic
    // path may send. Until Aug 2026 it used `definition.businessEvent` and the
    // catalog's `description` here — internal English documentation — which the
    // bus then stored verbatim in customer-visible columns ("AI extraction
    // finished and the policy is readable" in an otherwise Greek feed). Both
    // fields are documentation for operators; `copy` is for people. An event
    // without copy (an `analytics` mirror) has no reader, so there is nothing
    // to send.
    const copy = definition.copy
    if (!copy) return skip(action.type, "no_customer_copy")

    // Through the ORCHESTRATOR, not straight to `emit`. It resolves the
    // registry's declared recipients — so one business event reaches the
    // customer AND their advisor where the event says it should — and applies
    // quiet hours, the daily cap and any schedule before handing delivery to
    // the bus. Calling `emit` here would be a second delivery path with none of
    // those policies, which is the duplication this layer exists to prevent.
    const outcomes = await orchestrate({
        event: notificationEvent,
        subjectUserId: ctx.subjectUserId,
        title: copy.title,
        message: copy.message,
        vars: (action.params?.vars ?? ctx.payload) as Record<string, string | number | null | undefined>,
        // One notification per business event per notification-type per
        // recipient, so a replayed or retried delivery cannot tell anyone twice.
        dedupeKey: `evt:${ctx.eventId}:${notificationEvent}`,
    })

    if (outcomes.length === 0) return skip(action.type, "no_recipient")

    const delivered = outcomes.flatMap((o) => o.result?.delivered ?? [])
    const deferred = outcomes.flatMap((o) => o.result?.deferred ?? [])
    const deduped = outcomes.every((o) => o.result?.deduped)

    if (deduped) return skip(action.type, "already_notified")
    if (delivered.length === 0 && deferred.length === 0) return skip(action.type, "no_channel")

    const parts = [
        delivered.length > 0 ? `delivered:${delivered.join(",")}` : null,
        // Reported distinctly: "deferred until morning" is a different outcome
        // from "sent", and an operator reading the workflow log needs to see it.
        deferred.length > 0 ? `deferred:${deferred.join(",")}` : null,
        `recipients:${outcomes.length}`,
    ].filter(Boolean)
    return done(action.type, parts.join(" · "))
}

/**
 * Advisory work.
 *
 * Creates a `UserTask` for the advisor who can actually act. Before this,
 * `userTask.create` had two call sites — the renewal cron and a manual action —
 * so a critical coverage gap, a failed extraction and a lapsed policy produced
 * customer notifications and no advisory work at all.
 */
async function executeAdvisorNotification(
    ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    if (!ctx.subjectUserId) return skip(action.type, "no_subject")

    // Only an ACTIVE relationship, and only the advisor who holds it. A task
    // assigned to nobody is a task nobody does.
    const relationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: ctx.subjectUserId,
            status: { not: "terminated" },
        },
        select: { agentUserId: true },
    })
    if (!relationship) return skip(action.type, "no_advisor")

    const title = typeof action.params?.title === "string" ? action.params.title : ctx.definition.description
    const priority = typeof action.params?.priority === "string" ? action.params.priority : "medium"

    // Idempotent on the event: a retried delivery must not create a second task
    // for one fact. `creatorUserId` carries the event id so the guard is the
    // data itself rather than a separate ledger.
    const existing = await db.userTask.findFirst({
        where: { userId: relationship.agentUserId, creatorUserId: `evt:${ctx.eventId}` },
        select: { id: true },
    })
    if (existing) return skip(action.type, "task_exists")

    await db.userTask.create({
        data: {
            userId: relationship.agentUserId,
            creatorUserId: `evt:${ctx.eventId}`,
            type: ctx.definition.aggregate,
            title,
            description: ctx.definition.description,
            priority,
            status: "pending",
            actionUrl:
                typeof action.params?.policyId === "string"
                    ? `/wallet/${action.params.policyId}`
                    : `/customers/${ctx.subjectUserId}`,
        },
    })
    return done(action.type, "task_created")
}

/**
 * Operator alert.
 *
 * Through the orchestrator with `only: ["admin"]`, so admin fan-out uses the
 * same recipient resolution as every other audience. This used to query
 * `roles: { contains: "admin" }` and loop `emit` itself — a second copy of the
 * lookup the orchestrator already performs, and one that would have drifted the
 * moment either changed.
 *
 * Admin alerts deliberately keep the URGENT path: an operator escalation exists
 * because something is wrong now, and deferring it to the morning would defeat
 * it. The registry marks these transactional, which is what exempts them.
 */
async function executeAdminNotification(
    ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    const { orchestrate } = await import("@/lib/notifications/orchestrator")
    const outcomes = await orchestrate({
        event: "admin_dunning_exhausted",
        subjectUserId: ctx.subjectUserId,
        only: ["admin"],
        // The machine event name, not the catalog's `description` — that field
        // is internal documentation and this row still lands in the same
        // customer-visible columns as every other notification. An operator
        // reading an escalation wants the exact event name anyway.
        title: { el: `Κλιμάκωση: ${ctx.name}`, en: `Escalation: ${ctx.name}` },
        message: {
            el: `Το συμβάν ${ctx.name} κλιμακώθηκε — ${action.reason}`,
            en: `Event ${ctx.name} escalated — ${action.reason}`,
        },
        dedupeKey: `evt:${ctx.eventId}:admin`,
    })
    if (outcomes.length === 0) return skip(action.type, "no_admins")
    return done(action.type, `admins:${outcomes.length}`)
}

/**
 * Risk recalculation, protection score, coverage gaps.
 *
 * All three are ONE call. `runGapEngine` recomputes the assessment, caches the
 * score, syncs recommendations and versions the result — the score and the gaps
 * are readings of the same pass, so recomputing them separately would be three
 * runs of the same engine that could disagree with each other.
 *
 * The action types stay distinct because a rule should be able to SAY "this
 * event updates the protection score" without knowing they share an
 * implementation.
 */
async function executeRiskRecalculation(
    ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    if (!ctx.subjectUserId) return skip(action.type, "no_subject")

    const { runGapEngine } = await import("@/lib/services/gap-engine")
    const trigger =
        ctx.definition.aggregate === "life_event"
            ? "life_event"
            : ctx.definition.aggregate === "policy"
              ? "policy_change"
              : "profile_update"

    const result = await runGapEngine(ctx.subjectUserId, {
        trigger: trigger as never,
        lifeEventId: (ctx.payload.lifeEventId as string | undefined) ?? null,
    })

    // `written: false` means the assessment genuinely did not move — a real
    // outcome, not a failure, and the reason a nightly cron over a stable book
    // costs nothing.
    return done(
        action.type,
        result.version?.written ? `version:${result.version.version}` : "unchanged"
    )
}

/**
 * Schedule something for later.
 *
 * Recorded as a due task rather than a timer: the platform's crons are daily,
 * so a "wake me in 3 days" primitive would be a lie about resolution. A dated
 * row that a sweep picks up is what the infrastructure can actually honour.
 */
async function executeScheduledReview(
    ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    if (!ctx.subjectUserId) return skip(action.type, "no_subject")

    const kind = typeof action.params?.kind === "string" ? action.params.kind : "review"

    // A RISK review is its own aggregate with a lifecycle, a deadline and a
    // snapshot of where the customer stood when it opened — not a task row.
    // The service decides whether one should actually open: most triggers
    // recalculate and say nothing, and a busy fortnight is one conversation
    // rather than three review cards.
    if (kind === "risk_review") {
        const trigger = typeof action.params?.trigger === "string" ? action.params.trigger : "life_event"
        const { openReview } = await import("@/lib/services/risk-review/service")
        const result = await openReview({
            userId: ctx.subjectUserId,
            trigger: trigger as never,
            causedByEventId: ctx.eventId,
        })
        // A decline is a real outcome with a reason — cooldown, outranked or
        // policy — and recording it is what lets an operator answer "why did
        // this customer not get a review".
        return result.opened
            ? done(action.type, `review:${result.reviewId}`)
            : skip(action.type, `review_${result.reason}`)
    }
    const step = typeof action.params?.step === "number" ? action.params.step : 1
    // Dunning ladder: day 1, 3, 7. Beyond that a human has already been asked.
    const offsetDays = kind === "dunning" ? [0, 1, 3, 7][Math.min(step, 3)] : 30
    if (kind === "dunning" && step > 3) return skip(action.type, "ladder_exhausted")

    const dueDate = new Date(ctx.occurredAt.getTime() + offsetDays * 24 * 3600_000)

    const existing = await db.userTask.findFirst({
        where: { userId: ctx.subjectUserId, creatorUserId: `evt:${ctx.eventId}:sched` },
        select: { id: true },
    })
    if (existing) return skip(action.type, "already_scheduled")

    await db.userTask.create({
        data: {
            userId: ctx.subjectUserId,
            creatorUserId: `evt:${ctx.eventId}:sched`,
            type: kind,
            title: `${kind === "dunning" ? "Payment retry" : "Review"} — ${ctx.definition.description}`,
            status: "pending",
            priority: kind === "dunning" ? "high" : "medium",
            dueDate,
        },
    })
    return done(action.type, `due:${dueDate.toISOString().slice(0, 10)}`)
}

/**
 * Recommendations.
 *
 * Deliberately a NO-OP that reports why: `runGapEngine` already syncs
 * recommendations as part of the same pass that produced the event. Running a
 * second generation here would produce a set that could disagree with the one
 * the customer is looking at. The action type exists so a rule can declare the
 * intent; the engine is the thing that satisfies it.
 */
async function executeAiRecommendation(
    _ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    return skip(action.type, "satisfied_by_risk_recalculation")
}

/**
 * Analytics.
 *
 * The event log IS the analytics record — every event is already stored with
 * its aggregate, subject, timestamp and payload. Writing a second row would be
 * a copy that can drift from the thing it copies.
 */
async function executeAnalytics(
    _ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    return done(action.type, "recorded_in_event_log")
}

/**
 * Audit.
 *
 * `ActivityLog` remains the compliance record. `targetUserId` is set to the
 * SUBJECT, never the actor — that is the field that answers "who accessed whose
 * data", which is the question a GDPR access request asks.
 */
async function executeAuditLog(
    ctx: EventContext,
    action: PlannedAction
): Promise<ActionOutcome> {
    try {
        await db.activityLog.create({
            data: {
                adminUserId: ctx.actor.id ?? "system",
                adminEmail: ctx.actor.type,
                actionType: ctx.name.toUpperCase().replace(/\./g, "_"),
                description: `${ctx.definition.description} — ${action.reason}`,
                targetUserId: ctx.subjectUserId,
                metadata: {
                    eventId: ctx.eventId,
                    correlationId: ctx.correlationId,
                    aggregate: ctx.aggregate,
                } as never,
            },
        })
        return done(action.type)
    } catch (error) {
        // An audit failure is worth knowing about but must not fail the
        // workflow — the fact already happened.
        logger("warn", "[events] audit log write failed", {
            event: ctx.name,
            error: error instanceof Error ? error.message : String(error),
        })
        return { type: action.type, status: "failed", reason: "audit_write_failed" }
    }
}

const EXECUTORS: Record<ActionType, Executor> = {
    email: executeNotification,
    push: executeNotification,
    in_app: executeNotification,
    advisor_notification: executeAdvisorNotification,
    admin_notification: executeAdminNotification,
    ai_recommendation: executeAiRecommendation,
    risk_recalculation: executeRiskRecalculation,
    protection_score_update: executeRiskRecalculation,
    coverage_gap_update: executeRiskRecalculation,
    scheduled_review: executeScheduledReview,
    analytics: executeAnalytics,
    audit_log: executeAuditLog,
}

/**
 * Run one planned action.
 *
 * Never throws: one action failing must not prevent the others. The outcome is
 * recorded either way, which is what makes the workflow auditable rather than
 * merely hopeful.
 */
export async function execute(ctx: EventContext, action: PlannedAction): Promise<ActionOutcome> {
    const executor = EXECUTORS[action.type]
    if (!executor) return skip(action.type, "no_executor")

    try {
        return await executor(ctx, action)
    } catch (error) {
        logger("error", "[events] action failed", {
            event: ctx.name,
            action: action.type,
            error: error instanceof Error ? error.message : String(error),
        })
        return {
            type: action.type,
            status: "failed",
            reason: error instanceof Error ? error.message.slice(0, 200) : "unknown",
        }
    }
}

/**
 * Run every planned action, in order.
 *
 * Sequential on purpose. `risk_recalculation` must finish before a notification
 * that describes its result, and running them in parallel would let a customer
 * be told about a score that had not been written yet.
 */
export async function executeAll(
    ctx: EventContext,
    actions: PlannedAction[]
): Promise<ActionOutcome[]> {
    const outcomes: ActionOutcome[] = []
    // State-shaped actions first, so a notification never describes a world
    // that does not exist yet.
    const ordered = [...actions].sort((a, b) => {
        const rank = (t: ActionType) =>
            t === "risk_recalculation" || t === "protection_score_update" || t === "coverage_gap_update"
                ? 0
                : t === "audit_log" || t === "analytics"
                  ? 2
                  : 1
        return rank(a.type) - rank(b.type)
    })
    for (const action of ordered) {
        outcomes.push(await execute(ctx, action))
    }
    return outcomes
}
