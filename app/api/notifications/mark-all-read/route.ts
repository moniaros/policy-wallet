import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Mark all as read (status = 'sent')
    await db.notificationEvent.updateMany({
        where: {
            userId: authResult.dbUser.id,
            channel: 'in_app',
            status: 'queued'
        },
        data: {
            status: 'sent',
            sentAt: new Date()
        }
    })

    return NextResponse.json({ success: true })
}
