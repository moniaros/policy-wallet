import type { Customer } from "@/components/agent/types"

export interface HealthScoreInput {
    policyCount: number
    openGapsCount: number
    lastInteractionDate: string | null
    profileComplete: boolean
    activationStatus: string
}

/**
 * Computes a 0-100 client health score.
 *
 * Weights:
 * - Coverage completeness (40%): policies vs gaps ratio
 * - Profile completeness (20%): has activated, has policies
 * - Interaction recency (20%): days since last interaction
 * - Gap count inverse (20%): fewer open gaps = higher score
 */
export function computeClientHealthScore(input: HealthScoreInput): number {
    const { policyCount, openGapsCount, lastInteractionDate, profileComplete, activationStatus } = input

    // Coverage completeness (40 points max)
    let coverageScore = 0
    if (policyCount > 0) {
        const gapRatio = openGapsCount / Math.max(policyCount, 1)
        coverageScore = Math.max(0, 40 * (1 - gapRatio * 0.5))
    }

    // Profile completeness (20 points max)
    let profileScore = 0
    if (activationStatus === "activated" || activationStatus === "active") profileScore += 10
    if (profileComplete) profileScore += 5
    if (policyCount > 0) profileScore += 5

    // Interaction recency (20 points max)
    let recencyScore = 0
    if (lastInteractionDate) {
        const daysSince = Math.floor(
            (Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSince <= 7) recencyScore = 20
        else if (daysSince <= 30) recencyScore = 15
        else if (daysSince <= 90) recencyScore = 10
        else if (daysSince <= 180) recencyScore = 5
    }

    // Gap count inverse (20 points max)
    let gapScore = 20
    if (openGapsCount > 0) {
        gapScore = Math.max(0, 20 - openGapsCount * 4)
    }

    return Math.round(Math.min(100, coverageScore + profileScore + recencyScore + gapScore))
}

export function computeHealthScoreFromCustomer(customer: Customer): number {
    return computeClientHealthScore({
        policyCount: customer.policyCount,
        openGapsCount: customer.openGapsCount,
        lastInteractionDate: customer.lastInteractionDate,
        profileComplete: customer.activationStatus === "activated" && customer.policyCount > 0,
        activationStatus: customer.activationStatus,
    })
}

export function getHealthScoreColor(score: number): string {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400"
    if (score >= 40) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
}

export function getHealthScoreDotColor(score: number): string {
    if (score >= 70) return "bg-emerald-500"
    if (score >= 40) return "bg-amber-500"
    return "bg-red-500"
}

export function getHealthScoreLabel(score: number, locale: "en" | "el" = "el"): string {
    if (score >= 70) return locale === "el" ? "Καλή" : "Good"
    if (score >= 40) return locale === "el" ? "Μέτρια" : "Fair"
    return locale === "el" ? "Χρειάζεται προσοχή" : "Needs Attention"
}
