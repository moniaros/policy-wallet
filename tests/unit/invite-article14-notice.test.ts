import { describe, it, expect, vi, beforeEach } from 'vitest'

import { LEGAL_ENTITY } from '@/lib/legal/entity-placeholders'

vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { sendEmail } from '@/lib/email/email-service'
import { article14Notice, sendPolicyInviteEmail } from '@/lib/email/invite-emails'

/**
 * GDPR Article 14 — owner decision D2.
 *
 * The person an agent invites did not give us their data; the agent typed it
 * (name, email, phone, ΑΦΜ) and uploads their policies. Article 14 requires
 * that they be told who the controller is, what is held, why, and what their
 * rights are. The notice lives ONLY inside the invite email, so this is the
 * one place to pin it: controller named as /privacy names it, the data
 * categories, the purpose, the four rights, a /privacy link — in both
 * languages — and the agent's name still in the email.
 */
function toText(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

async function renderInvite(language: 'el' | 'en') {
    await sendPolicyInviteEmail({
        to: 'customer@example.gr',
        token: 'tok',
        inviterName: 'Νίκος Παπαδόπουλος',
        policyNumber: '123',
        language,
    })
    const call = vi.mocked(sendEmail).mock.calls.at(-1)![0] as { html: string; subject: string }
    return { html: call.html, text: toText(call.html) }
}

beforeEach(() => {
    vi.mocked(sendEmail).mockClear()
})

describe('the invite email carries the Article 14 notice', () => {
    it('Greek: controller, data, purpose, rights, privacy link — and the agent stays named', async () => {
        const { html, text } = await renderInvite('el')

        expect(text).toContain('άρθρο 14')
        // The operating company as /privacy names it — never PolicyWallet alone.
        expect(text).toContain(LEGAL_ENTITY.el.company)
        expect(text).toMatch(/Υπεύθυνος επεξεργασίας/)
        // What is held.
        for (const item of ['ονοματεπώνυμο', 'email', 'τηλέφωνο', 'ΑΦΜ', 'ασφαλιστήρια']) {
            expect(text, item).toContain(item)
        }
        // Why.
        expect(text).toMatch(/ασφαλιστικού σας χαρτοφυλακίου/)
        // The rights.
        for (const right of ['πρόσβασης', 'διόρθωσης', 'διαγραφής', 'εναντίωσης']) {
            expect(text, right).toContain(right)
        }
        expect(html).toMatch(/href="[^"]*\/privacy"/)
        expect(html).toContain(`mailto:${LEGAL_ENTITY.el.dpoEmail}`)
        // The agent's name is still in the email.
        expect(text).toContain('Νίκος Παπαδόπουλος')
        // And the invite link survives the extra content.
        expect(html).toContain('/invite/tok')
    })

    it('English: the same disclosure, mirrored', async () => {
        const { html, text } = await renderInvite('en')

        expect(text).toContain('Article 14')
        expect(text).toContain(LEGAL_ENTITY.en.company)
        expect(text).toMatch(/The controller is/)
        for (const item of ['name', 'email', 'phone', 'ΑΦΜ', 'policies']) {
            expect(text, item).toContain(item)
        }
        expect(text).toMatch(/insurance portfolio/)
        for (const right of ['access', 'rectify', 'erase', 'object']) {
            expect(text, right).toContain(right)
        }
        expect(html).toMatch(/href="[^"]*\/en\/privacy"/)
        expect(text).toContain('Νίκος Παπαδόπουλος')
    })

    it('the notice never says PolicyWallet is the controller on its own', () => {
        for (const language of ['el', 'en'] as const) {
            const text = toText(article14Notice(language))
            expect(text).toContain(LEGAL_ENTITY[language].company)
            expect(text).not.toMatch(/(?:Υπεύθυνος επεξεργασίας είναι|The controller is) (?:η |το )?PolicyWallet[.,]/)
        }
    })

    it('uses «ασφαλιστήριο», never «συμβόλαιο»', () => {
        expect(article14Notice('el')).not.toMatch(/συμβόλαι/i)
    })
})
