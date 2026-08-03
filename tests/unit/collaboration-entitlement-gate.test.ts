/**
 * The collaboration write surface (POST /threads, /threads/[id]/messages,
 * /threads/[id]/actions) shipped with `requireApiUser()` only — no entitlement
 * check — while the UI and `notifyAgentAboutGap` both gate on `agentCollaboration`.
 * Any free-tier user could drive the paid feature straight off the API.
 *
 * The regression that matters most here is the fix, not the hole: agents resolve
 * against *B2C* tiers, so a naive entitlement gate resolves them to `free` and
 * locks them out of their own collaboration inbox.
 *
 * That exemption was originally blanket — agents skipped ALL fencing, so the
 * per-tier `collaborationThreads` flag was sold and never enforced (audit F-12).
 * Agents are now resolved against the AGENT catalogue instead: still immune to
 * the B2C-free trap, but actually fenced. Admins stay exempt outright — they
 * operate the product rather than buy it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAuthenticatedUserOrNull = vi.fn()
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...args: any[]) => getAuthenticatedUserOrNull(...args),
}))

const resolveUserEntitlements = vi.fn()
const canAgentUseFeature = vi.fn()
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: (...args: any[]) => resolveUserEntitlements(...args),
    canAgentUseFeature: (...args: any[]) => canAgentUseFeature(...args),
}))

const createThread = vi.fn(async () => ({ id: 'thr-1' }))
const addMessage = vi.fn(async () => ({ id: 'msg-1' }))
const addAction = vi.fn(async () => ({ id: 'act-1' }))
const listThreads = vi.fn(async () => [{ id: 'thr-1' }])
vi.mock('@/lib/services/collaboration.service', () => ({
    collaborationService: {
        createThread: (...a: any[]) => createThread(...(a as [])),
        addMessage: (...a: any[]) => addMessage(...(a as [])),
        addAction: (...a: any[]) => addAction(...(a as [])),
        listThreads: (...a: any[]) => listThreads(...(a as [])),
    },
}))

import { POST as postThread, GET as getThreads } from '@/app/api/v1/collaboration/threads/route'
import { POST as postMessage } from '@/app/api/v1/collaboration/threads/[id]/messages/route'
import { POST as postAction } from '@/app/api/v1/collaboration/threads/[id]/actions/route'

const signIn = (roles: string) => {
    getAuthenticatedUserOrNull.mockResolvedValue({
        dbUser: { id: 'user-1', roles },
    })
}

const withTier = (agentCollaboration: boolean) => {
    resolveUserEntitlements.mockResolvedValue({ limits: { agentCollaboration } })
}

const threadReq = () =>
    new Request('http://localhost/api/v1/collaboration/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ relationshipId: 'rel-1', subject: 'Coverage question' }),
    })

const messageReq = () =>
    new Request('http://localhost/api/v1/collaboration/threads/thr-1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'Hello' }),
    })

const actionReq = () =>
    new Request('http://localhost/api/v1/collaboration/threads/thr-1/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Send documents', assigneeUserId: 'user-2' }),
    })

const idParams = { params: Promise.resolve({ id: 'thr-1' }) }

const writeEndpoints: Array<[string, () => Promise<Response>]> = [
    ['POST /threads', () => postThread(threadReq()) as any],
    ['POST /threads/[id]/messages', () => postMessage(messageReq(), idParams) as any],
    ['POST /threads/[id]/actions', () => postAction(actionReq(), idParams) as any],
]

beforeEach(() => {
    vi.clearAllMocks()
    // Agent catalogue default: collaborationThreads is true on every agent tier
    // today, so the fence is inert in practice — but it now EXISTS, so an admin
    // turning it off for a tier is actually honoured.
    canAgentUseFeature.mockResolvedValue(true)
})

describe('collaboration write entitlement gate', () => {
    describe.each(writeEndpoints)('%s', (_name, call) => {
        it('rejects a free-tier policyholder with 403 UPGRADE_REQUIRED', async () => {
            signIn('policyholder')
            withTier(false)

            const res = await call()
            const json = await res.json()

            expect(res.status).toBe(403)
            expect(json.error.code).toBe('UPGRADE_REQUIRED')
            expect(createThread).not.toHaveBeenCalled()
            expect(addMessage).not.toHaveBeenCalled()
            expect(addAction).not.toHaveBeenCalled()
        })

        it('allows an entitled (pro) policyholder through', async () => {
            signIn('policyholder')
            withTier(true)

            const res = await call()

            expect(res.status).toBe(200)
        })

        // D3 regression guard: agents have no B2C subscription, so entitlements
        // resolve them to `free`. Role exemption must run BEFORE that lookup.
        it('allows an agent whose B2C entitlements resolve to free (agent catalogue decides)', async () => {
            signIn('agent,policyholder')
            withTier(false)

            const res = await call()

            expect(res.status).toBe(200)
            expect(resolveUserEntitlements).not.toHaveBeenCalled()
        })

        it('rejects an agent whose AGENT catalogue withholds collaborationThreads', async () => {
            // The fence must actually bite, or it reverts to the blanket
            // exemption that let a sold per-tier flag go unenforced (F-12).
            signIn('agent,policyholder')
            withTier(false)
            canAgentUseFeature.mockResolvedValue(false)

            const res = await call()

            expect(res.status).toBe(403)
            expect(canAgentUseFeature).toHaveBeenCalledWith('user-1', 'collaborationThreads')
        })

        it('allows an admin whose B2C entitlements resolve to free', async () => {
            signIn('admin')
            withTier(false)

            const res = await call()

            expect(res.status).toBe(200)
            expect(resolveUserEntitlements).not.toHaveBeenCalled()
        })
    })

    // A downgraded user must keep reading their own history.
    it('leaves GET /threads open to a free-tier user', async () => {
        signIn('policyholder')
        withTier(false)

        const res = await getThreads(new Request('http://localhost/api/v1/collaboration/threads'))

        expect(res.status).toBe(200)
        expect(listThreads).toHaveBeenCalled()
        expect(resolveUserEntitlements).not.toHaveBeenCalled()
    })
})
