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
        const logs = await (db.activityLog as any).findMany({
            where: {
                adminUserId: authResult.dbUser.id
            },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { timestamp: "desc" }
        })

        let nextCursor: string | null = null
        if (logs.length > limit) {
            const nextItem = logs.pop()
            nextCursor = nextItem!.id
        }

        return createApiResponse({
            activities: logs.map((l: any) => ({
                id: l.id,
                action_type: l.actionType,
                description: l.description,
                timestamp: l.timestamp,
                metadata: l.metadata || {}
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
