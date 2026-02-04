import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { GapList } from "@/components/gaps/GapList"
import { detectGapsForUser, createGapInstances } from "@/lib/gap-detection"
import { CoverageInsightsClient } from "@/components/coverage/CoverageInsightsClient"

export default async function CoverageInsightsPage() {
    const { dbUser } = await getAuthenticatedUser()

    // 1. Detect gaps for the user
    const detectedGaps = await detectGapsForUser(dbUser.id)

    // 2. Create gap instances in the DB (won't duplicate existing ones)
    if (detectedGaps.length > 0) {
        await createGapInstances(detectedGaps)
    }

    // 3. Fetch all current gap instances for this user's policies
    const gapInstances = await db.gapInstance.findMany({
        where: {
            policy: {
                ownerUserId: dbUser.id
            },
            status: {
                in: ['detected', 'acknowledged', 'open']
            }
        },
        include: {
            definition: true,
            policy: {
                select: {
                    id: true,
                    policyNumber: true,
                    acordData: true
                }
            }
        },
        orderBy: {
            detectedAt: 'desc'
        }
    })

    // Get user's policies for coverage breakdown
    const policies = await db.policy.findMany({
        where: {
            ownerUserId: dbUser.id
        },
        select: {
            id: true,
            policyNumber: true,
            acordData: true,
            createdAt: true
        }
    })

    // Calculate statistics
    const criticalGaps = gapInstances.filter(g => g.severity === 'critical').length
    const highGaps = gapInstances.filter(g => g.severity === 'high').length
    const mediumGaps = gapInstances.filter(g => g.severity === 'medium').length
    const lowGaps = gapInstances.filter(g => g.severity === 'low').length

    // Calculate health score (0-100)
    const healthScore = Math.max(0, Math.min(100,
        100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)
    ))

    // Group policies by type for coverage breakdown
    const coverageByType: Record<string, number> = {}
    let totalCoverage = 0

    policies.forEach(policy => {
        const acordData = policy.acordData as any
        const policyType = acordData?.policy?.lineOfBusiness?.code || 'Other'
        const coverageAmount = parseFloat(acordData?.policy?.premium?.amount?.toString() || '0')

        if (!coverageByType[policyType]) {
            coverageByType[policyType] = 0
        }
        coverageByType[policyType] += coverageAmount
        totalCoverage += coverageAmount
    })


    const coverageBreakdown = Object.entries(coverageByType).map(([type, amount]) => ({
        type,
        amount,
        percentage: totalCoverage > 0 ? (amount / totalCoverage) * 100 : 0
    }))

    return (
        <CoverageInsightsClient
            gaps={gapInstances}
            stats={{
                critical: criticalGaps,
                high: highGaps,
                medium: mediumGaps,
                low: lowGaps,
                healthScore,
                totalGaps: gapInstances.length,
                totalPolicies: policies.length,
                totalCoverage
            }}
            coverageBreakdown={coverageBreakdown}
            userLanguage={dbUser.preferredLanguage || 'en'}
        />
    )
}
