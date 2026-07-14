import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => ({ success: true, messageId: 'm1' })) }))
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), captureException: vi.fn() }))

import { sendEmail } from '@/lib/email/email-service'
import * as Sentry from '@sentry/nextjs'
import { sendFormAdminAlert, sendContactConfirmation, sendNewsletterWelcome } from '@/lib/email/form-emails'

const CONTACT = {
    name: 'Μαρία Ιωάννου',
    email: 'maria@example.gr',
    phone: '+30 210 1112222',
    subject: 'Συνεργασία',
    message: 'Θα ήθελα να συζητήσουμε μια πιθανή συνεργασία.',
}

const ORIGINAL_ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm1' })
    process.env.ADMIN_NOTIFICATION_EMAIL = 'owner@policywallet.gr'
})

afterEach(() => {
    if (ORIGINAL_ADMIN_EMAIL === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL
    else process.env.ADMIN_NOTIFICATION_EMAIL = ORIGINAL_ADMIN_EMAIL
})

describe('sendFormAdminAlert', () => {
    it('sends to the admin with reply-to set to the submitter', async () => {
        const result = await sendFormAdminAlert({ formType: 'contact', submission: CONTACT })

        expect(result.success).toBe(true)
        const options = vi.mocked(sendEmail).mock.calls[0][0]
        expect(options.to).toBe('owner@policywallet.gr')
        // The whole point: hitting Reply answers the person who filled the form.
        expect(options.replyTo).toBe(CONTACT.email)
        expect(options.subject).toContain('Συνεργασία')
        expect(options.html).toContain('maria@example.gr')
        expect(options.html).toContain('πιθανή συνεργασία')
    })

    it('escapes HTML in submitted values', async () => {
        await sendFormAdminAlert({
            formType: 'contact',
            submission: { ...CONTACT, message: '<script>alert("xss")</script>' },
        })

        const options = vi.mocked(sendEmail).mock.calls[0][0]
        expect(options.html).not.toContain('<script>')
        expect(options.html).toContain('&lt;script&gt;')
    })

    it('falls back to the shared admin inbox when ADMIN_NOTIFICATION_EMAIL is unset', async () => {
        delete process.env.ADMIN_NOTIFICATION_EMAIL

        const result = await sendFormAdminAlert({ formType: 'newsletter', submission: { email: 'x@example.gr' } })

        // resolveAdminNotificationEmail() carries a code-level default, so an
        // unset env var must never silently swallow a lead.
        expect(result.success).toBe(true)
        const options = vi.mocked(sendEmail).mock.calls[0][0]
        expect(options.to).toBeTruthy()
        expect(options.replyTo).toBe('x@example.gr')
    })
})

describe('submitter-facing emails', () => {
    it('sends the contact confirmation in Greek by default', async () => {
        await sendContactConfirmation({ to: CONTACT.email, name: CONTACT.name })

        const options = vi.mocked(sendEmail).mock.calls[0][0]
        expect(options.to).toBe(CONTACT.email)
        expect(options.subject).toBe('Λάβαμε το μήνυμά σας — PolicyWallet')
        expect(options.html).toContain('Μαρία Ιωάννου')
    })

    it('sends the newsletter welcome in the requested language', async () => {
        await sendNewsletterWelcome({ to: 'reader@example.gr', language: 'en' })

        const options = vi.mocked(sendEmail).mock.calls[0][0]
        expect(options.subject).toBe('You are subscribed to the PolicyWallet newsletter')
        expect(options.html).toContain('Welcome aboard')
    })
})
