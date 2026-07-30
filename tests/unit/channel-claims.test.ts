import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { helpArticles } from '@/lib/help-content'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Channels the notification dispatcher can actually deliver on. */
function implementedChannels(): string[] {
    const src = strip(readFileSync('lib/notifications.ts', 'utf-8'))
    return ['email', 'push', 'sms'].filter((c) => new RegExp(`channel === '${c}'`).test(src))
}

/**
 * The Help centre told users they could receive notifications "via Email, Push
 * Notifications (if using the mobile app), or SMS (Premium only)", and directed
 * them to "Account -> Notifications".
 *
 * Three untrue things in one answer. SMS is not implemented anywhere — the
 * preferences route says so itself — and it was presented as a PREMIUM benefit,
 * a paid feature that does not exist. Push is FCM web push and there is no
 * mobile app, so requiring one makes a reader dismiss a channel that works in
 * their browser. And "Account -> Notifications" is not a tab; the switches are
 * under Account -> Settings.
 */
describe('the product describes only the channels it can deliver', () => {
    it('email and push are implemented; SMS is not', () => {
        const channels = implementedChannels()
        expect(channels).toContain('email')
        expect(channels).toContain('push')
        expect(channels).not.toContain('sms')
    })

    it('no user-facing copy offers SMS', () => {
        const offenders: string[] = []
        for (const f of [
            ...globSync('lib/help-content.ts'),
            ...globSync('lib/guides/**/*.ts'),
            ...globSync('lib/i18n/translations/*.ts'),
            ...globSync('lib/monetization/**/*.ts'),
            ...globSync('components/**/*.tsx'),
        ]) {
            const src = strip(readFileSync(f, 'utf-8'))
            if (/\bSMS\b/.test(src)) offenders.push(f)
        }
        expect(offenders, `SMS offered in:\n${offenders.join('\n')}`).toEqual([])
    })

    it('does not make push conditional on an app that does not exist', () => {
        const all = JSON.stringify(helpArticles)
        expect(all).not.toMatch(/if using the mobile app/i)
        expect(all).not.toMatch(/εφαρμογή για κινητά/)
        expect(all).toMatch(/no app required/i)
        expect(all).toMatch(/δεν χρειάζεται εφαρμογή/)
    })

    it('points at the tab that actually holds the switches', () => {
        const all = JSON.stringify(helpArticles)
        expect(all).not.toMatch(/Account.{0,8}->.{0,4}"?Notifications/)
        expect(all).toMatch(/Account -> Settings/)
        expect(all).toMatch(/Λογαριασμό -> Ρυθμίσεις/)
    })

    it('and that tab is reachable — the settings tab is addressable', () => {
        const page = strip(readFileSync('app/(protected)/account/AccountClientPage.tsx', 'utf-8'))
        expect(page).toMatch(/requestedTab === 'settings'/)
    })
})
