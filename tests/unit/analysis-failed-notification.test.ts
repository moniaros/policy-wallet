/**
 * When a background analysis finishes unsuccessfully, the initiating agent must
 * get exactly one "not completed" notification so they aren't left waiting after
 * closing the upload dialog. Verifies the notifyAnalysisFailed seam directly
 * (the full runBackgroundAnalysis pipeline is covered by the manual E2E).
 *
 * The notification now goes through the bus, so the assertions moved from
 * `this.db` to the singleton the dispatcher writes through. The language
 * assertion moved with it, and is better for it: the bus resolves copy against
 * the RECIPIENT's preferredLanguage, where this used to take whatever language
 * the caller happened to pass — which, on an agent-initiated upload for a Greek
 * customer, was the agent's.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted above the module body, so the mock they close
// over must be created in vi.hoisted — which also runs before imports, hence
// the dynamic import of the shared factory.
const { dbMock } = await vi.hoisted(async () => ({
    dbMock: (await import('../helpers/notification-db-mock')).notificationDbMock(),
}))

// PolicyService transitively imports storage → env (Zod-validated); mock the
// heavy deps so the real service module loads.
vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/email/invite-emails', () => ({ sendPolicyInviteEmail: vi.fn(), sendPolicySharedAccessEmail: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { PolicyService } from '@/lib/services/policy.service'

const makeDb = () => ({
    policy: { findUnique: vi.fn(async () => ({ policyNumber: 'POL-1', insurerName: 'Allianz' })) },
})

/** The in-app row the dispatcher wrote, which is the one the agent sees. */
const inAppRows = () =>
    dbMock.notificationEvent.create.mock.calls
        .map((c: any[]) => c[0]?.data)
        .filter((d: any) => d?.channel === 'in_app')

describe('PolicyService.notifyAnalysisFailed', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        dbMock.notificationEvent.create.mockResolvedValue({} as never)
        dbMock.notificationEvent.findFirst.mockResolvedValue(null as never)
        dbMock.notificationPreference.findMany.mockResolvedValue([] as never)
        dbMock.user.findUnique.mockResolvedValue({
            email: 'agent@example.com',
            preferredLanguage: 'en',
        } as never)
    })

    it('emits one policy_analysis_failed in-app notification to the initiator, naming the policy', async () => {
        const svc = new PolicyService(makeDb() as any)

        await (svc as any).notifyAnalysisFailed('agent-1', 'pol-1', 'en')

        const rows = inAppRows()
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            userId: 'agent-1',
            eventType: 'policy_analysis_failed',
            channel: 'in_app',
            relatedObjectType: 'policy',
            relatedObjectId: 'pol-1',
        })
        expect(rows[0].message).toContain('POL-1')
        expect(rows[0].message).toContain('Allianz')
    })

    it('localizes to the RECIPIENT language, not the caller argument', async () => {
        dbMock.user.findUnique.mockResolvedValue({
            email: 'agent@example.com',
            preferredLanguage: 'el',
        } as never)
        const svc = new PolicyService(makeDb() as any)

        // Caller passes 'en'; the recipient reads Greek. The recipient wins.
        await (svc as any).notifyAnalysisFailed('agent-1', 'pol-1', 'en')

        expect(inAppRows()[0].title).toBe('Η ανάλυση δεν ολοκληρώθηκε')
    })

    it('is transactional — a failure notification is not suppressible by preference', async () => {
        dbMock.notificationPreference.findMany.mockResolvedValue([
            { channel: 'in_app', enabled: false },
            { channel: 'email', enabled: false },
        ] as never)
        const svc = new PolicyService(makeDb() as any)

        await (svc as any).notifyAnalysisFailed('agent-1', 'pol-1', 'en')

        // The customer handed us a document and is owed the outcome. Silence
        // reads as "still working".
        const rows = inAppRows()
        expect(rows).toHaveLength(1)
        expect(rows[0].skipReason).toBeNull()
    })

    it('never throws when the DB fails — a notification error must not surface as an analysis error', async () => {
        const svc = new PolicyService({
            policy: { findUnique: vi.fn(async () => { throw new Error('db down') }) },
        } as any)

        await expect((svc as any).notifyAnalysisFailed('a', 'p', 'el')).resolves.toBeUndefined()
        expect(dbMock.notificationEvent.create).not.toHaveBeenCalled()
    })
})
