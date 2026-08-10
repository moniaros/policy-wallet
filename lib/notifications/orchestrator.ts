/**
 * The Notification Orchestrator.
 *
 * One business event may produce several notifications to several people. The
 * orchestrator is the layer that decides **who**, **when** and **whether** —
 * and then hands **how** to the existing bus.
 *
 *     business event
 *          │
 *     orchestrator      recipients · quiet hours · rate limit · scheduling
 *          │
 *      emit()           registry · preferences · templates · channels · retry
 *          │
 *     channel adapters  in-app · email · push · (sms/whatsapp/webhook/slack/teams)
 *
 * ## It does not duplicate the bus
 *
 * Nothing here re-decides a channel, re-resolves a language, re-renders a
 * template or re-checks a per-event preference. All of that lives in `emit`,
 * once, and this layer calls it. The orchestrator answers only the questions
 * the bus deliberately does not: which PEOPLE this event concerns, and whether
 * now is an acceptable moment to reach them.
 *
 * ## Deferral, not suppression
 *
 * Quiet hours and rate limits **defer**. They never drop. A policy about
 * *timing* that silently discarded the message would be a policy about
 * *existence*, and the customer would simply never learn their cover lapsed
 * because it lapsed at 23:40.
 *
 * The one exception is urgency: a payment failure, a password change or a
 * lapsed motor policy ignores quiet hours and rate limits entirely. Those are
 * the notifications a person would want to be woken for, and a rule that
 * silenced them would be protecting the wrong thing.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { emit, type EmitParams, type EmitResult, type LocalizedText } from "./dispatch"
import { getEventDefinition, type RecipientKind } from "./registry"
import { getNotificationConfig } from "./config"
import { settingValue } from "./settings"

// ── Per-user delivery settings ───────────────────────────────────────────────

export interface DeliverySettings {
    timezone: string
    quietHoursEnabled: boolean
    quietHoursStart: number
    quietHoursEnd: number
    maxPerDay: number
    digestMode: string
}

/**
 * Defaults by role.
 *
 * Customers and advisors want the same settings with different starting points:
 * a customer wants nothing overnight; an advisor is being handed work and wants
 * it inside working hours, with a higher ceiling because a book of clients
 * legitimately generates more than one person's life does.
 *
 * One model, two defaults — rather than two models, which would be the same
 * logic twice differing only in who it applies to.
 */
export function defaultSettingsForRoles(roles: string | null | undefined): DeliverySettings {
    const isAdvisor = (roles ?? "").split(",").some((r) => r.trim() === "agent")
    return {
        timezone: "Europe/Athens",
        quietHoursEnabled: true,
        quietHoursStart: isAdvisor ? 19 : 22,
        quietHoursEnd: isAdvisor ? 8 : 8,
        maxPerDay: isAdvisor ? 60 : 12,
        digestMode: "immediate",
    }
}

export async function getDeliverySettings(userId: string): Promise<DeliverySettings> {
    try {
        const [stored, user] = await Promise.all([
            db.userNotificationSettings.findUnique({ where: { userId } }),
            db.user.findUnique({ where: { id: userId }, select: { roles: true } }),
        ])
        const defaults = defaultSettingsForRoles(user?.roles)
        if (!stored) return defaults
        return {
            timezone: stored.timezone || defaults.timezone,
            quietHoursEnabled: stored.quietHoursEnabled,
            quietHoursStart: stored.quietHoursStart,
            quietHoursEnd: stored.quietHoursEnd,
            // Null means "use the role default", so raising a default reaches
            // everyone who never overrode it.
            maxPerDay: stored.maxPerDay ?? defaults.maxPerDay,
            digestMode: stored.digestMode || defaults.digestMode,
        }
    } catch (error) {
        // Settings are a refinement, not a precondition. Unreadable settings
        // must not stop a notification.
        logger("warn", "[orchestrator] delivery settings unreadable; using defaults", {
            userId,
            error: error instanceof Error ? error.message : String(error),
        })
        return defaultSettingsForRoles(null)
    }
}

// ── Quiet hours ──────────────────────────────────────────────────────────────

/**
 * The recipient's local hour.
 *
 * Uses `Intl` rather than an offset constant: Greece observes daylight saving,
 * so a fixed +2 would put quiet hours an hour wrong for half the year — which
 * is precisely the window where being woken matters.
 */
export function localHour(at: Date, timezone: string): number {
    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            hour: "numeric",
            hour12: false,
        }).formatToParts(at)
        const hour = parts.find((p) => p.type === "hour")?.value
        const parsed = Number(hour)
        return Number.isFinite(parsed) ? parsed % 24 : at.getUTCHours()
    } catch {
        // An invalid stored timezone must not throw on a delivery path.
        return at.getUTCHours()
    }
}

/** Is `at` inside the quiet window? Handles the normal midnight-crossing case. */
export function isQuietHour(hour: number, start: number, end: number): boolean {
    if (start === end) return false
    // 22 → 8 wraps midnight; 1 → 6 does not.
    return start > end ? hour >= start || hour < end : hour >= start && hour < end
}

/**
 * The next moment delivery is permitted, or null when now is fine.
 *
 * Returns the START of the recipient's morning, not "now + N hours": a
 * notification deferred at 23:00 and one deferred at 03:00 should both arrive
 * when the person wakes, not eight hours after each was raised.
 */
export function nextAllowedTime(at: Date, settings: DeliverySettings): Date | null {
    if (!settings.quietHoursEnabled) return null
    if (!isQuietHour(localHour(at, settings.timezone), settings.quietHoursStart, settings.quietHoursEnd)) {
        return null
    }

    // Step forward an hour at a time and ask the RECIPIENT'S clock, rather than
    // computing `(end - hour + 24) % 24` and adding that many hours of elapsed
    // time. Those are the same number only when no clock change intervenes.
    //
    // Greece changes clocks twice a year. On the autumn night, 04:00 becomes
    // 03:00, so a notification deferred at 23:00 with a 22→08 window was sent
    // nine elapsed hours later — which is 07:00 local, still inside quiet hours.
    // Once a year the mechanism did precisely what it exists to prevent.
    //
    // Truncate to the hour first so a batch deferred across an evening arrives
    // together rather than dribbling in over minutes.
    let next = new Date(Math.floor(at.getTime() / 3600_000) * 3600_000)

    // 26 steps covers a full day plus both DST directions; the loop is bounded
    // so a nonsense window can never spin here on a delivery path.
    for (let i = 0; i < 26; i += 1) {
        next = new Date(next.getTime() + 3600_000)
        if (!isQuietHour(localHour(next, settings.timezone), settings.quietHoursStart, settings.quietHoursEnd)) {
            return next
        }
    }

    // Unreachable for any sane window (start === end returns false above), but
    // deferring by a day beats returning a time inside the quiet hours.
    return new Date(at.getTime() + 24 * 3600_000)
}

// ── Rate limiting ────────────────────────────────────────────────────────────

/**
 * How many notifications this user has already been sent today.
 *
 * Counts SENT rows on customer-facing channels only: a skipped row means we
 * deliberately did not reach them, and counting it toward their daily budget
 * would let a preference they set consume the allowance for the ones they
 * still want.
 */
async function sentToday(userId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 3600_000)
    return db.notificationEvent.count({
        where: {
            userId,
            status: "sent",
            channel: { in: ["email", "push"] },
            createdAt: { gte: since },
        },
    })
}

// ── Recipients ───────────────────────────────────────────────────────────────

export interface RecipientResolution {
    kind: RecipientKind
    userId: string
}

/**
 * Turn the registry's abstract recipients into real people.
 *
 * `recipients` has been declared on every event since the registry was written
 * and, until now, nothing read it — callers resolved recipients themselves,
 * which is why `policy_analyzed` was emitted twice from one function with two
 * copies of the copy. This is the field finally becoming load-bearing.
 */
export async function resolveRecipients(
    kinds: readonly RecipientKind[],
    context: { subjectUserId: string | null; counterpartyUserId?: string | null }
): Promise<RecipientResolution[]> {
    const out: RecipientResolution[] = []
    const seen = new Set<string>()

    const add = (kind: RecipientKind, userId: string | null | undefined) => {
        if (!userId || seen.has(userId)) return
        seen.add(userId)
        out.push({ kind, userId })
    }

    for (const kind of kinds) {
        if (kind === "owner") {
            add("owner", context.subjectUserId)
        } else if (kind === "counterparty") {
            add("counterparty", context.counterpartyUserId)
        } else if (kind === "advisor") {
            if (!context.subjectUserId) continue
            const relationship = await db.customerRelationship.findFirst({
                where: { policyholderUserId: context.subjectUserId, status: { not: "terminated" } },
                select: { agentUserId: true },
            })
            add("advisor", relationship?.agentUserId)
        } else if (kind === "admin") {
            const admins = await db.user.findMany({
                where: { roles: { contains: "admin" } },
                select: { id: true },
                take: 20,
            })
            for (const admin of admins) add("admin", admin.id)
        }
    }

    return out
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface OrchestrateParams {
    event: string
    /** Whose data this is. The owner, when the event has one. */
    subjectUserId: string | null
    /** The other party, for cross-side events (a collaboration message). */
    counterpartyUserId?: string | null
    title: LocalizedText
    message: LocalizedText
    relatedObjectType?: EmitParams["relatedObjectType"]
    relatedObjectId?: string
    /** Base idempotency key; the recipient is appended so each gets one copy. */
    dedupeKey?: string
    vars?: EmitParams["vars"]
    content?: EmitParams["content"]
    /**
     * Deliver no earlier than this. Quiet hours may push it later, never
     * earlier — an explicit schedule is a floor, not an instruction to ignore
     * the recipient's night.
     */
    notBefore?: Date
    /** Override the registry's recipients for this occurrence. */
    only?: readonly RecipientKind[]
}

export interface OrchestrationOutcome {
    recipient: string
    kind: RecipientKind
    result: EmitResult | null
    /** Set when the notification was deferred rather than sent now. */
    deferredUntil?: Date
    skipped?: string
}

/**
 * Deliver one business event to everyone it concerns.
 *
 * Never throws. A notification is a consequence of an action, never a
 * precondition of it.
 */
export async function orchestrate(
    params: OrchestrateParams
): Promise<OrchestrationOutcome[]> {
    const outcomes: OrchestrationOutcome[] = []

    try {
        const definition = getEventDefinition(params.event)
        if (!definition) {
            logger("error", "[orchestrator] unknown event", { event: params.event })
            return outcomes
        }

        const recipients = await resolveRecipients(params.only ?? definition.recipients, {
            subjectUserId: params.subjectUserId,
            counterpartyUserId: params.counterpartyUserId,
        })

        // Urgency wins over politeness. A payment failure, a credential change
        // or a lapsed motor policy ignores quiet hours and the daily cap: these
        // are what a person would want to be woken for, and a rule that
        // silenced them would protect the wrong thing.
        const urgent = definition.priority === "critical" || definition.transactional

        // Operator switches. Never throws — an unreadable settings table falls
        // back to the shipped defaults rather than to no notifications.
        const config = await getNotificationConfig()
        const quietHoursOn = settingValue<boolean>(config.settings, "orchestrator.quietHoursEnabled")
        const rateLimitOn = settingValue<boolean>(config.settings, "orchestrator.rateLimitEnabled")

        for (const recipient of recipients) {
            const settings = await getDeliverySettings(recipient.userId)
            const now = new Date()

            let scheduledFor: Date | null = params.notBefore ?? null

            if (!urgent) {
                // Quiet hours defer; they never drop.
                if (quietHoursOn) {
                    const quietUntil = nextAllowedTime(scheduledFor ?? now, settings)
                    if (quietUntil) scheduledFor = quietUntil
                }

                // Rate limit also defers — to tomorrow, so nothing is lost.
                const already = rateLimitOn ? await sentToday(recipient.userId) : 0
                if (rateLimitOn && already >= settings.maxPerDay) {
                    const tomorrow = new Date(now.getTime() + 24 * 3600_000)
                    tomorrow.setMinutes(0, 0, 0)
                    scheduledFor = scheduledFor && scheduledFor > tomorrow ? scheduledFor : tomorrow
                    logger("info", "[orchestrator] daily cap reached; deferring", {
                        userId: recipient.userId,
                        already,
                        cap: settings.maxPerDay,
                    })
                }
            }

            // One copy per recipient. Appending the recipient to the key means
            // the customer and their advisor each get told once, rather than
            // the second one being deduped away as a repeat of the first.
            const dedupeKey = params.dedupeKey
                ? `${params.dedupeKey}:${recipient.kind}`
                : undefined

            const result = await emit({
                event: params.event,
                userId: recipient.userId,
                title: params.title,
                message: params.message,
                relatedObjectType: params.relatedObjectType,
                relatedObjectId: params.relatedObjectId,
                dedupeKey,
                vars: params.vars,
                content: params.content,
                scheduledFor: scheduledFor ?? undefined,
            })

            outcomes.push({
                recipient: recipient.userId,
                kind: recipient.kind,
                result,
                deferredUntil: scheduledFor ?? undefined,
            })
        }
    } catch (error) {
        logger("error", "[orchestrator] failed", {
            event: params.event,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return outcomes
}
