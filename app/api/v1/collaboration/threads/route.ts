import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { requireCollaborationEntitlement } from "@/lib/api-entitlements"
import { collaborationService } from "@/lib/services/collaboration.service"

const listQuerySchema = z.object({
    relationshipId: z.string().min(1).optional(),
    policyId: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
})

const createThreadSchema = z.object({
    relationshipId: z.string().min(1),
    policyId: z.string().min(1).optional().nullable(),
    subject: z.string().min(3).max(180),
    category: z.enum(["coverage_gap", "document_request", "renewal", "questionnaire", "general"]).default("general"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    assignedToUserId: z.string().min(1).optional().nullable(),
    linkedOpportunityId: z.string().min(1).optional().nullable(),
    linkedQuestionnaireInstanceId: z.string().min(1).optional().nullable(),
    linkedGapInstanceId: z.string().min(1).optional().nullable(),
})

export async function GET(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const { auth } = authCheck

    const params = new URL(req.url).searchParams
    const parsed = listQuerySchema.safeParse({
        relationshipId: params.get("relationshipId") ?? undefined,
        policyId: params.get("policyId") ?? undefined,
        status: params.get("status") ?? undefined,
        category: params.get("category") ?? undefined,
        limit: params.get("limit") ?? undefined,
    })
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid query parameters", 400, parsed.error.issues)
    }

    try {
        const threads = await collaborationService.listThreads(auth.dbUser.id, auth.dbUser.roles, parsed.data)
        return createApiResponse({ threads })
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to list collaboration threads", 500, String(error))
    }
}

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error

    // Creates content and fans out notifications to the other party.
    const rl = await rateLimit(String(authCheck.auth.dbUser.id), 30, 3600000, `collab-thread:${authCheck.auth.dbUser.id}`)
    if (!rl.success) return rl.error!
    const { auth } = authCheck

    const gate = await requireCollaborationEntitlement(auth)
    if (gate) return gate

    const body = await req.json().catch(() => null)
    const parsed = createThreadSchema.safeParse(body)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid thread payload", 400, parsed.error.issues)
    }

    try {
        const thread = await collaborationService.createThread(auth.dbUser.id, auth.dbUser.roles, parsed.data)
        return createApiResponse({ thread })
    } catch (error: any) {
        if (error?.message === "Forbidden") return createApiError("FORBIDDEN", "Forbidden", 403)
        if (error?.message === "Relationship not found") return createApiError("NOT_FOUND", "Relationship not found", 404)
        // Deliberate policy denials, not server errors — no String(error) leak.
        if (error?.message === "Relationship not accepted yet") {
            return createApiError("FORBIDDEN", "The customer has not accepted this relationship yet", 403)
        }
        if (error?.message === "Relationship terminated") {
            return createApiError("FORBIDDEN", "This relationship has been terminated", 403)
        }
        return createApiError("INTERNAL_ERROR", "Failed to create collaboration thread", 500)
    }
}
