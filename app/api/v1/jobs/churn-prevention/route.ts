import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { runChurnPreventionJob } from "@/lib/services/churn-prevention.service"

export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get("x-cron-secret")
    const authHeader = req.headers.get("authorization")
    const bearerSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null
    const isCronAuthorized = Boolean(
        cronSecret &&
        (
            (headerSecret && headerSecret === cronSecret) ||
            (bearerSecret && bearerSecret === cronSecret)
        )
    )

    if (!isCronAuthorized) {
        const authCheck = await requireApiUser({ roles: ["admin"] })
        if ("error" in authCheck) return authCheck.error
    }

    try {
        const summary = await runChurnPreventionJob()
        return createApiResponse({ summary })
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run churn prevention job", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
