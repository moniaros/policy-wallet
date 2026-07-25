import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Collaboration notifications (new message / thread / action, and the unread /
 * overdue / digest reminders) are sent to whichever party did NOT act — often
 * the POLICYHOLDER. They were hardcoded English titles + messages, so a Greek
 * policyholder got "New collaboration message" / "Daily collaboration digest"
 * in English. sendNotification localizes only the email shell, so each service
 * now resolves the recipient's preferred language (Greek default) and passes
 * localized copy to both the in-app record and the email.
 */
const SERVICE = readFileSync('lib/services/collaboration.service.ts', 'utf-8')
const REMINDERS = readFileSync('lib/services/collaboration-reminders.service.ts', 'utf-8')
const NOTIF = readFileSync('lib/notifications.ts', 'utf-8')

describe('collaboration notifications are localized to the recipient', () => {
    it('collaboration.service passes {el,en} titles (no hardcoded English) via both channels', () => {
        for (const bad of ['"New collaboration thread"', '"New collaboration message"', '"New action assigned"']) {
            expect(SERVICE).not.toContain(bad)
        }
        expect(SERVICE).toContain('notifyCollabParticipant')
        expect(SERVICE).toContain('el: "Νέο μήνυμα"')
        expect(SERVICE).toMatch(/channels: \["email", "in_app"\]/)
    })

    it('collaboration-reminders passes {el,en} copy (no hardcoded English)', () => {
        for (const bad of ['"Unread collaboration message"', '"Overdue collaboration action"', '"Daily collaboration digest"']) {
            expect(REMINDERS).not.toContain(bad)
        }
        expect(REMINDERS).toContain('notifyReminder')
        expect(REMINDERS).toContain('el: "Καθημερινή σύνοψη"')
    })

    it('sendNotification resolves {el,en} to the recipient preferred language', () => {
        expect(NOTIF).toContain('resolveLocalized')
        expect(NOTIF).toMatch(/title: LocalizedText/)
        // in_app is a real channel so callers can create the record through it
        expect(NOTIF).toMatch(/'in_app'/)
    })
})
