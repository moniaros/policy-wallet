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

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { createUserTask } from '@/app/(protected)/tasks/taskActions'
import { submitQuestionnaireResponse } from '@/app/(protected)/tasks/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockTaskCreate = vi.mocked(db.userTask.create)
const mockRelFind = vi.mocked(db.customerRelationship.findFirst)
const mockInstanceFind = vi.mocked(db.questionnaireInstance.findUnique)

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

    it('proceeds for the intended recipient', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue({ sentToUserId: 'user-1' } as any)
        vi.mocked(db.$transaction).mockResolvedValue({ success: true, responseId: 'r-1' } as any)

        const res = await submitQuestionnaireResponse('inst-1', {} as any)
        expect(res).toEqual({ success: true, responseId: 'r-1' })
    })

    it('throws when the instance does not exist', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)
        mockInstanceFind.mockResolvedValue(null)
        await expect(submitQuestionnaireResponse('missing', {} as any)).rejects.toThrow('Questionnaire not found')
    })
})
