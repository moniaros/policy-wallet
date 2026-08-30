"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { isMonthlyCeilingChoice } from "@/lib/notifications/cadence-options"

/**
 * The §9.5 cadence controls, as the customer sets them (P1-09b, from H-002's
 * answer B). Two writes, two stores, both read AT SEND TIME by
 * lib/notifications/cadence.ts — the seam tests in
 * tests/unit/cadence-controls.test.ts assert the dispatcher outcomes, so a
 * checkbox here cannot become decoration.
 *
 * Every export of a "use server" file is a public endpoint: the subject is
 * always the session user, and inputs are refused rather than coerced.
 */

/**
 * The global outbound off switch.
 *
 * Stored as an explicit `maxPerDay = 0` — zero per rolling day IS "never
 * reach me outside the app", the column already exists, and nothing else has
 * ever written 0 (null means "role default", always positive). Un-pausing
 * restores null, i.e. the role default, not some remembered number.
 */
export async function saveOutboundPause(paused: boolean) {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "Unauthorized" }
    if (typeof paused !== "boolean") return { error: "Invalid value" }

    await db.userNotificationSettings.upsert({
        where: { userId: auth.dbUser.id },
        create: { userId: auth.dbUser.id, maxPerDay: paused ? 0 : null },
        update: { maxPerDay: paused ? 0 : null },
    })

    revalidatePath("/account/notifications")
    return { success: true }
}

/**
 * The monthly ceiling on non-deadline outbound (the engagement class —
 * digests, perk reminders, drips; never a renewal or a lapse warning).
 *
 * Stored in `policyholder_profiles.preferences.outboundMonthlyCeiling`, the
 * existing per-user preference bag — which is why this control needed no
 * schema migration. Only the declared choices are accepted; null clears the
 * key entirely rather than storing a sentinel.
 */
export async function saveMonthlyCeiling(ceiling: number | null) {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "Unauthorized" }
    if (ceiling !== null && !(typeof ceiling === "number" && isMonthlyCeilingChoice(ceiling))) {
        return { error: "Invalid ceiling" }
    }
    // The store is the policyholder profile; other roles are shown the off
    // switch only, and a forged call for them must not mint a profile.
    const roles = (auth.dbUser.roles ?? "").split(",").map((r) => r.trim())
    if (!roles.includes("policyholder")) return { error: "Unavailable for this role" }

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: auth.dbUser.id },
        select: { preferences: true },
    })
    const preferences = { ...((profile?.preferences as Record<string, unknown>) ?? {}) }
    if (ceiling === null) delete preferences.outboundMonthlyCeiling
    else preferences.outboundMonthlyCeiling = ceiling

    await db.policyholderProfile.upsert({
        where: { userId: auth.dbUser.id },
        create: { userId: auth.dbUser.id, preferences: preferences as object },
        update: { preferences: preferences as object },
    })

    revalidatePath("/account/notifications")
    return { success: true }
}
