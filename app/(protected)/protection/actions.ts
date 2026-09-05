"use server"

import { getAuthenticatedUser, getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { runGapEngine } from "@/lib/services/gap-engine"

/**
 * Explicit refresh of the user's coverage picture — user-triggered.
 *
 * This used to ALSO run the legacy gap detector over the stored extraction and
 * write `gap_instances` rows with no run, no provenance, and reactivate
 * semantics (Goal 0 F4). Rule findings are now written only by an analysis
 * run, through lib/gaps/gap-instance-writer.ts (B0.1); what this action
 * refreshes is the profile engine's recommendations.
 */
export async function refreshCoverageAnalysis(): Promise<{ ok: boolean; error?: string }> {
    try {
        const { dbUser } = await getAuthenticatedUser()

        await runGapEngine(dbUser.id)

        // /coverage-insights was revalidated here too until V2-P2-03 removed
        // the route; /protection is the only mount of this snapshot now.
        revalidatePath("/protection")
        return { ok: true }
    } catch (error) {
        console.error("refreshCoverageAnalysis failed:", error)
        return { ok: false, error: "REFRESH_FAILED" }
    }
}

/**
 * Update the status of a gap instance
 */
export async function updateGapStatus(gapId: string, status: 'acknowledged' | 'dismissed' | 'resolved') {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        throw new Error("Unauthorized")
    }

    // Verify the gap belongs to the user
    const gap = await db.gapInstance.findUnique({
        where: { id: gapId },
        include: {
            policy: {
                select: { ownerUserId: true }
            }
        }
    })

    if (!gap || !gap.policy || gap.policy.ownerUserId !== authResult.dbUser.id) {
        throw new Error("Gap not found or unauthorized")
    }

    // Update status
    await db.gapInstance.update({
        where: { id: gapId },
        data: { status }
    })

    revalidatePath("/protection")
    return { success: true }
}
