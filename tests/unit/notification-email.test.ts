/**
 * Every agent↔policyholder notification email now goes through the shared branded
 * shell (buildNotificationEmail) instead of shipping a bare sentence as the whole
 * body. Also covers the re-branded invite emails (teal, not navy; fully bilingual).
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { buildNotificationEmail } from '@/lib/mail-templates'
import { sendEmail } from '@/lib/email/email-service'
import { sendPolicyInviteEmail } from '@/lib/email/invite-emails'

describe('buildNotificationEmail', () => {
    it('wraps the title/message in the branded PolicyWallet shell', () => {
        const { subject, html } = buildNotificationEmail({
            title: 'Proposal accepted',
            message: 'Your client accepted your proposal.',
            language: 'en',
        })
        expect(subject).toBe('Proposal accepted')
        expect(html).toContain('PolicyWallet') // wordmark
        expect(html).toContain('#29685B') // brand teal
        expect(html).toContain('Proposal accepted')
        expect(html).toContain('Your client accepted your proposal.')
    })

    it('escapes HTML in user-derived content (e.g. counter-offer notes)', () => {
        const { html } = buildNotificationEmail({
            title: 'Counter-offer received',
            message: 'Client proposed: "<script>alert(1)</script>"',
            language: 'en',
        })
        expect(html).not.toContain('<script>alert(1)</script>')
        expect(html).toContain('&lt;script&gt;')
    })

    it('adds a deep-link CTA resolved from the related object', () => {
        const { html } = buildNotificationEmail({
            title: 'New message',
            message: 'You have a new message.',
            relatedObjectType: 'thread',
            relatedObjectId: 'thr-1',
            language: 'en',
        })
        expect(html).toContain('/collaboration/threads/thr-1')
        expect(html).toContain('View details')
        expect(html).toContain('class="button"')
    })

    it('localizes the CTA + footer for Greek recipients and links a policy', () => {
        const { html } = buildNotificationEmail({
            title: 'Νέο μήνυμα',
            message: 'Έχετε νέο μήνυμα.',
            relatedObjectType: 'policy',
            relatedObjectId: 'pol-1',
            language: 'el',
        })
        expect(html).toContain('Προβολή λεπτομερειών')
        expect(html).toContain('/wallet/pol-1')
    })

    it('omits the CTA button when there is no related object to link to', () => {
        const { html } = buildNotificationEmail({
            title: 'Heads up',
            message: 'Something happened.',
            language: 'en',
        })
        expect(html).not.toContain('class="button"')
    })
})

describe('invite emails — teal brand + full bilingual body', () => {
    it('renders teal (not navy) and a fully Greek body for a Greek recipient', async () => {
        await sendPolicyInviteEmail({
            to: 'x@y.gr',
            token: 'tok',
            inviterName: 'Γιώργος',
            policyNumber: '123',
            language: 'el',
        })
        const html = (vi.mocked(sendEmail).mock.calls[0]![0] as any).html as string
        expect(html).toContain('#29685B') // teal brand
        expect(html).not.toContain('#1e3a8a') // no navy
        expect(html).not.toContain('Policy 123') // no English fragment in Greek copy
        expect(html).toContain('το ασφαλιστήριο 123')
        expect(html).toContain('/invite/tok')
    })
})
