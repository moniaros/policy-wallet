"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { rateLimit } from "@/lib/rate-limit"
import { sendFamilyInviteEmail } from "@/lib/email/invite-emails"
import { normalizeEmail } from "@/lib/identity/normalize-email"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"
import { displayPersonName } from "@/lib/wallet/policy-identity"
import { daysFromNow } from "@/lib/constants/time"

/**
 * Spec v2 §13 — family sharing. Every export is a public endpoint: the
 * subject is the session; the owner is whoever is signed in.
 */
const FAMILY_INVITE_EXPIRY_DAYS = 14

export async function inviteFamilyMember(rawEmail: string) {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.string().email().safeParse(String(rawEmail ?? "").trim())
    if (!parsed.success) return { error: "INVALID_EMAIL" as const }
    const email = normalizeEmail(parsed.data)
    if (email === normalizeEmail(dbUser.email ?? "")) return { error: "SELF" as const }

    // §21.2: the invite is the gated action; the section stays visible.
    const entitlements = await resolveUserEntitlements(dbUser.id)
    if (entitlements.tier === "free") return { error: "UPGRADE_REQUIRED" as const }

    const limited = await rateLimit(`family-invite:${dbUser.id}`, 10, 60 * 60 * 1000)
    if (!limited.success) return { error: "RATE_LIMITED" as const }

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
        const live = await db.walletMembership.findUnique({
            where: { walletOwnerUserId_memberUserId: { walletOwnerUserId: dbUser.id, memberUserId: existing.id } },
            select: { status: true },
        })
        if (live?.status === "active") return { error: "ALREADY_MEMBER" as const }
    }

    const invite = await db.invite.create({
        data: {
            inviterUserId: dbUser.id,
            inviteeEmail: email,
            token: crypto.randomUUID(),
            inviteType: "family",
            expiresAt: daysFromNow(FAMILY_INVITE_EXPIRY_DAYS),
        },
    })
    const sent = await sendFamilyInviteEmail({
        to: email,
        token: invite.token,
        inviterName: displayPersonName(dbUser.name) || dbUser.email,
        language: resolveUserLanguage(dbUser.preferredLanguage),
    }).catch(() => ({ success: false }))
    revalidatePath("/account/family")
    return { ok: true as const, emailDelivered: Boolean((sent as { success?: boolean }).success) }
}

/** The owner ends a membership, or a member leaves — either side, same write. */
export async function endFamilyMembership(membershipId: string) {
    const { dbUser } = await getAuthenticatedUser()
    const row = await db.walletMembership.findUnique({
        where: { id: membershipId },
        select: { id: true, walletOwnerUserId: true, memberUserId: true, status: true },
    })
    if (!row || row.status !== "active") return { error: "NOT_FOUND" as const }
    if (row.walletOwnerUserId !== dbUser.id && row.memberUserId !== dbUser.id) return { error: "NOT_FOUND" as const }
    await db.walletMembership.update({ where: { id: row.id }, data: { status: "ended", endedAt: new Date() } })

    // Tell the OTHER side — the one who did not act (spec v2 §25.3).
    const other = row.walletOwnerUserId === dbUser.id ? row.memberUserId : row.walletOwnerUserId
    const actorName = displayPersonName(dbUser.name)
    await emit({
        event: "family_member_left",
        userId: other,
        title: { el: "Το οικογενειακό πορτοφόλι άλλαξε", en: "Your family wallet changed" },
        message: row.walletOwnerUserId === dbUser.id
            ? { el: `${actorName || "Ο κάτοχος"} έκλεισε την πρόσβασή σας στο οικογενειακό πορτοφόλι.`, en: `${actorName || "The owner"} ended your access to the family wallet.` }
            : { el: `${actorName || "Ένα μέλος"} αποχώρησε από το οικογενειακό σας πορτοφόλι.`, en: `${actorName || "A member"} left your family wallet.` },
        dedupeKey: `family_member_left:${row.id}`,
    })
    revalidatePath("/account/family")
    revalidatePath("/wallet")
    return { ok: true as const }
}

export async function revokeFamilyInvite(inviteId: string) {
    const { dbUser } = await getAuthenticatedUser()
    const res = await db.invite.updateMany({
        where: { id: inviteId, inviterUserId: dbUser.id, inviteType: "family", consumedAt: null },
        data: { expiresAt: new Date() },
    })
    revalidatePath("/account/family")
    return res.count === 1 ? { ok: true as const } : { error: "NOT_FOUND" as const }
}
