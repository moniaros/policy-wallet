import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "20")

    try {
        const logs = await (db.activityLog as any).findMany({
            where: {
                adminUserId: session.user.id // Re-using adminUserId for consistency in this schema
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

        return NextResponse.json({
            data: {
                activities: logs.map(l => ({
                    id: l.id,
                    action_type: l.actionType,
                    description: l.description,
                    timestamp: l.timestamp,
                    metadata: l.metadata ? JSON.parse(l.metadata as string) : {}
                })),
                pagination: {
                    next_cursor: nextCursor,
                    has_more: !!nextCursor
                }
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Server error", status: 500 } },
            { status: 500 }
        )
    }
}
