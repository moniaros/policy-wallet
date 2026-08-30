"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { defaultSettingsForRoles } from "@/lib/notifications/orchestrator"

/**
 * Quiet hours, as the customer sets them.
 *
 * Deliberately three fields and nothing else. The §9.5 cadence controls — the
 * global outbound off switch (stored as an explicit maxPerDay of 0) and the
 * monthly ceiling — are the customer's too, but they live in
 * cadence-actions.ts; the POSITIVE daily cap and the digest mode remain
 * operator dials, because a customer asked to pick their own rate limit would
 * be being asked to do our job.
 */
export interface QuietHoursState {
    enabled: boolean
    start: number
    end: number
    timezone: string
}

export async function getQuietHours(): Promise<QuietHoursState | null> {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return null

    const user = await db.user
        .findUnique({ where: { id: auth.dbUser.id }, select: { roles: true } })
        .catch(() => null)

    // No row means the role default, not "off": quiet hours are on by default
    // because a push at 03:00 is a reason to uninstall, and a customer should
    // not have to discover the setting after being woken by it.
    const defaults = defaultSettingsForRoles(user?.roles)

    // A preference read must never take down the page it decorates.
    //
    // This is the whole account page — billing, security, data export — and it
    // was one unguarded query away from an error boundary. Two ways that bites:
    // any transient database error, and the ordinary window where the code is
    // deployed before its migration, which is exactly the state production is in
    // while `user_notification_settings` is unapplied.
    //
    // Falling back to the role defaults is not a degraded guess — it is the same
    // answer the function already gives when the row is simply absent, and it is
    // what the orchestrator will use for delivery either way.
    const stored = await db.userNotificationSettings
        .findUnique({ where: { userId: auth.dbUser.id } })
        .catch(() => null)

    return {
        enabled: stored?.quietHoursEnabled ?? defaults.quietHoursEnabled,
        start: stored?.quietHoursStart ?? defaults.quietHoursStart,
        end: stored?.quietHoursEnd ?? defaults.quietHoursEnd,
        timezone: stored?.timezone ?? defaults.timezone,
    }
}

function hour(raw: FormDataEntryValue | null, fallback: number): number {
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) return fallback
    return parsed
}

export async function saveQuietHours(formData: FormData) {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "Unauthorized" }

    const enabled = formData.get("quietHoursEnabled") === "on"
    const start = hour(formData.get("quietHoursStart"), 22)
    const end = hour(formData.get("quietHoursEnd"), 8)

    // Equal start and end would be a zero-length window that reads as "always
    // quiet" to a customer and as "never quiet" to the code. Refuse it rather
    // than silently picking one meaning.
    if (enabled && start === end) {
        return { error: "start_equals_end" }
    }

    await db.userNotificationSettings.upsert({
        where: { userId: auth.dbUser.id },
        create: {
            userId: auth.dbUser.id,
            quietHoursEnabled: enabled,
            quietHoursStart: start,
            quietHoursEnd: end,
        },
        update: {
            quietHoursEnabled: enabled,
            quietHoursStart: start,
            quietHoursEnd: end,
        },
    })

    revalidatePath("/me")
    return { success: true }
}
