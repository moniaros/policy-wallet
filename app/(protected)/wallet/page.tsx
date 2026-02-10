import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PolicyWalletClient } from "@/components/wallet/PolicyWalletClient"
import type { Policy } from "@/components/wallet/types"
import { PageHeader } from "@/components/ui/PageHeader"
import { Plus, Upload } from "lucide-react"

export default async function WalletPage() {
    const { dbUser } = await getAuthenticatedUser()

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id }
    })
    const showTour = (profile?.preferences as any)?.showTour || false


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

        const insuredItem = (() => {
            if (p.lineOfBusiness === 'motor' && (p.acordData as any)?.vehicle) {
                const v = (p.acordData as any).vehicle
                return {
                    type: 'vehicle' as const,
                    title: `${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle',
                    subtitle: v.plateNumber || undefined
                }
            }
            if (p.lineOfBusiness === 'home' && (p.acordData as any)?.property) {
                const prop = (p.acordData as any).property
                return {
                    type: 'property' as const,
                    title: prop.address || 'Property',
                    subtitle: prop.postalCode || undefined
                }
            }
            // Default fallback
            return undefined
        })()

        const extraction = (p.acordData as any)?.extraction
        const requiresReview = Boolean(
            extraction?.requiresReview ||
            (typeof extraction?.confidence?.overall === 'number' && extraction.confidence.overall < 80) ||
            (Array.isArray(extraction?.missingCriticalFields) && extraction.missingCriticalFields.length > 0)
        )

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
            verified: !requiresReview,
            documents: p.documents.map((d: any) => ({
                id: d.id,
                fileName: d.fileName,
                uploadedAt: d.uploadedAt.toISOString(),
                uploadedBy: d.source as any
            })),
            insuredItem
        }
    })

    return (
        <div className="min-h-screen bg-transparent">
            <PolicyWalletClient policies={mappedPolicies} user={user} agent={agent} showTour={showTour} />
        </div>
    )
}

function mapStatus(dbStatus: string, endDate: Date): 'active' | 'expiring_soon' | 'incomplete' | 'action_needed' | 'analyzing' | 'cancelled' {
    const now = new Date()
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (dbStatus === 'analyzing') return 'analyzing'
    if (dbStatus === 'cancelled') return 'cancelled'
    if (daysUntilExpiry < 0) return 'action_needed' // Expired
    if (daysUntilExpiry < 30) return 'expiring_soon'

    return 'active'
}
