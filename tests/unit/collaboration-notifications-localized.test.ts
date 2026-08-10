import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Collaboration notifications (new message / thread / action, and the unread /
 * overdue / digest reminders) go to whichever party did NOT act — often the
 * POLICYHOLDER. They were hardcoded English titles, so a Greek policyholder got
 * "New collaboration message" in English.
 *
 * The third case used to assert that the string `resolveLocalized` appeared in
 * lib/notifications.ts, which pinned an implementation detail in one file
 * rather than the behaviour. It is now exercised against the dispatcher, so it
 * survives the code moving and — more usefully — actually fails if the
 * recipient's language stops winning.
 */
const { dbMock } = await vi.hoisted(async () => ({
    dbMock: (await import('../helpers/notification-db-mock')).notificationDbMock(),
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { emit } from '@/lib/notifications/dispatch'
import { NOTIFICATION_EVENTS } from '@/lib/notifications/registry'

const SERVICE = readFileSync('lib/services/collaboration.service.ts', 'utf-8')
const REMINDERS = readFileSync('lib/services/collaboration-reminders.service.ts', 'utf-8')

describe('collaboration notifications are localized to the recipient', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        dbMock.notificationEvent.create.mockResolvedValue({} as never)
        dbMock.notificationEvent.findFirst.mockResolvedValue(null as never)
        dbMock.notificationPreference.findMany.mockResolvedValue([] as never)
    })

    it('collaboration.service passes {el,en} titles (no hardcoded English)', () => {
        for (const bad of ['"New collaboration thread"', '"New collaboration message"', '"New action assigned"']) {
            expect(SERVICE).not.toContain(bad)
        }
        expect(SERVICE).toContain('notifyCollabParticipant')
        expect(SERVICE).toContain('el: "Νέο μήνυμα"')
    })

    it('collaboration-reminders passes {el,en} copy (no hardcoded English)', () => {
        for (const bad of ['"Unread collaboration message"', '"Overdue collaboration action"', '"Daily collaboration digest"']) {
            expect(REMINDERS).not.toContain(bad)
        }
        expect(REMINDERS).toContain('notifyReminder')
        expect(REMINDERS).toContain('el: "Καθημερινή σύνοψη"')
    })

    it('the registry — not the caller — declares that these reach in-app and email', () => {
        // The channel set belongs to the EVENT. Callers used to pass
        // `channels: ["email", "in_app"]`, which is how renewal reminders ended
        // up email-only and invisible in the notification centre.
        for (const event of ['collaboration_message', 'collaboration_daily_digest']) {
            expect(NOTIFICATION_EVENTS[event].channels).toContain('in_app')
            expect(NOTIFICATION_EVENTS[event].channels).toContain('email')
        }
    })

    it('resolves {el,en} to the RECIPIENT preferred language', async () => {
        dbMock.user.findUnique.mockResolvedValue({
            email: 'greek@example.com',
            preferredLanguage: 'el',
        } as never)

        await emit({
            event: 'collaboration_message',
            userId: 'u1',
            title: { el: 'Νέο μήνυμα', en: 'New message' },
            message: { el: 'Έχετε νέο μήνυμα', en: 'You have a new message' },
        })

        const rows = dbMock.notificationEvent.create.mock.calls.map((c: any[]) => c[0].data)
        expect(rows.length).toBeGreaterThan(0)
        for (const row of rows) {
            expect(row.title).toBe('Νέο μήνυμα')
            expect(row.message).toBe('Έχετε νέο μήνυμα')
        }
    })

    it('every channel of one emission carries identical copy', async () => {
        dbMock.user.findUnique.mockResolvedValue({
            email: 'greek@example.com',
            preferredLanguage: 'el',
        } as never)

        await emit({
            event: 'collaboration_message',
            userId: 'u1',
            title: { el: 'Νέο μήνυμα', en: 'New message' },
            message: { el: 'Έχετε νέο μήνυμα', en: 'You have a new message' },
        })

        // Localising per channel is how an email and a push notification end up
        // saying different things about the same event; the bus resolves once.
        const rows = dbMock.notificationEvent.create.mock.calls.map((c: any[]) => c[0].data)
        expect(new Set(rows.map((r: any) => r.title)).size).toBe(1)
        expect(new Set(rows.map((r: any) => r.message)).size).toBe(1)
    })
})
