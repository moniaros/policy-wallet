/**
 * Draining the outbox.
 *
 *     pending event → decide → execute → record the outcome
 *
 * Two passes, and the split matters. **Dispatch** claims a pending event and
 * creates one delivery row per subscriber. **Delivery** runs the work. Keeping
 * them apart means a subscriber that fails is retried on its own rather than
 * re-running the whole fan-out, and it is why one slow consumer cannot hold up
 * the others.
 *
 * Today there is exactly one subscriber — the decision engine — because the
 * engine is where every reaction is decided. The delivery table is
 * per-subscriber from the start so that adding a second (an external webhook,
 * a partner feed) is a row, not a redesign.
 *
 * Runs inline after publish where latency matters, and from a cron as the
 * backstop. Both paths are idempotent, so an event dispatched twice does its
 * work once.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { decide, toContext } from "./decision-engine"
import { executeAll } from "./executor"

/** The only subscriber today. Adding one is a new key here plus a handler. */
export const SUBSCRIBERS = ["decision_engine"] as const
export type Subscriber = (typeof SUBSCRIBERS)[number]

export interface DispatchSummary {
    dispatched: number
    delivered: number
    failed: number
    skipped: number
}

/** Rows one invocation will touch. Reported, never silently capped. */
const MAX_BATCH = 100
/** Attempts before a delivery is parked as dead and an operator must look. */
const MAX_ATTEMPTS = 5

function backoffMinutes(attempt: number): number {
    return Math.min(15 * Math.pow(2, Math.max(0, attempt - 1)), 24 * 60)
}

/**
 * Claim pending events and create their delivery rows.
 *
 * The claim is the state flip to `dispatched`, done before any work: two
 * workers racing the same event means one of them creates the delivery rows and
 * the other finds none pending. The unique index on (eventId, subscriber) is
 * the backstop if both get that far.
 */
export async function dispatchPending(limit = MAX_BATCH): Promise<number> {
    const pending = await db.businessEvent.findMany({
        where: { dispatchState: "pending" },
        orderBy: { recordedAt: "asc" },
        take: limit,
        select: { id: true, name: true },
    })

    let dispatched = 0
    for (const event of pending) {
        try {
            await db.$transaction(async (tx) => {
                await tx.businessEvent.update({
                    where: { id: event.id },
                    data: { dispatchState: "dispatched", dispatchedAt: new Date() },
                })
                await tx.businessEventDelivery.createMany({
                    data: SUBSCRIBERS.map((subscriber) => ({
                        eventId: event.id,
                        subscriber,
                        nextAttemptAt: new Date(),
                    })),
                    skipDuplicates: true,
                })
            })
            dispatched++
        } catch (error) {
            logger("error", "[events] dispatch failed", {
                eventId: event.id,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
    return dispatched
}

/** Run one delivery: decide, execute, record. Never throws. */
async function runDelivery(deliveryId: string): Promise<"delivered" | "failed" | "skipped"> {
    const delivery = await db.businessEventDelivery.findUnique({
        where: { id: deliveryId },
        include: { event: true },
    })
    if (!delivery) return "skipped"

    // An operator switching a business event off at source. The event stays
    // RECORDED — the fact happened — but no actions follow. Distinct from a
    // notification override, which only stops the telling.
    const override = await db.businessEventOverride
        .findUnique({ where: { eventType: delivery.event.name }, select: { enabled: true } })
        .catch(() => null)
    if (override && !override.enabled) {
        await db.businessEventDelivery.update({
            where: { id: deliveryId },
            data: { status: "skipped", skipReason: "event_disabled", completedAt: new Date() },
        })
        return "skipped"
    }

    const ctx = toContext(delivery.event)
    if (!ctx) {
        // An event whose definition has been retired. Stale, not broken: it is
        // parked rather than retried for ever.
        await db.businessEventDelivery.update({
            where: { id: deliveryId },
            data: { status: "skipped", skipReason: "unknown_event", completedAt: new Date() },
        })
        return "skipped"
    }

    await db.businessEventDelivery.update({
        where: { id: deliveryId },
        data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
    })

    try {
        const decision = decide(ctx)
        const outcomes = await executeAll(ctx, decision.actions)
        const failedActions = outcomes.filter((o) => o.status === "failed")

        await db.businessEventDelivery.update({
            where: { id: deliveryId },
            data: {
                // A delivery with a failed action is a failed delivery: the
                // retry is what gets the missing consequence to happen.
                status: failedActions.length > 0 ? "failed" : "succeeded",
                completedAt: failedActions.length > 0 ? null : new Date(),
                nextAttemptAt:
                    failedActions.length > 0
                        ? new Date(Date.now() + backoffMinutes(delivery.attempts + 1) * 60_000)
                        : null,
                lastError: failedActions.length > 0 ? failedActions.map((f) => `${f.type}:${f.reason}`).join("; ").slice(0, 500) : null,
                // The workflow audit trail: what was decided, what was skipped
                // and why. This is what an operator reads when a customer asks
                // why nothing happened.
                actions: {
                    performed: outcomes,
                    skipped: decision.skipped,
                } as never,
            },
        })

        return failedActions.length > 0 ? "failed" : "delivered"
    } catch (error) {
        const attempts = delivery.attempts + 1
        const dead = attempts >= MAX_ATTEMPTS
        await db.businessEventDelivery.update({
            where: { id: deliveryId },
            data: {
                status: dead ? "dead" : "failed",
                lastError: error instanceof Error ? error.message.slice(0, 500) : String(error),
                nextAttemptAt: dead ? null : new Date(Date.now() + backoffMinutes(attempts) * 60_000),
            },
        })
        return "failed"
    }
}

/** Run every delivery that is due. */
export async function deliverDue(limit = MAX_BATCH): Promise<{ delivered: number; failed: number; skipped: number }> {
    const due = await db.businessEventDelivery.findMany({
        where: {
            status: { in: ["pending", "failed"] },
            attempts: { lt: MAX_ATTEMPTS },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        orderBy: { nextAttemptAt: "asc" },
        take: limit,
        select: { id: true },
    })

    let delivered = 0
    let failed = 0
    let skipped = 0
    for (const row of due) {
        const outcome = await runDelivery(row.id)
        if (outcome === "delivered") delivered++
        else if (outcome === "failed") failed++
        else skipped++
    }
    return { delivered, failed, skipped }
}

/**
 * One full sweep. Safe to run from a cron and inline after a publish.
 */
export async function runEventSweep(limit = MAX_BATCH): Promise<DispatchSummary> {
    const dispatched = await dispatchPending(limit)
    const { delivered, failed, skipped } = await deliverDue(limit)
    const summary = { dispatched, delivered, failed, skipped }
    logger("info", "event sweep complete", summary)
    return summary
}

/**
 * Process ONE event immediately, for latency-sensitive paths.
 *
 * An upload should not wait for a cron before the customer sees their result.
 * Never throws and never blocks the caller's outcome — if this does not run,
 * the sweep picks the event up, which is the whole reason the outbox exists.
 */
export async function dispatchNow(eventId: string): Promise<void> {
    try {
        await db.$transaction(async (tx) => {
            const event = await tx.businessEvent.findUnique({
                where: { id: eventId },
                select: { dispatchState: true },
            })
            if (!event || event.dispatchState !== "pending") return
            await tx.businessEvent.update({
                where: { id: eventId },
                data: { dispatchState: "dispatched", dispatchedAt: new Date() },
            })
            await tx.businessEventDelivery.createMany({
                data: SUBSCRIBERS.map((subscriber) => ({
                    eventId,
                    subscriber,
                    nextAttemptAt: new Date(),
                })),
                skipDuplicates: true,
            })
        })

        const deliveries = await db.businessEventDelivery.findMany({
            where: { eventId, status: { in: ["pending", "failed"] } },
            select: { id: true },
        })
        for (const delivery of deliveries) await runDelivery(delivery.id)
    } catch (error) {
        logger("warn", "[events] inline dispatch failed; the sweep will retry", {
            eventId,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}
