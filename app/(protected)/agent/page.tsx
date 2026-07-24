export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { AgentClient } from "./AgentClient"
import type { Policy } from "@/components/wallet/types"
import { redirect } from "next/navigation"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { mapPolicyCardStatus } from '@/lib/wallet/map-policy-card-status'

export default async function AgentPage() {
    const { dbUser } = await getAuthenticatedUser()
    const roleCopy = getRoleCopy((dbUser.preferredLanguage as 'el' | 'en') || 'el')

    // Fetch policies for navigation context
    const policies = await db.policy.findMany({
        where: {
            ownerUserId: dbUser.id
        },
        include: {
            documents: true,
        },
        orderBy: {
            endDate: 'asc'
        }
    })

    // Fetch agent relationship + branding
    const customerRelationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: dbUser.id,
            status: 'active'
        },
        include: {
            agent: {
                include: {
                    agentProfile: {
                        select: {
                            agencyName: true,
                            licenseNumber: true,
                            logoUrl: true,
                            brandColor: true,
                            website: true,
                            phone: true,
                            verificationStatus: true,
                        },
                    },
                },
            },
        }
    })

    const agentUser = customerRelationship?.agent
    const agentProfile = agentUser?.agentProfile

    // Custom portal branding (logo + brand color) is a paid entitlement
    // (brandedPortal, Starter+). Enforce it server-side on the AGENT's tier —
    // the AgentPlanGate blur was cosmetic, so a free agent's branding still
    // reached the client. Below-tier agents fall back to default styling +
    // their personal avatar; name/company/contact stay visible for everyone.
    const hasBrandedPortal = agentUser
        ? await canAgentUseFeature(agentUser.id, "brandedPortal")
        : false

    const agent = agentUser ? {
        id: agentUser.id,
        name: agentUser.name || roleCopy.defaults.agentName,
        phone: agentProfile?.phone || agentUser.phoneNumber || '',
        email: agentUser.email,
        company: agentProfile?.agencyName || roleCopy.defaults.agentCompany,
        photoUrl: (hasBrandedPortal ? agentProfile?.logoUrl : undefined) || agentUser.image || undefined,
        branding: hasBrandedPortal && agentProfile ? {
            agencyName: agentProfile.agencyName,
            licenseNumber: agentProfile.licenseNumber,
            logoUrl: agentProfile.logoUrl,
            brandColor: agentProfile.brandColor || "#10b981",
            website: agentProfile.website,
            verified: agentProfile.verificationStatus === "verified",
        } : undefined,
    } : undefined

    // Shared-access ledger: the policies this agent can currently see via an
    // active AccessGrant the customer granted (both policies the customer shared
    // and policies the advisor uploaded — which mint a grant too). The customer
    // controls all of them and can revoke any at will (revokeShare).
    const shareGrants = agentUser
        ? await db.accessGrant.findMany({
            where: {
                granterUserId: dbUser.id,
                granteeUserId: agentUser.id,
                status: "active",
                scope: { startsWith: "policy:" },
            },
            select: { id: true, scope: true, grantedAt: true },
        })
        : []

    const sharedPolicies = shareGrants
        .map((g) => {
            const policyId = g.scope.slice("policy:".length)
            const policy = policies.find((p) => p.id === policyId)
            return {
                grantId: g.id,
                policyId,
                policyNumber: policy?.policyNumber ?? policyId,
                insurerName: policy?.insurerName ?? "",
                lineOfBusiness: (policy?.lineOfBusiness as string) ?? "",
                addedByAdvisor: policy ? policy.createdByUserId === agentUser!.id : false,
                grantedAt: g.grantedAt.toISOString(),
            }
        })
        .filter((sp) => Boolean(sp.policyId))

    const user = {
        id: dbUser.id,
        name: dbUser.name || roleCopy.defaults.userName,
        email: dbUser.email,
        photoUrl: dbUser.image || undefined,
    }

    // Map policies
    const mappedPolicies: Policy[] = policies.map(p => ({
        id: p.id,
        userId: p.ownerUserId,
        policyNumber: p.policyNumber,
        insurerName: p.insurerName,
        insurerLogo: null,
        lineOfBusiness: p.lineOfBusiness as any,
        status: mapPolicyCardStatus(p.status, p.endDate),
        startDate: p.startDate.toISOString(),
        endDate: p.endDate.toISOString(),
        lastUpdated: p.updatedAt.toISOString(),
        sharedWithAgents: [],
        coverageHighlights: [],
        documents: p.documents.map((d: any) => ({
            id: d.id,
            fileName: d.fileName,
            uploadedAt: d.uploadedAt.toISOString(),
            uploadedBy: d.source as any
        })),
        acordData: p.acordData
    }))

    return (
        <AgentClient
            policies={mappedPolicies}
            user={user}
            agent={agent}
            relationshipId={customerRelationship?.id || null}
            sharedPolicies={sharedPolicies}
        />
    )
}

