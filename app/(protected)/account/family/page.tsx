export const runtime = "nodejs"

import type { Metadata } from "next"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { displayPersonName } from "@/lib/wallet/policy-identity"
import { FamilySection } from "@/components/settings/sections/FamilySection"

export const metadata: Metadata = { title: "Family wallet · Settings" }

export default async function FamilySettingsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const [members, memberships, pending, entitlements, privateCount] = await Promise.all([
        db.walletMembership.findMany({
            where: { walletOwnerUserId: dbUser.id, status: "active" },
            select: { id: true, acceptedAt: true, member: { select: { name: true, email: true } } },
            orderBy: { acceptedAt: "asc" },
        }),
        db.walletMembership.findMany({
            where: { memberUserId: dbUser.id, status: "active" },
            select: { id: true, acceptedAt: true, owner: { select: { name: true, email: true } } },
            orderBy: { acceptedAt: "asc" },
        }),
        db.invite.findMany({
            where: { inviterUserId: dbUser.id, inviteType: "family", consumedAt: null, expiresAt: { gt: new Date() } },
            select: { id: true, inviteeEmail: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
        resolveUserEntitlements(dbUser.id),
        db.policy.count({ where: { ownerUserId: dbUser.id, status: { not: "deleted" }, privateToOwner: true } }),
    ])
    return (
        <FamilySection
            canInvite={entitlements.tier !== "free"}
            members={members.map((m) => ({ id: m.id, name: displayPersonName(m.member.name) || m.member.email, since: m.acceptedAt.toISOString() }))}
            memberships={memberships.map((m) => ({ id: m.id, name: displayPersonName(m.owner.name) || m.owner.email, since: m.acceptedAt.toISOString() }))}
            pending={pending.map((p) => ({ id: p.id, email: p.inviteeEmail, sentAt: p.createdAt.toISOString() }))}
            privateCount={privateCount}
        />
    )
}
