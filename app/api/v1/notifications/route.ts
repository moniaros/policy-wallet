import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { resolveStoredNotification } from "@/lib/notifications/stored-content"
import { groupNotificationEventRows, type DeliveryRowLike } from "@/lib/notifications/event-grouping"
import { z } from "zod"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

const notificationsQuerySchema = z.object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { searchParams } = new URL(req.url)
    const queryParse = notificationsQuerySchema.safeParse({
        cursor: searchParams.get("cursor") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
    })
    if (!queryParse.success) {
        return createApiError("VALIDATION_ERROR", "Invalid query parameters", 400, queryParse.error.issues)
    }
    const { cursor, limit } = queryParse.data

    try {
        const notifications = await (db as any).notificationEvent.findMany({
            // Every real channel — the `analytics` mirror shares this table
            // but is not a notification and must not be served as one. The
            // per-channel rows fetched here are collapsed to EVENTS below
            // (§2.7): a customer-facing list must not show one emission once
            // per channel. All channels are fetched, rather than pinning
            // `in_app`, so an event with no in-app arm (an email-only send)
            // still appears once.
            where: { userId: authResult.dbUser.id, channel: { not: "analytics" } },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }
        })

        // The cursor walks DELIVERY rows (grouping happens after the page is
        // cut), so no row is ever skipped. Known, accepted limit: an event
        // whose channel rows straddle a page boundary can surface once per
        // page. Rows of one emission are written in the same dispatch call
        // and sit adjacent in createdAt order, so the window is milliseconds
        // wide; solving it outright needs an event table, i.e. a schema
        // change this fix is barred from (§12.2).
        let nextCursor: string | null = null
        if (notifications.length > limit) {
            const nextItem = notifications.pop()
            nextCursor = nextItem!.id
        }
        const events = groupNotificationEventRows(
            notifications as Array<
                DeliveryRowLike & {
                    eventType: string
                    status: string
                    title: string | null
                    message: string | null
                    relatedObjectType: string | null
                    relatedObjectId: string | null
                    sentAt: Date | null
                }
            >
        )

        // Presented, never raw: legacy rows can carry internal English
        // documentation, which the shared presenter substitutes with the
        // event's canonical bilingual copy in this reader's language.
        const readerLang = resolveUserLanguage(authResult.dbUser.preferredLanguage)
        return createApiResponse({
            // One item per event, spoken for by its representative row (the
            // in-app arm when one exists). No `channel` field: delivery
            // channel is not customer-facing information, and the only
            // in-repo consumer (PolicyWalletClient's completion toast)
            // never read it.
            notifications: events.map(({ representative: n }) => {
                const presented = resolveStoredNotification(n.eventType, n.title, n.message, readerLang)
                return ({
                id: n.id,
                event_type: n.eventType,
                status: n.status,
                title: presented.title,
                message: presented.message,
                related_object_type: n.relatedObjectType,
                related_object_id: n.relatedObjectId,
                created_at: n.createdAt,
                sent_at: n.sentAt
            })}),
            pagination: {
                next_cursor: nextCursor,
                has_more: !!nextCursor
            }
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}
