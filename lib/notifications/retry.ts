/**
 * Retry, expiry and escalation — the half of delivery that used to be missing.
 *
 * Before this, `failureReason` was written and nothing ever read it: a
 * notification that failed to send was simply lost, silently, for ever. There
 * was also no expiry, so nothing distinguished a message still worth
 * delivering from one that had gone stale, and no escalation, so a customer
 * whose payments kept failing was a fact nobody at PolicyWallet ever learned.
 *
 * Three passes, in this order, because the order is load-bearing:
 *
 *   1. EXPIRE first, so we never spend a retry on a message that is no longer
 *      true. A renewal reminder that arrives after the renewal has passed is
 *      worse than one that never came.
 *   2. ESCALATE, using the failure counts as they stand.
 *   3. RETRY what is left and still due.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { emit } from "./dispatch"
import { getEventDefinition, retryDelayMinutes } from "./registry"
import { getNotificationConfig } from "./config"
import { settingValue } from "./settings"
import { deliver, isTransportConfigured } from "./channels"
import { cadenceSkipForStoredRow, type CadenceGate } from "./cadence"
import type { NotificationChannel } from "./registry"

export interface RetrySweepSummary {
    expired: number
    retried: number
    delivered: number
    exhausted: number
    escalated: number
    /** Deferred notifications whose hour came and were sent. */
    scheduled: number
}

export async function runNotificationRetrySweep(now = new Date()): Promise<RetrySweepSummary> {
    const summary: RetrySweepSummary = {
        expired: 0,
        retried: 0,
        delivered: 0,
        exhausted: 0,
        escalated: 0,
        scheduled: 0,
    }

    // Everything below is operator-controlled. Expiry still runs even with retry
    // switched off: a stale notification should stop being pending regardless of
    // whether anyone intends to re-attempt it.
    const config = await getNotificationConfig()
    const retryEnabled = settingValue<boolean>(config.settings, "automation.retryEnabled")
    const escalationEnabled = settingValue<boolean>(config.settings, "automation.escalationEnabled")
    /** Rows one invocation will touch. Reported, never silently capped. */
    const MAX_BATCH = settingValue<number>(config.settings, "automation.retryBatchSize")

    // The §9.5 cadence gate, re-checked per stored row before late delivery.
    // A row queued last night (quiet hours) or failed last week (retry) was
    // admitted under the rules of THAT moment; the user may have switched
    // outbound off since, and this sweep must not be the way around their
    // refusal. One read per user per sweep.
    const cadenceGates = new Map<string, CadenceGate>()

    // ── 1. Expire ────────────────────────────────────────────────────────────
    const expired = await db.notificationEvent.updateMany({
        where: {
            status: "failed",
            expiresAt: { not: null, lt: now },
        },
        data: { status: "expired", nextAttemptAt: null },
    })
    summary.expired = expired.count

    // ── 2. Escalate ──────────────────────────────────────────────────────────
    //
    // A row that has exhausted its retries on an event with an escalation rule
    // is the signal. Grouped per (user, event) so three failed dunning attempts
    // raise ONE admin notification, not three.
    // Bounded to a recent window. Without it the sweep rescans every failure the
    // table has ever held, so a months-old dead address is reconsidered nightly
    // for as long as it exists.
    const ESCALATION_WINDOW_DAYS = 7
    const exhausted = await db.notificationEvent.findMany({
        where: {
            status: { in: ["failed", "expired"] },
            attempts: { gte: 1 },
            createdAt: { gte: new Date(now.getTime() - ESCALATION_WINDOW_DAYS * 24 * 3600_000) },
        },
        select: { id: true, userId: true, eventType: true, attempts: true, title: true },
        orderBy: { createdAt: "desc" },
        take: MAX_BATCH,
    })

    const escalationSeen = new Set<string>()
    for (const row of escalationEnabled ? exhausted : []) {
        const def = config.events[row.eventType] ?? getEventDefinition(row.eventType)
        const rule = def?.escalation
        if (!def || !rule?.afterFailures) continue
        if (row.attempts < rule.afterFailures) continue

        const key = `${row.userId}:${row.eventType}`
        if (escalationSeen.has(key)) continue
        escalationSeen.add(key)

        const admins = await db.user.findMany({
            where: { roles: { contains: "admin" } },
            select: { id: true },
            take: 20,
        })
        for (const admin of admins) {
            const result = await emit({
                event: rule.event,
                userId: admin.id,
                title: { el: `Κλιμάκωση: ${row.eventType}`, en: `Escalation: ${row.eventType}` },
                // Worded to be distinguishable from the pre-cutover composer
                // ("N failed delivery attempts of ..."), which the stored-content
                // presenter treats as legacy internal prose.
                message: {
                    el: `${row.attempts} αποτυχημένες προσπάθειες παράδοσης της ειδοποίησης «${row.title}» για τον χρήστη ${row.userId}.`,
                    en: `Delivery of "${row.title}" failed ${row.attempts} times for user ${row.userId}.`,
                },
                // ONE escalation per failed notification, ever.
                //
                // The key used to carry the date, so a permanently failed row —
                // a dead address, a bounced domain — re-escalated on every
                // nightly sweep. Telling an admin the same thing every morning
                // until someone deletes the row by hand is how a team learns to
                // ignore escalations, which costs more than the missed delivery.
                //
                // Keyed on the ROW rather than on (user, event): a fresh failure
                // months later is a genuinely new signal and must escalate again,
                // which a once-ever (user, event) key would silently swallow.
                dedupeKey: `escalation:${row.id}`,
            })
            if (result.written > 0 && !result.deduped) summary.escalated++
        }
    }

    // ── 2b. Scheduled sends ──────────────────────────────────────────────────
    //
    // Notifications deferred by quiet hours or an explicit schedule. Folded into
    // this sweep rather than given a cron of their own: it already runs, it
    // already knows how to deliver a stored row, and a second worker would be a
    // second place for delivery to drift.
    //
    // Expiry is checked again here, not only at defer time: a notification
    // deferred overnight can expire while it waits, and sending a renewal
    // reminder for a renewal that has already passed is the failure the expiry
    // rule exists to prevent.
    const due = await db.notificationEvent.findMany({
        where: {
            status: "queued",
            scheduledFor: { not: null, lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { scheduledFor: "asc" },
        take: MAX_BATCH,
    })

    for (const row of due) {
        const channel = row.channel as NotificationChannel
        if (!isTransportConfigured(channel)) {
            await db.notificationEvent.update({
                where: { id: row.id },
                data: {
                    status: "skipped",
                    skipReason: `transport_not_configured:${channel}`,
                    scheduledFor: null,
                },
            })
            continue
        }

        const cadenceSkip = await cadenceSkipForStoredRow(row.userId, row.eventType, channel, cadenceGates)
        if (cadenceSkip) {
            await db.notificationEvent.update({
                where: { id: row.id },
                data: { status: "skipped", skipReason: cadenceSkip, scheduledFor: null },
            })
            continue
        }

        const user = await db.user.findUnique({
            where: { id: row.userId },
            select: { email: true, preferredLanguage: true },
        })
        if (!user) continue

        const outcome = await deliver(channel, {
            userId: row.userId,
            email: user.email,
            title: row.title,
            message: row.message,
            language: user.preferredLanguage === "el" ? "el" : "en",
            relatedObjectType: row.relatedObjectType,
            relatedObjectId: row.relatedObjectId,
        })

        await db.notificationEvent.update({
            where: { id: row.id },
            data: {
                status: outcome.status,
                scheduledFor: null,
                attempts: row.attempts + (outcome.status === "skipped" ? 0 : 1),
                sentAt: outcome.status === "sent" ? now : null,
                failureReason: outcome.status === "failed" ? outcome.error.slice(0, 500) : null,
                skipReason: outcome.status === "skipped" ? outcome.reason : null,
                nextAttemptAt:
                    outcome.status === "failed"
                        ? new Date(now.getTime() + retryDelayMinutes(
                              (config.events[row.eventType] ?? getEventDefinition(row.eventType))?.retry
                                  ?? { attempts: 1, backoff: "none", baseDelayMinutes: 0 },
                              1
                          ) * 60_000)
                        : null,
            },
        })
        if (outcome.status === "sent") summary.scheduled++
    }

    // Deferred notifications that expired while they waited. Marked, not sent.
    const staleScheduled = await db.notificationEvent.updateMany({
        where: { status: "queued", scheduledFor: { not: null }, expiresAt: { not: null, lt: now } },
        data: { status: "expired", scheduledFor: null },
    })
    summary.expired += staleScheduled.count

    // ── 3. Retry ─────────────────────────────────────────────────────────────
    const dueRetries = await db.notificationEvent.findMany({
        where: {
            status: "failed",
            nextAttemptAt: { not: null, lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { nextAttemptAt: "asc" },
        take: MAX_BATCH,
    })

    for (const row of retryEnabled ? dueRetries : []) {
        // Effective rules, so an operator raising an event's retry ceiling
        // reaches rows that already exhausted the old one.
        const def = config.events[row.eventType] ?? getEventDefinition(row.eventType)
        if (!def) continue

        if (row.attempts >= def.retry.attempts) {
            // Out of attempts. Left as `failed` with its reason intact — this is
            // the record that we tried and could not reach them, which is the
            // thing an operator needs to see.
            summary.exhausted++
            await db.notificationEvent.update({
                where: { id: row.id },
                data: { nextAttemptAt: null },
            })
            continue
        }

        const channel = row.channel as NotificationChannel
        if (!isTransportConfigured(channel)) {
            await db.notificationEvent.update({
                where: { id: row.id },
                data: {
                    status: "skipped",
                    skipReason: `transport_not_configured:${channel}`,
                    nextAttemptAt: null,
                },
            })
            continue
        }

        // A retry must not deliver into a mailbox the user has since closed.
        const cadenceSkip = await cadenceSkipForStoredRow(row.userId, row.eventType, channel, cadenceGates)
        if (cadenceSkip) {
            await db.notificationEvent.update({
                where: { id: row.id },
                data: { status: "skipped", skipReason: cadenceSkip, nextAttemptAt: null },
            })
            continue
        }

        const user = await db.user.findUnique({
            where: { id: row.userId },
            select: { email: true, preferredLanguage: true },
        })
        if (!user) continue

        const outcome = await deliver(channel, {
            userId: row.userId,
            email: user.email,
            title: row.title,
            message: row.message,
            language: user.preferredLanguage === "el" ? "el" : "en",
            relatedObjectType: row.relatedObjectType,
            relatedObjectId: row.relatedObjectId,
        })

        const attempts = row.attempts + 1
        summary.retried++

        if (outcome.status === "sent") {
            summary.delivered++
            await db.notificationEvent.update({
                where: { id: row.id },
                data: { status: "sent", sentAt: now, attempts, nextAttemptAt: null, failureReason: null },
            })
        } else if (outcome.status === "skipped") {
            await db.notificationEvent.update({
                where: { id: row.id },
                data: { status: "skipped", skipReason: outcome.reason, attempts, nextAttemptAt: null },
            })
        } else {
            const moreLeft = attempts < def.retry.attempts
            await db.notificationEvent.update({
                where: { id: row.id },
                data: {
                    attempts,
                    failureReason: outcome.error.slice(0, 500),
                    nextAttemptAt: moreLeft
                        ? new Date(now.getTime() + retryDelayMinutes(def.retry, attempts) * 60_000)
                        : null,
                },
            })
            if (!moreLeft) summary.exhausted++
        }
    }

    logger("info", "notification retry sweep complete", { ...summary })
    return summary
}
