import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { getBaseEmailTemplate } from '@/lib/email/templates/base-template'
import { getLegalContent } from '@/lib/legal/legal-content'
import { LEGACY_TAB_REDIRECTS, SETTINGS_SECTIONS } from '@/lib/settings/sections'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The privacy policy states the lawful basis for marketing/engagement email as
 * "consent, with an unsubscribe option in every message" — «Συγκατάθεση, με
 * δυνατότητα απεγγραφής σε κάθε μήνυμα». No email carried one.
 *
 * The mechanism was already there and working: NotificationPreference toggles,
 * honoured by the weekly digest, churn prevention, engagement drip, and (via
 * lib/notifications) everything that goes through sendNotification. Nothing
 * pointed a reader at it.
 */
describe('every email offers the opt-out the privacy policy promises', () => {
    it('the policy does make that promise', () => {
        expect(JSON.stringify(getLegalContent('el'))).toMatch(/δυνατότητα απεγγραφής σε κάθε μήνυμα/)
        expect(JSON.stringify(getLegalContent('en'))).toMatch(/unsubscribe option in every message/i)
    })

    it('the footer links straight to the preferences screen in both languages', () => {
        const el = getBaseEmailTemplate('<p>x</p>', 'el')
        expect(el).toMatch(/\/account\/notifications/)
        expect(el).toMatch(/Διαχείριση ειδοποιήσεων/)

        const en = getBaseEmailTemplate('<p>x</p>', 'en')
        expect(en).toMatch(/\/account\/notifications/)
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
 * The link has to land where it says it lands.
 *
 * It used to point at `/account?tab=settings`, where the tab was React state:
 * the URL was honoured, but only because the page read the query param back on
 * mount. Sections are real routes now, so the footer links directly — and the
 * old query form still resolves, because those links sit in inboxes forever.
 */
describe('the preferences link opens the preferences screen', () => {
    const PAGE = strip(readFileSync('app/(protected)/account/page.tsx', 'utf-8'))

    it('every legacy tab still resolves to a real section', () => {
        const routes = new Set<string>(['/account', ...SETTINGS_SECTIONS.map((s) => s.href)])
        for (const [tab, target] of Object.entries(LEGACY_TAB_REDIRECTS)) {
            expect(routes.has(target), `?tab=${tab} → ${target}`).toBe(true)
        }
    })

    it('?tab=settings lands on the notification preferences, not an overview', () => {
        expect(LEGACY_TAB_REDIRECTS.settings).toBe('/account/notifications')
    })

    it('the index redirects those legacy tabs server-side', () => {
        expect(PAGE).toMatch(/LEGACY_TAB_REDIRECTS/)
        expect(PAGE).toMatch(/redirect\(legacyTarget\)/)
    })

    it('the notification toggles are on that route', () => {
        const section = strip(
            readFileSync('components/settings/sections/NotificationsSection.tsx', 'utf-8')
        )
        expect(section).toMatch(/setNotificationStreamPreference/)
    })
})
