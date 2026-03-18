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
