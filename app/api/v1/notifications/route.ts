import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function GET(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "20")

    try {
        const notifications = await (db as any).notificationEvent.findMany({
            where: { userId: authResult.dbUser.id },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }
        })

        let nextCursor: string | null = null
        if (notifications.length > limit) {
            const nextItem = notifications.pop()
            nextCursor = nextItem!.id
        }

        return createApiResponse({
            notifications: notifications.map((n: any) => ({
                id: n.id,
                event_type: n.eventType,
                channel: n.channel,
                status: n.status,
                title: n.title,
                message: n.message,
                related_object_type: n.relatedObjectType,
                related_object_id: n.relatedObjectId,
                created_at: n.createdAt,
                sent_at: n.sentAt
            })),
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
