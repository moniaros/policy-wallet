import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    // Rate limiting: max 3 registration attempts per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 3, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const body = await req.json()
        const { token, platform, device_name } = body

        if (!token) return createApiError("BAD_REQUEST", "Token is required", 400)

        await db.user.update({
            where: { id: authResult.dbUser.id },
            data: {
                pushToken: token
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "DEVICE_REGISTERED",
                description: `Registered ${platform} device: ${device_name}`,
            }
        })

        logger('info', 'Device registered', { userId: authResult.dbUser.id, platform })

        return createApiResponse({ message: "Device token registered successfully" })
    } catch (error) {
        logger('error', 'Device registration failed', { userId: authResult.dbUser.id, error })
        return createApiError("INTERNAL_ERROR", "Registration failed", 500)
    }
}
