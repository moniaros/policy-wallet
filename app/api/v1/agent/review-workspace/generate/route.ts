import { withApiGuard } from '@/lib/api-guard'
import { createApiError, createApiResponse } from '@/lib/api-utils'
import { getPolicyAccess } from '@/lib/policy-access'
import { db } from '@/lib/db'
import { generateReviewSuggestion, ReviewError } from '@/lib/agent/review-workspace'
import { z } from 'zod'
export const POST = withApiGuard({ auth: { mode: 'user', roles: ['agent'] }, rateLimit: { limit: 5, windowMs: 60_000, key: ({ auth }) => `agent-suggestion:${auth?.dbUser.id}` } }, async ({ auth, req }) => {
    if (process.env.AGENT_REVIEW_WORKSPACE !== '1') return createApiError('NOT_FOUND', 'Not available', 404)
    const viewer = { id: auth!.dbUser.id, roles: auth!.dbUser.roles }
    const actor = await db.user.findUnique({ where: { id: viewer.id }, select: { aiProcessingConsentVersion: true } })
    if (!actor?.aiProcessingConsentVersion) return createApiError('AI_CONSENT_REQUIRED', 'AI consent required', 403)
    const parsed = z.object({ policyId: z.string().min(1).max(100), language: z.enum(['el', 'en']) }).safeParse(await req.json())
    if (!parsed.success) return createApiError('VALIDATION_ERROR', 'Invalid policy', 400)
    const access = await getPolicyAccess(parsed.data.policyId, viewer)
    if (!access.canRead) return createApiError('FORBIDDEN', 'Forbidden', 403)
    try { return createApiResponse(await generateReviewSuggestion(viewer, parsed.data.policyId, parsed.data.language)) }
    catch (error) { return createApiError(error instanceof ReviewError ? error.code : 'PROVIDER_FAILED', 'Suggestion unavailable', 409) }
})
