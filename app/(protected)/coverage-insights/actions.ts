"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

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
