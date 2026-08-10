"use server"

import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import { BUSINESS_EVENTS } from "@/lib/events/catalog"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import {
    NOTIFICATION_CONFIG_CACHE_TAG,
    NOTIFICATION_TEMPLATES_CACHE_TAG,
} from "@/lib/notifications/config"
import { TEMPLATE_CHANNELS, TEMPLATE_LOCALES } from "@/lib/notifications/templates"
import { withJobRun } from "@/lib/jobs/run-record"

/**
 * Automation console actions.
 *
 * The verbs the brief asks for that the notification console did not already
 * have: pause/resume a schedule, run one now, enable/disable a business event,
 * and clone a template or a rule.
 *
 * Every write records an ActivityLog entry and invalidates the config tag, the
 * same contract as the notification admin actions.
 */

function invalidate() {
    revalidateTag(NOTIFICATION_CONFIG_CACHE_TAG, "max")
    revalidateTag(NOTIFICATION_TEMPLATES_CACHE_TAG, "max")
    revalidatePath("/admin/automation")
}

// ── Schedules ────────────────────────────────────────────────────────────────

export async function setSchedulePaused(formData: FormData) {
    const admin = await verifyAdminRole()
    const name = String(formData.get("jobName") ?? "")
    const enabled = formData.get("enabled") === "true"
    if (!name) throw new Error("A job name is required")

    await db.jobSchedule.upsert({
        where: { name },
        create: { name, enabled, changedBy: admin.id },
        update: { enabled, changedBy: admin.id },
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        enabled ? "RESUME_SCHEDULE" : "PAUSE_SCHEDULE",
        `${enabled ? "Resumed" : "Paused"} scheduled job ${name}`,
        { jobName: name }
    )

    revalidatePath("/admin/automation/schedules")
}

/**
 * Run a job now.
 *
 * Recorded with `trigger: "manual"` so it is never mistaken for evidence that
 * the SCHEDULE works — an operator pressing a button proves the job runs, not
 * that the cron fires.
 */
export async function runScheduleNow(formData: FormData) {
    const admin = await verifyAdminRole()
    const name = String(formData.get("jobName") ?? "")

    const runners: Record<string, () => Promise<unknown>> = {
        "notification-retry": async () =>
            (await import("@/lib/notifications/retry")).runNotificationRetrySweep(),
        "event-sweep": async () => (await import("@/lib/events/dispatcher")).runEventSweep(),
    }
    const runner = runners[name]
    // Only jobs that are safe to invoke out of band. The rest are reachable via
    // their route with the cron secret; offering a button for a job whose
    // side-effects assume a daily cadence would be a trap.
    if (!runner) throw new Error(`${name} cannot be run from the console`)

    await withJobRun(name, runner, { trigger: "manual" })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "RUN_SCHEDULE_NOW",
        `Manually ran scheduled job ${name}`,
        { jobName: name }
    )

    revalidatePath("/admin/automation/schedules")
}

// ── Business events ──────────────────────────────────────────────────────────

export async function setBusinessEventEnabled(formData: FormData) {
    const admin = await verifyAdminRole()
    const eventType = String(formData.get("eventType") ?? "")
    const enabled = formData.get("enabled") === "true"
    if (!BUSINESS_EVENTS[eventType]) throw new Error(`Unknown business event "${eventType}"`)

    const existing = await db.businessEventOverride.findUnique({ where: { eventType } })
    await db.businessEventOverride.upsert({
        where: { eventType },
        create: { eventType, enabled, changedBy: admin.id },
        update: { enabled, version: (existing?.version ?? 0) + 1, changedBy: admin.id },
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        enabled ? "ENABLE_BUSINESS_EVENT" : "DISABLE_BUSINESS_EVENT",
        `${enabled ? "Enabled" : "Disabled"} business event ${eventType}`,
        { eventType }
    )

    invalidate()
    revalidatePath("/admin/automation/events")
}

// ── Clone ────────────────────────────────────────────────────────────────────

/**
 * Copy a template to another channel, locale or event.
 *
 * The most common real use is translating: an operator writes the Greek, then
 * clones it to English and edits. Cloning rather than starting blank keeps the
 * variables and the structure, which is where the mistakes otherwise happen.
 */
export async function cloneTemplate(formData: FormData) {
    const admin = await verifyAdminRole()
    const sourceId = String(formData.get("templateId") ?? "")
    const targetEvent = String(formData.get("targetEvent") ?? "")
    const targetChannel = String(formData.get("targetChannel") ?? "")
    const targetLocale = String(formData.get("targetLocale") ?? "")

    if (!NOTIFICATION_EVENTS[targetEvent]) throw new Error(`Unknown event "${targetEvent}"`)
    if (!TEMPLATE_CHANNELS.includes(targetChannel as never)) throw new Error("Unknown channel")
    if (!TEMPLATE_LOCALES.includes(targetLocale as never)) throw new Error("Unknown locale")

    const source = await db.notificationTemplate.findUnique({ where: { id: sourceId } })
    if (!source) throw new Error("Template not found")

    if (
        source.eventType === targetEvent &&
        source.channel === targetChannel &&
        source.locale === targetLocale
    ) {
        throw new Error("A template cannot be cloned onto itself")
    }

    const existing = await db.notificationTemplate.findUnique({
        where: {
            eventType_channel_locale: {
                eventType: targetEvent,
                channel: targetChannel,
                locale: targetLocale,
            },
        },
    })

    await db.$transaction(async (tx) => {
        const row = await tx.notificationTemplate.upsert({
            where: {
                eventType_channel_locale: {
                    eventType: targetEvent,
                    channel: targetChannel,
                    locale: targetLocale,
                },
            },
            create: {
                eventType: targetEvent,
                channel: targetChannel,
                locale: targetLocale,
                subject: source.subject,
                title: source.title,
                body: source.body,
                // Cloned templates arrive INACTIVE. A copy is almost always
                // about to be edited — most often translated — and publishing
                // Greek copy to English readers the moment it is cloned is the
                // obvious way for this feature to cause harm.
                isActive: false,
                version: 1,
                changedBy: admin.id,
            },
            update: {
                subject: source.subject,
                title: source.title,
                body: source.body,
                isActive: false,
                version: (existing?.version ?? 0) + 1,
                changedBy: admin.id,
            },
        })
        await tx.notificationTemplateRevision.create({
            data: {
                templateId: row.id,
                version: row.version,
                snapshot: {
                    eventType: targetEvent,
                    channel: targetChannel,
                    locale: targetLocale,
                    subject: source.subject,
                    title: source.title,
                    body: source.body,
                    isActive: false,
                } as never,
                changes: {
                    clonedFrom: `${source.eventType}/${source.channel}/${source.locale}`,
                } as never,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "CLONE_NOTIFICATION_TEMPLATE",
        `Cloned template ${source.eventType}/${source.channel}/${source.locale} → ${targetEvent}/${targetChannel}/${targetLocale}`,
        { sourceId, targetEvent, targetChannel, targetLocale }
    )

    invalidate()
    redirect(
        `/admin/notifications/templates/${targetEvent}?channel=${targetChannel}&locale=${targetLocale}&saved=cloned`
    )
}

/** Copy one event's rule override onto another event. */
export async function cloneRuleOverride(formData: FormData) {
    const admin = await verifyAdminRole()
    const sourceEvent = String(formData.get("sourceEvent") ?? "")
    const targetEvent = String(formData.get("targetEvent") ?? "")

    if (!NOTIFICATION_EVENTS[targetEvent]) throw new Error(`Unknown event "${targetEvent}"`)
    if (sourceEvent === targetEvent) throw new Error("A rule cannot be cloned onto itself")

    const source = await db.notificationRuleOverride.findUnique({
        where: { eventType: sourceEvent },
    })
    if (!source) throw new Error("That event has no override to clone")

    const targetDefinition = NOTIFICATION_EVENTS[targetEvent]
    // A cloned channel list would be meaningless — possibly harmful — on an
    // event that declares a different set. Channels stay inherited; the
    // operational numbers are what is worth copying.
    const sourceChannels = Array.isArray(source.channels) ? (source.channels as string[]) : null
    const channelsFit =
        sourceChannels?.every((c) => targetDefinition.channels.includes(c as never)) ?? false

    const existing = await db.notificationRuleOverride.findUnique({ where: { eventType: targetEvent } })

    await db.$transaction(async (tx) => {
        const row = await tx.notificationRuleOverride.upsert({
            where: { eventType: targetEvent },
            create: {
                eventType: targetEvent,
                priority: source.priority,
                channels: channelsFit ? (sourceChannels as Prisma.InputJsonValue) : Prisma.DbNull,
                retryAttempts: source.retryAttempts,
                retryBackoff: source.retryBackoff,
                retryBaseDelayMinutes: source.retryBaseDelayMinutes,
                expiresAfterHours: source.expiresAfterHours,
                notes: `Cloned from ${sourceEvent}`,
                changedBy: admin.id,
            },
            update: {
                priority: source.priority,
                channels: channelsFit ? (sourceChannels as Prisma.InputJsonValue) : Prisma.DbNull,
                retryAttempts: source.retryAttempts,
                retryBackoff: source.retryBackoff,
                retryBaseDelayMinutes: source.retryBaseDelayMinutes,
                expiresAfterHours: source.expiresAfterHours,
                notes: `Cloned from ${sourceEvent}`,
                version: (existing?.version ?? 0) + 1,
                changedBy: admin.id,
            },
        })
        await tx.notificationRuleRevision.create({
            data: {
                overrideId: row.id,
                version: row.version,
                snapshot: { eventType: targetEvent, clonedFrom: sourceEvent } as never,
                changes: { clonedFrom: { from: null, to: sourceEvent } } as never,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "CLONE_NOTIFICATION_RULE",
        `Cloned rule ${sourceEvent} → ${targetEvent}`,
        { sourceEvent, targetEvent, channelsCopied: channelsFit }
    )

    invalidate()
    redirect(`/admin/notifications/triggers/${targetEvent}?saved=cloned`)
}
