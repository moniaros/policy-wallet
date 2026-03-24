export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { detectGapsForUser, createGapInstances } from "@/lib/gap-detection"
import { CoverageInsightsClient } from "@/components/coverage/CoverageInsightsClient"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"

export default async function CoverageInsightsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const entitlements = await resolveUserEntitlements(dbUser.id)

    // 1. Detect gaps for the user
    // This runs the detection engine to see if new gaps exist
    const detectedGaps = await detectGapsForUser(dbUser.id)

    // 2. Create gap instances in the DB (won't duplicate existing ones)
    if (detectedGaps.length > 0) {
        await createGapInstances(detectedGaps)
    }

    // 3. Fetch all current gap instances for this user's policies
    // We include policy details to display context in the insight cards
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
                    acordData: true,
                    lineOfBusiness: true,
                    insurerName: true
                }
            }
        },
        orderBy: {
            detectedAt: 'desc'
        }
    })

    // 4. Get user's policies for "What's OK" calculation
    const policies = await db.policy.findMany({
        where: {
            ownerUserId: dbUser.id
        },
        select: {
            id: true,
            policyNumber: true,
            acordData: true,
            createdAt: true,
            insurerName: true,
            lineOfBusiness: true // Select simple field
        }
    })

    // 5. Calculate statistics for the dashboard
    const criticalGaps = gapInstances.filter(g => g.severity === 'critical').length
    const highGaps = gapInstances.filter(g => g.severity === 'high').length
    const mediumGaps = gapInstances.filter(g => g.severity === 'medium').length
    const lowGaps = gapInstances.filter(g => g.severity === 'low').length

    // Calculate health score (0-100)
    // Rule: Critical hits hard (-25), High (-15), Medium (-8), Low (-3)
    const healthScore = Math.max(0, Math.min(100,
        100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)
    ))

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
                totalCoverage: 0 // Not prioritized in new design
            }}
            userLanguage={dbUser.preferredLanguage || 'en'}
            tier={entitlements.tier}
            isPaid={entitlements.isPaid}
            canUseAdvancedAnalytics={entitlements.limits.advancedAnalytics}
            canUseAgentCollaboration={entitlements.limits.agentCollaboration}
            policies={policies.map(p => ({
                id: p.id,
                insurerName: ((p as any).insurerName && (p as any).insurerName !== '__PENDING_EXTRACTION__') ? (p as any).insurerName : (p.lineOfBusiness || 'Policy'),
                lineOfBusiness: {
                    // Try to get from acordData first (more specific), then fallback to top-level field
                    code: (p.acordData as any)?.policy?.lineOfBusiness?.code || p.lineOfBusiness || 'other',
                    name: (p.acordData as any)?.policy?.lineOfBusiness?.Description || p.lineOfBusiness || 'Other Policy'
                }
            }))}
        />
    )
}
