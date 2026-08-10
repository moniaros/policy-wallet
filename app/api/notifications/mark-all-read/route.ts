import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

/**
 * Mark every in-app notification read.
 *
 * Writes `readAt`, matching the server action on /notifications. The two used to
 * write different columns, so "mark all read" in the bell left the
 * /notifications page's own count untouched, and vice versa.
 */
export async function POST(_request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await db.notificationEvent.updateMany({
        where: {
            userId: authResult.dbUser.id,
            channel: 'in_app',
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    return NextResponse.json({ success: true })
}
