export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { AgentClient } from "./AgentClient"
import type { Policy } from "@/components/wallet/types"
import { redirect } from "next/navigation"
import { getRoleCopy } from "@/lib/i18n/role-copy"

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

    const agent = agentUser ? {
        id: agentUser.id,
        name: agentUser.name || roleCopy.defaults.agentName,
        phone: agentProfile?.phone || agentUser.phoneNumber || '',
        email: agentUser.email,
        company: agentProfile?.agencyName || roleCopy.defaults.agentCompany,
        photoUrl: agentProfile?.logoUrl || agentUser.image || undefined,
        branding: agentProfile ? {
            agencyName: agentProfile.agencyName,
            licenseNumber: agentProfile.licenseNumber,
            logoUrl: agentProfile.logoUrl,
            brandColor: agentProfile.brandColor || "#10b981",
            website: agentProfile.website,
            verified: agentProfile.verificationStatus === "verified",
        } : undefined,
    } : undefined

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
        status: mapStatus(p.status, p.endDate),
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
        />
    )
}

function mapStatus(dbStatus: string, endDate: Date): 'active' | 'expiring_soon' | 'incomplete' | 'action_needed' {
    const now = new Date()
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (dbStatus === 'cancelled') return 'action_needed'
    if (daysUntilExpiry < 0) return 'action_needed'
    if (daysUntilExpiry < 30) return 'expiring_soon'

    return 'active'
}
