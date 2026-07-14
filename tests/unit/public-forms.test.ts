import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock side-effecting dependencies BEFORE importing the route modules ──
vi.mock('@/lib/db', () => ({
    db: {
        formSubmission: {
            create: vi.fn(async () => ({ id: 'sub_1' })),
            update: vi.fn(async () => ({})),
        },
    },
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true, count: 1, limit: 8 })) }))
vi.mock('@/lib/brevo', () => ({ createBrevoContact: vi.fn(async () => undefined) }))
vi.mock('@/lib/email/form-emails', () => ({
    sendFormAdminAlert: vi.fn(async () => ({ success: true, messageId: 'm1' })),
    sendContactConfirmation: vi.fn(async () => ({ success: true, messageId: 'm2' })),
    sendNewsletterWelcome: vi.fn(async () => ({ success: true, messageId: 'm3' })),
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))

import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { createBrevoContact } from '@/lib/brevo'
import { sendFormAdminAlert, sendContactConfirmation, sendNewsletterWelcome } from '@/lib/email/form-emails'
import { POST as contactPOST } from '@/app/api/contact/route'
import { POST as newsletterPOST } from '@/app/api/v1/newsletter/subscribe/route'

const VALID_CONTACT = {
    name: 'Γιάννης Παπαδόπουλος',
    email: 'giannis@example.gr',
    phone: '+30 210 1234567',
    subject: 'Γενική Ερώτηση',
    message: 'Θα ήθελα περισσότερες πληροφορίες για το προϊόν σας και τις καλύψεις.',
}

function postRequest(url: string, body: unknown) {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
        body: JSON.stringify(body),
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rateLimit).mockResolvedValue({ success: true, count: 1, limit: 8 } as any)
    vi.mocked(db.formSubmission.create).mockResolvedValue({ id: 'sub_1' } as any)
    vi.mocked(sendFormAdminAlert).mockResolvedValue({ success: true, messageId: 'm1' })
    vi.mocked(sendContactConfirmation).mockResolvedValue({ success: true, messageId: 'm2' })
    vi.mocked(sendNewsletterWelcome).mockResolvedValue({ success: true, messageId: 'm3' })
})

describe('POST /api/contact', () => {
    it('persists the submission and alerts the admin', async () => {
        const response = await contactPOST(postRequest('http://localhost/api/contact', VALID_CONTACT))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)

        // Persisted BEFORE any mail is attempted — this is what makes a Brevo
        // outage survivable.
        expect(db.formSubmission.create).toHaveBeenCalledOnce()
        expect(vi.mocked(db.formSubmission.create).mock.calls[0][0].data).toMatchObject({
            formType: 'contact',
            email: VALID_CONTACT.email,
            name: VALID_CONTACT.name,
            subject: VALID_CONTACT.subject,
        })

        expect(sendFormAdminAlert).toHaveBeenCalledWith({
            formType: 'contact',
            submission: expect.objectContaining({ email: VALID_CONTACT.email }),
        })
        expect(sendContactConfirmation).toHaveBeenCalledWith(
            expect.objectContaining({ to: VALID_CONTACT.email })
        )
        expect(db.formSubmission.update).toHaveBeenCalledWith({
            where: { id: 'sub_1' },
            data: { emailSent: true },
        })
    })

    it('still succeeds when the admin alert fails, leaving emailSent false', async () => {
        vi.mocked(sendFormAdminAlert).mockResolvedValue({ success: false, error: 'brevo down' })

        const response = await contactPOST(postRequest('http://localhost/api/contact', VALID_CONTACT))
        const payload = await response.json()

        // The message is safely in the DB, so the user is not told it failed.
        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(db.formSubmission.create).toHaveBeenCalledOnce()
        expect(db.formSubmission.update).not.toHaveBeenCalled()
    })

    it('silently drops a honeypot hit without persisting or emailing', async () => {
        const response = await contactPOST(
            postRequest('http://localhost/api/contact', { ...VALID_CONTACT, company: 'AcmeBot' })
        )
        const payload = await response.json()

        // Looks identical to success so the bot learns nothing.
        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(db.formSubmission.create).not.toHaveBeenCalled()
        expect(sendFormAdminAlert).not.toHaveBeenCalled()
    })

    it('returns per-field errors for an invalid payload', async () => {
        const response = await contactPOST(
            postRequest('http://localhost/api/contact', { ...VALID_CONTACT, email: 'nope', message: 'short' })
        )
        const payload = await response.json()

        expect(response.status).toBe(400)
        expect(payload.success).toBe(false)
        expect(payload.errors.email).toBeTruthy()
        expect(payload.errors.message).toBeTruthy()
        expect(db.formSubmission.create).not.toHaveBeenCalled()
    })

    it('returns the rate-limit response when the limiter rejects', async () => {
        const { NextResponse } = await import('next/server')
        vi.mocked(rateLimit).mockResolvedValue({
            success: false,
            limit: 8,
            remaining: 0,
            error: NextResponse.json({ error: 'rate' }, { status: 429 }),
        } as any)

        const response = await contactPOST(postRequest('http://localhost/api/contact', VALID_CONTACT))

        expect(response.status).toBe(429)
        expect(db.formSubmission.create).not.toHaveBeenCalled()
    })
})

describe('POST /api/v1/newsletter/subscribe', () => {
    it('persists, adds the contact to Brevo, and alerts the admin', async () => {
        const response = await newsletterPOST(
            postRequest('http://localhost/api/v1/newsletter/subscribe', {
                email: 'Reader@Example.GR',
                locale: 'en',
                source: 'footer_newsletter',
            })
        )
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.data.subscribed).toBe(true)

        // Email is normalised to lowercase before it reaches any sink.
        expect(vi.mocked(db.formSubmission.create).mock.calls[0][0].data).toMatchObject({
            formType: 'newsletter',
            email: 'reader@example.gr',
            source: 'footer_newsletter',
        })
        expect(createBrevoContact).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'reader@example.gr', updateEnabled: true })
        )
        expect(sendFormAdminAlert).toHaveBeenCalledWith({
            formType: 'newsletter',
            submission: expect.objectContaining({ email: 'reader@example.gr' }),
        })
        expect(sendNewsletterWelcome).toHaveBeenCalledWith({ to: 'reader@example.gr', language: 'en' })
    })

    it('silently drops a honeypot hit', async () => {
        const response = await newsletterPOST(
            postRequest('http://localhost/api/v1/newsletter/subscribe', {
                email: 'bot@example.com',
                company: 'AcmeBot',
            })
        )
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.data.subscribed).toBe(true)
        expect(db.formSubmission.create).not.toHaveBeenCalled()
        expect(createBrevoContact).not.toHaveBeenCalled()
        expect(sendFormAdminAlert).not.toHaveBeenCalled()
    })

    it('rejects an invalid email', async () => {
        const response = await newsletterPOST(
            postRequest('http://localhost/api/v1/newsletter/subscribe', { email: 'not-an-email' })
        )
        const payload = await response.json()

        expect(response.status).toBe(400)
        expect(payload.error.code).toBe('VALIDATION_ERROR')
        expect(db.formSubmission.create).not.toHaveBeenCalled()
    })

    it('still succeeds when the admin alert fails', async () => {
        vi.mocked(sendFormAdminAlert).mockResolvedValue({ success: false, error: 'no ADMIN_NOTIFICATION_EMAIL' })

        const response = await newsletterPOST(
            postRequest('http://localhost/api/v1/newsletter/subscribe', { email: 'reader@example.gr' })
        )
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.data.subscribed).toBe(true)
        expect(db.formSubmission.create).toHaveBeenCalledOnce()
        expect(db.formSubmission.update).not.toHaveBeenCalled()
    })
})
