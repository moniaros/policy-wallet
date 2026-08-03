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
import { normalizeBranch } from "@/lib/insurance/taxonomy"

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

/**
 * A policy-level gap, reduced to the one field the score needs: which line of
 * business it belongs to. Callers pass `policy.lineOfBusiness` when the gap sits
 * on a policy, else the gap definition's own line.
 */
export interface PolicyGapRef {
    lineOfBusiness: string | null | undefined
}

/** Points deducted per gap, and the ceiling for any single category. */
const GAP_PENALTY_PER_GAP = 5
const GAP_PENALTY_CAP = 20

/**
 * Count policy gaps per score category.
 *
 * A gap belongs to the category whose `coveredByLobs` contains the gap's line —
 * compared at PARENT-branch level, matching how `activeLobs` are normalized, so
 * a motorbike gap lands on Property & Motor rather than nowhere.
 *
 * Gaps whose line matches no category are counted in the total but deducted from
 * nothing: with no category to attribute them to, the only alternatives are to
 * invent one or to charge every category — and charging every category is the
 * bug this function exists to fix.
 */
function countGapsByCategory(gaps: PolicyGapRef[]): Map<string, number> {
    const counts = new Map<string, number>()

    for (const gap of gaps) {
        const raw = String(gap.lineOfBusiness || "").trim()
        if (!raw) continue
        const branch = normalizeBranch(raw)
        const parent = (branch.parentId ?? branch.id).toLowerCase()

        for (const cat of SCORE_CATEGORIES) {
            if (cat.coveredByLobs.includes(parent)) {
                counts.set(cat.key, (counts.get(cat.key) ?? 0) + 1)
            }
        }
    }

    return counts
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
 * @param policyGaps  Open policy-level gap instances. Prefer `PolicyGapRef[]` so
 *   each gap is charged to its own category. A bare `number` is still accepted
 *   for backwards compatibility, but carries no line-of-business information, so
 *   it can only be charged to every applicable category — which is exactly the
 *   defect this parameter shape replaces. Pass refs from any new call site.
 */
export function calculateProtectionScore(
    profile: ProfileFields,
    activeLobs: string[],
    profileGaps: ProfileGap[],
    policyGaps: number | PolicyGapRef[] = 0
): ProtectionScoreResult {
    // A single open gap on ONE policy used to deduct from EVERY applicable
    // category: the penalty was computed from the global count and subtracted
    // inside the per-category loop. A motor gap dragged down Health, Life and
    // Liability, so the category breakdown — the part an advisor reads out to a
    // client — pointed at lines that had nothing wrong with them.
    const attributable = Array.isArray(policyGaps)
    const policyGapCount = attributable ? policyGaps.length : policyGaps
    const gapsByCategory = attributable
        ? countGapsByCategory(policyGaps)
        : null
    // Child branches count as their parent. The taxonomy models motorbike and
    // truck under motor, renters under home, personal accident under life — and
    // SCORE_CATEGORIES lists only the parents. So a correctly-insured motorbike,
    // truck or rented home contributed NOTHING to the Property category: the
    // owner's real cover scored as if it did not exist, and the category read 0.
    const normalizedLobs = new Set(
        activeLobs.map((l) => {
            const branch = normalizeBranch(l)
            return (branch.parentId ?? branch.id).toLowerCase()
        })
    )
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

            // Deduct points for policy-level gaps in THIS category's lines.
            // Without attribution (legacy numeric input) fall back to the global
            // count, which is the pre-existing behaviour.
            const categoryGapCount = gapsByCategory
                ? gapsByCategory.get(cat.key) ?? 0
                : policyGapCount
            const policyGapPenalty = Math.min(
                GAP_PENALTY_CAP,
                categoryGapCount * GAP_PENALTY_PER_GAP
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
