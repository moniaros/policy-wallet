import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { requireCollaborationEntitlement } from "@/lib/api-entitlements"
import { collaborationService } from "@/lib/services/collaboration.service"

const createMessageSchema = z.object({
    body: z.string().min(1).max(2000),
    /**
     * Agent-only internal note, hidden from the policyholder.
     *
     * The client has always sent this; the schema never accepted it, so Zod
     * stripped it and the note was stored PUBLIC — an advisor wrote internal
     * commentary about a client believing it was private, and the client could
     * read it. Accepting it here is the write half of a read filter that was
     * already correct.
     */
    isPrivate: z.boolean().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const { auth } = authCheck
    const { id } = await params

    const gate = await requireCollaborationEntitlement(auth)
    if (gate) return gate

    const body = await req.json().catch(() => null)
    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid message payload", 400, parsed.error.issues)
    }

    // privateNotes is a genuine Pro+ differentiator (false on free/starter) and
    // was never enforced. Refuse rather than downgrade: silently storing a note
    // the author marked private as a public message is the defect above.
    if (parsed.data.isPrivate) {
        const { canAgentUseFeature } = await import("@/lib/subscription-entitlements")
        if (!(await canAgentUseFeature(auth.dbUser.id, "privateNotes"))) {
            return createApiError(
                "UPGRADE_REQUIRED",
                "Private notes require the Pro plan or higher",
                403
            )
        }
    }

    try {
        const message = await collaborationService.addMessage(
            auth.dbUser.id,
            auth.dbUser.roles,
            id,
            parsed.data.body,
            parsed.data.isPrivate === true
        )
        return createApiResponse({ message })
    } catch (error: any) {
        if (error?.message === "Forbidden") return createApiError("FORBIDDEN", "Forbidden", 403)
        return createApiError("INTERNAL_ERROR", "Failed to add message", 500, String(error))
    }
}
