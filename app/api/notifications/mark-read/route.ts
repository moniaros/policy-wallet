import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

/**
 * Mark one notification read.
 *
 * Writes `readAt` — the single definition of read. It used to write
 * `status: 'sent'` and `sentAt: new Date()`, which did two wrong things at once:
 * the shell badge (counting `readAt`) never moved, so reading a notification in
 * the bell left the badge stuck; and stamping `sentAt` on read overwrote the
 * delivery timestamp, so the row could no longer say when it was actually sent.
 */
export async function POST(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
        return NextResponse.json({ error: "notificationId required" }, { status: 400 })
    }

    // updateMany, not update: the ownership check belongs in the WHERE clause so
    // another user's id simply matches nothing instead of throwing.
    await db.notificationEvent.updateMany({
        where: {
            id: notificationId,
            userId: authResult.dbUser.id,
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    return NextResponse.json({ success: true })
}
