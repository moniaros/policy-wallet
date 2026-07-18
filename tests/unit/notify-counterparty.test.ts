/**
 * notifyCounterparty is the seam that broke the "silent handoffs" between agent
 * and customer (doc requests, proposals, uploads, renewal outcomes, agent-run
 * analysis). It must: localise to the *recipient's* language, always write the
 * in-app bell event, and never throw — a broken notification must not surface as
 * a failure of the action that triggered it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted above the module body, so the mocks they close
// over must be created via vi.hoisted (also hoisted) — not plain top-level vars.
const { dbMock, sendEmail } = vi.hoisted(() => ({
    dbMock: {
        user: { findUnique: vi.fn() },
        notificationPreference: { findMany: vi.fn(async () => [] as any[]) },
        notificationEvent: { create: vi.fn(async (_args?: any) => ({})) },
    },
    sendEmail: vi.fn(async (_opts?: any) => ({ success: true })),
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/email/email-service', () => ({ sendEmail }))
vi.mock('@/lib/mail-templates', () => ({ templates: {} }))
vi.mock('@/lib/services/push.service', () => ({ sendPushNotification: vi.fn(async () => ({ success: true })) }))

import { notifyCounterparty } from '@/lib/notifications'

const inAppCalls = () =>
    dbMock.notificationEvent.create.mock.calls.filter((c: any[]) => c[0]?.data?.channel === 'in_app')

describe('notifyCounterparty', () => {
    beforeEach(() => {
        dbMock.user.findUnique.mockReset()
        dbMock.notificationPreference.findMany.mockReset().mockResolvedValue([])
        dbMock.notificationEvent.create.mockReset().mockResolvedValue({})
        sendEmail.mockReset().mockResolvedValue({ success: true })
    })

    it('localises to the recipient language and writes an in-app bell event', async () => {
        dbMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'el', email: 'c@x.gr' })

        await notifyCounterparty({
            userId: 'cust-1',
            eventType: 'document_requested',
            title: { el: 'Τίτλος', en: 'Title' },
            message: { el: 'Μήνυμα', en: 'Message' },
            relatedObjectType: 'thread',
            relatedObjectId: 'thr-1',
        })

        const inApp = inAppCalls()
        expect(inApp).toHaveLength(1)
        expect(inApp[0]![0].data).toMatchObject({
            userId: 'cust-1',
            eventType: 'document_requested',
            channel: 'in_app',
            title: 'Τίτλος',
            message: 'Μήνυμα',
            relatedObjectType: 'thread',
            relatedObjectId: 'thr-1',
        })
    })

    it('falls back to English when the recipient has no Greek preference', async () => {
        dbMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'en', email: 'c@x.com' })

        await notifyCounterparty({
            userId: 'cust-2',
            eventType: 'proposal_received',
            title: { el: 'Τίτλος', en: 'Title' },
            message: { el: 'Μήνυμα', en: 'Message' },
        })

        expect(inAppCalls()[0]![0].data.title).toBe('Title')
    })

    it('with email:false, writes only the in-app event and sends no email', async () => {
        dbMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'en', email: 'c@x.com' })

        await notifyCounterparty({
            userId: 'cust-3',
            eventType: 'renewal_outcome',
            title: 'Renewal update',
            message: 'Renewed',
            email: false,
        })

        expect(dbMock.notificationEvent.create).toHaveBeenCalledTimes(1)
        expect(inAppCalls()).toHaveLength(1)
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it('never throws when the DB fails — the underlying action must not break', async () => {
        dbMock.user.findUnique.mockRejectedValue(new Error('db down'))

        await expect(
            notifyCounterparty({
                userId: 'cust-4',
                eventType: 'document_uploaded',
                title: 'x',
                message: 'y',
            })
        ).resolves.toBeUndefined()
        expect(dbMock.notificationEvent.create).not.toHaveBeenCalled()
    })
})
