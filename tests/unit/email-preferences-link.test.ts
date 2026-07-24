import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'
import { getBaseEmailTemplate } from '@/lib/email/templates/base-template'
import { getLegalContent } from '@/lib/legal/legal-content'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The privacy policy states the lawful basis for marketing/engagement email as
 * "consent, with an unsubscribe option in every message" — «Συγκατάθεση, με
 * δυνατότητα απεγγραφής σε κάθε μήνυμα». No email carried one.
 *
 * The mechanism was already there and working: NotificationPreference toggles on
 * /account, honoured by the weekly digest, churn prevention, engagement drip,
 * and (via lib/notifications) everything that goes through sendNotification.
 * Nothing pointed a reader at it.
 */
describe('every email offers the opt-out the privacy policy promises', () => {
    it('the policy does make that promise', () => {
        expect(JSON.stringify(getLegalContent('el'))).toMatch(/δυνατότητα απεγγραφής σε κάθε μήνυμα/)
        expect(JSON.stringify(getLegalContent('en'))).toMatch(/unsubscribe option in every message/i)
    })

    it('the footer links to the preferences screen in both languages', () => {
        const el = getBaseEmailTemplate('<p>x</p>', 'el')
        expect(el).toMatch(/\/account\?tab=settings/)
        expect(el).toMatch(/Διαχείριση ειδοποιήσεων/)

        const en = getBaseEmailTemplate('<p>x</p>', 'en')
        expect(en).toMatch(/\/account\?tab=settings/)
        expect(en).toMatch(/Manage notifications/)
    })

    it('is in EVERY email, because it is in the shared base', () => {
        const templates = globSync('lib/email/templates/*.ts').filter(
            (f) => !f.endsWith('base-template.ts') && !f.endsWith('phrases.ts')
        )
        for (const file of templates) {
            const src = strip(readFileSync(file, 'utf-8'))
            expect(src, `${file} bypasses the base template`).toMatch(/getBaseEmailTemplate\(/)
        }
    })
})

/**
 * The link has to land where it says it lands. The account tab was local state
 * only, so /account?tab=settings opened the overview and left the reader hunting
 * for the toggles the email had just promised.
 */
describe('the preferences link opens the preferences tab', () => {
    const PAGE = strip(readFileSync('app/(protected)/account/AccountClientPage.tsx', 'utf-8'))

    it('reads the tab from the URL', () => {
        expect(PAGE).toMatch(/useSearchParams/)
        expect(PAGE).toMatch(/searchParams\.get\('tab'\)/)
    })

    it('accepts only real tabs, falling back to the overview', () => {
        expect(PAGE).toMatch(/requestedTab === 'billing' \|\| requestedTab === 'settings'\s*\?\s*requestedTab\s*:\s*'overview'/)
    })

    it('the notification toggles are on that tab', () => {
        expect(PAGE).toMatch(/toggleNotificationPreference/)
    })
})
