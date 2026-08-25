"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import {
    firstInsight,
    quickStartPatch,
    type FirstInsight,
    type QuickStartAnswers,
} from "@/lib/services/onboarding/quick-start"

/**
 * Save the three answers and return the one true thing they imply.
 *
 * A server action rather than a client fetch so the risk catalog stays on the
 * server — the insight is derived by the real engine, and shipping that to the
 * browser to save a round trip would put the whole catalog in the bundle.
 */
export async function submitQuickStart(
    answers: QuickStartAnswers
): Promise<{ insight: FirstInsight | null }> {
    const { dbUser } = await getAuthenticatedUser()
    const patch = quickStartPatch(answers)
    const { answeredFields, ...columns } = patch as Record<string, unknown>

    const existing = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id },
        select: { answeredFields: true },
    })
    const previously = Array.isArray(existing?.answeredFields)
        ? (existing.answeredFields as unknown[]).filter((f): f is string => typeof f === "string")
        : []
    const answered = [...new Set([...previously, ...((answeredFields as string[]) ?? [])])]

    // Never overwrite an answer the customer has already given properly.
    //
    // These three are coarse by design — "I own my home" becomes
    // `propertiesOwned: 1`, and the dependant count is a floor taken from the
    // number of children. Writing them over a completed wizard would silently
    // destroy better information. The screen only renders for a profile we know
    // too little about, but a mutation must not depend on the UI to be safe.
    const fresh = Object.fromEntries(
        Object.entries(columns).filter(([column]) => !previously.includes(column))
    )

    await db.policyholderProfile.upsert({
        where: { userId: dbUser.id },
        update: { ...fresh, answeredFields: answered },
        create: { userId: dbUser.id, ...columns, answeredFields: answered },
    })

    // Awaited, like every other profile write: the page re-renders immediately
    // after this resolves and reads the persisted assessment, so a background
    // run would race it and the answers would appear to have changed nothing.
    await refreshProtectionScore(dbUser.id, "profile_update").catch((err) => {
        console.error("Quick-start engine run failed:", err)
    })

    return { insight: firstInsight(answers) }
}
