import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ db: {
    customerRelationship: { findUnique: vi.fn() },
    collaborationThread: { findUnique: vi.fn(), create: vi.fn() },
    policy: { findFirst: vi.fn() },
} }))
vi.mock('@/lib/notifications', () => ({ sendNotification: vi.fn() }))
import { db } from '@/lib/db'
import { collaborationService } from '@/lib/services/collaboration.service'
import { sendNotification } from '@/lib/notifications'

const input = { relationshipId: 'rel', subject: 'A specific question', initialMessage: 'Please clarify my benefit.', requestId: 'f0251531-d213-4c31-8083-a2fb5199e320' }
const relationship = { id: 'rel', agentUserId: 'advisor', policyholderUserId: 'holder', status: 'active' }
describe('reviewed advisor draft', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.mocked(db.customerRelationship.findUnique).mockResolvedValue(relationship as any)
        vi.mocked(db.collaborationThread.create).mockResolvedValue({ id: 'created', relationship } as any)
    })
    it('creates the first message atomically with its thread and never grants policy access', async () => {
        await collaborationService.createThread('holder', 'policyholder', input)
        const data = vi.mocked(db.collaborationThread.create).mock.calls[0][0].data as any
        expect(data.id).toMatch(/^draft-[a-f0-9]{64}$/)
        expect(data.id).not.toContain("holder")
        expect(data.messages.create).toMatchObject({ senderUserId: 'holder', messageType: 'comment', body: input.initialMessage })
        expect(data.policyId).toBeNull()
        expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'advisor', dedupeKey: expect.stringMatching(/^draft-[a-f0-9]{64}:assigned$/) }))
    })
    it('returns the existing thread on a retry without a second message or notification', async () => {
        const existing = { id: 'existing', createdByUserId: 'holder', relationshipId: 'rel', subject: input.subject, messages: [{ body: input.initialMessage }] }
        vi.mocked(db.collaborationThread.findUnique).mockResolvedValue(existing as any)
        expect(await collaborationService.createThread('holder', 'policyholder', input)).toEqual(existing)
        expect(db.collaborationThread.create).not.toHaveBeenCalled()
        expect(sendNotification).not.toHaveBeenCalled()
    })
    it('recovers a concurrent unique-key collision without creating another message', async () => {
        const existing = { id: 'existing', createdByUserId: 'holder', relationshipId: 'rel', subject: input.subject, messages: [{ body: input.initialMessage }] }
        vi.mocked(db.collaborationThread.findUnique).mockResolvedValueOnce(null).mockResolvedValueOnce(existing as any)
        vi.mocked(db.collaborationThread.create).mockRejectedValueOnce({ code: 'P2002' })
        expect(await collaborationService.createThread('holder', 'policyholder', input)).toEqual(existing)
        expect(db.collaborationThread.create).toHaveBeenCalledTimes(1)
        expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({ relatedObjectType: 'thread', relatedObjectId: 'existing', dedupeKey: expect.stringMatching(/^draft-[a-f0-9]{64}:assigned$/) }))
    })
    it('rejects a reused request id whose approved content changed', async () => {
        vi.mocked(db.collaborationThread.findUnique).mockResolvedValue({ createdByUserId: 'holder', relationshipId: 'rel', subject: 'Different', messages: [] } as any)
        await expect(collaborationService.createThread('holder', 'policyholder', input)).rejects.toThrow('Request content changed')
    })
    it.each(['inactive', 'terminated'])('refuses a relationship that ended as %s', async status => {
        vi.mocked(db.customerRelationship.findUnique).mockResolvedValue({ ...relationship, status } as any)
        await expect(collaborationService.createThread('holder', 'policyholder', input)).rejects.toThrow('Relationship terminated')
        expect(db.collaborationThread.create).not.toHaveBeenCalled()
    })
    it('refuses another policyholder even with a known relationship id', async () => {
        await expect(collaborationService.createThread('stranger', 'policyholder', input)).rejects.toThrow('Forbidden')
        expect(db.collaborationThread.create).not.toHaveBeenCalled()
    })
})
