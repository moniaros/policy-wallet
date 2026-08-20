export const runtime = 'nodejs'

import Link from "next/link"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { CoverageInsightsClient } from "@/components/coverage/CoverageInsightsClient"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { ProtectionScoreCard } from "@/components/coverage/ProtectionScoreCard"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { LifeEventsPanel } from "@/components/coverage/LifeEventsPanel"
import { declarableLifeEvents, getLifeEvent, magnitudePrompt } from "@/lib/services/life-events/registry"
import { getLifeEventHistory } from "@/lib/services/life-events/service"
import { RiskProfileWizard } from "@/components/coverage/RiskProfileWizard"
import { RefreshAnalysisButton } from "@/components/coverage/RefreshAnalysisButton"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { getGapEngineSnapshot, type GapEngineSnapshot } from "@/lib/services/gap-engine"
import { getTranslations } from "@/lib/i18n"
import { effectivePolicyStatus, isPolicyCoverageActive } from "@/lib/policy-status"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import { displayInsurerName, displayPolicyNumber } from "@/lib/wallet/policy-identity"

export default async function CoverageInsightsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const entitlements = await resolveUserEntitlements(dbUser.id)

    // Read-only snapshot: live score + smart-card evidence (pure functions
    // over current data) + the persisted recommendation set. The WRITE path
    // (gap detection + engine sync) used to run on every render — it now
    // lives behind the explicit refresh action, the upload pipeline and cron.
    let engineResult: GapEngineSnapshot | null = null
    try {
        engineResult = await getGapEngineSnapshot(dbUser.id)
    } catch (err) {
        console.error("Gap engine snapshot failed, falling back to legacy:", err)
    }

    // 2b. Load user profile for the risk profile wizard
    const profileRecord = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id },
    })

    // 2c. Life events — the declared history, and which one-time events are spent.
    const declaredEvents = await getLifeEventHistory(dbUser.id).catch(() => [])
    const recordedIds = new Set(declaredEvents.map((e) => e.definitionId))
    const lifeEventOptions = declarableLifeEvents().map((definition) => ({
        id: definition.id,
        domain: definition.domain,
        label: definition.label,
        description: definition.description,
        needsMagnitude: magnitudePrompt(definition.id) !== null,
        magnitudeLabel: magnitudePrompt(definition.id),
        alreadyRecorded: !definition.repeatable && recordedIds.has(definition.id),
    }))
    const recentLifeEvents = declaredEvents.slice(0, 5).map((event) => ({
        id: event.id,
        definitionId: event.definitionId,
        label: getLifeEvent(event.definitionId)?.label ?? {
            en: event.definitionId,
            el: event.definitionId,
        },
        occurredAt: event.occurredAt.toISOString(),
    }))

    // 3. Fetch all current gap instances for this user's policies
    const allGapInstances = await db.gapInstance.findMany({
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
            // No acordData here: these rows serialize straight into client
            // props (one per GAP), and the full ACORD JSON per row made the
            // RSC payload multi-MB. The client reads only lineOfBusiness.
            policy: {
                select: {
                    id: true,
                    policyNumber: true,
                    lineOfBusiness: true,
                    insurerName: true,
                    status: true,
                    endDate: true
                }
            }
        },
        orderBy: {
            detectedAt: 'desc'
        }
    })

    // 4. Get user's policies
    const allPolicies = await db.policy.findMany({
        where: {
            ownerUserId: dbUser.id
        },
        select: {
            id: true,
            policyNumber: true,
            acordData: true,
            createdAt: true,
            insurerName: true,
            lineOfBusiness: true,
            status: true,
            endDate: true,
            // Deep gap analysis is Plus-gated; only the deep pipeline sets this
            // (extractBasicSummary does not). Null everywhere ⇒ never deep-analyzed.
            lastAnalyzedAt: true
        }
    })

    // CRITICAL: coverage insights describe the protection you have TODAY.
    // A lapsed policy is not protection — its findings must not be presented
    // as your current coverage picture (they stay on that policy's own page).
    const policies = allPolicies.filter((policy) => isPolicyCoverageActive(policy))
    const expiredPolicies = allPolicies.filter((policy) => !isPolicyCoverageActive(policy)
        && effectivePolicyStatus(policy) === 'expired')
    const livePolicyIds = new Set(policies.map((policy) => policy.id))
    const gapInstances = allGapInstances.filter((gap) => !gap.policyId || livePolicyIds.has(gap.policyId))


    // 5. Calculate statistics
    const criticalGaps = gapInstances.filter(g => g.severity === 'critical').length
    const highGaps = gapInstances.filter(g => g.severity === 'high').length
    const mediumGaps = gapInstances.filter(g => g.severity === 'medium').length
    const lowGaps = gapInstances.filter(g => g.severity === 'low').length

    // Coverage-completeness score (profile-based). No misleading "100 = Strong"
    // fallback when the engine errors — an unknown score must never read as strong.
    const healthScore = engineResult ? engineResult.protectionScore.overallScore : 0

    // Verdict gating signals (Concept B = policy gaps): distinguish
    // "analyzed & clean" from "never deep-analyzed", and whether deep analysis
    // is available (Plus) at all. lastAnalyzedAt is set only by the deep pipeline.
    const hasPolicies = policies.length > 0
    const hasDeepAnalysis = policies.some((p) => (p as any).lastAnalyzedAt != null)
    const isDeepAnalysisLocked = entitlements.tier !== 'pro'

    // Freshness anchor for the protection score: the most recent deep-analysis
    // across the portfolio. Null when nothing has been deep-analyzed yet, so the
    // score claims no "as of" date it cannot back up.
    const latestAnalyzedAt = policies.reduce<string | null>((latest, p) => {
        const at = (p as any).lastAnalyzedAt as Date | null
        if (!at) return latest
        const iso = at.toISOString()
        return latest === null || iso > latest ? iso : latest
    }, null)

    const userLanguage = (dbUser.preferredLanguage || 'en') as 'en' | 'el'
    const t = getTranslations(userLanguage)

    return (
        // One page shell for the whole route — the three sections used to each
        // wrap in `.pw-page-shell` (min-h-screen), stacking to ~3 viewports tall
        // with large empty gaps between them.
        <div className="pw-page-shell">
            {/* Ordering: what to DO comes before how you SCORE — the
                recommendations and the reviewed findings lead, the passive
                score and the profile wizard follow. */}
            {engineResult && (
                <div>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 lg:pt-10 space-y-6">
                        <div className="flex justify-end">
                            <RefreshAnalysisButton
                                labels={{
                                    refresh: t.insights.refreshAnalysis,
                                    refreshing: t.insights.refreshingAnalysis,
                                    failed: t.insights.refreshFailed,
                                }}
                            />
                        </div>

                        <RecommendationCards
                            recommendations={engineResult.recommendations.map((r) => ({
                                ...r,
                                createdAt: r.createdAt.toISOString(),
                            }))}
                            language={userLanguage}
                            profileIncomplete={engineResult.profileCompleteness < 80}
                            smartContent={engineResult.smartContent}
                            tier={entitlements.tier}
                            hasPolicies={hasPolicies}
                        />
                    </div>
                </div>
            )}

            {/* Reviewed findings (has its own pw-page-shell wrapper) */}
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
                    excludedExpired={expiredPolicies.map((policy) => ({
                        id: policy.id,
                        label:
                            resolveInsurerDisplay(policy.insurerName).displayName ||
                            displayPolicyNumber(policy.policyNumber) ||
                            '',
                    }))}
                    userLanguage={userLanguage}
                    tier={entitlements.tier}
                    isPaid={entitlements.isPaid}
                    hasPolicies={hasPolicies}
                    hasDeepAnalysis={hasDeepAnalysis}
                    isDeepAnalysisLocked={isDeepAnalysisLocked}
                    canUseAgentCollaboration={entitlements.limits.agentCollaboration}
                    policies={policies.map(p => ({
                        id: p.id,
                        insurerName: displayInsurerName((p as any).insurerName, p.lineOfBusiness || 'Policy'),
                        lineOfBusiness: {
                            code: (p.acordData as any)?.policy?.lineOfBusiness?.code || p.lineOfBusiness || 'other',
                            name: (p.acordData as any)?.policy?.lineOfBusiness?.Description || p.lineOfBusiness || (userLanguage === 'el' ? 'Άλλο Συμβόλαιο' : 'Other Policy')
                        }
                    }))}
                />

            {/* Profile wizard (improves the analysis), then the passive score */}
            {engineResult && (
                <div>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6">
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
                                        childrenCount: profileRecord.childrenCount,
                                        residenceType: profileRecord.residenceType,
                                        propertiesOwned: profileRecord.propertiesOwned,
                                        rentsOutProperty: profileRecord.rentsOutProperty,
                                        ownsBoat: profileRecord.ownsBoat,
                                        ownsBusiness: profileRecord.ownsBusiness,
                                        businessEmployees: profileRecord.businessEmployees,
                                        savingsAmount: profileRecord.savingsAmount ? Number(profileRecord.savingsAmount) : null,
                                        valuablesValue: profileRecord.valuablesValue ? Number(profileRecord.valuablesValue) : null,
                                        activities: Array.isArray(profileRecord.activities) ? profileRecord.activities as string[] : null,
                                        cyberExposure: profileRecord.cyberExposure,
                                        retirementPlanning: profileRecord.retirementPlanning,
                                    } : undefined}
                                    language={userLanguage}
                                />
                            </div>
                        )}

                        {/* Free tier with at least one finding: the page has shown
                            real value (recommendations + gaps) — now name what the
                            full gap analysis adds. Below the value, never above it. */}
                        {entitlements.tier === "free" && engineResult.recommendations.length > 0 && (
                            <UpgradeTriggerCard
                                featureKey="advanced_gap_detection"
                                triggerSource="coverage_insights_page"
                                returnTo="/coverage-insights"
                                dismissible
                            />
                        )}

                        {/* Declaring a change is the cheapest way to improve the
                            assessment, so it sits above the assessment itself.
                            The id anchors the dashboard's "Something changed?"
                            card — keep it in sync with LifeEventPromptCard. */}
                        <div id="life-events" className="scroll-mt-20">
                            <LifeEventsPanel
                                options={lifeEventOptions}
                                recent={recentLifeEvents}
                                language={userLanguage}
                            />
                        </div>

                        {/* The risk list and the risk graph used to sit here.
                            Both are now nested inside the nine dimensions on
                            /insights/risk-profile: three renderings of one
                            assessment on one page asked the customer to
                            reconcile them, which is our job, not theirs. This
                            page answers a different question — what your
                            POLICIES say — and links across for the other. */}
                        <div className="pw-card pw-pad">
                            <p className="pw-kicker">{t.insights.riskProfileKicker}</p>
                            <p className="mt-1 text-caption text-muted-foreground">
                                {t.insights.riskProfileBlurb}
                            </p>
                            <Link
                                href="/insights/risk-profile"
                                className="mt-2 inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                            >
                                {t.insights.riskProfileCta}
                            </Link>
                        </div>

                        {/* The protection score only makes sense once there is a
                            policy to score — with none it read "0 / Critical",
                            which is noise, not a verdict. */}
                        {hasPolicies && (
                            <ProtectionScoreCard
                                overallScore={engineResult.protectionScore.overallScore}
                                tier={engineResult.scoreTier}
                                categoryScores={engineResult.protectionScore.categoryScores as any}
                                gapCount={engineResult.protectionScore.gapCount}
                                expectedLines={engineResult.protectionScore.expectedLines}
                                actualLines={engineResult.protectionScore.actualLines}
                                profileCompleteness={engineResult.profileCompleteness}
                                indeterminate={engineResult.protectionScore.indeterminate ?? false}
                                language={userLanguage}
                                analyzedAt={latestAnalyzedAt}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
