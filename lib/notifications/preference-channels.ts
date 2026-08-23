/**
 * The channel dimension of a customer's notification switch.
 *
 * A switch on the settings screen governs a STREAM (a preference-registry
 * group). This module decides which channels that means — derived from
 * `IMPLEMENTED_CHANNELS`, never restated, so a newly implemented transport
 * joins the governed set the moment it becomes real. The screen used to write
 * `channel: "email"` and nothing else: "off" silenced email while push (a real
 * transport, VAPID-keyed in production) kept firing, and the customer was told
 * nothing. `tests/unit/notification-preference-keys.test.ts` guards against
 * any preference surface growing its own channel list again.
 *
 * `in_app` is implemented but deliberately NOT governed here. In-app delivery
 * IS the NotificationEvent row (see channels/index.ts) — the bell and the
 * /notifications history read `channel: "in_app"` rows with no status filter,
 * so a suppressed in-app arm would still render; the checkbox would change
 * nothing the customer sees. And the in-app timeline doubles as the customer's
 * own record of what the product did, which is not something to consent away —
 * interruption control is quiet hours' job, and the bell does not interrupt.
 * A switch therefore answers exactly one question: "does this stream still
 * reach me OUTSIDE the app?"
 *
 * This lives apart from preference-registry.ts on purpose: the settings screen
 * (a client component) imports the registry for its groups, and must not pull
 * the channel-adapter module graph into the client bundle. Only server code —
 * the write action, the data loader, the API route, onboarding — imports this.
 */

import { IMPLEMENTED_CHANNELS } from "./channels"
import { getEventDefinition, type NotificationChannel } from "./registry"
import { eventTypesFor, type NotificationPreferenceGroup } from "./preference-registry"

/**
 * Every implemented channel that reaches the customer outside the app —
 * what one preference switch governs. Derived, never listed.
 */
export const PREFERENCE_CHANNELS: NotificationChannel[] = IMPLEMENTED_CHANNELS.filter(
    (channel) => channel !== "in_app"
)

export interface PreferenceRow {
    userId: string
    eventType: string
    channel: NotificationChannel
    enabled: boolean
}

/**
 * The exact rows one switch writes: every event type the group governs ×
 * every governed channel.
 *
 * The full channel set is written even for an event whose registry entry is
 * currently narrower (the dispatcher only consults pairs it attempts, and
 * admin overrides can only NARROW a channel set). That asymmetry is the
 * point: if the registry later widens an event onto a new outreach channel,
 * the explicit rows are already there, and a stream the customer switched
 * off cannot silently start reaching them again through the new pipe.
 */
export function preferenceRowsForStream(
    userId: string,
    group: NotificationPreferenceGroup,
    enabled: boolean
): PreferenceRow[] {
    const rows: PreferenceRow[] = []
    for (const eventType of eventTypesFor(group)) {
        for (const channel of PREFERENCE_CHANNELS) {
            rows.push({ userId, eventType, channel, enabled })
        }
    }
    return rows
}

// `\u0000` as an escape, never a raw NUL byte: a literal NUL makes this file
// BINARY to grep/ripgrep, so every command-line text tool — and any guard that
// shells out to one — silently skips it. lint:utf8 does not catch it, because
// U+0000 is valid UTF-8.
const pairKey = (eventType: string, channel: string) => `${eventType}\u0000${channel}`

/**
 * Does this stream still reach the customer outside the app?
 *
 * True iff at least one (eventType, channel) pair the dispatcher can actually
 * attempt — the event's DECLARED channels intersected with the governed set —
 * is not explicitly switched off. Absent row = on, exactly the dispatcher's
 * rule (`suppressedChannels` in dispatch.ts suppresses only on an explicit
 * `false`).
 *
 * The intersection matters for legacy rows: the old screen wrote email-only,
 * so a customer who opted out then has `email: false` and nothing for push.
 * For an email-led event that means NOTHING fires outside the app — the
 * switch must show off — while a virtual "push is on" over a channel the
 * event never uses must not drag the display back to on. The write side is
 * deliberately wider than this read (see preferenceRowsForStream); the read
 * reports what actually happens today.
 */
export function streamReachesOut(
    prefs: Array<{ eventType: string; channel: string; enabled: boolean }>,
    group: NotificationPreferenceGroup
): boolean {
    const explicit = new Map<string, boolean>()
    for (const pref of prefs) {
        explicit.set(pairKey(pref.eventType, pref.channel), pref.enabled)
    }

    for (const eventType of eventTypesFor(group)) {
        const def = getEventDefinition(eventType)
        if (!def || def.transactional) continue
        for (const channel of def.channels) {
            if (!PREFERENCE_CHANNELS.includes(channel)) continue
            if (explicit.get(pairKey(eventType, channel)) ?? true) return true
        }
    }
    return false
}
