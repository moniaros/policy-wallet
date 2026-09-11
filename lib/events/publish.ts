/**
 * Publishing a business fact.
 *
 * `publish()` writes one outbox row. It does not deliver anything, decide
 * anything, or know that consumers exist — that is the whole point. The
 * decision engine (lib/events/decision-engine.ts) reads the outbox later and
 * decides what should happen.
 *
 * ## Use inside the transaction that commits the fact
 *
 * ```ts
 * await db.$transaction(async (tx) => {
 *   const policy = await tx.policy.create({ … })
 *   await publish({ name: "policy.created", … }, tx)
 * })
 * ```
 *
 * The outbox row and the fact commit together, so they cannot disagree: either
 * both happened or neither did. This is the property an in-process emitter
 * cannot offer, and the audit found exactly that failure mode on the upload
 * path — a floating promise a serverless function may terminate before it runs.
 *
 * Where a caller genuinely has no transaction (a webhook that already committed,
 * a cron reading rows it did not write), publishing straight after the write is
 * acceptable and the `idempotencyKey` is what closes the gap.
 */

import { db, type DbClient } from "@/lib/db"
import { logger } from "@/lib/logger"
import { getEventDefinition } from "./catalog"
import type { Prisma } from "@prisma/client"

/**
 * Anything that can run a Prisma write — the application client or the
 * transaction client `db.$transaction` hands out (both carry the client-level
 * `omit`, so they are typed on `DbClient`, not the bare `Prisma.TransactionClient`).
 */
type Writer = Pick<DbClient, "businessEvent">

export interface ActorRef {
    /**
     * `customer` — the subject acted for themselves.
     * `advisor`  — someone acting FOR the subject.
     * `system`   — a cron, a queue worker, a webhook handler.
     * `admin`    — an operator.
     */
    type: "customer" | "advisor" | "system" | "admin"
    id?: string | null
}

export interface PublishParams {
    /** Catalog key. An undeclared name is a programming error. */
    name: string
    /** What the event is about. */
    aggregate: { type: string; id: string }
    /**
     * WHOSE data this is — the GDPR anchor. Erasure and subject-access walk
     * this, never `actor`. An advisor uploading for a customer is
     * actor=advisor, subject=customer; collapsing the two misattributes the
     * record, misroutes the notification, and loses the access log.
     */
    subjectUserId: string | null
    actor: ActorRef
    payload: Record<string, unknown>
    /**
     * When the FACT happened. Defaults to now, but pass it whenever the fact
     * predates our knowledge of it — a life event declared today may have
     * occurred last year, and every date-dependent rule reads this.
     */
    occurredAt?: Date
    /**
     * Natural key of the fact, built from the thing and never from the clock.
     * A webhook redelivery or a cron re-run records one fact once.
     */
    idempotencyKey?: string
    /** The chain this belongs to. Generated when absent. */
    correlationId?: string
    /** The event that DIRECTLY caused this one. */
    causationId?: string
    metadata?: Record<string, unknown>
}

export interface PublishResult {
    eventId: string | null
    correlationId: string
    /** True when the idempotency key matched an existing row and nothing was written. */
    deduped: boolean
}

const EMPTY = (correlationId: string): PublishResult => ({
    eventId: null,
    correlationId,
    deduped: false,
})

/**
 * Next sequence number for this aggregate.
 *
 * Per-aggregate ordering is the only ordering guarantee the architecture makes.
 * Global ordering is deliberately not offered: it forces every event through one
 * queue and caps throughput for a benefit almost nothing needs.
 *
 * A race can hand two concurrent publishers the same number. That is tolerated:
 * the sequence orders a replay, it is not a uniqueness constraint, and paying
 * for a lock on every publish to make a tie impossible is the wrong trade.
 */
async function nextSequence(writer: Writer, type: string, id: string): Promise<number> {
    const latest = await writer.businessEvent.findFirst({
        where: { aggregateType: type, aggregateId: id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
    })
    return (latest?.sequence ?? 0) + 1
}

/**
 * Publish a business fact.
 *
 * Never throws. A fact that happened has happened; failing to record it must not
 * roll back the action that caused it. The cost of that choice is that a
 * publish failure is a lost event, which is why it is logged at error level and
 * why the outbox is written in the caller's transaction wherever possible.
 */
export async function publish(
    params: PublishParams,
    writer: Writer = db
): Promise<PublishResult> {
    const correlationId = params.correlationId ?? crypto.randomUUID()

    try {
        const definition = getEventDefinition(params.name)
        if (!definition) {
            // Loud in development, survivable in production — the same contract
            // the notification bus uses for an undeclared event.
            const message = `[events] unknown event "${params.name}" — declare it in lib/events/catalog.ts`
            if (process.env.NODE_ENV !== "production") throw new Error(message)
            logger("error", message, { event: params.name })
            return EMPTY(correlationId)
        }

        if (definition.status === "planned") {
            logger("warn", "[events] publish for a planned (unwired) event", { event: params.name })
            return EMPTY(correlationId)
        }

        if (params.idempotencyKey) {
            const existing = await writer.businessEvent.findUnique({
                where: { idempotencyKey: params.idempotencyKey },
                select: { id: true, correlationId: true },
            })
            if (existing) {
                return { eventId: existing.id, correlationId: existing.correlationId, deduped: true }
            }
        }

        const sequence = await nextSequence(writer, params.aggregate.type, params.aggregate.id)

        const row = await writer.businessEvent.create({
            data: {
                name: params.name,
                version: definition.version ?? 1,
                occurredAt: params.occurredAt ?? new Date(),
                aggregateType: params.aggregate.type,
                aggregateId: params.aggregate.id,
                sequence,
                subjectUserId: params.subjectUserId,
                actorType: params.actor.type,
                actorId: params.actor.id ?? null,
                correlationId,
                causationId: params.causationId ?? null,
                payload: params.payload as never,
                metadata: (params.metadata ?? null) as never,
                idempotencyKey: params.idempotencyKey ?? null,
            },
            select: { id: true },
        })

        return { eventId: row.id, correlationId, deduped: false }
    } catch (error) {
        // A unique-constraint collision here is the idempotency key doing its
        // job under a genuine race: the other publisher recorded the same fact,
        // and the loser has nothing to add.
        logger("error", "[events] publish failed", {
            event: params.name,
            error: error instanceof Error ? error.message : String(error),
        })
        return EMPTY(correlationId)
    }
}

/**
 * Publish a fact caused by another event, inheriting its chain.
 *
 * This is how derived events are produced: a subscriber concludes something and
 * says which event made it conclude that. The result is a causal TREE — the
 * thing the customer timeline needs to answer "why am I seeing this".
 */
export async function publishDerived(
    cause: { eventId: string; correlationId: string },
    params: Omit<PublishParams, "correlationId" | "causationId">,
    writer: Writer = db
): Promise<PublishResult> {
    return publish(
        { ...params, correlationId: cause.correlationId, causationId: cause.eventId },
        writer
    )
}
