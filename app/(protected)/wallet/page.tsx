import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PolicyWalletClient } from "@/components/wallet/PolicyWalletClient"
import type { Policy } from "@/components/wallet/types"
import { PageHeader } from "@/components/ui/PageHeader"
import { Plus, Upload } from "lucide-react"

export default async function WalletPage() {
    const { dbUser } = await getAuthenticatedUser()

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

    // Fetch agent relationship for mobile view
    const customerRelationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: dbUser.id,
            status: 'active'
        },
        include: {
            agent: true
        }
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

    // Fetch active access grants
    const allGrants = await db.accessGrant.findMany({
        where: {
            granterUserId: dbUser.id,
            status: 'active',
            scope: { startsWith: 'policy:' }
        },
        include: {
            grantee: true
        }
    })

    // Map Prisma types to UI types
    const mappedPolicies: Policy[] = policies.map(p => {
        // Find grants for this policy
        const policyGrants = allGrants.filter(g => g.scope === `policy:${p.id}`)

        return {
            id: p.id,
            policyNumber: p.policyNumber,
            insurerName: p.insurerName,
            insurerLogo: null, // Placeholder
            lineOfBusiness: p.lineOfBusiness as any,
            status: mapStatus(p.status, p.endDate),
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
            lastUpdated: p.updatedAt.toISOString(),
            premiumAmount: p.premiumAmount ? Number(p.premiumAmount) : undefined,
            premiumCurrency: p.premiumCurrency || 'EUR',
            sharedWithAgents: policyGrants.map(g => ({
                agentName: g.grantee.name || 'Agent',
                agentId: g.grantee.id,
                permissions: g.permissions
            })),
            coverageHighlights: [], // Mock or parse from summary
            documents: p.documents.map((d: any) => ({
                id: d.id,
                fileName: d.fileName,
                uploadedAt: d.uploadedAt.toISOString(),
                uploadedBy: d.source as any
            }))
        }
    })

    return (
        <div className="min-h-screen bg-transparent">
            <PolicyWalletClient policies={mappedPolicies} user={user} />
        </div>
    )
}

function mapStatus(dbStatus: string, endDate: Date): 'active' | 'expiring_soon' | 'incomplete' | 'action_needed' | 'analyzing' {
    const now = new Date()
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (dbStatus === 'analyzing') return 'analyzing'
    if (dbStatus === 'cancelled') return 'action_needed'
    if (daysUntilExpiry < 0) return 'action_needed' // Expired
    if (daysUntilExpiry < 30) return 'expiring_soon'

    return 'active'
}
