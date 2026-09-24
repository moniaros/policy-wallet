"use server"

import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getOffersForUser } from "@/lib/partner-offers/catalog"
import { athensDate } from "@/lib/wellness/nudges"

/**
 * Owner decision 2026-09-24: record that the person USED a partner offer —
 * no booking, no partner integration. A public endpoint: the subject is the
 * session, the offer must be one this person may use right now (unlocked for
 * their plan), and one row per offer per Athens day is enough.
 */
const Input = z.object({ offerId: z.string().min(1), method: z.enum(["link", "code", "phone"]) })

export async function recordPartnerReferral(input: { offerId: string; method: "link" | "code" | "phone" }) {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = Input.safeParse(input)
    if (!parsed.success) return { error: "INVALID" as const }
    const { unlocked } = await getOffersForUser(dbUser.id)
    const offer = unlocked.find((o) => o.id === parsed.data.offerId)
    if (!offer || offer.redemptionMethod !== parsed.data.method) return { error: "NOT_FOUND" as const }

    const dayStart = new Date(`${athensDate()}T00:00:00Z`)
    const already = await db.partnerReferral.findFirst({
        where: { userId: dbUser.id, offerId: offer.id, createdAt: { gte: dayStart } },
        select: { id: true },
    })
    if (!already) {
        const row = await db.partnerOffer.findUnique({ where: { id: offer.id }, select: { vendorId: true } })
        if (!row) return { error: "NOT_FOUND" as const }
        await db.partnerReferral.create({ data: { userId: dbUser.id, offerId: offer.id, vendorId: row.vendorId, method: parsed.data.method } })
    }
    return { ok: true as const }
}
