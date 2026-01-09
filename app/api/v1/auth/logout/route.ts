import { NextResponse } from "next/server"
import { auth, signOut } from "@/auth"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"

import { logger } from "@/lib/logger"

export async function POST() {
    try {
        const session = await auth()
        const sessionId = (session?.user as any)?.sessionId

        // 1. Invalidate whitelisted session in DB
        if (sessionId) {
            await db.activeSession.delete({
                where: { id: sessionId }
            }).catch(() => {
                // Ignore if session already deleted or non-existent
            })
        }

        // 2. Perform NextAuth signout (clears cookies/JWT)
        // Note: We rely on DB session invalidation. Client should handle cookie clearing.
        // await signOut({ redirect: false })

        return createApiResponse({ message: "Logged out successfully" })
    } catch (error) {
        logger('error', 'Logout failed', { error })
        return createApiError("INTERNAL_ERROR", "Logout failed", 500)
    }
}
