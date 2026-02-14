import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const activityLogQuerySchema = z.object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(req: Request) {
    const authCheck = await requireApiUser({ roles: ["admin"] })
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { searchParams } = new URL(req.url)
    const queryParse = activityLogQuerySchema.safeParse({
        cursor: searchParams.get("cursor") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
    })
    if (!queryParse.success) {
        return createApiError("VALIDATION_ERROR", "Invalid query parameters", 400, queryParse.error.issues)
    }
    const { cursor, limit } = queryParse.data

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
