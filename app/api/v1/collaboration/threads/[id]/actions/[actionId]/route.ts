import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { collaborationService } from "@/lib/services/collaboration.service"

const patchActionSchema = z.object({
    status: z.enum(["pending", "in_progress", "done", "cancelled"]),
    dueDate: z.string().datetime().refine(value => new Date(value).getTime() > Date.now(), "Future date required").optional(),
})

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; actionId: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const { auth } = authCheck
    const { id, actionId } = await params

    const body = await req.json().catch(() => null)
    const parsed = patchActionSchema.safeParse(body)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid action status payload", 400, parsed.error.issues)
    }

    try {
        const action = await collaborationService.updateActionStatus(
            auth.dbUser.id,
            auth.dbUser.roles,
            id,
            actionId,
            parsed.data.status,
            parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
        )
        return createApiResponse({ action })
    } catch (error: any) {
        if (error?.message === "Forbidden") return createApiError("FORBIDDEN", "Forbidden", 403)
        return createApiError("INTERNAL_ERROR", "Failed to update action", 500, String(error))
    }
}
