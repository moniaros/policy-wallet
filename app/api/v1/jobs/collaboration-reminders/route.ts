import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { runCollaborationReminderJobs } from "@/lib/services/collaboration-reminders.service"

export async function POST(req: Request) {
    // Shared guard: constant-time secret comparison (see api-auth).
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

    try {
        const summary = await runCollaborationReminderJobs()
        return createApiResponse({ summary })
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to run collaboration reminder jobs", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
