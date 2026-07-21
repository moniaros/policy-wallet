import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export async function hasProcessedWebhookEvent(provider: string, eventId: string) {
    return db.processedWebhookEvent.findUnique({
        where: {
            provider_eventId: {
                provider,
                eventId,
            },
        },
    })
}

/**
 * Atomically claim a webhook event for processing. The unique (provider,
 * eventId) constraint makes this race-safe where check-then-mark is not:
 * concurrent redeliveries of the same event both passed the
 * `hasProcessedWebhookEvent` check and double-processed. Exactly one caller
 * gets `true`; everyone else gets `false` and must skip.
 *
 * If the handler fails after claiming, call `releaseWebhookEventClaim` so the
 * provider's retry can reprocess — otherwise the event is silently dropped.
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return false
        }
        throw error
    }
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
