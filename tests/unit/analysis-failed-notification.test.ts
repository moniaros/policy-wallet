/**
 * When a background analysis finishes unsuccessfully, the initiating agent must
 * get exactly one "not completed" notification so they aren't left waiting after
 * closing the upload dialog. Verifies the notifyAnalysisFailed seam directly via
 * an injected DB (the full runBackgroundAnalysis pipeline is covered by the
 * manual E2E).
 */
import { describe, it, expect, vi } from 'vitest'

// PolicyService transitively imports storage → env (Zod-validated); mock the
// heavy deps so the real service module loads. `this.db` comes from the
// injected mock, so the '@/lib/db' singleton is irrelevant.
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/email/invite-emails', () => ({ sendPolicyInviteEmail: vi.fn(), sendPolicySharedAccessEmail: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { PolicyService } from '@/lib/services/policy.service'

const makeDb = () => ({
    policy: { findUnique: vi.fn(async () => ({ policyNumber: 'POL-1', insurerName: 'Allianz' })) },
    notificationEvent: { create: vi.fn(async () => ({})) },
})

describe('PolicyService.notifyAnalysisFailed', () => {
    it('emits one policy_analysis_failed in-app notification to the initiator, naming the policy', async () => {
        const db = makeDb()
        const svc = new PolicyService(db as any)

        await (svc as any).notifyAnalysisFailed('agent-1', 'pol-1', 'en')

        expect(db.notificationEvent.create).toHaveBeenCalledTimes(1)
        expect(db.notificationEvent.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'agent-1',
                    eventType: 'policy_analysis_failed',
                    channel: 'in_app',
                    relatedObjectType: 'policy',
                    relatedObjectId: 'pol-1',
                }),
            })
        )
        const message = (db.notificationEvent.create as any).mock.calls[0][0].data.message as string
        expect(message).toContain('POL-1')
        expect(message).toContain('Allianz')
    })

    it('localizes the notification to Greek', async () => {
        const db = makeDb()
        const svc = new PolicyService(db as any)

        await (svc as any).notifyAnalysisFailed('agent-1', 'pol-1', 'el')

        const data = (db.notificationEvent.create as any).mock.calls[0][0].data
        expect(data.title).toBe('Η ανάλυση δεν ολοκληρώθηκε')
    })

    it('never throws when the DB fails — a notification error must not surface as an analysis error', async () => {
        const db = {
            policy: { findUnique: vi.fn(async () => { throw new Error('db down') }) },
            notificationEvent: { create: vi.fn() },
        }
        const svc = new PolicyService(db as any)

        await expect((svc as any).notifyAnalysisFailed('a', 'p', 'el')).resolves.toBeUndefined()
        expect(db.notificationEvent.create).not.toHaveBeenCalled()
    })
})
