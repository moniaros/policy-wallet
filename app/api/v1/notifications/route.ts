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
        const notifications = await (db as any).notificationEvent.findMany({
            where: { userId: session.user.id },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }
        })

        let nextCursor: string | null = null
        if (notifications.length > limit) {
            const nextItem = notifications.pop()
            nextCursor = nextItem!.id
        }

        return NextResponse.json({
            data: {
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
