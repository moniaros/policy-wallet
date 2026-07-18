/**
 * Sending a questionnaire used to notify NOBODY — sendQuestionnaire created the
 * instance + an automation thread but never called any notifier, so the customer
 * had no bell/email and the questionnaire was invisible unless they guessed the
 * /tasks/[id] URL. It must now notify the recipient, deep-linked to the answer page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/db', () => ({
    db: {
        customerRelationship: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
        questionnaireTemplate: { findFirst: vi.fn() },
        questionnaireInstance: { create: vi.fn() },
    },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/services/ai/ai-service.factory', () => ({ getAIService: vi.fn() }))
vi.mock('@/lib/services/customer.service', () => ({ CustomerService: class {} }))
vi.mock('@/lib/services/collaboration.service', () => ({
    collaborationService: { ensureAutomationThread: vi.fn(async () => ({})) },
}))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(async () => ({ success: true })),
    sendAiConsentRequestEmail: vi.fn(async () => ({ success: true })),
}))
vi.mock('@/lib/notifications', () => ({ notifyCounterparty: vi.fn(async () => {}) }))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { notifyCounterparty } from '@/lib/notifications'
import { sendQuestionnaire } from '@/app/(protected)/agent/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockRelFind = vi.mocked(db.customerRelationship.findUnique)
const mockTemplateFind = vi.mocked(db.questionnaireTemplate.findFirst)
const mockInstanceCreate = vi.mocked(db.questionnaireInstance.create)
const mockNotify = vi.mocked(notifyCounterparty)

beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ dbUser: { id: 'agent-1', roles: 'agent' } } as any)
    mockRelFind.mockResolvedValue({ policyholderUserId: 'cust-9', agentUserId: 'agent-1' } as any)
    mockTemplateFind.mockResolvedValue({ id: 'tpl-1' } as any)
    mockInstanceCreate.mockResolvedValue({ id: 'inst-1' } as any)
})

describe('sendQuestionnaire — notifies the recipient', () => {
    it('notifies the policyholder, deep-linked to the questionnaire answer page', async () => {
        await sendQuestionnaire('rel-1', 'tpl-1')

        expect(mockNotify).toHaveBeenCalledTimes(1)
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'cust-9',
                eventType: 'questionnaire_received',
                relatedObjectType: 'questionnaire',
                relatedObjectId: 'inst-1',
            })
        )
    })

    it('does not notify when the agent does not own the relationship', async () => {
        mockRelFind.mockResolvedValue({ policyholderUserId: 'cust-9', agentUserId: 'other-agent' } as any)

        await expect(sendQuestionnaire('rel-1', 'tpl-1')).rejects.toThrow('Relationship not found')
        expect(mockNotify).not.toHaveBeenCalled()
        expect(mockInstanceCreate).not.toHaveBeenCalled()
    })
})
