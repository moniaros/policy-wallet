export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getAccountData } from "./actions"
import { AccountClientPage } from "./AccountClientPage"
import type { Policy } from "@/components/wallet/types"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { mapPolicyCardStatus } from '@/lib/wallet/map-policy-card-status'

export default async function AccountPage() {
    const { dbUser } = await getAuthenticatedUser()
    const roleCopy = getRoleCopy((dbUser.preferredLanguage as 'el' | 'en') || 'el')

    const data = await getAccountData()
    if (!data) {
        return (
            <div className="pw-page-shell px-4 py-8">
                <div className="mx-auto max-w-2xl pw-card pw-pad text-sm text-black/70 dark:text-white/75">
                    {roleCopy.defaults.loadingError}
                </div>
            </div>
        )
    }

    // Fetch additional data for mobile view (policies & agent)
    const policies = await db.policy.findMany({
        where: { ownerUserId: dbUser.id },
        orderBy: { endDate: 'asc' },
        include: { documents: true }
    })

    const customerRelationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: dbUser.id,
            status: 'active'
        },
        include: { agent: true }
    })

    const agent = customerRelationship?.agent ? {
        id: customerRelationship.agent.id,
        name: customerRelationship.agent.name || roleCopy.defaults.agentName,
        phone: customerRelationship.agent.phoneNumber || '',
        email: customerRelationship.agent.email || '',
        company: roleCopy.defaults.agentCompany,
        photoUrl: customerRelationship.agent.image || undefined,
        isOnline: true
    } : undefined

    const user = {
        id: dbUser.id,
        name: dbUser.name || roleCopy.defaults.userName,
        email: dbUser.email,
        photoUrl: dbUser.image || undefined,
        isOnline: true
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
        <AccountClientPage
            initialData={data}
            mobileProps={{
                policies: mappedPolicies,
                user,
                agent
            }}
        />
    )
}


