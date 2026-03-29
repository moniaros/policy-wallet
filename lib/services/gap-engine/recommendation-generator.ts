/**
 * Recommendation Generator
 *
 * Converts detected profile gaps and policy gaps into prioritized,
 * personalized recommendation instances. Handles deduplication,
 * persistence, and lifecycle management.
 */

import { db } from "@/lib/db"
import type { ProfileGap, GapSeverity } from "./profile-gap-rules"

// ── Types ────────────────────────────────────────────────────────────

export interface RecommendationInput {
    userId: string
    lineOfBusiness: string
    ruleId: string | null
    gapInstanceId: string | null
    title: { en: string; el: string }
    description: { en: string; el: string }
    urgency: GapSeverity
    estimatedCostEur: number | null
    personalReason: { en: string; el: string }
    matchedProductId?: string | null
}

export interface MatchedProduct {
    id: string
    name: { en: string; el: string }
    premiumRangeLow: number | null
    premiumRangeHigh: number | null
    keyBenefits: Array<{ en: string; el: string }> | null
    greekMarketPopularity: number
}

export interface RecommendationOutput {
    id: string
    lineOfBusiness: string
    ruleId: string | null
    title: { en: string; el: string }
    description: { en: string; el: string }
    urgency: GapSeverity
    estimatedCostEur: number | null
    personalReason: { en: string; el: string }
    status: string
    createdAt: Date
    matchedProduct: MatchedProduct | null
}

// ── Greek market premium estimates ───────────────────────────────────

const ESTIMATED_ANNUAL_PREMIUMS: Record<string, number> = {
    motor: 400,
    home: 250,
    health: 800,
    life: 600,
    travel: 80,
    pet: 150,
    liability: 200,
    legal_expenses: 120,
    income_protection: 500,
    disability: 400,
    cyber: 100,
}

export function getEstimatedPremium(lob: string): number | null {
    return ESTIMATED_ANNUAL_PREMIUMS[lob.toLowerCase()] ?? null
}

// ── Conversion ───────────────────────────────────────────────────────

/**
 * Convert profile gaps into recommendation inputs.
 */
export function profileGapsToRecommendations(
    userId: string,
    gaps: ProfileGap[]
): RecommendationInput[] {
    return gaps.map((gap) => ({
        userId,
        lineOfBusiness: gap.lineOfBusiness,
        ruleId: gap.ruleId,
        gapInstanceId: null,
        title: gap.name,
        description: gap.reason,
        urgency: gap.severity,
        estimatedCostEur: getEstimatedPremium(gap.lineOfBusiness),
        personalReason: gap.reason,
    }))
}

/**
 * Convert policy-level gap instances into recommendation inputs.
 */
export function policyGapsToRecommendations(
    userId: string,
    gapInstances: Array<{
        id: string
        severity: string
        aiExplanation: string | null
        aiExplanationEl: string | null
        aiSuggestion: string | null
        aiSuggestionEl: string | null
        policy: {
            lineOfBusiness: string
            insurerName: string
        } | null
        definition: {
            name: string
            slug: string
            description: string | null
        }
    }>
): RecommendationInput[] {
    return gapInstances.map((gi) => ({
        userId,
        lineOfBusiness: gi.policy?.lineOfBusiness ?? "other",
        ruleId: `policy_gap:${gi.definition.slug}`,
        gapInstanceId: gi.id,
        title: {
            en: gi.definition.name,
            el: gi.definition.name, // fallback; AI may provide el version
        },
        description: {
            en: gi.aiExplanation || gi.definition.description || "",
            el: gi.aiExplanationEl || gi.definition.description || "",
        },
        urgency: (gi.severity as GapSeverity) || "medium",
        estimatedCostEur: getEstimatedPremium(
            gi.policy?.lineOfBusiness ?? "other"
        ),
        personalReason: {
            en: gi.aiSuggestion || `Review your ${gi.policy?.insurerName ?? ""} policy for this coverage gap.`,
            el: gi.aiSuggestionEl || `Ελέγξτε το ασφαλιστήριο ${gi.policy?.insurerName ?? ""} για αυτό το κενό κάλυψης.`,
        },
    }))
}

// ── Prioritization ───────────────────────────────────────────────────

const SEVERITY_ORDER: Record<GapSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

/**
 * Sort recommendations by urgency (severity), then by estimated financial impact.
 */
export function prioritizeRecommendations(
    recs: RecommendationInput[]
): RecommendationInput[] {
    return [...recs].sort((a, b) => {
        const sevDiff =
            (SEVERITY_ORDER[a.urgency] ?? 3) -
            (SEVERITY_ORDER[b.urgency] ?? 3)
        if (sevDiff !== 0) return sevDiff

        // Higher estimated cost = higher priority (bigger gap)
        return (b.estimatedCostEur ?? 0) - (a.estimatedCostEur ?? 0)
    })
}

// ── Product Matching ─────────────────────────────────────────────────

/**
 * Match recommendations to insurance products from the catalog.
 * Uses lineOfBusiness + idealProfileTags for best-fit matching.
 */
export async function matchProductsToRecommendations(
    recs: RecommendationInput[],
    profileTags: string[] = []
): Promise<RecommendationInput[]> {
    if (recs.length === 0) return recs

    const lobs = [...new Set(recs.map((r) => r.lineOfBusiness.toLowerCase()))]

    const products = await db.insuranceProduct.findMany({
        where: {
            lineOfBusiness: { in: lobs },
            isActive: true,
        },
        orderBy: [{ greekMarketPopularity: "desc" }, { sortOrder: "asc" }],
    })

    if (products.length === 0) return recs

    // Build a map: lob -> best product (prefer products whose idealProfileTags overlap with user tags)
    const productByLob = new Map<string, string>()
    for (const lob of lobs) {
        const lobProducts = products.filter(
            (p) => p.lineOfBusiness.toLowerCase() === lob
        )
        if (lobProducts.length === 0) continue

        // Score each product by tag overlap
        let best = lobProducts[0]
        let bestScore = 0
        for (const p of lobProducts) {
            const tags = p.idealProfileTags || []
            const overlap = tags.filter((t) => profileTags.includes(t)).length
            if (overlap > bestScore) {
                bestScore = overlap
                best = p
            }
        }
        productByLob.set(lob, best.id)
    }

    return recs.map((rec) => ({
        ...rec,
        matchedProductId:
            productByLob.get(rec.lineOfBusiness.toLowerCase()) ?? null,
    }))
}

/**
 * Derive profile tags from profile fields for product matching.
 */
export function deriveProfileTags(profile: {
    ownsHome?: boolean
    hasPets?: boolean
    vehiclesCount?: number
    dependentsCount?: number
    employmentStatus?: string | null
    travelsFrequently?: boolean
    hasLoans?: boolean
    mortgageAmount?: number | null
}): string[] {
    const tags: string[] = []
    if (profile.ownsHome) tags.push("homeowner")
    if (profile.hasPets) tags.push("has_pets")
    if ((profile.vehiclesCount ?? 0) > 0) tags.push("has_vehicles")
    if ((profile.dependentsCount ?? 0) > 0) tags.push("has_dependents")
    if (profile.employmentStatus === "self_employed") tags.push("self_employed")
    if (profile.travelsFrequently) tags.push("travels_frequently")
    if (profile.hasLoans) tags.push("has_loans")
    if (profile.mortgageAmount && Number(profile.mortgageAmount) > 0) tags.push("has_mortgage")
    return tags
}

// ── Persistence ──────────────────────────────────────────────────────

/**
 * Sync recommendations to the database.
 * - Creates new recommendations for newly detected gaps
 * - Does NOT duplicate existing active recommendations for the same rule
 * - Marks stale recommendations as dismissed (gap no longer applies)
 */
export async function syncRecommendations(
    userId: string,
    newRecs: RecommendationInput[]
): Promise<{ created: number; dismissed: number }> {
    // Fetch existing active recommendations for this user
    const existing = await db.recommendationInstance.findMany({
        where: {
            userId,
            status: "active",
        },
        select: {
            id: true,
            ruleId: true,
            lineOfBusiness: true,
        },
    })

    const existingRuleIds = new Set(existing.map((e) => e.ruleId).filter(Boolean))
    const newRuleIds = new Set(newRecs.map((r) => r.ruleId).filter(Boolean))

    let created = 0
    let dismissed = 0

    // Create new recommendations that don't already exist
    for (const rec of newRecs) {
        if (rec.ruleId && existingRuleIds.has(rec.ruleId)) {
            continue // already exists
        }

        await db.recommendationInstance.create({
            data: {
                userId: rec.userId,
                gapInstanceId: rec.gapInstanceId,
                lineOfBusiness: rec.lineOfBusiness,
                ruleId: rec.ruleId,
                title: rec.title as any,
                description: rec.description as any,
                urgency: rec.urgency,
                estimatedCostEur: rec.estimatedCostEur,
                personalReason: rec.personalReason as any,
                status: "active",
                productId: rec.matchedProductId ?? null,
            },
        })
        created++
    }

    // Dismiss stale recommendations (gap no longer applies)
    for (const ex of existing) {
        if (ex.ruleId && !newRuleIds.has(ex.ruleId)) {
            await db.recommendationInstance.update({
                where: { id: ex.id },
                data: {
                    status: "dismissed",
                    dismissReason: "auto:gap_resolved",
                },
            })
            dismissed++
        }
    }

    return { created, dismissed }
}

/**
 * Dismiss a specific recommendation.
 */
export async function dismissRecommendation(
    recommendationId: string,
    userId: string,
    reason: string
): Promise<{ count: number }> {
    const result = await db.recommendationInstance.updateMany({
        where: {
            id: recommendationId,
            userId,
            status: "active",
        },
        data: {
            status: "dismissed",
            dismissReason: reason,
        },
    })
    return { count: result.count }
}

/**
 * Mark a recommendation as actioned (user took action).
 */
export async function actionRecommendation(
    recommendationId: string,
    userId: string
): Promise<{ count: number }> {
    const result = await db.recommendationInstance.updateMany({
        where: {
            id: recommendationId,
            userId,
            status: "active",
        },
        data: {
            status: "actioned",
            actionedAt: new Date(),
        },
    })
    return { count: result.count }
}

/**
 * Get active recommendations for a user, sorted by priority.
 */
export async function getActiveRecommendations(
    userId: string
): Promise<RecommendationOutput[]> {
    const recs = await db.recommendationInstance.findMany({
        where: {
            userId,
            status: "active",
        },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    premiumRangeLow: true,
                    premiumRangeHigh: true,
                    keyBenefits: true,
                    greekMarketPopularity: true,
                },
            },
        },
        orderBy: [{ createdAt: "desc" }],
    })

    // Sort by urgency then cost
    const sorted = recs.sort((a, b) => {
        const sevDiff =
            (SEVERITY_ORDER[(a.urgency as GapSeverity)] ?? 3) -
            (SEVERITY_ORDER[(b.urgency as GapSeverity)] ?? 3)
        if (sevDiff !== 0) return sevDiff
        return Number(b.estimatedCostEur ?? 0) - Number(a.estimatedCostEur ?? 0)
    })

    return sorted.map((r) => ({
        id: r.id,
        lineOfBusiness: r.lineOfBusiness,
        ruleId: r.ruleId,
        title: r.title as { en: string; el: string },
        description: r.description as { en: string; el: string },
        urgency: r.urgency as GapSeverity,
        estimatedCostEur: r.estimatedCostEur ? Number(r.estimatedCostEur) : null,
        personalReason: r.personalReason as { en: string; el: string },
        status: r.status,
        createdAt: r.createdAt,
        matchedProduct: r.product
            ? {
                  id: r.product.id,
                  name: r.product.name as { en: string; el: string },
                  premiumRangeLow: r.product.premiumRangeLow ? Number(r.product.premiumRangeLow) : null,
                  premiumRangeHigh: r.product.premiumRangeHigh ? Number(r.product.premiumRangeHigh) : null,
                  keyBenefits: r.product.keyBenefits as Array<{ en: string; el: string }> | null,
                  greekMarketPopularity: r.product.greekMarketPopularity,
              }
            : null,
    }))
}
