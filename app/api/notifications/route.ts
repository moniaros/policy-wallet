import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Fetch notifications for the user
    const notifications = await db.notificationEvent.findMany({
        where: {
            userId: authResult.dbUser.id,
            channel: 'in_app',
            ...(unreadOnly ? { status: 'queued' } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    })

    // Get unread count
    const unreadCount = await db.notificationEvent.count({
        where: {
            userId: authResult.dbUser.id,
            channel: 'in_app',
            status: 'queued' // Using 'queued' as unread, 'sent' as read
        }
    })

    return NextResponse.json({
        notifications: notifications.map(n => ({
            id: n.id,
            eventType: n.eventType,
            title: n.title,
            message: n.message,
            relatedObjectType: n.relatedObjectType,
            relatedObjectId: n.relatedObjectId,
            isRead: n.status === 'sent',
            createdAt: n.createdAt.toISOString()
        })),
        unreadCount
    })
}
