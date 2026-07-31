import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { runChurnPreventionJob } from "@/lib/services/churn-prevention.service"

export async function POST(req: Request) {
    // Shared guard: constant-time secret comparison (see api-auth).
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

    try {
        const summary = await runChurnPreventionJob()
        return createApiResponse({ summary })
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run churn prevention job", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
