import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), reserve: vi.fn(), release: vi.fn(), ask: vi.fn(), tx: { user: { findMany: vi.fn() }, customerRelationship: { findFirst: vi.fn() }, policy: { findUniqueOrThrow: vi.fn() }, agentReviewRevision: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }, collaborationThread: { create: vi.fn() }, collaborationMessage: { create: vi.fn() } } }))
vi.mock('@/lib/db', () => ({ db: { $transaction: (fn: any) => fn(mocks.tx) } }))
vi.mock('@/lib/policy-access', () => ({ getPolicyAccess: mocks.access }))
vi.mock('@/lib/token-tracking', () => ({ reserveTokens: mocks.reserve, releaseTokenReservation: mocks.release }))
vi.mock('@/lib/services/ai/gateway', () => ({ aiGateway: { askQuestion: mocks.ask } }))
import { executeReviewCommand, generateReviewSuggestion } from '@/lib/agent/review-workspace'
import { approvalDigest, sourceDigest } from '@/lib/agent/review-contract'
const viewer = { id: 'agent-a', roles: 'agent' }
const policy = { id: 'p', ownerUserId: 'customer-a', status: 'active', updatedAt: new Date('2026-09-21'), acordData: {}, documents: [], gapInstances: [], analysisRuns: [] }
const revision = { id: 'r', policyId: 'p', userId: 'agent-a', recipientUserId: 'customer-a', body: 'Review the limit on page 2.', language: 'en', channel: 'collaboration', sourceDigest: sourceDigest(policy), status: 'approved' }
beforeEach(() => {
    vi.clearAllMocks()
    mocks.access.mockResolvedValue({ canRead: true, hasAgentRelationship: true, policy })
    mocks.tx.customerRelationship.findFirst.mockResolvedValue({ id: 'relationship-a', status: 'active' })
    mocks.tx.policy.findUniqueOrThrow.mockResolvedValue(policy)
    mocks.tx.agentReviewRevision.findFirst.mockResolvedValue({ ...revision, approvalDigest: approvalDigest(revision) })
    mocks.tx.agentReviewRevision.update.mockImplementation(async ({ data }: any) => ({ ...revision, ...data }))
    mocks.tx.collaborationThread.create.mockResolvedValue({ id: 'thread-a' })
    mocks.tx.collaborationMessage.create.mockResolvedValue({ id: 'review-r' })
})
const send = () => executeReviewCommand(viewer, { operation: 'deliver', policyId: 'p', revisionId: 'r', digest: approvalDigest(revision) })
describe('private review delivery', () => {
    it('copies approved body only and binds the recipient through the live relationship', async () => {
        const result = await send()
        expect(result.status).toBe('delivered')
        expect(mocks.tx.collaborationThread.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ relationshipId: 'relationship-a', policyId: 'p' }) }))
        expect(mocks.tx.collaborationMessage.create).toHaveBeenCalledWith({ data: { id: 'review-r', threadId: 'thread-a', senderUserId: 'agent-a', body: revision.body, messageType: 'comment', isPrivate: false, metadata: { approvedRevisionId: 'r' } } })
    })
    it('does not redeliver an already delivered revision', async () => {
        mocks.tx.agentReviewRevision.findFirst.mockResolvedValue({ ...revision, status: 'delivered' })
        await send()
        expect(mocks.tx.collaborationMessage.create).not.toHaveBeenCalled()
    })
    it('refuses a changed source and unapproved content', async () => {
        mocks.tx.policy.findUniqueOrThrow.mockResolvedValue({ ...policy, acordData: { corrected: true } })
        await expect(send()).rejects.toThrow('STALE_REVIEW')
        mocks.tx.policy.findUniqueOrThrow.mockResolvedValue(policy)
        mocks.tx.agentReviewRevision.findFirst.mockResolvedValue({ ...revision, status: 'draft' })
        await expect(send()).rejects.toThrow('NOT_APPROVED')
        expect(mocks.tx.collaborationMessage.create).not.toHaveBeenCalled()
    })
    it('requires policy access and a live relationship even with an old draft', async () => {
        mocks.access.mockResolvedValue({ canRead: false, hasAgentRelationship: true, policy })
        await expect(send()).rejects.toThrow('FORBIDDEN')
        mocks.access.mockResolvedValue({ canRead: true, hasAgentRelationship: true, policy })
        mocks.tx.customerRelationship.findFirst.mockResolvedValue(null)
        await expect(send()).rejects.toThrow('FORBIDDEN')
        expect(mocks.tx.agentReviewRevision.findFirst).not.toHaveBeenCalled()
    })
    it('keeps pending relationships private: approval cannot bypass customer acceptance', async () => {
        mocks.tx.customerRelationship.findFirst.mockResolvedValue({ id: 'relationship-a', status: 'pending_activation' })
        await expect(send()).rejects.toThrow('FORBIDDEN')
        expect(mocks.tx.collaborationMessage.create).not.toHaveBeenCalled()
    })
    it('scopes revisions to the acting agent and policy', async () => {
        mocks.tx.agentReviewRevision.findFirst.mockResolvedValue(null)
        await expect(send()).rejects.toThrow('FORBIDDEN')
        expect(mocks.tx.agentReviewRevision.findFirst).toHaveBeenCalledWith({ where: { userId: 'agent-a', policyId: 'p', id: 'r' } })
    })
    it('invalidates approval on rejection without altering customer data', async () => {
        await executeReviewCommand(viewer, { operation: 'feedback', policyId: 'p', revisionId: 'r', feedback: 'reject', note: 'Evidence missing', reuseApproved: false })
        expect(mocks.tx.agentReviewRevision.update).toHaveBeenCalledWith({ where: { id: 'r' }, data: { feedback: 'reject', feedbackNote: 'Evidence missing', reuseApproved: false, status: 'draft', approvalDigest: null, approvedAt: null } })
        expect(mocks.tx.collaborationMessage.create).not.toHaveBeenCalled()
    })
})


describe('private AI suggestion boundaries', () => {
    beforeEach(() => {
        mocks.tx.user.findMany.mockResolvedValue([{ id: 'agent-a', aiProcessingConsentVersion: 'v1' }, { id: 'customer-a', aiProcessingConsentVersion: 'v1' }])
        mocks.tx.agentReviewRevision.findMany.mockResolvedValue([])
        mocks.reserve.mockResolvedValue({ allowed: true, source: 'subscription' })
        mocks.release.mockResolvedValue(undefined)
        mocks.ask.mockResolvedValue(JSON.stringify({ rationale: 'Private context', uncertainties: ['Unknown limit'], questions: ['Confirm limit?'], actions: ['Review source'], customerDraft: 'Please confirm the recorded limit.' }))
        mocks.tx.agentReviewRevision.create.mockImplementation(async ({ data }: any) => ({ id: 'generated', ...data }))
    })
    it('blocks consent and quota failures before contacting any provider', async () => {
        mocks.tx.user.findMany.mockResolvedValue([{ id: 'agent-a', aiProcessingConsentVersion: 'v1' }])
        await expect(generateReviewSuggestion(viewer, 'p', 'en')).rejects.toThrow('AI_CONSENT_REQUIRED')
        expect(mocks.ask).not.toHaveBeenCalled()
        mocks.tx.user.findMany.mockResolvedValue([{ id: 'agent-a', aiProcessingConsentVersion: 'v1' }, { id: 'customer-a', aiProcessingConsentVersion: 'v1' }])
        mocks.reserve.mockResolvedValue({ allowed: false })
        await expect(generateReviewSuggestion(viewer, 'p', 'en')).rejects.toThrow('QUOTA_REQUIRED')
        expect(mocks.ask).not.toHaveBeenCalled()
    })
    it('stores private advice apart from customer text and reuses only opted-in same-policy examples', async () => {
        const result = await generateReviewSuggestion(viewer, 'p', 'en')
        expect(result.body).toBe('Please confirm the recorded limit.')
        expect(result.privateAdvice).toMatchObject({ rationale: 'Private context' })
        expect(result.status).not.toBe('approved')
        expect(mocks.tx.agentReviewRevision.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'agent-a', policyId: 'p', feedback: 'accept', reuseApproved: true } }))
        expect(mocks.tx.collaborationMessage.create).not.toHaveBeenCalled()
        expect(mocks.release).toHaveBeenCalled()
    })
    it('does not store generated English prose as a Greek draft', async () => {
        await expect(generateReviewSuggestion(viewer, 'p', 'el')).rejects.toThrow('PROVIDER_FAILED')
        expect(mocks.tx.agentReviewRevision.create).not.toHaveBeenCalled()
    })
    it('does not release another run’s reservation when using purchased allowance', async () => {
        mocks.reserve.mockResolvedValue({ allowed: true, source: 'purchased' })
        await generateReviewSuggestion(viewer, 'p', 'en')
        expect(mocks.release).not.toHaveBeenCalled()
    })
    it('refuses stale sources after provider latency and does not save malformed output', async () => {
        mocks.tx.policy.findUniqueOrThrow.mockResolvedValueOnce(policy).mockResolvedValueOnce({ ...policy, updatedAt: new Date('2026-10-01') })
        await expect(generateReviewSuggestion(viewer, 'p', 'en')).rejects.toThrow('STALE_REVIEW')
        expect(mocks.tx.agentReviewRevision.create).not.toHaveBeenCalled()
        mocks.ask.mockResolvedValue('not json')
        await expect(generateReviewSuggestion(viewer, 'p', 'en')).rejects.toThrow('PROVIDER_FAILED')
        expect(mocks.tx.agentReviewRevision.create).not.toHaveBeenCalled()
        expect(mocks.release).toHaveBeenCalledTimes(2)
    })
})
