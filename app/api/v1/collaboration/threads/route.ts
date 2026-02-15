import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
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
    const { auth } = authCheck

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
        return createApiError("INTERNAL_ERROR", "Failed to create collaboration thread", 500, String(error))
    }
}
