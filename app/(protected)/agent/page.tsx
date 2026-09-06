export const runtime = 'nodejs'

import { buildSharedPolicyLedger } from "@/lib/wallet/shared-policy-ledger"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { AgentClient } from "./AgentClient"
import type { Policy } from "@/components/wallet/types"
import { redirect } from "next/navigation"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { isAgentVerified } from "@/lib/agent/verification"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function AgentPage() {
    const { dbUser } = await getAuthenticatedUser()
    const roleCopy = getRoleCopy(resolveUserLanguage(dbUser.preferredLanguage))

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
            verified: isAgentVerified(agentProfile.verificationStatus),
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
            // The level is what the customer must see to know what the advisor can do (PW-BRIDGE-01 A-10).
            select: { id: true, scope: true, grantedAt: true, permissions: true },
        })
        : []

    // ONE pure function builds the ledger (lib/wallet/shared-policy-ledger.ts): grants over deleted policies
    // are dropped, one policy is listed once at its highest level, and the «N of M» numerator is the
    // number of DISTINCT policies the advisor can see — it can never exceed the count beside it.
    const ledger = buildSharedPolicyLedger(shareGrants, policies, agentUser?.id ?? "")
    const sharedPolicies = ledger.items

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
        // Pass the RAW stored status — the same contract as the wallet page.
        // Anything that renders these derives the displayed status through
        // getPolicyStatusView / resolvePolicyLifecycle (the single pipeline).
        // The second pipeline this page used to call (mapPolicyCardStatus, now
        // deleted) had no 'expired' state, so a lapsed policy left here as
        // 'action_needed' — «Απαιτείται ενέργεια» on Σύμβουλος while the wallet
        // said «Ληγμένο» about the same policy on the same day.
        status: p.status as Policy['status'],
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

