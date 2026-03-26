import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { getUserAchievements, checkAndAwardAchievements } from "@/lib/services/achievements.service"
import { NextResponse } from "next/server"

export async function GET() {
    const authResult = await requireApiUser()
    if ("error" in authResult) return authResult.error
    const userId = authResult.auth.dbUser.id

    try {
        // Check for new achievements on each fetch
        await checkAndAwardAchievements(userId)
        const achievements = await getUserAchievements(userId)
        return NextResponse.json(achievements)
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to get achievements", 500, String(error))
    }
}
