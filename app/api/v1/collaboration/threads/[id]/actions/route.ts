import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { requireCollaborationEntitlement } from "@/lib/api-entitlements"
import { collaborationService } from "@/lib/services/collaboration.service"

const createActionSchema = z.object({
    title: z.string().min(1).max(140),
    description: z.string().max(1000).optional(),
    assigneeUserId: z.string().min(1),
    dueDate: z.string().datetime().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const { auth } = authCheck
    const { id } = await params

    const gate = await requireCollaborationEntitlement(auth)
    if (gate) return gate

    const body = await req.json().catch(() => null)
    const parsed = createActionSchema.safeParse(body)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid action payload", 400, parsed.error.issues)
    }

    try {
        const action = await collaborationService.addAction(auth.dbUser.id, auth.dbUser.roles, id, parsed.data)
        return createApiResponse({ action })
    } catch (error: any) {
        if (error?.message === "Forbidden") return createApiError("FORBIDDEN", "Forbidden", 403)
        if (error?.message === "Invalid assignee") return createApiError("VALIDATION_ERROR", "Invalid assignee", 400)
        return createApiError("INTERNAL_ERROR", "Failed to add action", 500, String(error))
    }
}
