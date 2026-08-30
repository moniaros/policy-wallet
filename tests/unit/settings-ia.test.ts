import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import {
    activeSectionFor,
    LEGACY_TAB_REDIRECTS,
    SETTINGS_SECTIONS,
    settingsSectionsFor,
} from '@/lib/settings/sections'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * Settings was one route with three panels chosen in React state. A section
 * could not be linked to, could not have its own loading or error boundary, and
 * arriving on any of them loaded all three tabs' data. The rail, the mobile
 * index and the routes now come from one array — this is the test that they
 * cannot drift apart.
 */
describe('every settings section is a real, reachable route', () => {
    it.each(SETTINGS_SECTIONS)('$id has a page', (section) => {
        const dir = `app/(protected)${section.href}`
        expect(existsSync(`${dir}/page.tsx`), `${dir}/page.tsx`).toBe(true)
    })

    it.each(SETTINGS_SECTIONS)('$id has its own loading and error boundary', (section) => {
        const dir = `app/(protected)${section.href}`
        expect(existsSync(`${dir}/loading.tsx`), `${dir}/loading.tsx`).toBe(true)
        expect(existsSync(`${dir}/error.tsx`), `${dir}/error.tsx`).toBe(true)
    })

    it.each(SETTINGS_SECTIONS)('$id is labelled and explained in both languages', (section) => {
        for (const dict of [el, en]) {
            const entry = dict.settings.nav[section.labelKey]
            expect(entry?.label, `${section.id} label`).toBeTruthy()
            // A rail of bare nouns ("Profile", "Security") does not answer
            // "what can I control here?" — every entry says what is inside it.
            expect(entry?.description, `${section.id} description`).toBeTruthy()
        }
    })

    it('marks the right rail entry active, including on the index', () => {
        expect(activeSectionFor('/me')).toBe('profile')
        expect(activeSectionFor('/me/profile')).toBe('profile')
        expect(activeSectionFor('/me/plan')).toBe('plan')
        expect(activeSectionFor('/agent/settings')).toBe('agency')
        expect(activeSectionFor('/wallet')).toBeNull()
    })

    it('shows the agency section only to advisors', () => {
        const asPolicyholder = settingsSectionsFor('policyholder').map((s) => s.id)
        const asAgent = settingsSectionsFor('agent,policyholder').map((s) => s.id)
        expect(asPolicyholder).not.toContain('agency')
        expect(asAgent).toContain('agency')
    })

    it('keeps every old tab link working', () => {
        const routes = new Set(['/me', ...SETTINGS_SECTIONS.map((s) => s.href)])
        for (const [tab, target] of Object.entries(LEGACY_TAB_REDIRECTS)) {
            expect(routes.has(target), `?tab=${tab} → ${target}`).toBe(true)
        }
    })

    it('keeps private settings out of the index', () => {
        const layout = readFileSync('app/(protected)/me/layout.tsx', 'utf-8')
        expect(layout).toMatch(/robots/)
        expect(layout).toMatch(/index: false/)
    })
})

/**
 * The honesty rule.
 *
 * The screen this replaced listed "active sessions" from a table nothing has
 * ever written outside the seed, a "sign out everywhere" that deleted those
 * non-existent rows without revoking a single Supabase session, an invoice
 * table and a saved-card panel for models written nowhere, a wallet-credit
 * figure that is always zero, and a "download report" button with no handler.
 *
 * A control for a capability the product does not have is worse than its
 * absence: it tells the customer they are protected, or billed, or in control,
 * when they are not.
 */
describe('settings never renders a control nothing backs', () => {
    const SECTIONS = [
        'components/settings/sections/ProfileSection.tsx',
        'components/settings/sections/PlanSection.tsx',
        'components/settings/sections/SecuritySection.tsx',
        'components/settings/sections/NotificationsSection.tsx',
        'components/settings/sections/PrivacySection.tsx',
        'components/settings/sections/HistorySection.tsx',
    ]
    const all = SECTIONS.map((f) => strip(readFileSync(f, 'utf-8'))).join('\n')

    it('does not list per-device sessions — ActiveSession is never written', () => {
        expect(all).not.toMatch(/activeSessions|ActiveSession|is_current/)
    })

    it('does not offer MFA, 2FA or passkeys — none are implemented', () => {
        expect(all).not.toMatch(/\bMFA\b|two-factor|twoFactor|passkey|webauthn/i)
    })

    it('does not render an invoice table or a saved card — neither model is written', () => {
        expect(all).not.toMatch(/invoices|paymentMethods|card_last4|cardBrand/i)
    })

    it('does not show a referral credit balance — no credit is ever granted', () => {
        expect(all).not.toMatch(/creditBalance|creditTransactions/)
    })

    it('has no button without a handler', () => {
        for (const file of SECTIONS) {
            const src = readFileSync(file, 'utf-8')
            // Every <button> in a settings section is either a submit or has an
            // onClick. The old "Download report" had neither and did nothing.
            for (const match of src.matchAll(/<button\b([\s\S]*?)>/g)) {
                const attrs = match[1]
                expect(
                    /onClick=|type="submit"/.test(attrs),
                    `${file}: <button ${attrs.trim().slice(0, 80)}…> has no handler`
                ).toBe(true)
            }
        }
    })

    it('signs out through Supabase, which owns the sessions', () => {
        const actions = strip(readFileSync('app/(protected)/me/security-actions.ts', 'utf-8'))
        expect(actions).toMatch(/signOut\(\{ scope: "others" \}\)/)
        expect(actions).toMatch(/signOut\(\{ scope: "global" \}\)/)
    })

    it('re-authenticates before changing the password', () => {
        // updatePassword was reachable with only a length check: an open tab on
        // a shared machine was enough to lock the owner out of their account.
        const actions = strip(readFileSync('app/(protected)/me/security-actions.ts', 'utf-8'))
        expect(actions).toMatch(/signInWithPassword/)
        expect(actions).toMatch(/WRONG_PASSWORD/)
        expect(actions).toMatch(/rateLimit\(/)
    })
})
