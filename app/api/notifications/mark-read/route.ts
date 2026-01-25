import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
        return NextResponse.json({ error: "notificationId required" }, { status: 400 })
    }

    // Mark as read (status = 'sent')
    await db.notificationEvent.update({
        where: {
            id: notificationId,
            userId: authResult.dbUser.id // Ensure user owns this notification
        },
        data: {
            status: 'sent',
            sentAt: new Date()
        }
    })

    return NextResponse.json({ success: true })
}
