/**
 * Unified Protection Score Calculator
 *
 * Computes a single 0-100 protection score across 6 insurance categories.
 * Replaces the ad-hoc health score calculations scattered across the codebase.
 *
 * Design:
 * - Categories that don't apply to the user are excluded from the denominator
 * - Each category scores 0-100 individually (0 = missing, 50 = partial, 100 = fully covered)
 * - Final score = weighted average of applicable categories
 * - Category applicability is determined by the user's risk profile
 */

import type { ProfileFields, ProfileGap } from "./profile-gap-rules"
import type { GapSeverity } from "./profile-gap-rules"

// ── Category definitions ─────────────────────────────────────────────

export interface ScoreCategory {
    key: string
    label: { en: string; el: string }
    weight: number
    essential: boolean
    /** Lines of business that satisfy this category */
    coveredByLobs: string[]
    /** When does this category apply to the user? */
    appliesWhen: (profile: ProfileFields) => boolean
}

export const SCORE_CATEGORIES: ScoreCategory[] = [
    {
        key: "health",
        label: { en: "Health", el: "Υγεία" },
        weight: 25,
        essential: true,
        coveredByLobs: ["health"],
        appliesWhen: () => true, // everyone
    },
    {
        key: "life",
        label: { en: "Life & Income", el: "Ζωή & Εισόδημα" },
        weight: 25,
        essential: true,
        coveredByLobs: ["life", "income_protection"],
        appliesWhen: (p) =>
            p.dependentsCount > 0 ||
            (p.mortgageAmount != null && Number(p.mortgageAmount) > 0) ||
            (p.hasLoans && p.loanAmount != null && Number(p.loanAmount) > 0),
    },
    {
        key: "property",
        label: { en: "Property & Motor", el: "Ακίνητα & Αυτοκίνητο" },
        weight: 20,
        essential: true,
        coveredByLobs: ["home", "motor"],
        appliesWhen: (p) => p.ownsHome || p.vehiclesCount > 0,
    },
    {
        key: "income",
        label: { en: "Income Protection", el: "Προστασία Εισοδήματος" },
        weight: 15,
        essential: false,
        coveredByLobs: ["life", "income_protection", "disability"],
        appliesWhen: (p) =>
            p.employmentStatus === "employed" ||
            p.employmentStatus === "self_employed",
    },
    {
        key: "liability",
        label: { en: "Liability & Legal", el: "Ευθύνη & Νομική" },
        weight: 10,
        essential: false,
        coveredByLobs: ["liability", "legal_expenses"],
        appliesWhen: (p) =>
            p.employmentStatus === "self_employed" || p.ownsHome,
    },
    {
        key: "other",
        label: { en: "Lifestyle", el: "Τρόπος Ζωής" },
        weight: 5,
        essential: false,
        coveredByLobs: ["travel", "pet", "cyber"],
        appliesWhen: (p) => p.travelsFrequently || p.hasPets,
    },
]

// ── Types ────────────────────────────────────────────────────────────

export interface ProtectionScoreResult {
    overallScore: number
    categoryScores: Record<string, CategoryScore>
    gapCount: number
    expectedLines: string[]
    actualLines: string[]
    applicableCategories: string[]
}

export interface CategoryScore {
    key: string
    label: { en: string; el: string }
    score: number // 0-100
    weight: number
    applicable: boolean
    essential: boolean
    coveredLobs: string[]
    missingLobs: string[]
}

/**
 * How much a line of business weighs in the protection model, 0 when unknown.
 *
 * The category weights (health 25, life 25, property 20, income 15, liability
 * 10, other 5) are the product's one considered statement about what matters
 * most to a household. Exported so recommendations can be ranked by that
 * judgement instead of by what the cover costs to buy.
 */
export function lobProtectionWeight(lob: string): number {
    const key = String(lob || "").toLowerCase()
    let best = 0
    for (const cat of SCORE_CATEGORIES) {
        if (cat.coveredByLobs.includes(key)) best = Math.max(best, cat.weight)
    }
    return best
}

/**
 * The lightweight estimate used when no protection score has been cached yet.
 *
 * **This is not the same measure as `calculateProtectionScore`.** The real score
 * is a weighted model of which insurance CATEGORIES a profile implies and how
 * much of each the person actually holds; this is a flat deduction from 100 per
 * detected gap. For the same portfolio the two can differ by a wide margin — a
 * single motor policy with no gaps scores 100 here and can score far lower under
 * the category model, because holding one line of cover is not the same as being
 * protected.
 *
 * So anything rendering this owes the reader the word "provisional". The
 * dashboard already does (StatTiles `isProvisional`); this exists so the other
 * four callers stop each carrying their own copy of the arithmetic and their own
 * decision about whether to say so.
 *
 * Returns **null** with no policies: zero is a verdict on a portfolio, and there
 * is no portfolio to pass one on.
 */
export function provisionalProtectionScore(
    policyCount: number,
    gapSeverities: string[]
): number | null {
    if (policyCount === 0) return null
    const weight: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3 }
    const penalty = gapSeverities.reduce((sum, sev) => sum + (weight[sev] ?? 0), 0)
    return Math.max(0, Math.min(100, 100 - penalty))
}

// ── Calculator ───────────────────────────────────────────────────────

/**
 * Calculate unified protection score for a user.
 *
 * @param profile  User's risk profile fields
 * @param activeLobs  Lines of business the user currently has active policies for
 * @param profileGaps  Detected profile-level gaps (from profile-gap-rules.ts)
 * @param policyGapCount  Number of open policy-level gap instances (from GapInstance table)
 */
export function calculateProtectionScore(
    profile: ProfileFields,
    activeLobs: string[],
    profileGaps: ProfileGap[],
    policyGapCount: number = 0
): ProtectionScoreResult {
    const normalizedLobs = new Set(activeLobs.map((l) => l.toLowerCase()))
    const gapLobs = new Set(profileGaps.map((g) => g.lineOfBusiness.toLowerCase()))

    const categoryResults: Record<string, CategoryScore> = {}
    const applicableCategories: string[] = []
    let weightedSum = 0
    let totalWeight = 0

    for (const cat of SCORE_CATEGORIES) {
        // Which LOBs from this category does the user have?
        const coveredLobs = cat.coveredByLobs.filter((lob) =>
            normalizedLobs.has(lob)
        )
        const missingLobs = cat.coveredByLobs.filter(
            (lob) => !normalizedLobs.has(lob) && gapLobs.has(lob)
        )

        // A category is applicable if the profile implies it OR the user already
        // holds a policy in it. Never ignore coverage the user actually has: a
        // motor policy makes Property relevant even when the profile's
        // vehiclesCount is 0. Without this, a real policy contributed nothing and
        // the overall score sat at 0 / "Critical" despite active coverage.
        const applicable = cat.appliesWhen(profile) || coveredLobs.length > 0

        let categoryScore = 100

        if (applicable) {
            applicableCategories.push(cat.key)

            if (coveredLobs.length === 0) {
                // No coverage at all in this category
                categoryScore = 0
            } else {
                // Partial: some LOBs covered, some missing
                const relevantLobs = cat.coveredByLobs.filter(
                    (lob) => normalizedLobs.has(lob) || gapLobs.has(lob)
                )
                if (relevantLobs.length > 0) {
                    categoryScore = Math.round(
                        (coveredLobs.length / relevantLobs.length) * 100
                    )
                }
            }

            // Deduct points for policy-level gaps in covered lines
            const policyGapPenalty = Math.min(
                20,
                policyGapCount * 5
            )
            categoryScore = Math.max(0, categoryScore - policyGapPenalty)

            weightedSum += categoryScore * cat.weight
            totalWeight += cat.weight
        }

        categoryResults[cat.key] = {
            key: cat.key,
            label: cat.label,
            score: applicable ? categoryScore : -1, // -1 means N/A
            weight: cat.weight,
            applicable,
            essential: cat.essential,
            coveredLobs,
            missingLobs,
        }
    }

    const overallScore =
        totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0

    // Collect expected and actual lines
    const expectedLines: string[] = []
    const actualLines = [...normalizedLobs]

    for (const cat of SCORE_CATEGORIES) {
        if (cat.appliesWhen(profile)) {
            for (const lob of cat.coveredByLobs) {
                if (!expectedLines.includes(lob)) {
                    expectedLines.push(lob)
                }
            }
        }
    }

    return {
        overallScore,
        categoryScores: categoryResults,
        gapCount: profileGaps.length + policyGapCount,
        expectedLines,
        actualLines,
        applicableCategories,
    }
}

/**
 * Get the color tier for a protection score.
 */
export function getScoreTier(score: number): {
    tier: "excellent" | "good" | "fair" | "poor" | "critical"
    color: string
    label: { en: string; el: string }
} {
    if (score >= 85) {
        return {
            tier: "excellent",
            color: "green",
            label: { en: "Excellent", el: "Εξαιρετική" },
        }
    }
    if (score >= 70) {
        return {
            tier: "good",
            color: "green",
            label: { en: "Good", el: "Καλή" },
        }
    }
    if (score >= 50) {
        return {
            tier: "fair",
            color: "amber",
            label: { en: "Fair", el: "Μέτρια" },
        }
    }
    if (score >= 30) {
        return {
            tier: "poor",
            color: "orange",
            label: { en: "Needs Attention", el: "Χρειάζεται Προσοχή" },
        }
    }
    return {
        tier: "critical",
        color: "red",
        label: { en: "Critical", el: "Κρίσιμη" },
    }
}
