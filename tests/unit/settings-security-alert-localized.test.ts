import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * The security surface used to show an audit trail with a hardcoded English
 * "Alert" badge on failed events — English on a trust-critical screen for a
 * Greek reader. That badge is gone, along with the thing it decorated: the
 * `success` flag it keyed off was a hardcoded `true` in the data mapper, so it
 * could never render, and no code path writes a failed-login event at all.
 *
 * The invariant that replaced it is stronger. The list may only render event
 * types it has a translated label for. The old screen had no case for
 * `login_success` — the ONLY login event `app/auth/callback/route.ts` writes —
 * and its label lookup fell through to `return eventType`, so every sign-in
 * printed the raw string `login_success` to the user, in both languages.
 */
const SECTION = readFileSync('components/settings/sections/SecuritySection.tsx', 'utf-8')

/** Every eventType any code path writes to `SecurityEvent`. */
const PRODUCED_EVENT_TYPES = ['login_success', 'email_change', 'password_change']

describe('security activity renders only labelled, localised events', () => {
    it('has a label for every event type that is actually produced', () => {
        for (const eventType of PRODUCED_EVENT_TYPES) {
            expect(SECTION, eventType).toContain(`${eventType}:`)
        }
    })

    it('never falls back to printing the raw event key', () => {
        expect(SECTION).not.toMatch(/return\s+eventType/)
        expect(SECTION).not.toMatch(/labels\[eventType\]\s*\|\|/)
    })

    it('both languages define every event label the section reads', () => {
        const keys = ['eventLogin', 'eventEmailChange', 'eventPasswordChange'] as const
        for (const key of keys) {
            expect(el.settings.security[key], key).toBeTruthy()
            expect(en.settings.security[key], key).toBeTruthy()
            expect(el.settings.security[key], key).toMatch(/[Α-Ωα-ωίϊΐόάέύϋΰήώ]/)
        }
    })

    it('does not claim a device or a location it does not have', () => {
        // The old mapper hardcoded device_name "System" and location "Unknown"
        // for every row — two columns that could only ever print a constant.
        expect(SECTION).not.toMatch(/device_name|deviceName/)
        expect(SECTION).not.toMatch(/'Unknown'/)
    })
})
