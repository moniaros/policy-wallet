import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { requireCollaborationEntitlement } from "@/lib/api-entitlements"
import { collaborationService } from "@/lib/services/collaboration.service"

const createMessageSchema = z.object({
    body: z.string().min(1).max(2000),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error

    // Creates content and fans out notifications to the other party.
    const rl = await rateLimit(String(authCheck.auth.dbUser.id), 60, 3600000, `collab-message:${authCheck.auth.dbUser.id}`)
    if (!rl.success) return rl.error!
    const { auth } = authCheck
    const { id } = await params

    const gate = await requireCollaborationEntitlement(auth)
    if (gate) return gate

    const body = await req.json().catch(() => null)
    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid message payload", 400, parsed.error.issues)
    }

    try {
        const message = await collaborationService.addMessage(auth.dbUser.id, auth.dbUser.roles, id, parsed.data.body)
        return createApiResponse({ message })
    } catch (error: any) {
        if (error?.message === "Forbidden") return createApiError("FORBIDDEN", "Forbidden", 403)
        return createApiError("INTERNAL_ERROR", "Failed to add message", 500, String(error))
    }
}
