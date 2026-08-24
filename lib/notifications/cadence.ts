/**
 * The §9.5 cadence controls — the CUSTOMER's controls, deliberately not part
 * of lib/notifications/settings.ts (which declares the 17 operator dials).
 *
 * H-002 was answered with option B — deadline-bearing events plus a monthly
 * digest — and B depends on two controls the user owns:
 *
 *   1. **A global off switch for outbound.** Stored as an explicit
 *      `user_notification_settings.max_per_day = 0`. Zero per rolling day is
 *      the literal meaning of "never reach me outside the app", the column
 *      already exists, and nothing else has ever written 0 (the settings
 *      screen exposed only quiet hours; null means "role default", which is
 *      always ≥ 12). But a cap of 0 is NOT a rate limit and must not run
 *      through the rate-limit machinery, for two reasons this module exists
 *      to make structural:
 *
 *        - The rate limit DEFERS. `already >= 0` is always true, so a cap of
 *          0 queued everything for tomorrow — and the sweep then delivered it
 *          without re-asking. A one-day delay is not "off".
 *        - The rate limit is gated on the ADMIN setting
 *          `orchestrator.rateLimitEnabled`. An operator switching platform
 *          rate limiting off must not switch every customer's "no" off with
 *          it. A rule the operator can bend must never be the rule protecting
 *          the customer FROM the operator — so this gate reads the user's row
 *          directly and consults no admin setting whatsoever.
 *
 *   2. **A monthly ceiling on non-deadline outbound.** Stored as
 *      `policyholder_profiles.preferences.outboundMonthlyCeiling` — the
 *      existing per-user preference bag (it already carries onboarding state
 *      and `showTour`), which is what lets the control exist without a schema
 *      migration. Absent, null or invalid = no ceiling. "Non-deadline" is the
 *      registry's own vocabulary: `category: "engagement"`, the perk / digest
 *      / drip / churn class. A renewal reminder or a lapse warning has a date
 *      and a consequence and is exactly what option B keeps — the ceiling can
 *      never touch it.
 *
 * Both controls are enforced where messages leave: the dispatcher skips (and
 * records why, like `preference_off`) before any transport is attempted, and
 * the retry sweep re-checks before delivering a row that was queued or failed
 * BEFORE the user changed their mind. Transactional events are exempt from
 * both, by the same rule as per-event preferences: nobody consents away a
 * failed payment or a password change. The in-app timeline is untouched — it
 * is the customer's own record and does not interrupt anyone.
 *
 * Reads fail OPEN (no gate), matching `getDeliverySettings`: settings are a
 * refinement, not a precondition, and a transient DB error must not silence
 * every notification with no row recording why. `tests/unit/cadence-controls.test.ts`
 * holds all of this to dispatcher OUTCOMES, and the transport-universe guard
 * in `tests/unit/notification-bus-invariants.test.ts` holds the set of send
 * paths this gate must cover.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
    NOTIFICATION_EVENTS,
    type NotificationChannel,
    type NotificationEventDefinition,
} from "./registry"
import { PREFERENCE_CHANNELS } from "./preference-channels"

// ── Vocabulary ───────────────────────────────────────────────────────────────

/** Recorded on the row when the user's global off switch withheld a send. */
export const SKIP_USER_OUTBOUND_OFF = "user_outbound_off"
/** Recorded on the row when the user's monthly ceiling withheld a send. */
export const SKIP_USER_MONTHLY_CEILING = "user_monthly_ceiling"

/**
 * "Outbound" = reaches the customer outside the app. One vocabulary, derived:
 * PREFERENCE_CHANNELS is IMPLEMENTED_CHANNELS minus in_app, so a transport
 * built later joins the governed set the moment it becomes real — the same
 * property P1-09 gave the stream switches.
 */
export function isOutboundChannel(channel: NotificationChannel): boolean {
    return PREFERENCE_CHANNELS.includes(channel)
}

/** The rolling month, mirroring maxPerDay's rolling day. */
const MONTH_MS = 30 * 24 * 3600_000

/**
 * The event types the monthly ceiling governs: the engagement class, minus
 * anything transactional (which today is only the analytics-channel feedback
 * mirrors — belt and braces, since analytics is not outbound either).
 */
export const CEILING_GOVERNED_EVENT_TYPES: readonly string[] = Object.entries(
    NOTIFICATION_EVENTS
)
    .filter(([, def]) => def.category === "engagement" && !def.transactional)
    .map(([key]) => key)

export function isCeilingGoverned(def: NotificationEventDefinition): boolean {
    return def.category === "engagement" && !def.transactional
}

// ── The gate ─────────────────────────────────────────────────────────────────

export interface CadenceGate {
    /** True only on an explicit stored maxPerDay of 0 — never from a default. */
    outboundOff: boolean
    /** Positive integer, or null = no ceiling. */
    monthlyCeiling: number | null
}

export const OPEN_GATE: CadenceGate = { outboundOff: false, monthlyCeiling: null }

/**
 * A stored ceiling is used only when it is a positive whole number. The
 * preferences column is a JSON bag other features also write; a corrupt or
 * foreign value must degrade to "no ceiling", never to NaN comparisons that
 * silently suppress (or silently admit) everything.
 */
export function parseMonthlyCeiling(raw: unknown): number | null {
    return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : null
}

/**
 * Read one user's cadence controls. Never throws; unreadable = open gate.
 * Deliberately independent of `getNotificationConfig` — see the module note.
 */
export async function getCadenceGate(userId: string): Promise<CadenceGate> {
    try {
        const [settings, profile] = await Promise.all([
            db.userNotificationSettings
                .findUnique({ where: { userId }, select: { maxPerDay: true } })
                .catch(() => null),
            db.policyholderProfile
                .findUnique({ where: { userId }, select: { preferences: true } })
                .catch(() => null),
        ])
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
        return {
            outboundOff: settings?.maxPerDay === 0,
            monthlyCeiling: parseMonthlyCeiling(prefs.outboundMonthlyCeiling),
        }
    } catch (error) {
        logger("warn", "[cadence] gate unreadable; delivering", {
            userId,
            error: error instanceof Error ? error.message : String(error),
        })
        return OPEN_GATE
    }
}

/**
 * Distinct MESSAGES (not rows) sent to this user on outbound channels for
 * ceiling-governed events in the rolling month. One emission writes one row
 * per channel under one dedupe key; a customer with push and email enabled
 * received one notification, and counting rows would halve their ceiling.
 * Never throws; unreadable = 0, i.e. fail open, consistent with the gate.
 */
export async function countOutboundEngagementThisMonth(
    userId: string,
    now: Date = new Date()
): Promise<number> {
    try {
        const rows = await db.notificationEvent.findMany({
            where: {
                userId,
                status: "sent",
                channel: { in: [...PREFERENCE_CHANNELS] },
                eventType: { in: [...CEILING_GOVERNED_EVENT_TYPES] },
                createdAt: { gte: new Date(now.getTime() - MONTH_MS) },
            },
            select: { id: true, dedupeKey: true },
        })
        const distinct = new Set<string>()
        for (const row of rows) distinct.add(row.dedupeKey ?? row.id)
        return distinct.size
    } catch (error) {
        logger("warn", "[cadence] month count unreadable; delivering", {
            userId,
            error: error instanceof Error ? error.message : String(error),
        })
        return 0
    }
}

/**
 * The skip decision for one (event, channel) pair, pure so the precedence is
 * unit-testable: the off switch outranks the ceiling, and neither touches a
 * transactional event or a non-outbound channel.
 */
export function cadenceSkipReason(
    def: Pick<NotificationEventDefinition, "transactional" | "category">,
    channel: NotificationChannel,
    gate: CadenceGate,
    sentThisMonth: number
): string | null {
    if (def.transactional || !isOutboundChannel(channel)) return null
    if (gate.outboundOff) return SKIP_USER_OUTBOUND_OFF
    if (
        gate.monthlyCeiling !== null &&
        def.category === "engagement" &&
        sentThisMonth >= gate.monthlyCeiling
    ) {
        return SKIP_USER_MONTHLY_CEILING
    }
    return null
}

/**
 * The sweep's form of the same question, for a STORED row about to be
 * delivered late — deferred by quiet hours, or failed and due for retry. The
 * user may have closed the door since the row was written, and a queue must
 * not be a way around a refusal. `gates` lets one sweep run ask about each
 * user once.
 */
export async function cadenceSkipForStoredRow(
    userId: string,
    eventType: string,
    channel: NotificationChannel,
    gates?: Map<string, CadenceGate>
): Promise<string | null> {
    // Registry, not effective config: an admin override cannot change
    // `transactional` or `category` (see lib/notifications/config.ts), so the
    // declaration is the truth — and an event that no longer exists gets no
    // cadence opinion here (the sweep already handles unknown events).
    const def = NOTIFICATION_EVENTS[eventType]
    if (!def || def.transactional || !isOutboundChannel(channel)) return null

    let gate = gates?.get(userId)
    if (!gate) {
        gate = await getCadenceGate(userId)
        gates?.set(userId, gate)
    }
    if (gate.outboundOff) return SKIP_USER_OUTBOUND_OFF
    if (gate.monthlyCeiling !== null && isCeilingGoverned(def)) {
        const sent = await countOutboundEngagementThisMonth(userId)
        if (sent >= gate.monthlyCeiling) return SKIP_USER_MONTHLY_CEILING
    }
    return null
}
