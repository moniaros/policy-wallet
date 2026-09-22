import { withApiGuard } from '@/lib/api-guard'
import { createApiError, createApiResponse } from '@/lib/api-utils'
import { executeReviewCommand, readReviewWorkspace, reviewCommand, ReviewError } from '@/lib/agent/review-workspace'
import { getPolicyAccess } from '@/lib/policy-access'
import { z } from 'zod'

const guard = { auth: { mode: 'user' as const, roles: ['agent' as const] }, rateLimit: { limit: 30, windowMs: 60_000, key: ({ auth }: any) => `agent-review:${auth?.dbUser.id}` } }
const enabled = () => process.env.AGENT_REVIEW_WORKSPACE === '1'
export const GET = withApiGuard(guard, async ({ auth, req }) => {
    if (!enabled()) return createApiError('NOT_FOUND', 'Not available', 404)
    const parsed = z.string().min(1).max(100).safeParse(new URL(req.url).searchParams.get('policyId'))
    if (!parsed.success) return createApiError('VALIDATION_ERROR', 'Invalid policy', 400)
    const viewer = { id: auth!.dbUser.id, roles: auth!.dbUser.roles }
    const access = await getPolicyAccess(parsed.data, viewer)
    if (!access.canRead) return createApiError('FORBIDDEN', 'Forbidden', 403)
    try { return createApiResponse(await readReviewWorkspace(viewer, parsed.data)) }
    catch (error) { return failure(error) }
})
export const POST = withApiGuard(guard, async ({ auth, req }) => {
    if (!enabled()) return createApiError('NOT_FOUND', 'Not available', 404)
    const parsed = reviewCommand.safeParse(await req.json())
    if (!parsed.success) return createApiError('VALIDATION_ERROR', 'Invalid review', 400)
    const viewer = { id: auth!.dbUser.id, roles: auth!.dbUser.roles }
    const access = await getPolicyAccess(parsed.data.policyId, viewer)
    if (!access.canRead) return createApiError('FORBIDDEN', 'Forbidden', 403)
    try { return createApiResponse(await executeReviewCommand(viewer, parsed.data)) }
    catch (error) { return failure(error) }
})
function failure(error: unknown) {
    if (error instanceof ReviewError) return createApiError(error.code, error.code, error.code === 'FORBIDDEN' ? 403 : 409)
    return createApiError('REVISION_CONFLICT', 'Unable to save. Refresh and retry.', 409)
}
