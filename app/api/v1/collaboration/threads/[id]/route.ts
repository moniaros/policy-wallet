import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { collaborationService } from "@/lib/services/collaboration.service"

const statusSchema = z.object({
    status: z.enum(["open", "waiting_policyholder", "waiting_agent", "resolved", "closed"]),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const { auth } = authCheck
    const { id } = await params

    const thread = await collaborationService.getThreadDetail(auth.dbUser.id, auth.dbUser.roles, id)
    if (!thread) return createApiError("NOT_FOUND", "Thread not found", 404)

    return createApiResponse({ thread })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const { auth } = authCheck
    const { id } = await params

    const body = await req.json().catch(() => null)
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid status payload", 400, parsed.error.issues)
    }

    try {
        const thread = await collaborationService.updateThreadStatus(auth.dbUser.id, auth.dbUser.roles, id, parsed.data.status)
        return createApiResponse({ thread })
    } catch (error: any) {
        if (error?.message === "Forbidden") return createApiError("FORBIDDEN", "Forbidden", 403)
        return createApiError("INTERNAL_ERROR", "Failed to update thread status", 500, String(error))
    }
}
