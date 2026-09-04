import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock side-effecting deps BEFORE importing the action module ──
// createPolicy's limit branch must RETURN a structured code, never throw:
// prod builds redact thrown server-action messages to a digest, so a throw
// can never reach the client's upgrade-modal mapping (POLICYWALLET-E).
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
// Keep the REAL exports (MAX_DOCUMENTS_PER_POLICY and friends — actions.ts now
// imports the shared cap instead of re-declaring 20) and stub only the name
// sanitiser. A hand-listed factory hides every export it forgets, and the
// failure surfaces in whichever suite happens to import the changed file.
vi.mock('@/lib/security/file-upload', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/security/file-upload')>()),
    sanitizeDisplayName: (s: string) => s,
}))
vi.mock('@/lib/supabase/storage-download', () => ({ isOwnedStorageUrl: vi.fn(() => true) }))
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/api-auth', () => ({ hasAnyRole: vi.fn(() => false) }))
vi.mock('@/lib/services/ai', () => ({ getAIService: vi.fn() }))
vi.mock('@/lib/services/gap-analysis.service', () => ({ GapAnalysisService: class { } }))
vi.mock('@/lib/services/analysis/analysis-queue', () => ({ enqueueAnalysisRun: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/policy-status', () => ({ resolveCoverageEndDate: vi.fn() }))
vi.mock('@/lib/services/policy.service', () => ({ PolicyService: class { } }))
vi.mock('@/lib/token-tracking', () => ({ canUserUseTokens: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({ resolveUserEntitlements: vi.fn() }))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: {} }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(),
    sendPolicySharedAccessEmail: vi.fn(),
}))
vi.mock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
    PolicyAnalysisOrchestratorService: class { },
}))
vi.mock('@/lib/wallet/policy-review', () => ({
    buildPolicyReviewData: vi.fn(),
    sumInsuredTargetPath: vi.fn(),
}))

const getUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({ auth: { getUser: (...a: unknown[]) => getUser(...a) } })),
}))

const canUserAddPolicy = vi.fn()
vi.mock('@/lib/subscription-limits', () => ({
    canUserAddPolicy: (...a: unknown[]) => canUserAddPolicy(...a),
    canUserUseFeature: vi.fn(),
    getUserSubscription: vi.fn(),
    SUBSCRIPTION_LIMITS: {},
}))

const recordConversionEvent = vi.fn()
vi.mock('@/lib/journey/conversion-events', () => ({
    recordConversionEvent: (...a: unknown[]) => recordConversionEvent(...a),
}))

const userFindUnique = vi.fn()
const dbTransaction = vi.fn()
const activityLogCreate = vi.fn()
const policyCreate = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
        activityLog: { create: (...a: unknown[]) => activityLogCreate(...a) },
        // A manual entry (no document) is one atomic policy write.
        policy: { create: (...a: unknown[]) => policyCreate(...a) },
        $transaction: (...a: unknown[]) => dbTransaction(...a),
    },
}))
// A document travels through the ingestion service (its own suite); this file
// is about the policy cap and the manual entry.
vi.mock('@/lib/ingestion/ingest-policy-document', () => ({ ingestPolicyDocument: vi.fn() }))

import { createPolicy } from '@/app/(protected)/wallet/actions'

function validFormData() {
    const fd = new FormData()
    fd.set('insurerName', 'Test Insurer')
    fd.set('policyNumber', 'PN-1')
    fd.set('lineOfBusiness', 'motor')
    fd.set('startDate', '2026-01-01')
    fd.set('endDate', '2027-01-01')
    return fd
}

beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'sb-1', email: 'user@example.test', user_metadata: {} } } })
    userFindUnique.mockResolvedValue({ id: 'db-user-1' })
})

describe('createPolicy at the policy cap', () => {
    it('returns the structured POLICY_LIMIT_REACHED code instead of throwing', async () => {
        canUserAddPolicy.mockResolvedValue({ allowed: false })

        await expect(createPolicy(validFormData())).resolves.toEqual({ error: 'POLICY_LIMIT_REACHED' })
        expect(dbTransaction).not.toHaveBeenCalled()
        expect(policyCreate).not.toHaveBeenCalled()
    })

    it('records the limit_hit conversion event', async () => {
        canUserAddPolicy.mockResolvedValue({ allowed: false })

        await createPolicy(validFormData())

        expect(recordConversionEvent).toHaveBeenCalledWith(
            'db-user-1',
            'limit_hit',
            { kind: 'policy', source: 'create_policy' },
        )
    })
})

describe('createPolicy under the cap', () => {
    it('creates a manual (document-less) policy as active and returns the policyId', async () => {
        canUserAddPolicy.mockResolvedValue({ allowed: true })
        policyCreate.mockResolvedValue({ id: 'pol-1', policyNumber: 'PN-1', insurerName: 'Test Insurer' })
        activityLogCreate.mockResolvedValue({})

        await expect(createPolicy(validFormData())).resolves.toEqual({ success: true, policyId: 'pol-1' })
        expect(policyCreate).toHaveBeenCalledTimes(1)
        expect(policyCreate.mock.calls[0]![0]).toMatchObject({ data: { status: 'active', lineOfBusiness: 'motor' } })
    })
})
