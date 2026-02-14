import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

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
