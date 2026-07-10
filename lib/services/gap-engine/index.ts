/**
 * Gap Detection & Recommendation Engine — Orchestrator
 *
 * Single entry point that:
 * 1. Loads user profile + policies + existing gap instances
 * 2. Runs profile-based gap detection rules
 * 3. Calculates unified protection score
 * 4. Generates and persists recommendations
 * 5. Caches protection score
 *
 * Used by:
 * - GET /api/v1/protection-score (on-demand)
 * - GET /api/v1/recommendations (on-demand)
 * - POST /api/v1/jobs/protection-score-refresh (cron)
 * - Coverage insights page (server component)
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
    detectProfileGaps,
    getExpectedLines,
    toProfileFields,
    type ProfileGap,
    type ProfileFields,
    type PolicyFields,
} from "./profile-gap-rules"
import {
    calculateProtectionScore,
    getScoreTier,
    type ProtectionScoreResult,
} from "./protection-score"
import {
    profileGapsToRecommendations,
    policyGapsToRecommendations,
    prioritizeRecommendations,
    syncRecommendations,
    getActiveRecommendations,
    matchProductsToRecommendations,
    deriveProfileTags,
    type RecommendationInput,
    type RecommendationOutput,
} from "./recommendation-generator"
import {
    evaluatePortfolioRules,
    buildProfileGapEvidence,
    type PortfolioGap,
    type SmartCardContent,
} from "./portfolio-rules"
import type { AIRiskProfileAnalysisResponse } from "@/lib/services/ai/ai-service.interface"

// ── Public types ─────────────────────────────────────────────────────

export interface GapEngineResult {
    protectionScore: ProtectionScoreResult
    scoreTier: ReturnType<typeof getScoreTier>
    profileGaps: ProfileGap[]
    recommendations: RecommendationOutput[]
    profileCompleteness: number // 0-100
    syncStats: { created: number; dismissed: number }
    /** AI-generated risk insights (null if AI unavailable or failed) */
    aiInsights: AIRiskProfileAnalysisResponse | null
    /** Evidence / next-action / review-target per recommendation ruleId,
     *  computed fresh from the live portfolio on every run. */
    smartContent: Record<string, SmartCardContent>
    /** Whether the user has an active advisor relationship. */
    hasAgent: boolean
}

export interface RunGapEngineOptions {
    /** Run AI risk profile analysis (slower, costs tokens). Default: false */
    includeAiInsights?: boolean
}

export interface CachedProtectionScore {
    overallScore: number
    categoryScores: Record<string, any>
    gapCount: number
    expectedLines: string[]
    actualLines: string[]
    computedAt: Date
}

// ── Main orchestrator ────────────────────────────────────────────────

/**
 * Run the full gap detection and scoring engine for a user.
 * This is the primary entry point.
 */
export async function runGapEngine(userId: string, opts?: RunGapEngineOptions): Promise<GapEngineResult> {
    // 1. Load user data in parallel
    const [profileRecord, policies, openGapInstances, activeRelationships] = await Promise.all([
        db.policyholderProfile.findUnique({
            where: { userId },
        }),
        db.policy.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                insurerName: true,
                premiumAmount: true,
                policyNumber: true,
                startDate: true,
                endDate: true,
                coverageSummary: true,
                acordData: true,
            },
        }),
        db.gapInstance.findMany({
            where: {
                OR: [
                    { policy: { ownerUserId: userId } },
                    { userId },
                ],
                status: { in: ["open", "detected", "acknowledged"] },
            },
            include: {
                definition: {
                    select: {
                        name: true,
                        slug: true,
                        description: true,
                    },
                },
                policy: {
                    select: {
                        lineOfBusiness: true,
                        insurerName: true,
                    },
                },
            },
        }),
        db.customerRelationship.count({
            where: { policyholderUserId: userId, status: "active" },
        }),
    ])
    const hasAgent = activeRelationships > 0

    // 2. Convert to engine types
    const profile = toProfileFields(profileRecord)
    const policyFields: PolicyFields[] = policies.map((p) => ({
        lineOfBusiness: p.lineOfBusiness,
        status: p.status,
    }))
    const activeLobs = [
        ...new Set(
            policies
                .filter((p) => p.status === "active")
                .map((p) => p.lineOfBusiness.toLowerCase())
        ),
    ]

    // 3. Detect profile-level gaps
    const profileGaps = detectProfileGaps(profile, policyFields)

    // 4. Calculate protection score
    const protectionScore = calculateProtectionScore(
        profile,
        activeLobs,
        profileGaps,
        openGapInstances.length
    )
    const scoreTier = getScoreTier(protectionScore.overallScore)

    // 4b. Detect portfolio-level gaps (expiring policies, duplicates,
    // low limits, unclear exclusions, missing advisor)
    const portfolioGaps = evaluatePortfolioRules(
        policies.map((p) => ({
            id: p.id,
            lineOfBusiness: p.lineOfBusiness,
            status: p.status,
            insurerName: p.insurerName,
            policyNumber: p.policyNumber,
            startDate: p.startDate,
            endDate: p.endDate,
            acordData: p.acordData,
        })),
        { hasAgent }
    )

    // 5. Generate recommendations from both profile gaps and policy gaps
    const profileRecs = profileGapsToRecommendations(userId, profileGaps)
    const policyRecs = policyGapsToRecommendations(userId, openGapInstances)

    // 5b. Match recommendations to insurance products from catalog.
    // Portfolio recs are deliberately excluded — suggesting a product on a
    // "duplicate coverage" or "expiring policy" card would read as a pitch.
    const profileTags = deriveProfileTags(profile)
    const matchedRecs = await matchProductsToRecommendations(
        prioritizeRecommendations([...profileRecs, ...policyRecs]),
        profileTags
    )
    const portfolioRecs: RecommendationInput[] = portfolioGaps.map((gap) => ({
        userId,
        lineOfBusiness: gap.lineOfBusiness,
        ruleId: gap.ruleId,
        gapInstanceId: null,
        title: gap.name,
        description: gap.reason,
        urgency: gap.severity,
        estimatedCostEur: null,
        personalReason: gap.reason,
    }))

    // 6. Sync recommendations to DB
    const syncStats = await syncRecommendations(userId, [...matchedRecs, ...portfolioRecs])

    // 6b. Smart-card content (evidence / next action / review target),
    // recomputed from live data every run so it never goes stale.
    const activePolicyCount = policies.filter((p) => p.status === "active").length
    const smartContent: Record<string, SmartCardContent> = {}
    for (const gap of portfolioGaps) {
        smartContent[gap.ruleId] = {
            evidence: gap.evidence,
            nextAction: gap.nextAction,
            reviewHref: gap.reviewHref,
        }
    }
    for (const gap of profileGaps) {
        smartContent[gap.ruleId] = buildProfileGapEvidence(
            gap.ruleId,
            gap.lineOfBusiness,
            activePolicyCount
        )
    }

    // 7. Cache protection score
    await cacheProtectionScore(userId, protectionScore)

    // 8. Fetch final recommendation list (includes existing + newly created)
    const recommendations = await getActiveRecommendations(userId)

    // 9. Calculate profile completeness
    const profileCompleteness = calculateProfileCompleteness(profile)

    // 10. AI risk insights (optional, non-blocking)
    let aiInsights: AIRiskProfileAnalysisResponse | null = null
    if (opts?.includeAiInsights) {
        aiInsights = await runAiRiskAnalysis(profile, policies, userId)
    }

    logger("info", `Gap engine completed for user ${userId}`, {
        score: protectionScore.overallScore,
        profileGaps: profileGaps.length,
        policyGaps: openGapInstances.length,
        recommendations: recommendations.length,
        syncStats,
        hasAiInsights: aiInsights !== null,
    })

    return {
        protectionScore,
        scoreTier,
        profileGaps,
        recommendations,
        profileCompleteness,
        syncStats,
        aiInsights,
        smartContent,
        hasAgent,
    }
}

// ── Cached score access ──────────────────────────────────────────────

/**
 * Get the cached protection score, or compute if stale/missing.
 * Use this for lightweight reads (e.g., dashboard cards, agent client lists).
 */
export async function getProtectionScore(
    userId: string,
    maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<CachedProtectionScore | null> {
    const cached = await db.protectionScore.findUnique({
        where: { userId },
    })

    if (cached) {
        const age = Date.now() - cached.computedAt.getTime()
        if (age < maxAgeMs) {
            return {
                overallScore: cached.overallScore,
                categoryScores: cached.categoryScores as Record<string, any>,
                gapCount: cached.gapCount,
                expectedLines: cached.expectedLines as string[],
                actualLines: cached.actualLines as string[],
                computedAt: cached.computedAt,
            }
        }
    }

    // Stale or missing — recompute
    const result = await runGapEngine(userId)
    return {
        overallScore: result.protectionScore.overallScore,
        categoryScores: result.protectionScore.categoryScores,
        gapCount: result.protectionScore.gapCount,
        expectedLines: result.protectionScore.expectedLines,
        actualLines: result.protectionScore.actualLines,
        computedAt: new Date(),
    }
}

/**
 * Force refresh the protection score (e.g., after profile update or policy change).
 */
export async function refreshProtectionScore(
    userId: string
): Promise<GapEngineResult> {
    return runGapEngine(userId)
}

// ── AI risk analysis ─────────────────────────────────────────────────

async function runAiRiskAnalysis(
    profile: ProfileFields,
    policies: Array<{
        id: string; lineOfBusiness: string; status: string; insurerName: string;
        premiumAmount: any; policyNumber: string; startDate: Date; endDate: Date;
        coverageSummary: string | null;
    }>,
    userId: string
): Promise<AIRiskProfileAnalysisResponse | null> {
    try {
        const { getAIService } = await import("@/lib/services/ai/ai-service.factory")
        const aiService = getAIService()
        if (!aiService.isAvailable()) return null

        const policyMetadata = policies.map((p) => ({
            insurerName: p.insurerName || "Unknown",
            policyNumber: p.policyNumber,
            lineOfBusiness: p.lineOfBusiness,
            startDate: p.startDate,
            endDate: p.endDate,
            premiumAmount: p.premiumAmount ? Number(p.premiumAmount) : null,
            coverageSummary: p.coverageSummary,
        }))

        return await aiService.analyzeRiskProfile(
            {
                maritalStatus: profile.maritalStatus,
                dependentsCount: profile.dependentsCount,
                employmentStatus: profile.employmentStatus,
                ownsHome: profile.ownsHome,
                mortgageAmount: profile.mortgageAmount ? Number(profile.mortgageAmount) : null,
                hasPets: profile.hasPets,
                vehiclesCount: profile.vehiclesCount,
                annualIncome: profile.annualIncome ? Number(profile.annualIncome) : null,
                occupation: profile.occupation,
                travelsFrequently: profile.travelsFrequently,
                hasLoans: profile.hasLoans,
                loanAmount: profile.loanAmount ? Number(profile.loanAmount) : null,
                smokingStatus: profile.smokingStatus,
                dateOfBirth: profile.dateOfBirth?.toISOString().split("T")[0] ?? null,
                lifeEvents: profile.lifeEvents as Array<{ type: string; date: string }> | null,
                gender: profile.gender,
                heightCm: profile.heightCm,
                weightKg: profile.weightKg,
                chronicConditions: profile.chronicConditions,
                familyMedicalHistory: profile.familyMedicalHistory,
                drivingRecord: profile.drivingRecord,
                activityLevel: profile.activityLevel,
            },
            policyMetadata,
            { userId }
        )
    } catch (err) {
        logger("warn", "AI risk profile analysis failed (non-blocking)", {
            userId,
            error: err instanceof Error ? err.message : String(err),
        })
        return null
    }
}

// ── Internal helpers ─────────────────────────────────────────────────

async function cacheProtectionScore(
    userId: string,
    score: ProtectionScoreResult
): Promise<void> {
    const categoryScoresJson: Record<string, number> = {}
    for (const [key, val] of Object.entries(score.categoryScores)) {
        categoryScoresJson[key] = val.score
    }

    await db.protectionScore.upsert({
        where: { userId },
        update: {
            overallScore: score.overallScore,
            categoryScores: categoryScoresJson,
            gapCount: score.gapCount,
            expectedLines: score.expectedLines,
            actualLines: score.actualLines,
            computedAt: new Date(),
        },
        create: {
            userId,
            overallScore: score.overallScore,
            categoryScores: categoryScoresJson,
            gapCount: score.gapCount,
            expectedLines: score.expectedLines,
            actualLines: score.actualLines,
            computedAt: new Date(),
        },
    })
}

/**
 * Calculate how complete the user's risk profile is (0-100).
 *
 * Split into two weighted sections to avoid regressing existing users when
 * new health fields are added:
 *
 *   Core (65%): original fields — identity, financial, lifestyle booleans.
 *               A user who filled these before the health section shipped keeps
 *               ~65, sees the wizard, and is nudged to fill the health section.
 *
 *   Health (35%): new health & lifestyle fields. drivingRecord is only included
 *                 in the denominator when the user has vehicles — non-drivers
 *                 aren't penalised for not answering it.
 *
 * Boolean fields (ownsHome, hasPets, etc.) default to `false` in the DB and are
 * only counted as filled once the profile has been touched (any nullable set, or
 * any boolean toggled to true).
 */
function calculateProfileCompleteness(profile: ProfileFields): number {
    // ── Core section (weight: 65%) ────────────────────────────────────
    const coreNullable = [
        profile.maritalStatus != null,
        profile.employmentStatus != null,
        profile.dateOfBirth != null,
        profile.annualIncome != null,
        profile.occupation != null,
        profile.smokingStatus != null,
    ]

    const hasAnyNullableFilled = coreNullable.some(Boolean)
    const hasAnyBooleanToggled =
        profile.ownsHome ||
        profile.hasPets ||
        profile.travelsFrequently ||
        profile.hasLoans ||
        profile.vehiclesCount > 0 ||
        profile.dependentsCount > 0

    const profileTouched = hasAnyNullableFilled || hasAnyBooleanToggled

    const coreBooleans = profileTouched
        ? [true, true, true, true, true] // ownsHome, hasPets, vehiclesCount, travelsFrequently, hasLoans
        : [false, false, false, false, false]

    const coreChecks = [...coreNullable, ...coreBooleans]
    const coreRatio = coreChecks.filter(Boolean).length / coreChecks.length

    // ── Health section (weight: 35%) ──────────────────────────────────
    // drivingRecord is only expected for users who own vehicles.
    const healthChecks = [
        profile.gender != null,
        profile.heightCm != null,
        profile.weightKg != null,
        profile.chronicConditions != null,    // null = never answered; [] = "none"
        profile.familyMedicalHistory != null, // same semantics
        profile.activityLevel != null,
        ...(profile.vehiclesCount > 0 ? [profile.drivingRecord != null] : []),
    ]

    const healthRatio = healthChecks.length > 0
        ? healthChecks.filter(Boolean).length / healthChecks.length
        : 1 // no health checks applicable → full credit

    return Math.round((coreRatio * 0.65 + healthRatio * 0.35) * 100)
}

// ── Re-exports ───────────────────────────────────────────────────────

export { detectProfileGaps, getExpectedLines, toProfileFields } from "./profile-gap-rules"
export { calculateProtectionScore, getScoreTier, SCORE_CATEGORIES } from "./protection-score"
export {
    getActiveRecommendations,
    dismissRecommendation,
    actionRecommendation,
    getEstimatedPremium,
    matchProductsToRecommendations,
    deriveProfileTags,
} from "./recommendation-generator"
export { generatePlaybook, generateAgentPlaybooks } from "./agent-playbook"
export { evaluatePortfolioRules, buildProfileGapEvidence } from "./portfolio-rules"
export type { PortfolioGap, PortfolioPolicyFacts, SmartCardContent } from "./portfolio-rules"
export type { ProfileGap, ProfileFields, GapSeverity } from "./profile-gap-rules"
export type { ProtectionScoreResult, CategoryScore } from "./protection-score"
export type { RecommendationOutput, MatchedProduct } from "./recommendation-generator"
export type { AgentPlaybook, PlaybookStep } from "./agent-playbook"
