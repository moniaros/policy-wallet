import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { NOTIFICATION_PREFERENCE_GROUPS, eventTypesFor } from '@/lib/notifications/preference-registry'
import {
    PREFERENCE_CHANNELS,
    preferenceRowsForStream,
    streamReachesOut,
} from '@/lib/notifications/preference-channels'
import { IMPLEMENTED_CHANNELS } from '@/lib/notifications/channels'
import { getEventDefinition } from '@/lib/notifications/registry'
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
        // leave the others still sending. The expansion now happens server-side
        // (the screen passes only the group's key), so the assertion moved to
        // the action and the shared row builder.
        const ACTIONS = strip(readFileSync('app/(protected)/me/actions.ts', 'utf-8'))
        expect(ACTIONS).toMatch(/preferenceRowsForStream/)
        expect(UI).toMatch(/setNotificationStreamPreference\(/)
        for (const group of NOTIFICATION_PREFERENCE_GROUPS) {
            const written = new Set(preferenceRowsForStream('u1', group, false).map((r) => r.eventType))
            expect([...written].sort()).toEqual([...eventTypesFor(group)].sort())
        }
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

/**
 * The channel dimension. The settings screen wrote `channel: "email"` and
 * nothing else, so a customer who switched a stream "off" silenced one pipe of
 * it: push is an implemented transport (VAPID web push), the dispatcher
 * honours per-channel rows, and the missing push row defaulted to ON. A
 * mislabelled control — "off" that keeps notifying — is the defect this
 * section exists to keep out.
 */

/**
 * Every file that writes NotificationPreference, enumerated from the
 * filesystem — app/, components/ and lib/ in full, not a list of known
 * locations (a guard that scopes itself to known files guards the files,
 * not the invariant).
 */
function preferenceWriters(): string[] {
    const universe = [
        ...globSync('app/**/*.ts'),
        ...globSync('app/**/*.tsx'),
        ...globSync('components/**/*.ts'),
        ...globSync('components/**/*.tsx'),
        ...globSync('lib/**/*.ts'),
    ]
    return universe.filter((f) => isPreferenceWriter(strip(readFileSync(f, 'utf-8'))))
}

function isPreferenceWriter(src: string): boolean {
    return /notificationPreference\s*\.\s*(upsert|create|createMany|update|updateMany)/.test(src)
}

/** Why a preference-writing file is not allowed to look like this. */
function channelViolations(src: string): string[] {
    const problems: string[] = []
    // A literal channel at a write site is the original defect. The write
    // key objects (`userId_eventType_channel`) use the same `channel:` label,
    // so this catches literals in `where`, `create` and `data` alike.
    if (/channel:\s*["'`]/.test(src)) problems.push('hardcodes a channel literal at a write site')
    // The channel set must come from the one derived constant — directly, or
    // through the row builder that wraps it — so a fourth implemented channel
    // reaches every writer without any of them changing.
    if (!/PREFERENCE_CHANNELS|preferenceRowsForStream/.test(src)) {
        problems.push('does not derive its channels from PREFERENCE_CHANNELS')
    }
    return problems
}

describe('a switch governs the stream, not one pipe of it', () => {
    it('the governed set is derived from the implemented set, minus only in_app', () => {
        // in_app is implemented but deliberately not governable: the bell and
        // the history read in_app rows with no status filter, so a suppressed
        // in-app arm would still render — a checkbox wired to nothing. See
        // lib/notifications/preference-channels.ts.
        expect(IMPLEMENTED_CHANNELS).toContain('in_app')
        expect(PREFERENCE_CHANNELS).toEqual(IMPLEMENTED_CHANNELS.filter((c) => c !== 'in_app'))
        // email and push both exist and are both governed — the single
        // hardcoded channel can never come back as "the derived set happens
        // to have one member".
        expect(PREFERENCE_CHANNELS).toContain('email')
        expect(PREFERENCE_CHANNELS).toContain('push')

        const src = strip(readFileSync('lib/notifications/preference-channels.ts', 'utf-8'))
        expect(src).toMatch(/IMPLEMENTED_CHANNELS\.filter/)
        expect(src, 'PREFERENCE_CHANNELS must be computed, never a literal list').not.toMatch(
            /PREFERENCE_CHANNELS[^=\n]*=\s*\[/
        )
    })

    it('every governed event is one the dispatcher will actually honour a preference for', () => {
        for (const group of NOTIFICATION_PREFERENCE_GROUPS) {
            let consultablePairs = 0
            for (const eventType of eventTypesFor(group)) {
                const def = getEventDefinition(eventType)
                expect(def, `${eventType} is not in the registry — its switch writes rows nothing reads`).toBeTruthy()
                // suppressedChannels() returns empty for transactional events:
                // a switch over one would be a checkbox the dispatcher ignores.
                expect(def!.transactional, `${eventType} is transactional — not suppressible`).toBe(false)
                consultablePairs += def!.channels.filter((c) => PREFERENCE_CHANNELS.includes(c)).length
            }
            expect(
                consultablePairs,
                `group ${group.labelKey} has no outreach channel at all — its switch would govern nothing`
            ).toBeGreaterThan(0)
        }
    })

    it('what one switch writes silences the stream; what it reads reports the stream', () => {
        for (const group of NOTIFICATION_PREFERENCE_GROUPS) {
            const off = preferenceRowsForStream('u1', group, false)
            // every event type × every governed channel, exactly once
            expect(off.length).toBe(eventTypesFor(group).length * PREFERENCE_CHANNELS.length)
            expect(new Set(off.map((r) => `${r.eventType} ${r.channel}`)).size).toBe(off.length)
            for (const channel of PREFERENCE_CHANNELS) {
                expect(off.some((r) => r.channel === channel)).toBe(true)
            }

            expect(streamReachesOut(off, group)).toBe(false)
            expect(streamReachesOut(preferenceRowsForStream('u1', group, true), group)).toBe(true)
            // Absent rows mean ON — the dispatcher's own rule.
            expect(streamReachesOut([], group)).toBe(true)
        }
    })

    it('the defect, demonstrated: an email-only opt-out does not silence a full-reach stream', () => {
        // policy_expiring declares in_app+email+push. The pre-fix screen wrote
        // only the email row, so push stayed live — the switch must therefore
        // report this legacy state as ON (the stream still reaches out), and
        // flipping it off writes the full set and actually ends it.
        const renewals = NOTIFICATION_PREFERENCE_GROUPS.find((g) => g.eventType === 'policy_expiring')!
        const legacy = [{ eventType: 'policy_expiring', channel: 'email', enabled: false }]
        expect(streamReachesOut(legacy, renewals)).toBe(true)

        // For an email-led stream the same legacy row IS the whole outreach —
        // the switch must show OFF, not resurrect it because a virtual "push"
        // pair defaults to on over a channel the event never uses.
        const digest = NOTIFICATION_PREFERENCE_GROUPS.find((g) => g.eventType === 'weekly_digest')!
        const digestOff = [{ eventType: 'weekly_digest', channel: 'email', enabled: false }]
        expect(streamReachesOut(digestOff, digest)).toBe(false)
    })
})

describe('no preference surface hardcodes a channel', () => {
    const writers = preferenceWriters()

    it('the universe enumerates itself and finds the known writers', () => {
        // If the glob or the writer detector breaks, this goes red before the
        // per-file checks can silently pass over an empty list.
        expect(writers.length).toBeGreaterThan(0)
        expect(writers, `writers found:\n${writers.join('\n')}`).toContain(
            'app/(protected)/me/actions.ts'
        )
        expect(writers).toContain('app/onboarding/actions.ts')
        expect(writers).toContain('app/api/v1/notifications/preferences/route.ts')
    })

    it('every writer derives its channels; none writes a literal one', () => {
        const offenders: string[] = []
        for (const f of writers) {
            for (const problem of channelViolations(strip(readFileSync(f, 'utf-8')))) {
                offenders.push(`${f}: ${problem}`)
            }
        }
        expect(offenders, offenders.join('\n')).toEqual([])
    })

    it('the settings screen cannot name a channel at all', () => {
        // The channel dimension belongs to the server action. A screen that
        // never mentions a channel cannot re-grow `channel: "email"`.
        const UI = strip(readFileSync('components/settings/sections/NotificationsSection.tsx', 'utf-8'))
        for (const channel of IMPLEMENTED_CHANNELS) {
            expect(UI, `the screen names "${channel}"`).not.toMatch(
                new RegExp(`["'\`]${channel}["'\`]`)
            )
        }
    })

    it('the probe writer turns the detector red — on both counts', () => {
        // A guard without a committed probe proven to fail it is not a guard.
        const probe = readFileSync('tests/fixtures/guard-probes/pref-writer-hardcoded-channel.ts.txt', 'utf-8')
        const stripped = strip(probe)
        // The probe genuinely exercises the guarded path: the universe filter
        // would classify it as a writer, and the detector flags it.
        expect(isPreferenceWriter(stripped)).toBe(true)
        expect(channelViolations(stripped)).toEqual([
            'hardcodes a channel literal at a write site',
            'does not derive its channels from PREFERENCE_CHANNELS',
        ])
    })
})
