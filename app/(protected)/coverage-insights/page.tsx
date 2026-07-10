export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { detectGapsForUser, createGapInstances } from "@/lib/gap-detection"
import { CoverageInsightsClient } from "@/components/coverage/CoverageInsightsClient"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { ProtectionScoreCard } from "@/components/coverage/ProtectionScoreCard"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { RiskProfileWizard } from "@/components/coverage/RiskProfileWizard"
import { runGapEngine } from "@/lib/services/gap-engine"

export default async function CoverageInsightsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const entitlements = await resolveUserEntitlements(dbUser.id)

    // 1. Legacy gap detection — only run if no policy was analyzed in the last hour
    // to avoid write-heavy N+1 detection on every page render.
    const recentlyAnalyzed = await db.policy.findFirst({
        where: {
            ownerUserId: dbUser.id,
            lastAnalyzedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        select: { id: true },
    })
    if (!recentlyAnalyzed) {
        const detectedGaps = await detectGapsForUser(dbUser.id)
        if (detectedGaps.length > 0) {
            await createGapInstances(detectedGaps)
        }
    }

    // 2. Run gap engine (reads fresh gap instances, computes protection score + recommendations)
    let engineResult: Awaited<ReturnType<typeof runGapEngine>> | null = null
    try {
        engineResult = await runGapEngine(dbUser.id)
    } catch (err) {
        console.error("Gap engine failed, falling back to legacy:", err)
    }

    // 2b. Load user profile for the risk profile wizard
    const profileRecord = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id },
    })

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

    // 4. Get user's policies
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
            lineOfBusiness: true
        }
    })

    // 5. Calculate statistics
    const criticalGaps = gapInstances.filter(g => g.severity === 'critical').length
    const highGaps = gapInstances.filter(g => g.severity === 'high').length
    const mediumGaps = gapInstances.filter(g => g.severity === 'medium').length
    const lowGaps = gapInstances.filter(g => g.severity === 'low').length

    // Use protection score from engine if available, otherwise legacy calculation
    const healthScore = engineResult
        ? engineResult.protectionScore.overallScore
        : Math.max(0, Math.min(100,
            100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)
        ))

    const userLanguage = (dbUser.preferredLanguage || 'en') as 'en' | 'el'

    return (
        <>
            {/* Protection Score Card (rendered above existing insights) */}
            {engineResult && (
                <div className="pw-page-shell">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 lg:pt-10 space-y-6">
                        <ProtectionScoreCard
                            overallScore={engineResult.protectionScore.overallScore}
                            tier={engineResult.scoreTier}
                            categoryScores={engineResult.protectionScore.categoryScores as any}
                            gapCount={engineResult.protectionScore.gapCount}
                            expectedLines={engineResult.protectionScore.expectedLines}
                            actualLines={engineResult.protectionScore.actualLines}
                            profileCompleteness={engineResult.profileCompleteness}
                            language={userLanguage}
                        />

                        {engineResult.profileCompleteness < 80 && (
                            <div id="risk-profile-wizard">
                                <RiskProfileWizard
                                    initialData={profileRecord ? {
                                        maritalStatus: profileRecord.maritalStatus,
                                        dependentsCount: profileRecord.dependentsCount,
                                        employmentStatus: profileRecord.employmentStatus,
                                        ownsHome: profileRecord.ownsHome,
                                        mortgageAmount: profileRecord.mortgageAmount ? Number(profileRecord.mortgageAmount) : null,
                                        hasPets: profileRecord.hasPets,
                                        vehiclesCount: profileRecord.vehiclesCount,
                                        annualIncome: profileRecord.annualIncome ? Number(profileRecord.annualIncome) : null,
                                        occupation: profileRecord.occupation,
                                        travelsFrequently: profileRecord.travelsFrequently,
                                        hasLoans: profileRecord.hasLoans,
                                        loanAmount: profileRecord.loanAmount ? Number(profileRecord.loanAmount) : null,
                                        smokingStatus: profileRecord.smokingStatus,
                                        lifeEvents: Array.isArray(profileRecord.lifeEvents) ? profileRecord.lifeEvents as Array<{ type: string; date: string }> : undefined,
                                    } : undefined}
                                    language={userLanguage}
                                />
                            </div>
                        )}

                        <RecommendationCards
                            recommendations={engineResult.recommendations.map((r) => ({
                                ...r,
                                createdAt: r.createdAt.toISOString(),
                            }))}
                            language={userLanguage}
                            profileIncomplete={engineResult.profileCompleteness < 80}
                            smartContent={engineResult.smartContent}
                        />
                    </div>
                </div>
            )}

            {/* Existing coverage insights (has its own pw-page-shell wrapper) */}
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
                        totalCoverage: 0
                    }}
                    userLanguage={userLanguage}
                    tier={entitlements.tier}
                    isPaid={entitlements.isPaid}
                    canUseAgentCollaboration={entitlements.limits.agentCollaboration}
                    policies={policies.map(p => ({
                        id: p.id,
                        insurerName: ((p as any).insurerName && (p as any).insurerName !== '__PENDING_EXTRACTION__') ? (p as any).insurerName : (p.lineOfBusiness || 'Policy'),
                        lineOfBusiness: {
                            code: (p.acordData as any)?.policy?.lineOfBusiness?.code || p.lineOfBusiness || 'other',
                            name: (p.acordData as any)?.policy?.lineOfBusiness?.Description || p.lineOfBusiness || (userLanguage === 'el' ? 'Άλλο Συμβόλαιο' : 'Other Policy')
                        }
                    }))}
                />
        </>
    )
}
