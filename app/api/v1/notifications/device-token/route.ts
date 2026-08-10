import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

/**
 * Register / unregister a browser for Web Push.
 *
 * This route previously wrote `User.pushToken` — a single column, so
 * registering a second device silently evicted the first and a customer with a
 * phone and a laptop could only ever be reached on whichever they last opted in
 * from. It also had NO caller anywhere in the codebase, which is why the column
 * was always null and every push the dispatcher recorded as "sent" was never
 * actually attempted.
 *
 * It now writes `push_devices`, one row per browser, keyed on the push
 * endpoint — which is stable for a given browser, so re-registering on every
 * visit updates rather than accumulates.
 */

const subscriptionSchema = z.object({
    endpoint: z.string().url("A push endpoint URL is required"),
    p256dh: z.string().min(1, "p256dh key is required"),
    auth: z.string().min(1, "auth secret is required"),
    platform: z.enum(["ios", "android", "web"]).optional(),
    device_name: z.string().max(200).optional(),
})

const unsubscribeSchema = z.object({
    endpoint: z.string().url(),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limiting: max 3 registration attempts per minute per USER — the
    // bare-IP key shared proxy.ts's global bucket and punished NAT'd offices.
    const limitCheck = await rateLimit(authResult.dbUser.id, 3, 60000, `device-token:${authResult.dbUser.id}`)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const parsed = subscriptionSchema.parse(await req.json())
        const userAgent = parsed.device_name || req.headers.get("user-agent")?.slice(0, 200) || null

        // Upsert on endpoint. A browser that re-subscribes returns the same
        // endpoint, so a daily visitor gets one row, not one per visit — and a
        // subscription that moves between accounts follows the new owner.
        await db.pushDevice.upsert({
            where: { endpoint: parsed.endpoint },
            create: {
                userId: authResult.dbUser.id,
                endpoint: parsed.endpoint,
                p256dh: parsed.p256dh,
                auth: parsed.auth,
                userAgent,
            },
            update: {
                userId: authResult.dbUser.id,
                p256dh: parsed.p256dh,
                auth: parsed.auth,
                userAgent,
                lastSeenAt: new Date(),
                // A re-registration is a working browser; clear the strikes it
                // accumulated while it was unreachable.
                failureCount: 0,
            },
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "DEVICE_REGISTERED",
                // The endpoint is a capability URL — anyone holding it can push
                // to this browser — so it is deliberately NOT written to the
                // audit log.
                description: `Registered ${parsed.platform || "web"} push subscription`,
            },
        })

        logger("info", "Push subscription registered", {
            userId: authResult.dbUser.id,
            platform: parsed.platform,
        })

        return createApiResponse({ message: "Push subscription registered" })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid push subscription payload", 400, error.issues)
        }
        logger("error", "Push subscription registration failed", {
            userId: authResult.dbUser.id,
            error: error instanceof Error ? error.message : String(error),
        })
        return createApiError("INTERNAL_ERROR", "Registration failed", 500)
    }
}

export async function DELETE(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const { endpoint } = unsubscribeSchema.parse(await req.json())

        // Scoped to the caller: an endpoint is guessable-ish and must not let
        // one account unsubscribe another's browser.
        await db.pushDevice.deleteMany({
            where: { endpoint, userId: authResult.dbUser.id },
        })

        return createApiResponse({ message: "Push subscription removed" })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid payload", 400, error.issues)
        }
        return createApiError("INTERNAL_ERROR", "Unsubscribe failed", 500)
    }
}
