import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/email/email-service', () => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}))

import { sendEmail } from '@/lib/email/email-service'
import {
    resolveAdminNotificationEmail,
    sendAdminSignupNotificationEmail,
} from '@/lib/email/admin-emails'

const sendEmailMock = vi.mocked(sendEmail)

const baseParams = {
    name: 'Μαρία Παπαδοπούλου',
    email: 'maria@example.com',
    phoneNumber: '+306912345678',
    role: 'policyholder',
    language: 'el',
    isInvitedActivation: false,
}

describe('resolveAdminNotificationEmail', () => {
    afterEach(() => vi.unstubAllEnvs())

    it('defaults to the agentriseinsurance inbox', () => {
        vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', '')
        expect(resolveAdminNotificationEmail()).toBe('agentriseinsurance@gmail.com')
    })

    it('honours the ADMIN_NOTIFICATION_EMAIL override', () => {
        vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'ops@policywallet.gr')
        expect(resolveAdminNotificationEmail()).toBe('ops@policywallet.gr')
    })
})

describe('sendAdminSignupNotificationEmail', () => {
    beforeEach(() => sendEmailMock.mockClear())
    afterEach(() => vi.unstubAllEnvs())

    it('sends to the admin inbox with the signup details', async () => {
        await sendAdminSignupNotificationEmail(baseParams)

        expect(sendEmailMock).toHaveBeenCalledTimes(1)
        const call = sendEmailMock.mock.calls[0][0]
        expect(call.to).toBe('agentriseinsurance@gmail.com')
        expect(call.subject).toContain('Νέα εγγραφή')
        expect(call.subject).toContain('Μαρία Παπαδοπούλου')
        expect(call.html).toContain('maria@example.com')
        expect(call.html).toContain('+306912345678')
        expect(call.html).toContain('Ασφαλισμένος')
        expect(call.html).toContain('Νέος λογαριασμός')
    })

    it('labels invited-account activations and agent roles', async () => {
        await sendAdminSignupNotificationEmail({
            ...baseParams,
            role: 'agent',
            isInvitedActivation: true,
        })

        const call = sendEmailMock.mock.calls[0][0]
        expect(call.html).toContain('Ενεργοποίηση προσκεκλημένου λογαριασμού')
        expect(call.html).toContain('Ασφαλιστικός σύμβουλος')
    })

    it('falls back to the raw role string for unknown roles', async () => {
        await sendAdminSignupNotificationEmail({ ...baseParams, role: 'auditor' })
        expect(sendEmailMock.mock.calls[0][0].html).toContain('auditor')
    })

    it('omits the phone row when no phone is available', async () => {
        await sendAdminSignupNotificationEmail({ ...baseParams, phoneNumber: null })
        expect(sendEmailMock.mock.calls[0][0].html).not.toContain('Τηλέφωνο')
    })

    it('escapes HTML in user-controlled fields', async () => {
        await sendAdminSignupNotificationEmail({
            ...baseParams,
            name: '<script>alert(1)</script>',
        })
        const html = sendEmailMock.mock.calls[0][0].html
        expect(html).not.toContain('<script>')
        expect(html).toContain('&lt;script&gt;')
    })

    it('respects the recipient override', async () => {
        vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'ops@policywallet.gr')
        await sendAdminSignupNotificationEmail(baseParams)
        expect(sendEmailMock.mock.calls[0][0].to).toBe('ops@policywallet.gr')
    })
})
