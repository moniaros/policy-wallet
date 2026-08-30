import { db } from "@/lib/db"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { policyLabel, policyAssetIdentifier, displayPersonName } from "@/lib/wallet/policy-identity"
import { formatPolicyDate } from "@/lib/wallet/policy-detail"
import { NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"

export interface AdviserModel {
    lang: "el" | "en"
    adviser: {
        id: string
        name: string
        company: string | null
        phone: string | null
        email: string
        photoUrl: string | null
        relationshipId: string
        since: string | null
    } | null
    /** One row per live policy: shared (with the grant id and date) or not. */
    policies: Array<{ id: string; label: string; asset: string | null; grantId: string | null; sharedSince: string | null; addedByAdviser: boolean }>
    threads: Array<{ id: string; subject: string; status: string; at: string; policyId: string | null }>
}

/**
 * /adviser (§8.7): the customer's OWN adviser — never a directory. Sharing is
 * per policy, revocable, and every change leaves an AdviserShareAudit row.
 */
export async function loadAdviserModel(userId: string, lang: "el" | "en"): Promise<AdviserModel> {
    const relationship = await db.customerRelationship.findFirst({
        where: { policyholderUserId: userId, status: "active" },
        include: { agent: { include: { agentProfile: { select: { agencyName: true, logoUrl: true, phone: true } } } } },
    })
    const roleCopy = getRoleCopy(lang)
    const agent = relationship?.agent ?? null
    const [policies, grants, threads] = await Promise.all([
        db.policy.findMany({
            where: { ownerUserId: userId, status: { notIn: [...NON_LIVE_POLICY_STATUSES, "expired"] } },
            select: { id: true, insurerName: true, policyNumber: true, lineOfBusiness: true, acordData: true, createdByUserId: true },
            orderBy: { endDate: "asc" },
        }),
        agent
            ? db.accessGrant.findMany({
                  where: { granterUserId: userId, granteeUserId: agent.id, status: "active", scope: { startsWith: "policy:" } },
                  select: { id: true, scope: true, grantedAt: true },
              })
            : [],
        relationship
            ? db.collaborationThread.findMany({
                  where: { relationshipId: relationship.id },
                  orderBy: { lastActivityAt: "desc" },
                  take: 8,
                  select: { id: true, subject: true, status: true, lastActivityAt: true, policyId: true },
              })
            : [],
    ])
    const grantByPolicy = new Map(grants.map((g) => [g.scope.slice("policy:".length), g]))
    const locale = lang === "el" ? "el-GR" : "en-GB"
    const hasBranding = agent ? await canAgentUseFeature(agent.id, "brandedPortal") : false
    return {
        lang,
        adviser: agent && relationship
            ? {
                  id: agent.id,
                  name: displayPersonName(agent.name) || roleCopy.defaults.agentName,
                  company: agent.agentProfile?.agencyName ?? null,
                  phone: agent.agentProfile?.phone ?? agent.phoneNumber ?? null,
                  email: agent.email,
                  photoUrl: (hasBranding ? agent.agentProfile?.logoUrl : null) ?? agent.image ?? null,
                  relationshipId: relationship.id,
                  since: relationship.createdAt ? formatPolicyDate(relationship.createdAt, locale) : null,
              }
            : null,
        policies: policies.map((p) => {
            const grant = grantByPolicy.get(p.id)
            return {
                id: p.id,
                label: policyLabel(p, ""),
                asset: policyAssetIdentifier({ lineOfBusiness: p.lineOfBusiness, acordData: p.acordData }),
                grantId: grant?.id ?? null,
                sharedSince: grant ? formatPolicyDate(grant.grantedAt, locale) : null,
                addedByAdviser: agent ? p.createdByUserId === agent.id : false,
            }
        }),
        threads: threads.map((th) => ({ id: th.id, subject: th.subject, status: th.status, at: th.lastActivityAt.toISOString(), policyId: th.policyId })),
    }
}
