import { describe, it, expect, vi, beforeEach } from 'vitest'
// A-01: credential PRESENCE is a query now; these mocks carry no credential, so presence is false throughout.
vi.mock("@/lib/services/credential-signals", () => ({
    passwordPresence: async () => new Set<string>(),
    hasPasswordCredential: async () => false,
    withCredentialSignals: async (_db: unknown, rows: Array<Record<string, unknown>>) => rows.map((r) => ({ ...r, hasPassword: false })),
}))
import { AppError } from '@/lib/errors'

// ── Mock side-effecting deps BEFORE importing the action module ──
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))

const mockCreateCustomer = vi.fn()
vi.mock('@/lib/services/customer.service', () => ({
    CustomerService: class {
        createCustomer(...args: unknown[]) { return mockCreateCustomer(...args) }
    },
}))
vi.mock('@/lib/services/customer-resolution.service', () => ({
    customerResolutionService: { resolveCustomerCandidates: vi.fn() },
}))
vi.mock('@/lib/services/ai/ai-service.factory', () => ({
    AIServiceFactory: {}, getAIService: vi.fn(() => ({ isAvailable: () => false })),
}))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: {} }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(async () => ({ success: true })),
    sendAiConsentRequestEmail: vi.fn(async () => ({ success: true })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

// Storage + upload validation, so a document can travel through the action.
const uploadFileDetailed = vi.fn()
const deleteFile = vi.fn(async (_url?: string) => true)
vi.mock('@/lib/storage', () => ({
    uploadFileDetailed: (...a: unknown[]) => uploadFileDetailed(...a),
    deleteFile: (url: string) => deleteFile(url),
}))
vi.mock('@/lib/security/file-upload', () => ({
    validateUploadFile: vi.fn(async () => ({
        ok: true,
        value: { ext: '.pdf', canonicalMime: 'application/pdf', displayName: 'policy.pdf' },
    })),
    sanitizeDisplayName: (s: string) => s,
    REJECTION_MESSAGES: {},
}))
// The document gate runs on the bytes inside the ingestion service, before
// storage; its verdicts have their own suite (tests/unit/ingestion). Here it
// passes the four `%PDF` bytes so this file keeps proving the ORDERING.
vi.mock('@/lib/ingestion/document-gate', () => ({
    validateDocumentForIngestion: vi.fn(async () => ({
        status: 'validated',
        documentType: 'insurance_policy',
        insuranceConfidence: 0.9,
        detectedBranch: 'motor',
        branchConfidence: 0.9,
        declaredBranch: 'motor',
        branchConsistency: 'consistent',
        reviewReasons: [],
        evidence: { pageCount: 1, textChars: 500, imageOnly: false, groupsHit: [], branchScores: {}, negativeType: null, classifier: 'deterministic' },
        documentHash: 'h'.repeat(64),
        engineVersion: 'docgate-1',
        latencyMs: 1,
    })),
    documentKindFor: () => 'policy_schedule',
    GATE_ACTIVITY: { validated: 'DOCUMENT_VALIDATED', requires_review: 'DOCUMENT_REVIEW_REQUIRED', rejected: 'DOCUMENT_REJECTED' },
}))
vi.mock('@/lib/services/policy-discard', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/services/policy-discard')>()),
    discardOrphanedUploads: vi.fn(async (urls: string[]) => {
        for (const url of urls) await deleteFile(url)
    }),
}))

const canAgentAddCustomer = vi.fn()
const canAgentAddPolicyForCustomer = vi.fn()
const canAgentRunAnalysis = vi.fn()
vi.mock('@/lib/subscription-entitlements', () => ({
    canAgentAddCustomer: (...a: unknown[]) => canAgentAddCustomer(...a),
    canAgentAddPolicyForCustomer: (...a: unknown[]) => canAgentAddPolicyForCustomer(...a),
    canAgentRunAnalysis: (...a: unknown[]) => canAgentRunAnalysis(...a),
}))
// The token pre-flight the action now runs BEFORE it answers (H1) — the same
// estimate + gate createRun applies inside the deferred run.
const preflightAnalysisTokenGate = vi.fn()
vi.mock('@/lib/services/analysis/run-preflight', () => ({
    preflightAnalysisTokenGate: (...a: unknown[]) => preflightAnalysisTokenGate(...a),
}))

const userFindUnique = vi.fn()
const userUpdate = vi.fn()
const relFindFirst = vi.fn()
const relUpdate = vi.fn()
const notifCreate = vi.fn()
const dbTransaction = vi.fn()
const policyFindFirst = vi.fn()
const policyFindUnique = vi.fn()
const policyUpdate = vi.fn()
const policyDocumentUpdateMany = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: (...a: unknown[]) => userFindUnique(...a), update: (...a: unknown[]) => userUpdate(...a) },
        customerRelationship: {
            findFirst: (...a: unknown[]) => relFindFirst(...a),
            update: (...a: unknown[]) => relUpdate(...a),
        },
        // The bus reads preferences and checks the dedupe key before writing.
        notificationEvent: { create: (...a: unknown[]) => notifCreate(...a), findFirst: vi.fn(async () => null) },
        notificationPreference: { findMany: vi.fn(async () => []) },
        policy: {
            findFirst: (...a: unknown[]) => policyFindFirst(...a),
            findUnique: (...a: unknown[]) => policyFindUnique(...a),
            update: (...a: unknown[]) => policyUpdate(...a),
        },
        policyDocument: { updateMany: (...a: unknown[]) => policyDocumentUpdateMany(...a) },
        $transaction: (...a: unknown[]) => dbTransaction(...a),
    },
}))

import { after } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { addPolicyForCustomer, commitScannedPolicy } from '@/app/(protected)/agent/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)

const AGENT = { dbUser: { id: 'agent-1', roles: 'agent', name: 'Agent A', email: 'a@x.gr', preferredLanguage: 'en' } } as any

const POLICY = {
    insurerName: 'Allianz', policyNumber: 'P-1', lineOfBusiness: 'motor',
    startDate: '2026-01-01', endDate: '2027-01-01', premiumAmount: 500,
}

beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(AGENT)
    canAgentAddCustomer.mockResolvedValue({ allowed: true })
    canAgentAddPolicyForCustomer.mockResolvedValue({ allowed: true })
    canAgentRunAnalysis.mockResolvedValue({ allowed: true })
    // A usable relationship so addPolicyForCustomer's gate passes.
    relFindFirst.mockResolvedValue({ id: 'rel-1', status: 'active' })
    relUpdate.mockResolvedValue({})
    notifCreate.mockResolvedValue({})
    userUpdate.mockResolvedValue({})
    userFindUnique.mockResolvedValue(null)
    // No pre-existing duplicate by default.
    policyFindFirst.mockResolvedValue(null)
    policyFindUnique.mockResolvedValue({ acordData: { vehicle: { plateNumber: 'ΑΒΓ-1234' } } })
    policyUpdate.mockResolvedValue({})
    policyDocumentUpdateMany.mockResolvedValue({ count: 1 })
    preflightAnalysisTokenGate.mockResolvedValue({ allowed: true, estimatedTokens: 211_000 })
    // Policy create + grant (+ document row) inside the atomic transaction.
    txPolicyDocumentCreate.mockResolvedValue({})
    dbTransaction.mockImplementation(async (fn: any) => fn(txClient()))
    uploadFileDetailed.mockResolvedValue({ url: 'https://storage/policies/k1', bucket: 'policies', key: 'k1', mimeType: 'application/pdf' })
})

const txPolicyDocumentCreate = vi.fn()
const txClient = () => ({
    policy: { create: vi.fn(async () => ({ id: 'pol-1', policyNumber: 'P-1', lineOfBusiness: 'motor', insurerName: 'Allianz' })) },
    accessGrant: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    policyDocument: { create: (...a: unknown[]) => txPolicyDocumentCreate(...a) },
})

function documentForm(): FormData {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const file = new File([bytes], 'policy.pdf', { type: 'application/pdf' })
    // jsdom's File has no arrayBuffer(); the ingestion service reads the bytes
    // through it before storage (the document gate runs on them).
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer, configurable: true })
    const fd = new FormData()
    fd.append('file', file)
    return fd
}

describe('commitScannedPolicy', () => {
    it('rejects a non-agent caller', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'u', roles: 'policyholder' } } as any)
        const res = await commitScannedPolicy({ mode: 'attach', customerId: 'c1' }, POLICY)
        expect(res).toEqual({ success: false, error: 'UNAUTHORIZED' })
    })

    it('create_new: gates the customer cap, creates the customer with ΑΦΜ, then the policy', async () => {
        mockCreateCustomer.mockResolvedValue({ policyholderUserId: 'cust-new' })

        const res = await commitScannedPolicy(
            { mode: 'create_new', customer: { name: 'Nikos', surname: 'Ioannou', email: 'nikos@x.gr', phone: '6900000000', taxId: '123456783' } },
            POLICY,
        )

        expect(canAgentAddCustomer).toHaveBeenCalledWith('agent-1')
        expect(mockCreateCustomer).toHaveBeenCalledWith('agent-1', expect.objectContaining({
            email: 'nikos@x.gr', name: 'Nikos Ioannou', phoneNumber: '6900000000', taxId: '123456783',
        }))
        expect(res).toMatchObject({ success: true, policyId: 'pol-1', customerId: 'cust-new', created: true })
    })

    it('create_new: blocks when the customer cap is reached and never creates', async () => {
        canAgentAddCustomer.mockResolvedValue({ allowed: false, current: 50, limit: 50, reason: 'cap' })

        const res = await commitScannedPolicy(
            { mode: 'create_new', customer: { name: 'N', email: 'n@x.gr' } },
            POLICY,
        )

        expect(res.success).toBe(false)
        expect(mockCreateCustomer).not.toHaveBeenCalled()
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it('create_new: on relationship conflict, falls back to attaching to the existing customer', async () => {
        mockCreateCustomer.mockRejectedValue(AppError.conflict('Customer already exists in your list'))
        userFindUnique.mockImplementation(async ({ where }: any) =>
            where?.email ? { id: 'existing-cust' } : null,
        )

        const res = await commitScannedPolicy(
            { mode: 'create_new', customer: { name: 'N', email: 'dupe@x.gr', taxId: '123456783' } },
            POLICY,
        )

        expect(res).toMatchObject({ success: true, policyId: 'pol-1', customerId: 'existing-cust', created: false })
    })

    it('attach: backfills ΑΦΜ only when the existing customer has none', async () => {
        userFindUnique.mockImplementation(async ({ select }: any) =>
            select?.taxId ? { taxId: null } : null,
        )

        await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9', taxId: '123456783' }, POLICY)

        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'cust-9' }, data: { taxId: '123456783' },
        }))
    })

    it('attach: does NOT overwrite an ΑΦΜ the customer already has', async () => {
        userFindUnique.mockImplementation(async ({ select }: any) =>
            select?.taxId ? { taxId: '999999999' } : null,
        )

        await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9', taxId: '123456783' }, POLICY)

        expect(userUpdate).not.toHaveBeenCalled()
    })

    it('warns on a duplicate (same number + branch + start date) instead of creating a second row', async () => {
        policyFindFirst.mockResolvedValue({
            id: 'pol-existing', policyNumber: 'P-1', insurerName: 'Allianz',
            lineOfBusiness: 'motor', startDate: new Date('2026-01-01'),
        })

        const res = await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9' }, POLICY)

        expect(res).toMatchObject({
            success: false,
            duplicate: true,
            existing: { policyNumber: 'P-1', insurerName: 'Allianz' },
        })
        // Data minimization: the matched row may be a policy the customer
        // uploaded themselves, which this agent holds no grant for. Only the two
        // fields the warning renders go over the wire — never the internal id,
        // which is a capability handle for every id-taking policy endpoint.
        expect((res as any).existing).not.toHaveProperty('id')
        expect(dbTransaction).not.toHaveBeenCalled() // no policy created
        // The duplicate query is scoped to owner + number + branch + start date.
        expect(policyFindFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                ownerUserId: 'cust-9',
                lineOfBusiness: 'motor',
                policyNumber: { equals: 'P-1', mode: 'insensitive' },
            }),
        }))
    })

    it('creates the policy when the agent confirms the duplicate (Add anyway)', async () => {
        policyFindFirst.mockResolvedValue({
            id: 'pol-existing', policyNumber: 'P-1', insurerName: 'Allianz',
            lineOfBusiness: 'motor', startDate: new Date('2026-01-01'),
        })

        const res = await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9' }, POLICY, false, undefined, true)

        expect(res).toMatchObject({ success: true, policyId: 'pol-1' })
        expect(policyFindFirst).not.toHaveBeenCalled() // check skipped when confirmed
        expect(dbTransaction).toHaveBeenCalled()
    })
})

/**
 * Ordering of the commit. The policy row, its grant and the customer's
 * notification used to be committed BEFORE the storage upload and the
 * document row, so a storage failure left a live, document-less policy and a
 * customer told about a document that did not exist.
 */
describe('addPolicyForCustomer — storage first, then ONE transaction, then notify', () => {
    const input = { customerId: 'cust-9', policy: POLICY }

    it('storage failure writes no policy, no grant and no notification', async () => {
        uploadFileDetailed.mockRejectedValue(new Error('bucket unavailable'))

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toEqual({ success: false, error: 'ADD_POLICY_FAILED' })
        expect(dbTransaction).not.toHaveBeenCalled()
        expect(notifCreate).not.toHaveBeenCalled()
        expect(relUpdate).not.toHaveBeenCalled()
    })

    it('the document row lands in the same transaction as the policy', async () => {
        // The bus resolves the recipient before it writes the notification row.
        userFindUnique.mockResolvedValue({ id: 'cust-9', email: 'c@x.gr', preferredLanguage: 'el' })

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toMatchObject({ success: true, policyId: 'pol-1' })
        expect(uploadFileDetailed).toHaveBeenCalledTimes(1)
        expect(dbTransaction).toHaveBeenCalledTimes(1)
        // Written through the transaction client, keyed to the policy it created.
        expect(txPolicyDocumentCreate).toHaveBeenCalledTimes(1)
        expect(txPolicyDocumentCreate.mock.calls[0]![0].data).toMatchObject({
            policyId: 'pol-1',
            storageKey: 'k1',
            storageBucket: 'policies',
            mimeType: 'application/pdf',
            source: 'agent',
        })
        expect(deleteFile).not.toHaveBeenCalled()
        // The upload completed before the transaction opened.
        expect(uploadFileDetailed.mock.invocationCallOrder[0]).toBeLessThan(dbTransaction.mock.invocationCallOrder[0])
        // …and the customer is told only after the commit.
        expect(notifCreate).toHaveBeenCalled()
        expect(dbTransaction.mock.invocationCallOrder[0]).toBeLessThan(notifCreate.mock.invocationCallOrder[0])
    })

    it('a failed transaction removes the just-stored object and notifies nobody', async () => {
        dbTransaction.mockRejectedValue(new Error('constraint'))

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toEqual({ success: false, error: 'ADD_POLICY_FAILED' })
        expect(deleteFile).toHaveBeenCalledWith('https://storage/policies/k1')
        expect(notifCreate).not.toHaveBeenCalled()
    })
})

/**
 * H1 — the analysis verdict is decided BEFORE the action answers.
 *
 * The token gate used to run only inside after(): the modal had already said
 * «εκτελείται στο παρασκήνιο» when createRun refused, and on the free agent
 * tier it refused every time (a document run estimates at ~211k tokens
 * against a 150k monthly budget), leaving the policy stuck in `analyzing`.
 * The action now applies the same gates up front and returns one of four
 * outcomes; a refused run is stamped the way the pipeline stamps one.
 */
describe('addPolicyForCustomer — the analysis outcome is decided before the action returns', () => {
    const input = { customerId: 'cust-9', policy: POLICY }
    // The customer (the policy OWNER) has consented; the bus reads the same row.
    const consentedOwner = { id: 'cust-9', email: 'c@x.gr', preferredLanguage: 'el', aiProcessingConsentVersion: '2026-07' }

    it('blocked_consent when the owner has not consented: nothing is scheduled, the policy stays active', async () => {
        userFindUnique.mockResolvedValue({ id: 'cust-9', email: 'c@x.gr', aiProcessingConsentVersion: null })

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toMatchObject({ success: true, analysis: 'blocked_consent' })
        expect(after).not.toHaveBeenCalled()
        expect(preflightAnalysisTokenGate).not.toHaveBeenCalled()
        expect(policyUpdate).not.toHaveBeenCalled()
    })

    it('blocked_quota when the monthly analyses cap is reached: stamped action_needed, retryable, never analyzing', async () => {
        userFindUnique.mockResolvedValue(consentedOwner)
        canAgentRunAnalysis.mockResolvedValue({ allowed: false, reason: 'ai_analysis_limit', used: 5, limit: 5 })

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toMatchObject({ success: true, analysis: 'blocked_quota' })
        expect(after).not.toHaveBeenCalled()
        expect(policyUpdate).toHaveBeenCalledTimes(1)
        const stamp = policyUpdate.mock.calls[0]![0]
        expect(stamp.where).toEqual({ id: 'pol-1' })
        expect(stamp.data.status).toBe('action_needed')
        expect(stamp.data.acordData).toMatchObject({
            // The plate the agent typed survives the stamp.
            vehicle: { plateNumber: 'ΑΒΓ-1234' },
            processingError: { code: 'TOKEN_LIMIT_BLOCKED', retryable: true },
        })
        expect(policyUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'analyzing' } }))
        expect(policyDocumentUpdateMany).toHaveBeenCalledWith({ where: { policyId: 'pol-1' }, data: { processingStatus: 'failed' } })
    })

    it('blocked_quota when the token gate refuses the estimated run — the same gate createRun applies', async () => {
        userFindUnique.mockResolvedValue(consentedOwner)
        preflightAnalysisTokenGate.mockResolvedValue({ allowed: false, reason: 'monthly_limit_reached', estimatedTokens: 211_000 })

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toMatchObject({ success: true, analysis: 'blocked_quota' })
        expect(preflightAnalysisTokenGate).toHaveBeenCalledWith('agent-1', { lineOfBusiness: 'motor', hasDocument: true })
        expect(after).not.toHaveBeenCalled()
        expect(policyUpdate.mock.calls[0]![0].data.status).toBe('action_needed')
        expect(policyUpdate.mock.calls[0]![0].data.acordData.processingError.message).toContain('monthly_limit_reached')
    })

    it('queued only when consent, the run cap AND the token gate all pass — then it is scheduled and marked analyzing', async () => {
        userFindUnique.mockResolvedValue(consentedOwner)

        const res = await addPolicyForCustomer(input, documentForm())

        expect(res).toMatchObject({ success: true, analysis: 'queued' })
        expect(after).toHaveBeenCalledTimes(1)
        expect(policyUpdate).toHaveBeenCalledWith({ where: { id: 'pol-1' }, data: { status: 'analyzing' } })
        expect(policyDocumentUpdateMany).not.toHaveBeenCalled()
    })

    it('none when no document was uploaded: no gate is consulted and nothing is claimed', async () => {
        userFindUnique.mockResolvedValue(consentedOwner)

        const res = await addPolicyForCustomer(input)

        expect(res).toMatchObject({ success: true, analysis: 'none' })
        expect(canAgentRunAnalysis).not.toHaveBeenCalled()
        expect(preflightAnalysisTokenGate).not.toHaveBeenCalled()
        expect(after).not.toHaveBeenCalled()
    })

    it('commitScannedPolicy forwards the verdict unchanged', async () => {
        userFindUnique.mockImplementation(async ({ where, select }: any) =>
            select?.taxId ? { taxId: '123456783' } : where?.id === 'cust-9' ? consentedOwner : null,
        )
        preflightAnalysisTokenGate.mockResolvedValue({ allowed: false, reason: 'insufficient_tokens', estimatedTokens: 211_000 })

        const res = await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9' }, POLICY, false, documentForm())

        expect(res).toMatchObject({ success: true, policyId: 'pol-1', customerId: 'cust-9', analysis: 'blocked_quota' })
    })
})
