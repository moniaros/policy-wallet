"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import {
    firstInsight,
    quickStartFactWrites,
    type FirstInsight,
    type QuickStartAnswers,
} from "@/lib/services/onboarding/quick-start"
import {
    applyFactWrites,
    existingFacts,
    profileFactData,
} from "@/lib/services/protection-profile/fact-writes"

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

    const existing = await db.policyholderProfile.findUnique({ where: { userId: dbUser.id } })

    // Never overwrite an answer the customer has already given properly.
    //
    // These three are coarse by design — "I own my home" becomes
    // `propertiesOwned: 1`, and the dependant count is a floor taken from the
    // number of children. Writing them over a completed wizard would silently
    // destroy better information. The screen only renders for a profile we know
    // too little about, but a mutation must not depend on the UI to be safe —
    // so the writes carry their precision and applyFactWrites refuses a coarse
    // value over an exact one.
    const applied = applyFactWrites({
        existing: existingFacts(existing as Record<string, unknown> | null),
        writes: quickStartFactWrites(answers),
        now: new Date(),
    })
    const facts = profileFactData(applied)

    await db.policyholderProfile.upsert({
        where: { userId: dbUser.id },
        update: { ...facts },
        create: { userId: dbUser.id, ...facts },
    })

    // Awaited, like every other profile write: the page re-renders immediately
    // after this resolves and reads the persisted assessment, so a background
    // run would race it and the answers would appear to have changed nothing.
    await refreshProtectionScore(dbUser.id, "profile_update").catch((err) => {
        console.error("Quick-start engine run failed:", err)
    })

    return { insight: firstInsight(answers) }
}
