/**
 * What `runBackgroundAnalysis` does with an analysis that did not succeed.
 *
 * The disposition is not one behaviour, it is three, and collapsing them is
 * how this went wrong in the first place:
 *
 *   DISCARD  — technical failure on a placeholder-only policy: delete it.
 *   KEEP     — technical failure on a policy someone typed into: mark it.
 *   INFORM   — the run never started (quota, consent, permission): keep it and
 *              say why, in Greek. A quota-blocked upload that silently
 *              vanished would look like a broken product.
 *
 * Plus the case that must NOT regress: a partially degraded run is a SUCCESS.
 * The live pipeline reported `overallSuccessPct: 96` on a healthy run; nothing
 * may start treating that as a failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const deleteFile = vi.hoisted(() => vi.fn(async () => true))
const emit = vi.hoisted(() => vi.fn(async () => ({})))
const extractBasicSummary = vi.hoisted(() => vi.fn())
const createAndExecuteRun = vi.hoisted(() => vi.fn())
const resolveUserEntitlements = vi.hoisted(() => vi.fn(async () => ({ tier: 'pro' })))

vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/notifications/dispatch', () => ({ emit }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(),
    sendPolicySharedAccessEmail: vi.fn(),
}))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({ resolveUserEntitlements }))
vi.mock('@/lib/events/publishers', () => ({ publishAnalysisCompleted: vi.fn() }))
vi.mock('@/lib/services/analysis/policy-analysis-orchestrator.service', () => ({
    PolicyAnalysisOrchestratorService: class {
        extractBasicSummary = extractBasicSummary
        createAndExecuteRun = createAndExecuteRun
    },
}))

import { PolicyService } from '@/lib/services/policy.service'

const PLACEHOLDER = {
    insurerName: '__PENDING_EXTRACTION__',
    policyNumber: 'PENDING-1786732800000',
}

function makeDb(policyRow: Record<string, unknown> = {}) {
    const row = {
        id: 'pol-1',
        ownerUserId: 'user-1',
        acordData: {},
        status: 'analyzing',
        documents: [{ id: 'doc-1', fileUrl: 'https://x.supabase.co/storage/v1/object/public/policies/a.pdf' }],
        ...PLACEHOLDER,
        ...policyRow,
    }
    return {
        policy: {
            findUnique: vi.fn(async () => row),
            update: vi.fn(async () => row),
            delete: vi.fn(async () => row),
        },
        policyDocument: { updateMany: vi.fn(async () => ({ count: 1 })) },
        user: { findUnique: vi.fn(async () => ({ roles: 'user', preferredLanguage: 'el' })) },
    }
}

/** The `data` of every policy.update call, flattened. */
const updates = (db: any) => db.policy.update.mock.calls.map((c: any[]) => c[0]?.data)

/** Every message the bus was asked to send. */
const messages = () => emit.mock.calls.map((c: any[]) => c[0])

beforeEach(() => {
    vi.clearAllMocks()
    deleteFile.mockResolvedValue(true)
    resolveUserEntitlements.mockResolvedValue({ tier: 'pro' } as never)
})

describe('DISCARD — a technical failure on a placeholder-only policy', () => {
    it('deletes the policy, its documents and its storage object, and marks nothing', async () => {
        createAndExecuteRun.mockRejectedValue(new Error('Gemini request failed: 503 Service Unavailable'))
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(deleteFile).toHaveBeenCalledWith('https://x.supabase.co/storage/v1/object/public/policies/a.pdf')
        expect(db.policy.delete).toHaveBeenCalledWith({ where: { id: 'pol-1' } })
        // No half-state left behind: the row is gone, not stamped action_needed.
        expect(updates(db).some((d: any) => d?.status === 'action_needed')).toBe(false)
    })

    it('tells the customer the upload was not saved, in Greek, without an internal code', async () => {
        createAndExecuteRun.mockRejectedValue(new Error('Request timeout after 180000ms'))
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        const sent = messages()
        expect(sent).toHaveLength(1)
        expect(sent[0].event).toBe('policy_analysis_failed')
        expect(sent[0].message.el).toContain('δεν αποθηκεύτηκε')
        expect(sent[0].message.el).not.toMatch(/TIMEOUT|ANALYSIS_FAILED|PENDING-|__PENDING_EXTRACTION__/)
        // Nothing to link to — the policy no longer exists.
        expect(sent[0].relatedObjectId).toBeUndefined()
    })
})

describe('KEEP — a technical failure on a policy somebody typed into', () => {
    it('keeps the row and marks it action_needed instead of destroying the work', async () => {
        createAndExecuteRun.mockRejectedValue(new Error('Gemini request failed: 503'))
        const db = makeDb({ insurerName: 'Interamerican', policyNumber: 'POL-42' })

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'agent-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()
        const stamped = updates(db).find((d: any) => d?.status === 'action_needed')
        expect(stamped).toBeTruthy()
        expect(stamped.acordData.processingError.code).toBe('ANALYSIS_FAILED')
    })
})

describe('INFORM — the run never started', () => {
    it('keeps a quota-blocked upload and explains the quota in Greek', async () => {
        createAndExecuteRun.mockResolvedValue({
            id: 'run-1',
            status: 'blocked',
            blockedReason: 'insufficient_tokens',
            failureMessage: 'Token budget check failed: insufficient tokens',
        })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        // The upload survives. This is the whole point of the branch.
        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()

        const stamped = updates(db).find((d: any) => d?.status === 'action_needed')
        expect(stamped.acordData.processingError.code).toBe('TOKEN_LIMIT_BLOCKED')
        expect(stamped.acordData.processingError.retryable).toBe(true)

        const [sent] = messages()
        expect(sent.message.el).toContain('όριο AI')
        expect(sent.message.el).toContain('αποθηκευμένο')
        // No internal code and no raw provider text leaking through. ("credits"
        // and "AI" are the product's established Greek-UI terms — see
        // lib/i18n/translations/el.ts — so Latin characters as such are fine.)
        expect(sent.message.el).not.toContain('TOKEN_LIMIT_BLOCKED')
        expect(sent.message.el).not.toMatch(/insufficient|Token budget|blocked/i)
    })

    it('keeps a consent-blocked upload and asks for consent in Greek', async () => {
        createAndExecuteRun.mockResolvedValue({
            id: 'run-1',
            status: 'blocked',
            blockedReason: 'ai_consent_missing',
            failureMessage: 'Policy owner has not granted AI-processing consent',
        })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        const stamped = updates(db).find((d: any) => d?.status === 'action_needed')
        expect(stamped.acordData.processingError.code).toBe('AI_CONSENT_REQUIRED')
        expect(messages()[0].message.el).toContain('συγκατάθεση')
    })

    it('still treats the free-tier lock as a normal saved policy, not a failure', async () => {
        createAndExecuteRun.mockResolvedValue({
            id: 'run-1',
            status: 'blocked',
            blockedReason: 'free_tier_ai_locked',
        })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(updates(db).some((d: any) => d?.status === 'active')).toBe(true)
        expect(emit).not.toHaveBeenCalled()
    })
})

describe('a partially successful run is a SUCCESS', () => {
    it('saves a completed_with_warnings run reporting 96% step success', async () => {
        createAndExecuteRun.mockResolvedValue({
            id: 'run-1',
            status: 'completed_with_warnings',
            overallSuccessPct: 96,
        })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()
        expect(updates(db).some((d: any) => d?.status === 'active')).toBe(true)
        expect(updates(db).some((d: any) => d?.status === 'action_needed')).toBe(false)
    })

    it('saves a clean completed run', async () => {
        createAndExecuteRun.mockResolvedValue({ id: 'run-1', status: 'completed', overallSuccessPct: 100 })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(updates(db).some((d: any) => d?.status === 'active')).toBe(true)
    })
})

describe('the free/Starter basic-summary path', () => {
    it('no longer leaves a failed extraction stuck on "analyzing" forever', async () => {
        // The result used to be awaited and thrown away, so for the majority
        // tier a failed parse left the policy analysing with nothing said.
        resolveUserEntitlements.mockResolvedValue({ tier: 'free' } as never)
        extractBasicSummary.mockResolvedValue({ status: 'failed', reason: 'extraction_failed' })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        // Placeholder identity + technical failure → discarded outright.
        expect(db.policy.delete).toHaveBeenCalled()
        expect(deleteFile).toHaveBeenCalled()
        expect(messages()).toHaveLength(1)
    })

    it('informs rather than discards when the basic parse is consent-blocked', async () => {
        resolveUserEntitlements.mockResolvedValue({ tier: 'free' } as never)
        extractBasicSummary.mockResolvedValue({ status: 'blocked', reason: 'ai_consent_missing' })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        const stamped = updates(db).find((d: any) => d?.status === 'action_needed')
        expect(stamped.acordData.processingError.code).toBe('AI_CONSENT_REQUIRED')
    })

    it('leaves a successful basic parse completely alone', async () => {
        resolveUserEntitlements.mockResolvedValue({ tier: 'free' } as never)
        extractBasicSummary.mockResolvedValue({ status: 'completed' })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(db.policy.update).not.toHaveBeenCalled()
        expect(emit).not.toHaveBeenCalled()
    })

    it('keeps and informs when the document was read and is not a policy (needs_review) — never the discard branch', async () => {
        resolveUserEntitlements.mockResolvedValue({ tier: 'free' } as never)
        extractBasicSummary.mockResolvedValue({ status: 'needs_review', reason: 'extraction_empty' })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        // Placeholder identity — the exact row the discard branch would delete.
        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()
        // The orchestrator stamped the row itself; this path only speaks.
        expect(updates(db).some((d: any) => d?.status === 'active')).toBe(false)
        const [sent] = messages()
        expect(sent.event).toBe('policy_analysis_failed')
        expect(sent.message.el).toContain('στοιχεία ασφαλιστηρίου')
        expect(sent.message.el).toContain('αποθηκευμένο')
        expect(sent.message.el).not.toMatch(/EXTRACTION_EMPTY|PENDING-|__PENDING_EXTRACTION__/)
    })
})

describe('INFORM — the deep run read the document and found no policy', () => {
    it('keeps a placeholder row the run ended with EXTRACTION_EMPTY, stamps it retryable, and says why in Greek', async () => {
        createAndExecuteRun.mockResolvedValue({
            id: 'run-1',
            status: 'failed',
            failureCode: 'EXTRACTION_EMPTY',
            failureMessage: 'The document was read but carries no policy identity, period of cover or coverages',
        })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(deleteFile).not.toHaveBeenCalled()
        const stamped = updates(db).find((d: any) => d?.status === 'action_needed')
        expect(stamped.acordData.processingError.code).toBe('EXTRACTION_EMPTY')
        expect(stamped.acordData.processingError.retryable).toBe(true)
        expect(updates(db).some((d: any) => d?.status === 'active')).toBe(false)
        const [sent] = messages()
        expect(sent.message.el).toContain('στοιχεία ασφαλιστηρίου')
        expect(sent.message.el).not.toContain('EXTRACTION_EMPTY')
    })

    it('a failed run with a TECHNICAL code on a placeholder row is still discarded — the code travels, the disposition does not blur', async () => {
        createAndExecuteRun.mockResolvedValue({
            id: 'run-1',
            status: 'failed',
            failureCode: 'PIPELINE_ERROR',
            failureMessage: 'Gemini request failed: 503 Service Unavailable',
        })
        const db = makeDb()

        await new PolicyService(db as any).runBackgroundAnalysis('pol-1', 'user-1', 'el')

        expect(db.policy.delete).toHaveBeenCalledWith({ where: { id: 'pol-1' } })
        expect(updates(db).some((d: any) => d?.status === 'action_needed')).toBe(false)
    })
})
