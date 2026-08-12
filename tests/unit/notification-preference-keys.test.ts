import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { NOTIFICATION_PREFERENCE_GROUPS, eventTypesFor } from '@/lib/notifications/preference-registry'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * Every event type any sender actually passes.
 *
 * Two spellings, because notifications now go through the bus: `emit({ event:
 * "..." })` at call sites, and `eventType: "..."` on the remaining shims and in
 * queries. Scanning only the old one reported every migrated sender as an
 * orphan — the guard would have failed for the opposite of the reason it
 * exists.
 *
 * Digits matter: engagement_day3 / engagement_day7 exist, and an extractor
 * without \d silently reported them as orphan keys.
 */
function sentEventTypes(): Set<string> {
    const found = new Set<string>()
    for (const f of [...globSync('lib/**/*.ts'), ...globSync('app/**/*.ts')]) {
        const src = strip(readFileSync(f, 'utf-8'))
        for (const m of src.matchAll(/(?:eventType|event): *["']([A-Za-z0-9_]+)["']/g)) {
            found.add(m[1])
        }
    }
    return found
}

/**
 * The settings screen hardcoded three ids of its own — `policy_expiry`,
 * `security_alert`, `marketing` — and NO sender read any of them. The renewal
 * reminder reads `policy_expiring`, so the switch labelled "policy expiry" wrote
 * a row nothing ever consulted: turning it off changed nothing. The other two
 * were read by nobody at all.
 *
 * Meanwhile the three email streams that DO consult NotificationPreference — the
 * weekly digest, churn prevention and the engagement drip — had no switch.
 *
 * That mattered beyond tidiness. Every email footer links to this screen
 * offering to manage notifications, and the privacy policy states the lawful
 * basis as consent with an unsubscribe option in every message. The mechanism
 * was real in the services; the control was not.
 */
describe('every switch writes a key some sender reads', () => {
    const sent = sentEventTypes()

    it('the registry is not empty and covers the metered email streams', () => {
        const keys = NOTIFICATION_PREFERENCE_GROUPS.flatMap(eventTypesFor)
        for (const required of ['policy_expiring', 'weekly_digest', 'churn_prevention', 'engagement_welcome']) {
            expect(keys, `${required} has no switch`).toContain(required)
        }
    })

    it('every key in the registry is an event type a sender passes', () => {
        const orphans = NOTIFICATION_PREFERENCE_GROUPS.flatMap(eventTypesFor).filter((k) => !sent.has(k))
        expect(orphans, `keys no sender uses:\n${orphans.join('\n')}`).toEqual([])
    })

    it('does not resurrect the invented ids', () => {
        const keys = NOTIFICATION_PREFERENCE_GROUPS.flatMap(eventTypesFor)
        for (const invented of ['policy_expiry', 'security_alert', 'marketing']) {
            expect(keys).not.toContain(invented)
        }
        expect(sent.has('policy_expiring')).toBe(true)
        expect(sent.has('policy_expiry')).toBe(false)
    })

    it('has a label AND an explanation for every group, in both languages', () => {
        // A switch whose label is a category name ("Weekly summary") tells the
        // reader nothing about what turning it off costs them. Every group
        // carries a plain-language description for that reason.
        for (const group of NOTIFICATION_PREFERENCE_GROUPS) {
            for (const dict of [el, en]) {
                const entry = dict.settings.notificationGroups[group.labelKey]
                expect(entry?.label, group.labelKey).toBeTruthy()
                expect(entry?.description, group.labelKey).toBeTruthy()
            }
        }
    })
})

describe('the settings screen is driven by the registry', () => {
    const UI = strip(readFileSync('components/settings/sections/NotificationsSection.tsx', 'utf-8'))

    it('does not hardcode its own preference ids', () => {
        expect(UI).toMatch(/NOTIFICATION_PREFERENCE_GROUPS\.map/)
        expect(UI).not.toMatch(/id: 'policy_expiry'/)
        expect(UI).not.toMatch(/id: 'security_alert'/)
        expect(UI).not.toMatch(/id: 'marketing'/)
    })

    it('writes every event type a switch governs, not just the first', () => {
        // One switch covers a stream: renewal reminders govern policy_expiring,
        // renewal_milestone and perk_reminder. Writing only the group key would
        // leave the others still sending.
        expect(UI).toMatch(/eventTypesFor\(group\)\.map/)
    })

    it('is the only preference UI — /notifications must not ship a second catalog', () => {
        // Two screens wrote the same table from disagreeing lists: the
        // /notifications catalog exposed renewal_milestone on its own while the
        // group switch here governs it, so a stream switched off in one place
        // could be half-revived in the other.
        // Stripped: the file's own header comment names the keys it dropped.
        const history = strip(readFileSync('components/notifications/NotificationsClient.tsx', 'utf-8'))
        expect(history).not.toMatch(/preferenceCatalog/)
        expect(history).not.toMatch(/pending_questionnaire/)
    })
})
