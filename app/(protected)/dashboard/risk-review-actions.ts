"use server"

import { revalidatePath } from "next/cache"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { completeReview, dismissReview } from "@/lib/services/risk-review/service"

/**
 * The customer acting on their review.
 *
 * Both verbs are scoped to the caller inside the service — a review id is not a
 * capability, and a scoped `updateMany` means another user's id simply matches
 * nothing rather than throwing.
 */
export async function completeRiskReview(formData: FormData) {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "Unauthorized" }
    const reviewId = String(formData.get("reviewId") ?? "")
    const ok = await completeReview(reviewId, auth.dbUser.id)
    revalidatePath("/dashboard")
    return ok ? { success: true } : { error: "not_open" }
}

export async function dismissRiskReview(formData: FormData) {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "Unauthorized" }
    const reviewId = String(formData.get("reviewId") ?? "")
    const ok = await dismissReview(reviewId, auth.dbUser.id)
    revalidatePath("/dashboard")
    return ok ? { success: true } : { error: "not_open" }
}
