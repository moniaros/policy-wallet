import { db } from "@/lib/db"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { getPolicyAccess } from "@/lib/policy-access"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { withApiGuard } from "@/lib/api-guard"

const UpdatePolicySchema = z.object({
    policyNumber: z.string().optional(),
    insurerName: z.string().optional(),
    startDate: z.string().pipe(z.coerce.date()).optional(),
    endDate: z.string().pipe(z.coerce.date()).optional(),
    premiumAmount: z.number().optional(),
    status: z.string().optional(),
})

const policyIdParamsSchema = z.object({
    id: z.string().min(1),
})

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    const access = await getPolicyAccess(id, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })
    if (!access.exists) return createApiError("NOT_FOUND", "Policy not found", 404)
    if (!access.canRead) return createApiError("FORBIDDEN", "Access denied", 403)

    try {
        const policy = await db.policy.findUnique({
            where: { id },
            include: {
                documents: true,
                gapInstances: {
                    where: { resolvedAt: null },
                    include: { definition: true }
                }
            }
        })

        if (!policy) return createApiError("NOT_FOUND", "Policy not found", 404)

        const highlights = [
            `Policy Number: ${policy.policyNumber}`,
            `Insurer: ${policy.insurerName}`,
            `LOB: ${policy.lineOfBusiness}`,
            `Valid until: ${policy.endDate.toDateString()}`
        ]

        // Explicit projection — the old full-row spread also re-shipped the raw
        // gapInstances include and internal ids alongside the mapped fields.
        return createApiResponse({
            id: policy.id,
            policyNumber: policy.policyNumber,
            insurerName: policy.insurerName,
            lineOfBusiness: policy.lineOfBusiness,
            status: policy.status,
            startDate: policy.startDate,
            endDate: policy.endDate,
            coverageEndDate: policy.coverageEndDate,
            premiumAmount: policy.premiumAmount,
            premiumCurrency: policy.premiumCurrency,
            coverageSummary: policy.coverageSummary,
            acordData: policy.acordData,
            lastAnalyzedAt: policy.lastAnalyzedAt,
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt,
            highlights,
            gaps: {
                count: policy.gapInstances.length,
                items: policy.gapInstances.map(gi => ({
                    id: gi.id,
                    gap_definition_id: gi.gapDefinitionId,
                    title: (gi.definition as any).title,
                    description: (gi.definition as any).description,
                    severity: gi.severity,
                    status: gi.status,
                    ai_explanation: gi.aiExplanation,
                    ai_suggestion: gi.aiSuggestion,
                    detected_at: gi.detectedAt
                }))
            }
        })
    } catch (error) {
        logger('error', 'Fetch policy failed', { id, error, userId: authResult.dbUser.id })
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}

export const PATCH = withApiGuard(
    {
        auth: { mode: "user" },
        validation: {
            params: policyIdParamsSchema,
            body: UpdatePolicySchema,
        },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ auth, params }) => `policy:update:${auth?.dbUser.id || "anonymous"}:${(params as { id: string }).id}`,
        },
    },
    async ({ auth, params, body }) => {
        const authResult = auth!
        const { id } = params

        const access = await getPolicyAccess(id, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        if (!access.exists) return createApiError("NOT_FOUND", "Policy not found", 404)
        if (!access.canWrite) return createApiError("FORBIDDEN", "You do not have permission to edit this policy", 403)

        try {
            const policy = await db.policy.update({
                where: { id },
                data: body!
            })

            return createApiResponse(policy)
        } catch (error) {
            console.error(error)
            return createApiError("BAD_REQUEST", "Update failed", 400)
        }
    }
)

export const DELETE = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: policyIdParamsSchema },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth, params }) => `policy:delete:${auth?.dbUser.id || "anonymous"}:${(params as { id: string }).id}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const { id } = params

        const access = await getPolicyAccess(id, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        if (!access.exists) return createApiError("NOT_FOUND", "Policy not found", 404)
        if (!access.canDelete) return createApiError("FORBIDDEN", "You do not have permission to delete this policy", 403)

        try {
            await db.policy.update({
                where: { id },
                data: { status: "deleted" }
            })

            // Log Activity
            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_DELETED",
                    description: `Soft-deleted policy ${id}`,
                    metadata: { policyId: id }
                }
            })

            logger('info', 'Policy soft-deleted', { id, userId: authResult.dbUser.id })

            return createApiResponse({ message: "Policy deleted successfully" })
        } catch (error) {
            logger('error', 'Delete policy failed', { id, error, userId: authResult.dbUser.id })
            return createApiError("INTERNAL_ERROR", "Delete failed", 500)
        }
    }
)
