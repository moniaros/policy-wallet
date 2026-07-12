"use server"

import { getAuthenticatedUser, getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { detectGapsForUser, createGapInstances } from "@/lib/gap-detection"
import { runGapEngine } from "@/lib/services/gap-engine"

/**
 * Explicit re-analysis of the user's coverage. This is the WRITE path the
 * page render used to take on every visit (gap detection + engine sync +
 * score caching) — now user-triggered. The upload pipeline and cron remain
 * the automatic refresh paths.
 */
export async function refreshCoverageAnalysis(): Promise<{ ok: boolean; error?: string }> {
    try {
        const { dbUser } = await getAuthenticatedUser()

        const detectedGaps = await detectGapsForUser(dbUser.id)
        if (detectedGaps.length > 0) {
            await createGapInstances(detectedGaps)
        }
        await runGapEngine(dbUser.id)

        revalidatePath("/coverage-insights")
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

    revalidatePath("/coverage-insights")
    return { success: true }
}
