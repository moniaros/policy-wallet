import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/db', () => ({
    db: {
        userTask: { create: vi.fn() },
        customerRelationship: { findFirst: vi.fn() },
        questionnaireInstance: { findUnique: vi.fn(), update: vi.fn() },
        questionnaireResponse: { create: vi.fn() },
        $transaction: vi.fn(),
    },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Mock the cross-side notification + score-refresh seams so the submit path
// under test doesn't pull in the real notification/email/gap-engine modules.
vi.mock('@/lib/notifications', () => ({ notifyCounterparty: vi.fn() }))
vi.mock('@/lib/services/gap-engine', () => ({ refreshProtectionScore: vi.fn() }))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { notifyCounterparty } from '@/lib/notifications'
import { refreshProtectionScore } from '@/lib/services/gap-engine'
import { createUserTask } from '@/app/(protected)/tasks/taskActions'
import { submitQuestionnaireResponse } from '@/app/(protected)/tasks/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockTaskCreate = vi.mocked(db.userTask.create)
const mockRelFind = vi.mocked(db.customerRelationship.findFirst)
const mockInstanceFind = vi.mocked(db.questionnaireInstance.findUnique)
const mockNotify = vi.mocked(notifyCounterparty)
const mockRefreshScore = vi.mocked(refreshProtectionScore)

const AGENT = { dbUser: { id: 'agent-1', roles: 'agent' } } as any

beforeEach(() => {
    vi.clearAllMocks()
    mockTaskCreate.mockResolvedValue({ id: 'task-1' } as any)
})

describe('createUserTask — recipient must be self or a related customer', () => {
    it('rejects assigning a task to an arbitrary user with no relationship', async () => {
        mockAuth.mockResolvedValue(AGENT)
        mockRelFind.mockResolvedValue(null)

        const res = await createUserTask({ userId: 'stranger-9', title: 'x' } as any)

        expect(res).toEqual({ success: false, error: 'Unauthorized' })
        expect(mockTaskCreate).not.toHaveBeenCalled()
    })

    it('allows assigning to a customer the agent has an active relationship with', async () => {
        mockAuth.mockResolvedValue(AGENT)
        mockRelFind.mockResolvedValue({ id: 'rel-1' } as any)

        const res = await createUserTask({ userId: 'cust-2', title: 'Renew' } as any)

        expect(res).toEqual({ success: true, taskId: 'task-1' })
        expect(mockRelFind).toHaveBeenCalledWith(
            expect.objectContaining({ where: { agentUserId: 'agent-1', policyholderUserId: 'cust-2' } })
        )
    })

    it('allows self-assignment without a relationship lookup', async () => {
        mockAuth.mockResolvedValue(AGENT)
        const res = await createUserTask({ userId: 'agent-1', title: 'Personal note' } as any)
        expect(res).toEqual({ success: true, taskId: 'task-1' })
        expect(mockRelFind).not.toHaveBeenCalled()
    })
})

describe('submitQuestionnaireResponse — only the recipient may answer', () => {
    it('rejects a caller who is not the instance recipient, without writing', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue({ sentToUserId: 'someone-else' } as any)

        await expect(submitQuestionnaireResponse('inst-1', {} as any)).rejects.toThrow('Unauthorized')
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('proceeds for the intended recipient, notifies the sending agent, and refreshes the score', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1', name: 'Maria K.' } } as any)
        mockInstanceFind.mockResolvedValue({
            sentToUserId: 'user-1',
            sentByUserId: 'agent-9',
            template: { name: 'Motor Review', questions: [] },
        } as any)
        vi.mocked(db.$transaction).mockResolvedValue({ responseId: 'r-1' } as any)
        mockRefreshScore.mockResolvedValue({ protectionScore: { overallScore: 72 } } as any)

        const res = await submitQuestionnaireResponse('inst-1', {} as any)

        // profileFieldsUpdated is [] here: the template asks nothing that maps
        // to a risk-profile field, so the score is refreshed but cannot move.
        expect(res).toEqual({
            success: true,
            responseId: 'r-1',
            protectionScore: 72,
            profileFieldsUpdated: [],
        })
        // The agent who sent it is notified (no longer a silent handoff), deep-linked
        // to the customer via the customer's userId.
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'agent-9',
                eventType: 'questionnaire_completed',
                relatedObjectType: 'customer',
                relatedObjectId: 'user-1',
            })
        )
        expect(mockRefreshScore).toHaveBeenCalledWith('user-1')
    })

    it('still succeeds when the score refresh fails — it must not fail the submission', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue({
            sentToUserId: 'user-1',
            sentByUserId: 'agent-9',
            template: { name: 'Motor Review', questions: [] },
        } as any)
        vi.mocked(db.$transaction).mockResolvedValue({ responseId: 'r-1' } as any)
        mockRefreshScore.mockRejectedValue(new Error('engine down'))

        const res = await submitQuestionnaireResponse('inst-1', {} as any)
        expect(res).toEqual({
            success: true,
            responseId: 'r-1',
            protectionScore: null,
            profileFieldsUpdated: [],
        })
    })

    // F-01: answers that map to risk-profile fields must reach the profile the
    // Protection Score reads — otherwise an advisor can send a questionnaire,
    // get it back, and watch the score sit exactly where it was.
    it('writes mapped answers to the risk profile inside the response transaction', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue({
            sentToUserId: 'user-1',
            sentByUserId: 'agent-9',
            template: {
                name: 'Risk Profile',
                questions: [
                    { id: 'risk.dependentsCount' },
                    { id: 'risk.ownsHome' },
                    { id: 'notes' },
                ],
            },
        } as any)

        const tx = {
            questionnaireResponse: { create: vi.fn().mockResolvedValue({ id: 'r-1' }) },
            questionnaireInstance: { update: vi.fn() },
            policyholderProfile: { upsert: vi.fn() },
        }
        vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(tx))
        mockRefreshScore.mockResolvedValue({ protectionScore: { overallScore: 61 } } as any)

        const res = await submitQuestionnaireResponse('inst-1', {
            'risk.dependentsCount': 2,
            'risk.ownsHome': true,
            notes: 'prefers email',
        } as any)

        expect(res.profileFieldsUpdated).toEqual(['dependentsCount', 'ownsHome'])
        expect(tx.policyholderProfile.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: { userId: 'user-1', dependentsCount: 2, ownsHome: true },
            update: { dependentsCount: 2, ownsHome: true },
        })
    })

    it('does not touch the profile when no answer maps to a risk field', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue({
            sentToUserId: 'user-1',
            sentByUserId: 'agent-9',
            template: { name: 'Notes', questions: [{ id: 'notes' }] },
        } as any)

        const tx = {
            questionnaireResponse: { create: vi.fn().mockResolvedValue({ id: 'r-2' }) },
            questionnaireInstance: { update: vi.fn() },
            policyholderProfile: { upsert: vi.fn() },
        }
        vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(tx))
        mockRefreshScore.mockResolvedValue({ protectionScore: { overallScore: 40 } } as any)

        await submitQuestionnaireResponse('inst-1', { notes: 'call me' } as any)

        expect(tx.policyholderProfile.upsert).not.toHaveBeenCalled()
    })

    it('throws when the instance does not exist', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue(null)
        await expect(submitQuestionnaireResponse('missing', {} as any)).rejects.toThrow('Questionnaire not found')
    })
})
