import { db, isUniqueConstraintViolation } from "@/lib/db"
import { logger } from "@/lib/logger"

// How long a claim may sit in 'processing' before another delivery may take it
// over. Webhook handlers run well under this; a claim older than the TTL means
// its holder died mid-handler (timeout/OOM/deploy) — without takeover, every
// provider retry would be answered "duplicate" and the event silently dropped.
const CLAIM_TTL_MS = 5 * 60 * 1000

/**
 * Atomically claim a webhook event for processing. The unique (provider,
 * eventId) constraint makes this race-safe where check-then-mark was not:
 * concurrent redeliveries of the same event both passed the old existence
 * check and double-processed. Exactly one caller gets `true`.
 *
 * A row stuck in 'processing' past CLAIM_TTL_MS (holder died mid-handler) is
 * taken over by the next delivery instead of shadowing it forever.
 */
export async function claimWebhookEvent(args: {
    provider: string
    eventId: string
    sourceRoute?: string
}): Promise<boolean> {
    try {
        await db.processedWebhookEvent.create({
            data: {
                provider: args.provider,
                eventId: args.eventId,
                sourceRoute: args.sourceRoute,
                status: "processing",
            },
        })
        return true
    } catch (error) {
        if (!isUniqueConstraintViolation(error)) {
            throw error
        }
    }

    // Row exists — reclaim it only if it is an expired 'processing' claim.
    // processedAt doubles as the claim timestamp (set on create, refreshed here).
    const takeover = await db.processedWebhookEvent.updateMany({
        where: {
            provider: args.provider,
            eventId: args.eventId,
            status: "processing",
            processedAt: { lt: new Date(Date.now() - CLAIM_TTL_MS) },
        },
        data: {
            processedAt: new Date(),
            sourceRoute: args.sourceRoute,
        },
    })
    if (takeover.count === 1) {
        logger("warn", "Webhook event claim taken over from a dead holder", {
            provider: args.provider,
            eventId: args.eventId,
        })
        return true
    }
    return false
}

/**
 * Release a claim after a handler error so the provider's retry is not
 * treated as a duplicate. Only removes rows still in "processing" — a claim
 * finalized via `markWebhookEventProcessed` is never released.
 */
export async function releaseWebhookEventClaim(provider: string, eventId: string) {
    await db.processedWebhookEvent.deleteMany({
        where: {
            provider,
            eventId,
            status: "processing",
        },
    })
}

export async function markWebhookEventProcessed(args: {
    provider: string
    eventId: string
    sourceRoute?: string
    status?: "processed" | "ignored" | "failed"
    result?: unknown
}) {
    const { provider, eventId, sourceRoute, status = "processed", result } = args

    await db.processedWebhookEvent.upsert({
        where: {
            provider_eventId: {
                provider,
                eventId,
            },
        },
        update: {
            status,
            sourceRoute,
            result: result as any,
            processedAt: new Date(),
        },
        create: {
            provider,
            eventId,
            sourceRoute,
            status,
            result: result as any,
        },
    })
}

/**
 * The full claim → handle → finalize lifecycle in one place, so no webhook
 * route can copy the pattern and drop the release-on-error branch.
 *
 * Returns "duplicate" when another delivery holds a live claim (skip and ack),
 * or "processed" after the handler ran and the claim was finalized with the
 * handler's return value as the recorded result. A handler throw releases the
 * claim (so the provider's retry reprocesses) and rethrows.
 */
export async function processWebhookEventOnce(
    args: {
        provider: string
        eventId: string
        sourceRoute: string
    },
    handler: () => Promise<unknown | void>
): Promise<"processed" | "duplicate"> {
    const claimed = await claimWebhookEvent(args)
    if (!claimed) {
        return "duplicate"
    }

    let result: unknown
    try {
        result = await handler()
    } catch (handlerError) {
        await releaseWebhookEventClaim(args.provider, args.eventId).catch(() => {})
        throw handlerError
    }

    await markWebhookEventProcessed({
        provider: args.provider,
        eventId: args.eventId,
        sourceRoute: args.sourceRoute,
        status: "processed",
        result: result ?? undefined,
    })
    return "processed"
}
