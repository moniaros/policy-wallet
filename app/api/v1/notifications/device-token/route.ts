import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const deviceTokenSchema = z.object({
    token: z.string().min(1, "Token is required"),
    platform: z.enum(["ios", "android", "web"]).optional(),
    device_name: z.string().optional(),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limiting: max 3 registration attempts per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 3, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const { token, platform, device_name } = deviceTokenSchema.parse(await req.json())

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
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid device token payload", 400, error.issues)
        }
        logger('error', 'Device registration failed', { userId: authResult.dbUser.id, error })
        return createApiError("INTERNAL_ERROR", "Registration failed", 500)
    }
}
