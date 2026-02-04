import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getAccountData } from "./actions"
import { AccountClient } from "@/components/account/AccountClient"
import type { Policy } from "@/components/wallet/types"

export default async function AccountPage() {
    const { dbUser } = await getAuthenticatedUser()

    const data = await getAccountData()
    if (!data) return <div>Error loading account data.</div>

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
        name: customerRelationship.agent.name || 'Your Agent',
        phone: customerRelationship.agent.phoneNumber || '',
        email: customerRelationship.agent.email,
        company: 'PolicyWallet Agent',
        photoUrl: customerRelationship.agent.image || undefined,
        isOnline: true
    } : undefined

    const user = {
        id: dbUser.id,
        name: dbUser.name || 'User',
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
        <AccountClient
            initialData={data}
            userLanguage={dbUser.preferredLanguage || 'en'}
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
