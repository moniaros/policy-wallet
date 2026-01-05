import { auth } from "@/auth"
import { db } from "@/lib/db"
import { WalletClient } from "./WalletClient"
import type { Policy, PolicyDocument } from "@/components/wallet/types"

export default async function WalletPage() {
    const session = await auth()
    if (!session?.user?.id) return null

    const policies = await db.policy.findMany({
        where: {
            ownerUserId: session.user.id
        },
        include: {
            documents: true,
            // In a real app we would include shared agents here
        },
        orderBy: {
            endDate: 'asc'
        }
    })

    // Map Prisma types to UI types
    const mappedPolicies: Policy[] = policies.map(p => ({
        id: p.id,
        policyNumber: p.policyNumber,
        insurerName: p.insurerName,
        insurerLogo: null, // Placeholder
        lineOfBusiness: p.lineOfBusiness as any,
        status: mapStatus(p.status, p.endDate),
        startDate: p.startDate.toISOString(),
        endDate: p.endDate.toISOString(),
        lastUpdated: p.updatedAt.toISOString(),
        sharedWithAgents: [], // Mock for now
        coverageHighlights: [], // Mock or parse from summary
        documents: p.documents.map((d: any) => ({
            id: d.id,
            fileName: d.fileName,
            uploadedAt: d.uploadedAt.toISOString(),
            uploadedBy: d.source as any
        }))
    }))

    return <WalletClient policies={mappedPolicies} />
}

function mapStatus(dbStatus: string, endDate: Date): 'active' | 'expiring_soon' | 'incomplete' | 'action_needed' {
    const now = new Date()
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (dbStatus === 'cancelled') return 'action_needed'
    if (daysUntilExpiry < 0) return 'action_needed' // Expired
    if (daysUntilExpiry < 30) return 'expiring_soon'

    return 'active'
}
