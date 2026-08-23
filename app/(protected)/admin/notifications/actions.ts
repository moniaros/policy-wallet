"use server"

import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import {
    computeRuleDiff,
    computeTemplateDiff,
    parseRuleOverrideForm,
    parseSettingsForm,
    parseTemplateForm,
    validateRuleOverride,
    validateTemplateInput,
} from "@/lib/admin/notification-admin"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import {
    NOTIFICATION_CONFIG_CACHE_TAG,
    NOTIFICATION_TEMPLATES_CACHE_TAG,
} from "@/lib/notifications/config"
import { NOTIFICATION_SETTINGS, settingValue } from "@/lib/notifications/settings"
import { emit } from "@/lib/notifications/dispatch"
import { runNotificationRetrySweep } from "@/lib/notifications/retry"

/**
 * Server actions for the notification admin console.
 *
 * Thin transaction wrappers — every rule lives in lib/admin/notification-admin.ts
 * so it is testable without a request. Each write records a revision (the
 * versioning requirement) and an ActivityLog entry (the audit requirement), and
 * then invalidates the config tag so the change lands on the next notification
 * rather than up to a minute later.
 */

function invalidateConfig() {
    // 'max' marks tagged entries stale immediately; the TTL is only the backstop.
    revalidateTag(NOTIFICATION_CONFIG_CACHE_TAG, "max")
    revalidateTag(NOTIFICATION_TEMPLATES_CACHE_TAG, "max")
    revalidatePath("/admin/notifications")
    revalidatePath("/admin/notifications/triggers")
}

// ── Trigger rules ────────────────────────────────────────────────────────────

export async function saveRuleOverride(formData: FormData) {
    const admin = await verifyAdminRole()
    const input = parseRuleOverrideForm(formData)
    const def = NOTIFICATION_EVENTS[input.eventType]

    const errors = validateRuleOverride(input, def)
    if (errors.length > 0) {
        // Surfaced as a thrown error so Next's error boundary shows it rather
        // than the form appearing to have saved.
        throw new Error(errors.map((e) => e.message).join(" "))
    }

    const existing = await db.notificationRuleOverride.findUnique({
        where: { eventType: input.eventType },
    })
    const nextVersion = (existing?.version ?? 0) + 1
    const changes = computeRuleDiff(existing as never, input)

    // Nothing moved — do not manufacture a revision. A version history full of
    // no-op saves is a history nobody can read.
    if (existing && Object.keys(changes).length === 0) {
        redirect(`/admin/notifications/triggers/${input.eventType}?saved=nochange`)
    }

    // `channels` is a nullable Json column, so "inherit" has to be written as
    // Prisma.DbNull — a plain `null` sets the JSON value `null`, which is a
    // different thing and would read back as "an override exists and it is
    // empty".
    const { channels, ...scalars } = input
    const writable = {
        ...scalars,
        channels: channels === null ? Prisma.DbNull : (channels as Prisma.InputJsonValue),
    }

    await db.$transaction(async (tx) => {
        const row = await tx.notificationRuleOverride.upsert({
            where: { eventType: input.eventType },
            create: { ...writable, version: 1, changedBy: admin.id },
            update: { ...writable, version: nextVersion, changedBy: admin.id },
        })
        await tx.notificationRuleRevision.create({
            data: {
                overrideId: row.id,
                version: row.version,
                snapshot: input as never,
                changes: changes as never,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_NOTIFICATION_RULE",
        `Notification rule updated for ${input.eventType}`,
        { eventType: input.eventType, changes }
    )

    invalidateConfig()
    redirect(`/admin/notifications/triggers/${input.eventType}?saved=1`)
}

/** The one-click switch on the triggers list. */
export async function toggleTrigger(formData: FormData) {
    const admin = await verifyAdminRole()
    const eventType = String(formData.get("eventType") ?? "")
    const enable = formData.get("enable") === "true"
    const def = NOTIFICATION_EVENTS[eventType]
    if (!def) throw new Error(`Unknown event "${eventType}"`)

    if (!enable && def.transactional) {
        throw new Error(
            `"${def.businessEvent}" is transactional and cannot be switched off. A customer never agreed to stop being told about this.`
        )
    }

    const existing = await db.notificationRuleOverride.findUnique({ where: { eventType } })
    const nextVersion = (existing?.version ?? 0) + 1

    await db.$transaction(async (tx) => {
        const row = await tx.notificationRuleOverride.upsert({
            where: { eventType },
            create: { eventType, enabled: enable, version: 1, changedBy: admin.id },
            update: { enabled: enable, version: nextVersion, changedBy: admin.id },
        })
        await tx.notificationRuleRevision.create({
            data: {
                overrideId: row.id,
                version: row.version,
                snapshot: { eventType, enabled: enable } as never,
                changes: { enabled: { from: existing?.enabled ?? null, to: enable } } as never,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        enable ? "ENABLE_NOTIFICATION_TRIGGER" : "DISABLE_NOTIFICATION_TRIGGER",
        `${enable ? "Enabled" : "Disabled"} notification trigger ${eventType}`,
        { eventType }
    )

    invalidateConfig()
    revalidatePath("/admin/notifications/triggers")
}

/** Drop the override entirely and return the event to its registry default. */
export async function resetRuleOverride(formData: FormData) {
    const admin = await verifyAdminRole()
    const eventType = String(formData.get("eventType") ?? "")

    await db.notificationRuleOverride.deleteMany({ where: { eventType } })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "RESET_NOTIFICATION_RULE",
        `Notification rule reset to code default for ${eventType}`,
        { eventType }
    )

    invalidateConfig()
    redirect(`/admin/notifications/triggers/${eventType}?saved=reset`)
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function saveTemplate(formData: FormData) {
    const admin = await verifyAdminRole()
    const input = parseTemplateForm(formData)

    const errors = validateTemplateInput(input)
    if (errors.length > 0) throw new Error(errors.map((e) => e.message).join(" "))

    const existing = await db.notificationTemplate.findUnique({
        where: {
            eventType_channel_locale: {
                eventType: input.eventType,
                channel: input.channel,
                locale: input.locale,
            },
        },
    })
    const nextVersion = (existing?.version ?? 0) + 1
    const changes = computeTemplateDiff(existing as never, input)

    await db.$transaction(async (tx) => {
        const row = await tx.notificationTemplate.upsert({
            where: {
                eventType_channel_locale: {
                    eventType: input.eventType,
                    channel: input.channel,
                    locale: input.locale,
                },
            },
            create: { ...input, version: 1, changedBy: admin.id },
            update: {
                subject: input.subject,
                title: input.title,
                body: input.body,
                isActive: input.isActive,
                version: nextVersion,
                changedBy: admin.id,
            },
        })
        await tx.notificationTemplateRevision.create({
            data: {
                templateId: row.id,
                version: row.version,
                snapshot: input as never,
                changes: changes as never,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_NOTIFICATION_TEMPLATE",
        `Template updated for ${input.eventType} / ${input.channel} / ${input.locale}`,
        { eventType: input.eventType, channel: input.channel, locale: input.locale, changes }
    )

    invalidateConfig()
    redirect(`/admin/notifications/templates/${input.eventType}?saved=1`)
}

export async function deleteTemplate(formData: FormData) {
    const admin = await verifyAdminRole()
    const templateId = String(formData.get("templateId") ?? "")
    const eventType = String(formData.get("eventType") ?? "")

    // Revisions cascade with the row, which is correct: the version history of a
    // template describes THAT template, and keeping it after the template is
    // gone would be a history of something that no longer exists.
    await db.notificationTemplate.deleteMany({ where: { id: templateId } })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "DELETE_NOTIFICATION_TEMPLATE",
        `Template deleted for ${eventType}`,
        { templateId, eventType }
    )

    invalidateConfig()
    redirect(`/admin/notifications/templates/${eventType}?saved=deleted`)
}

/**
 * Send one real notification to the ADMINISTRATOR THEMSELVES.
 *
 * Never to another user, and the recipient is not a form field — a test-send
 * feature that can address anyone is a way to send arbitrary text to a customer
 * from a trusted sender, which is a phishing primitive, not a preview.
 */
export async function sendTestNotification(formData: FormData) {
    const admin = await verifyAdminRole()
    const eventType = String(formData.get("eventType") ?? "")
    const def = NOTIFICATION_EVENTS[eventType]
    if (!def) throw new Error(`Unknown event "${eventType}"`)

    const { getNotificationConfig } = await import("@/lib/notifications/config")
    const config = await getNotificationConfig()
    if (!settingValue<boolean>(config.settings, "flag.testSendEnabled")) {
        throw new Error("Test sends are switched off in settings.")
    }

    // Test sends carry the event's REAL customer copy, prefixed so the
    // operator can tell it apart — that is what a test is for: seeing what a
    // customer would see. `businessEvent` is internal documentation and no
    // longer allowed in a stored title. Analytics mirrors have no copy; the
    // machine name is the honest label for those.
    const result = await emit({
        event: eventType,
        userId: admin.id,
        title: {
            el: `[ΔΟΚΙΜΗ] ${def.copy?.title.el ?? eventType}`,
            en: `[TEST] ${def.copy?.title.en ?? eventType}`,
        },
        message: {
            el: def.copy
                ? `${def.copy.message.el} — δοκιμαστική αποστολή για το συμβάν ${eventType} από την κονσόλα διαχείρισης.`
                : `Δοκιμαστική αποστολή για το συμβάν ${eventType} από την κονσόλα διαχείρισης.`,
            en: def.copy
                ? `${def.copy.message.en} — test send for event ${eventType} from the admin console.`
                : `Test send for event ${eventType} from the admin console.`,
        },
        // A dedupe key including the minute, so an operator can send again to
        // check a change without waiting, but a double-click does not send twice.
        dedupeKey: `admin_test:${eventType}:${new Date().toISOString().slice(0, 16)}`,
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "SEND_TEST_NOTIFICATION",
        `Test notification sent for ${eventType}`,
        { eventType, delivered: result.delivered, skipped: result.skipped }
    )

    revalidatePath("/admin/notifications/history")
    redirect(
        `/admin/notifications/templates/${eventType}?tested=${encodeURIComponent(
            result.delivered.join(",") || "none"
        )}`
    )
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function saveSettings(formData: FormData) {
    const admin = await verifyAdminRole()
    const keys = NOTIFICATION_SETTINGS.map((s) => s.key)
    const { values, errors } = parseSettingsForm(formData, keys)
    if (errors.length > 0) throw new Error(errors.map((e) => `${e.field}: ${e.message}`).join("; "))

    for (const { key, value } of values) {
        await db.notificationSetting.upsert({
            where: { key },
            create: { key, value: value as never, changedBy: admin.id },
            update: { value: value as never, changedBy: admin.id },
        })
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_NOTIFICATION_SETTINGS",
        `Notification settings updated (${values.length} keys)`,
        { values }
    )

    invalidateConfig()
    redirect("/admin/notifications?saved=1")
}

// ── Delivery operations ──────────────────────────────────────────────────────

/** Re-queue one failed notification for the next sweep. */
export async function retryNotification(formData: FormData) {
    const admin = await verifyAdminRole()
    const id = String(formData.get("notificationId") ?? "")

    const row = await db.notificationEvent.findUnique({
        where: { id },
        select: { id: true, eventType: true, status: true, expiresAt: true },
    })
    if (!row) throw new Error("Notification not found")

    // Re-queued by clearing the schedule, not by resetting `attempts`: the
    // attempt count is the record of how hard we have already tried, and wiping
    // it would let a permanently broken address retry for ever.
    await db.notificationEvent.update({
        where: { id },
        data: {
            status: "failed",
            nextAttemptAt: new Date(),
            // An operator asking for a retry is overriding the expiry judgement;
            // give it a fresh window rather than re-queuing something the sweep
            // will immediately expire again.
            expiresAt: row.expiresAt && row.expiresAt < new Date() ? null : row.expiresAt,
        },
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "RETRY_NOTIFICATION",
        `Manual retry queued for ${row.eventType}`,
        { notificationId: id, eventType: row.eventType }
    )

    revalidatePath("/admin/notifications/history")
}

/** Run the sweep now instead of waiting for the cron. */
export async function runRetrySweepNow() {
    const admin = await verifyAdminRole()
    const summary = await runNotificationRetrySweep()

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "RUN_NOTIFICATION_RETRY_SWEEP",
        `Retry sweep run manually: ${summary.retried} retried, ${summary.delivered} delivered`,
        summary
    )

    revalidatePath("/admin/notifications")
    revalidatePath("/admin/notifications/history")
}
