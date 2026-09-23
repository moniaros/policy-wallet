import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { displayPersonName } from "@/lib/wallet/policy-identity"
import { isAgentRole } from "@/lib/auth/require-agent"

/**
 * The invite-redemption core, shared by every door an invite can come through:
 * the /invite/[token] link (app/auth/actions.ts redeemInvite + registerUser)
 * and the typed code (app/onboarding/actions.ts redeemInviteCode).
 *
 * It lives in lib/, NOT in a "use server" file, on purpose: every export of a
 * "use server" file is a callable endpoint, and this function takes the
 * subject `userId` from its caller. Exported from an action file it would be
 * an unauthenticated write path (it was, for months, as `redeemInvite(token,
 * userId)`). Callers derive `userId` from the session and pass it here.
 *
 * Before this module existed, redeemInviteCode carried its own copy of the
 * logic that ignored `relationshipType` and always made the INVITER the agent —
 * so a client→advisor invite or a policy share redeemed by code created the
 * relationship backwards, and announced nothing.
 */
/** Apply an invite for `userId`. Silent no-op on a missing, consumed, expired or wrong-recipient invite. */
export async function applyInviteRedemption(token: string, userId: string) {
    const invite = await db.invite.findUnique({ where: { token } })
    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) return

    const isShareInvite = ["share", "policy_share", "access_grant"].includes(invite.inviteType)
    // Policyholder→advisor "connect" invite (inverse of the agent→client signup
    // invite): the invitee becomes the AGENT of the relationship, and — unlike
    // the agent→client signup invite whose relationship is pre-created keyed to
    // the invited id — this one is created here at redeem time, so it must be
    // email-bound like a share invite.
    const isClientAgentInvite =
        invite.inviteType === "signup" && invite.relationshipType === "client_agent"
    // Spec v2 §13: the family-wallet invite. Email-bound like a share.
    const isFamilyInvite = invite.inviteType === "family"

    // Bind a share/access/client-agent invite to the address it was sent to: a
    // leaked token must not connect/grant whoever opens the link. Check BEFORE
    // consuming so a wrong-recipient click leaves the invite valid for the
    // intended user. (The agent→client signup branch is already email-bound —
    // its relationship was pre-created keyed on the invited user's id.)
    if ((isShareInvite || isClientAgentInvite || isFamilyInvite) && invite.inviteeEmail) {
        const redeemer = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
        const redeemerEmail = redeemer?.email?.trim().toLowerCase()
        if (!redeemerEmail || redeemerEmail !== invite.inviteeEmail.trim().toLowerCase()) {
            return
        }
    }

    await db.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), inviteeUserId: userId },
    })

    if (isClientAgentInvite) {
        // Ensure the redeeming advisor holds the agent role so they can manage
        // the client. The register path already set role=agent (→ idempotent
        // here). For an existing NON-agent account (accepting via login) we add
        // the role, an AgentProfile, and sync the Supabase JWT metadata —
        // effective on their NEXT login, since middleware gates the agent
        // dashboard on the token role. The DB role is the source of truth for
        // server checks either way.
        const redeemer = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, roles: true },
        })
        if (redeemer && !isAgentRole(redeemer.roles)) {
            const nextRoles = [
                ...redeemer.roles.split(",").map((r) => r.trim()).filter(Boolean),
                "agent",
            ].join(",")
            await db.user.update({ where: { id: userId }, data: { roles: nextRoles } })
            await db.agentProfile.upsert({
                where: { userId },
                update: {},
                create: { userId, verificationStatus: "pending" },
            })
            try {
                const { getSupabaseAuthUserByEmail, syncAuthRoleClaim } = await import("@/lib/supabase/admin")
                if (redeemer.email) {
                    const authUser = await getSupabaseAuthUserByEmail(redeemer.email)
                    if (authUser) await syncAuthRoleClaim(authUser, nextRoles)
                }
            } catch (error) {
                // Best-effort — never fail the connect over a JWT sync hiccup.
                console.error("Advisor JWT role sync failed", error)
            }
        }

        // Connect: the advisor (redeemer) is the agent; the inviter is the client.
        await db.customerRelationship.upsert({
            where: {
                agentUserId_policyholderUserId: {
                    agentUserId: userId,
                    policyholderUserId: invite.inviterUserId,
                },
            },
            create: {
                agentUserId: userId,
                policyholderUserId: invite.inviterUserId,
                status: "active",
                activationStatus: "activated",
            },
            update: { status: "active", activationStatus: "activated" },
        })
        // Same moment as sharePolicy's, reached by a different door: a
        // relationship becoming active is when another person gains sight of
        // this customer's policies. `sharePolicy` has always announced it;
        // redemption did not, so an advisor could appear on someone's account
        // in silence (PW-BRIDGE-01 I-02). Both sides, each naming the other.
        await announceRelationshipActivated({
            customerUserId: invite.inviterUserId,
            advisorUserId: userId,
            dedupeSuffix: invite.id,
        })
        return
    }

    if (isFamilyInvite) {
        // The owner cannot be their own member; consume and mint nothing.
        if (invite.inviterUserId === userId) return
        await db.walletMembership.upsert({
            where: { walletOwnerUserId_memberUserId: { walletOwnerUserId: invite.inviterUserId, memberUserId: userId } },
            create: { walletOwnerUserId: invite.inviterUserId, memberUserId: userId, status: "active" },
            update: { status: "active", acceptedAt: new Date(), endedAt: null },
        })
        // Both sides, each naming the other: another person now sees this
        // wallet (spec v2 §25.3 — a silent grant of sight is never allowed).
        try {
            const [owner, member] = await Promise.all([
                db.user.findUnique({ where: { id: invite.inviterUserId }, select: { name: true } }),
                db.user.findUnique({ where: { id: userId }, select: { name: true } }),
            ])
            const ownerName = displayPersonName(owner?.name)
            const memberName = displayPersonName(member?.name)
            const whoseEl = ownerName ? `του/της ${ownerName}` : "του πορτοφολιού"
            const whoseEn = ownerName ? `${ownerName}'s` : "the wallet's"
            await emit({
                event: "family_member_joined",
                userId: invite.inviterUserId,
                title: { el: "Νέο μέλος στο οικογενειακό σας πορτοφόλι", en: "A new member joined your family wallet" },
                message: {
                    el: `${memberName || "Ένα μέλος της οικογένειας"} αποδέχτηκε την πρόσκληση και βλέπει πλέον τα ασφαλιστήρια που δεν έχετε κρατήσει ιδιωτικά.`,
                    en: `${memberName || "A family member"} accepted the invitation and now sees the policies you have not kept private.`,
                },
                dedupeKey: `family_member_joined:owner:${invite.id}`,
            })
            await emit({
                event: "family_member_joined",
                userId,
                title: { el: "Μπήκατε σε ένα οικογενειακό πορτοφόλι", en: "You joined a family wallet" },
                message: {
                    el: `Βλέπετε πλέον τα ασφαλιστήρια ${whoseEl} που δεν έχουν κρατηθεί ιδιωτικά. Μπορείτε να αποχωρήσετε οποτεδήποτε από τις Ρυθμίσεις.`,
                    en: `You now see ${whoseEn} policies that were not kept private. You can leave at any time from Settings.`,
                },
                dedupeKey: `family_member_joined:member:${invite.id}`,
            })
        } catch (error) {
            console.error("Family-joined notification failed", error)
        }
        return
    }

    if (invite.inviteType === "signup") {
        const activated = await (db.customerRelationship.updateMany as any)({
            where: {
                agentUserId: invite.inviterUserId,
                policyholderUserId: userId,
            },
            data: { status: "active", activationStatus: "activated" },
        })
        // Only when a relationship actually flipped — a re-run of a consumed
        // invite must not re-announce a connection that was already live.
        if ((activated as { count?: number })?.count) {
            await announceRelationshipActivated({
                customerUserId: userId,
                advisorUserId: invite.inviterUserId,
                dedupeSuffix: invite.id,
            })
        }
        return
    }

    if (isShareInvite && invite.scope) {
        // Self-grant no-op: if the redeemer already OWNS the scoped policy,
        // a grant would be meaningless (owners hold full capabilities) —
        // consume the invite (done above) but mint nothing.
        if (invite.scope.startsWith("policy:")) {
            const scopedPolicyId = invite.scope.slice("policy:".length)
            const scopedPolicy = await db.policy.findUnique({
                where: { id: scopedPolicyId },
                select: { ownerUserId: true },
            })
            if (scopedPolicy?.ownerUserId === userId) return
        }

        const existingGrant = await db.accessGrant.findFirst({
            where: {
                granterUserId: invite.inviterUserId,
                granteeUserId: userId,
                scope: invite.scope,
                status: "active",
            },
            select: { id: true },
        })

        if (!existingGrant) {
            const requestedPermissions = invite.requestedPermissions?.trim()
            await db.accessGrant.create({
                data: {
                    granterUserId: invite.inviterUserId,
                    granteeUserId: userId,
                    scope: invite.scope,
                    permissions: requestedPermissions || "read",
                    status: "active",
                },
            })

            // A share COMPLETES here. `sharePolicy` announces it when the
            // advisor already has an account; when they do not, it sends an
            // invite and the grant is minted at redemption — where nothing was
            // said to either side (PW-BRIDGE-01 I-02). Best-effort: the grant
            // has committed and is the part that matters.
            try {
                const [granter, grantee] = await Promise.all([
                    db.user.findUnique({ where: { id: invite.inviterUserId }, select: { name: true } }),
                    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
                ])
                const granterName = displayPersonName(granter?.name)
                const granteeName = displayPersonName(grantee?.name)
                await emit({
                    event: "policy_shared",
                    userId,
                    title: { el: "Ένα ασφαλιστήριο κοινοποιήθηκε μαζί σας", en: "A policy was shared with you" },
                    message: {
                        el: `${granterName || "Ένας πελάτης"} σας έδωσε πρόσβαση σε ένα ασφαλιστήριο.`,
                        en: `${granterName || "A client"} gave you access to a policy.`,
                    },
                    dedupeKey: `policy_shared:${invite.id}`,
                })
                await emit({
                    event: "policy_shared",
                    userId: invite.inviterUserId,
                    title: { el: "Η κοινοποίηση ενεργοποιήθηκε", en: "Your share is now active" },
                    message: {
                        el: `${granteeName || "Ο σύμβουλός σας"} αποδέχτηκε και βλέπει πλέον το ασφαλιστήριο. Μπορείτε να ανακαλέσετε την πρόσβαση οποτεδήποτε.`,
                        en: `${granteeName || "Your advisor"} accepted and can now see the policy. You can revoke this at any time.`,
                    },
                    dedupeKey: `policy_share_active:${invite.id}`,
                })
            } catch (error) {
                console.error("Share-redeemed notification failed", error)
            }
        }
    }
}

/**
 * Both sides of «a relationship is now active», each naming the other.
 *
 * The copy is `sharePolicy`'s, deliberately: the same fact should not read
 * differently because it arrived through an invite (PW-BRIDGE-01 I-02).
 * Best-effort — the relationship has already committed.
 */
async function announceRelationshipActivated(params: {
    customerUserId: string
    advisorUserId: string
    dedupeSuffix: string
}) {
    const { customerUserId, advisorUserId, dedupeSuffix } = params
    try {
        const [customer, advisor] = await Promise.all([
            db.user.findUnique({ where: { id: customerUserId }, select: { name: true, email: true } }),
            db.user.findUnique({ where: { id: advisorUserId }, select: { name: true, email: true } }),
        ])
        const advisorName = displayPersonName(advisor?.name) || advisor?.email
        const customerName = displayPersonName(customer?.name)
        await emit({
            event: "advisor_assigned",
            userId: customerUserId,
            title: { el: "Συνδεθήκατε με σύμβουλο", en: "You are connected to an advisor" },
            message: {
                el: `${advisorName || "Ο σύμβουλός σας"} μπορεί πλέον να συνεργάζεται μαζί σας. Μπορείτε να ανακαλέσετε την πρόσβαση οποτεδήποτε.`,
                en: `${advisorName || "Your advisor"} can now work with you. You can revoke this at any time.`,
            },
            dedupeKey: `advisor_assigned:invite:${dedupeSuffix}`,
        })
        await emit({
            event: "advisor_assigned",
            userId: advisorUserId,
            title: { el: "Νέος πελάτης συνδέθηκε", en: "A new client connected" },
            message: {
                el: `${customerName || "Ένας πελάτης"} συνδέθηκε μαζί σας.`,
                en: `${customerName || "A client"} is now connected to you.`,
            },
            relatedObjectType: "customer",
            relatedObjectId: customerUserId,
            dedupeKey: `advisor_assigned_agent:invite:${dedupeSuffix}`,
        })
    } catch (error) {
        console.error("Relationship-activated notification failed", error)
    }
}
