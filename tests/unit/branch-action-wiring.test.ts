/**
 * PR 5 wiring: the `askAgent` and `task` branch actions stopped being decorative.
 *
 * Two things are worth protecting here, and neither is "the happy path works":
 *
 *  1. The ENTITLEMENT MATRIX. `startBranchActionThread` is a paid surface, but
 *     `resolveUserEntitlements` resolves B2C tiers — so a naive gate locks out
 *     admins (the D3 trap that PR 0 fixed for the API routes). Free must be
 *     refused, admin must pass regardless of tier.
 *
 *  2. The DEDUPE. This is why the action calls `ensureAutomationThread` rather
 *     than hand-rolling POST /threads + POST /messages: a user tapping the
 *     button five times must produce ONE thread in their advisor's inbox, not
 *     five. The test drives that through a fake that reproduces the service's
 *     real "reuse any open thread in this (relationship, category)" rule.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAuthenticatedUserOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...args: any[]) => getAuthenticatedUserOrNull(...args),
}))

const resolveUserEntitlements = vi.fn()
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: (...args: any[]) => resolveUserEntitlements(...args),
}))

const policyFindUnique = vi.fn()
const accessGrantFindFirst = vi.fn(async () => null)
const relationshipFindFirst = vi.fn()
const userTaskCreate = vi.fn(async (args: any) => ({ id: 'task-1', ...args.data }))
vi.mock('@/lib/db', () => ({
    db: {
        policy: { findUnique: (...a: any[]) => policyFindUnique(...(a as [])) },
        accessGrant: { findFirst: (...a: any[]) => accessGrantFindFirst(...(a as [])) },
        customerRelationship: { findFirst: (...a: any[]) => relationshipFindFirst(...(a as [])) },
        userTask: { create: (...a: any[]) => userTaskCreate(...(a as [])) },
    },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

/**
 * Stand-in for `collaborationService.ensureAutomationThread` that keeps the
 * behaviour under test — dedupe on (relationshipId, category) while a thread is
 * open — so "a second click reuses the thread" is asserted against the real
 * rule, not against a mock that returns a constant.
 */
const openThreads = new Map<string, { id: string; subject: string; category: string; priority?: string }>()
let threadSeq = 0
const ensureAutomationThread = vi.fn(async (_userId: string, input: any) => {
    const key = `${input.relationshipId}:${input.category}`
    const existing = openThreads.get(key)
    if (existing) return existing
    threadSeq += 1
    const created = {
        id: `thr-${threadSeq}`,
        subject: input.subject,
        category: input.category,
        priority: input.priority,
    }
    openThreads.set(key, created)
    return created
})
vi.mock('@/lib/services/collaboration.service', () => ({
    collaborationService: {
        ensureAutomationThread: (...a: any[]) => ensureAutomationThread(...(a as [])),
    },
}))

import { startBranchActionThread } from '@/app/(protected)/wallet/collaborationActions'
import { createSelfTask } from '@/app/(protected)/tasks/taskActions'
import { AGENT_REQUESTS } from '@/lib/insurance/content/agent-requests'

const OWNER = 'user-1'

const signIn = (roles = 'policyholder', id = OWNER) => {
    getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id, roles, name: 'Maria' } })
}
const withCollaboration = (agentCollaboration: boolean) => {
    resolveUserEntitlements.mockResolvedValue({ limits: { agentCollaboration } })
}
const withAgent = (has: boolean) => {
    relationshipFindFirst.mockResolvedValue(has ? { id: 'rel-1', agentUserId: 'agent-1' } : null)
}

beforeEach(() => {
    vi.clearAllMocks()
    openThreads.clear()
    threadSeq = 0
    policyFindUnique.mockResolvedValue({ id: 'pol-1', ownerUserId: OWNER })
    accessGrantFindFirst.mockResolvedValue(null)
    userTaskCreate.mockImplementation(async (args: any) => ({ id: 'task-1', ...args.data }))
    signIn()
    withCollaboration(true)
    withAgent(true)
})

describe('startBranchActionThread — gate matrix', () => {
    it('refuses anonymous callers before touching the database', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(null)
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(policyFindUnique).not.toHaveBeenCalled()
    })

    it('refuses a user who neither owns the policy nor holds an active grant', async () => {
        policyFindUnique.mockResolvedValue({ id: 'pol-1', ownerUserId: 'someone-else' })
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ error: 'Unauthorized' })
        expect(ensureAutomationThread).not.toHaveBeenCalled()
    })

    it('returns UPGRADE_REQUIRED on the free tier — the shape the modal keys off', async () => {
        withCollaboration(false)
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ error: 'UPGRADE_REQUIRED' })
        expect(ensureAutomationThread).not.toHaveBeenCalled()
    })

    it('D3: an admin passes even when the B2C tier resolves to no collaboration', async () => {
        signIn('admin,policyholder')
        withCollaboration(false)
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ success: true, threadId: 'thr-1' })
    })

    it('returns NO_AGENT when no active relationship exists', async () => {
        withAgent(false)
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ error: 'NO_AGENT' })
        expect(ensureAutomationThread).not.toHaveBeenCalled()
    })

    it('opens the thread with the subject, category and priority mapped for the action', async () => {
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ success: true, threadId: 'thr-1' })

        const [userId, input] = ensureAutomationThread.mock.calls[0] as [string, any]
        expect(userId).toBe(OWNER)
        expect(input).toMatchObject({
            relationshipId: 'rel-1',
            policyId: 'pol-1',
            subject: AGENT_REQUESTS.motor_ask_agent_mikti.subject.el,
            category: 'general',
            priority: 'medium',
        })
        // The advisor gets a first message naming who asked — not an empty thread.
        expect(input.initialMessage).toContain('Maria')
        expect(input.initialMessage).toContain(AGENT_REQUESTS.motor_ask_agent_mikti.message.el)
    })

    it('maps the green-card ask to document_request, not the general enquiry thread', async () => {
        const result = await startBranchActionThread('pol-1', 'motor_request_green_card')
        expect(result).toEqual({ success: true, threadId: 'thr-1' })
        const [, input] = ensureAutomationThread.mock.calls[0] as [string, any]
        expect(input.category).toBe('document_request')
        expect(input.priority).toBe('high')
    })

    it('falls back to the default request for a generic ${branch}_ask_agent id', async () => {
        const result = await startBranchActionThread('pol-1', 'boat_ask_agent')
        expect(result).toEqual({ success: true, threadId: 'thr-1' })
        const [, input] = ensureAutomationThread.mock.calls[0] as [string, any]
        expect(input.category).toBe('general')
        expect(input.subject).toBeTruthy()
    })

    it('surfaces THREAD_FAILED rather than throwing into the client', async () => {
        ensureAutomationThread.mockRejectedValueOnce(new Error('db down'))
        const result = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        expect(result).toEqual({ error: 'THREAD_FAILED' })
    })
})

describe('startBranchActionThread — dedupe stops advisor spam', () => {
    it('a second identical click reuses the open thread instead of opening a new one', async () => {
        const first = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        const second = await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')

        expect(first).toEqual({ success: true, threadId: 'thr-1' })
        expect(second).toEqual(first)
        expect(ensureAutomationThread).toHaveBeenCalledTimes(2)
        expect(openThreads.size).toBe(1)
    })

    it('two actions sharing a category collapse into one thread; a different category does not', async () => {
        // motor_ask_agent_mikti → general, home_ask_agent → coverage_gap,
        // motor_request_green_card → document_request.
        await startBranchActionThread('pol-1', 'motor_ask_agent_mikti')
        await startBranchActionThread('pol-1', 'boat_ask_agent_layup') // also `general`
        expect(openThreads.size).toBe(1)

        await startBranchActionThread('pol-1', 'motor_request_green_card')
        expect(openThreads.size).toBe(2)
    })
})

describe('createSelfTask', () => {
    it('resolves the authed user id server-side rather than trusting the client', async () => {
        const result = await createSelfTask({
            title: 'Γραμμή επείγουσας βοήθειας',
            type: 'reminder',
            actionUrl: 'tel:2101234567',
            actionLabel: 'Κλήση',
        })

        expect(result).toEqual({ success: true, taskId: 'task-1' })
        const [args] = userTaskCreate.mock.calls[0] as [any]
        expect(args.data.userId).toBe(OWNER)
        expect(args.data.creatorUserId).toBe(OWNER)
        expect(args.data.actionUrl).toBe('tel:2101234567')
    })

    it('rejects unauthenticated callers without writing', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(null)
        const result = await createSelfTask({ title: 'anything' })
        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(userTaskCreate).not.toHaveBeenCalled()
    })
})
