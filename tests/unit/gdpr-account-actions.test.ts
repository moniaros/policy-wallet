/**
 * Self-service GDPR actions in app/(protected)/account/actions.ts:
 * deleteAccount queues a request (duplicate-guarded, machine-readable code)
 * and cancelDeletionRequest lets the user withdraw it — but only before
 * approval, and always leaving the request row behind as history.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const requestFindFirst = vi.fn()
const requestCreate = vi.fn()
const requestUpdate = vi.fn()
const activityCreate = vi.fn()
const getAuthenticatedUserOrNull = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        deletionRequest: {
            findFirst: (...a: unknown[]) => requestFindFirst(...a),
            create: (...a: unknown[]) => requestCreate(...a),
            update: (...a: unknown[]) => requestUpdate(...a),
        },
        activityLog: { create: (...a: unknown[]) => activityCreate(...a) },
    },
}))
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...a: unknown[]) => getAuthenticatedUserOrNull(...a),
    getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/lib/stripe', () => ({ stripe: {} }))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn() }))
vi.mock('@/lib/services/revenuecat.service', () => ({ syncRevenueCatSubscription: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/env', () => ({ env: { NEXTAUTH_URL: 'http://localhost:3000' } }))

import { deleteAccount, cancelDeletionRequest } from '@/app/(protected)/me/actions'

beforeEach(() => {
    vi.clearAllMocks()
    getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: 'user-1' } })
    requestCreate.mockResolvedValue({ id: 'req-1' })
    requestUpdate.mockResolvedValue({ id: 'req-1' })
    activityCreate.mockResolvedValue({})
})

describe('deleteAccount', () => {
    it('queues a GDPR Article 17 request and audit-logs it', async () => {
        requestFindFirst.mockResolvedValue(null)

        const res = await deleteAccount()

        expect(res).toMatchObject({ success: true, requestId: 'req-1' })
        expect((requestCreate.mock.calls[0]![0] as any).data).toMatchObject({
            userId: 'user-1',
            status: 'requested',
            legalBasis: 'GDPR_ARTICLE_17',
        })
        expect(activityCreate).toHaveBeenCalled()
    })

    it('returns a machine-readable code when a request is already open', async () => {
        requestFindFirst.mockResolvedValue({ id: 'req-0', status: 'in_review' })

        const res = await deleteAccount()

        expect(res).toEqual({ error: 'DELETION_ALREADY_PENDING' })
        expect(requestCreate).not.toHaveBeenCalled()
    })
})

describe('cancelDeletionRequest', () => {
    it('withdraws a requested/in_review request, keeping the row as history', async () => {
        requestFindFirst.mockResolvedValue({ id: 'req-1', status: 'requested', operatorNotes: null })

        const res = await cancelDeletionRequest()

        expect(res).toEqual({ success: true })
        const update = requestUpdate.mock.calls[0]![0] as any
        expect(update.where).toEqual({ id: 'req-1' })
        expect(update.data.status).toBe('rejected')
        expect(update.data.operatorNotes).toContain('Withdrawn by the data subject')
    })

    it('refuses once the request is approved or processing', async () => {
        // first findFirst (requested/in_review) → null; second (approved/processing) → hit
        requestFindFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'req-1' })

        const res = await cancelDeletionRequest()

        expect(res).toEqual({ error: 'DELETION_IN_FLIGHT' })
        expect(requestUpdate).not.toHaveBeenCalled()
    })

    it('reports when there is nothing to withdraw', async () => {
        requestFindFirst.mockResolvedValue(null)

        const res = await cancelDeletionRequest()

        expect(res).toEqual({ error: 'NO_OPEN_REQUEST' })
    })
})
