/**
 * Multi-Policy Portfolio Gap View
 *
 * Cross-policy gap analysis using cached ACORD data and stored gap instances.
 * Produces a portfolio-level risk summary without any additional AI calls.
 * Available to Plus+ tier users.
 */

import { OPEN_GAP_STATUSES } from "@/lib/wallet/gap-status"
import { db } from "@/lib/db"
import type { LocalizedText } from "../ai/ai-service.interface"

// ── Types ─────────────────────────────────────────────────────────────

export interface PortfolioGapSummary {
    userId: string
    totalPolicies: number
    analyzedPolicies: number
    /** Policies grouped by line of business */
    byLineOfBusiness: LineOfBusinessSummary[]
    /** All detected gaps across the portfolio, grouped by severity */
    gapsBySeverity: Record<"critical" | "high" | "medium" | "low", PortfolioGapEntry[]>
    /** Total estimated annual savings across all policies */
    totalEstimatedSavingsEur: number
    /** Gaps common to multiple policies (overlap detection) */
    crossPolicyGaps: CrossPolicyGap[]
    /** Portfolio risk score (0-100, higher = more risk) */
    riskScore: number
}

export interface LineOfBusinessSummary {
    lineOfBusiness: string
    policyCount: number
    totalPremium: number
    gapCount: number
}

export interface PortfolioGapEntry {
    slug: string
    policyId: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    severity: string
    explanation: LocalizedText | null
    suggestion: LocalizedText | null
}

export interface CrossPolicyGap {
    slug: string
    severity: string
    affectedPolicies: Array<{ policyId: string; policyNumber: string }>
}

// ── Core function ─────────────────────────────────────────────────────

export async function getPortfolioGapSummary(
    userId: string
): Promise<PortfolioGapSummary> {
    // Fetch all user policies with their latest analysis and gap instances
    const policies = await db.policy.findMany({
        where: { ownerUserId: userId },
        include: {
            gapInstances: {
                // The LIVE set, not 'open' alone; superseded rows are history (A-15).
                where: { status: { in: [...OPEN_GAP_STATUSES] }, supersededAt: null },
                include: {
                    definition: {
                        select: { slug: true },
                    },
                },
            },
            analysisRuns: {
                where: { status: { in: ["completed", "completed_with_warnings"] } },
                orderBy: { finishedAt: "desc" },
                take: 1,
                select: {
                    resultJson: true,
                },
            },
        },
    })

    const analyzedPolicies = policies.filter((p) => p.lastAnalyzedAt != null)

    // Group by line of business
    const lobMap = new Map<string, LineOfBusinessSummary>()
    for (const p of policies) {
        const lob = p.lineOfBusiness
        const existing = lobMap.get(lob) ?? {
            lineOfBusiness: lob,
            policyCount: 0,
            totalPremium: 0,
            gapCount: 0,
        }
        existing.policyCount += 1
        existing.totalPremium += p.premiumAmount ? Number(p.premiumAmount) : 0
        existing.gapCount += p.gapInstances.length

        lobMap.set(lob, existing)
    }

    // Collect all gaps grouped by severity
    const gapsBySeverity: PortfolioGapSummary["gapsBySeverity"] = {
        critical: [],
        high: [],
        medium: [],
        low: [],
    }

    const gapSlugCounts = new Map<string, { slug: string; severity: string; policies: Array<{ policyId: string; policyNumber: string }> }>()

    for (const p of policies) {
        for (const gap of p.gapInstances) {
            const slug = gap.definition.slug
            const severity = (gap.severity?.toLowerCase() ?? "medium") as keyof typeof gapsBySeverity
            const bucket = gapsBySeverity[severity] ?? gapsBySeverity.medium

            bucket.push({
                slug,
                policyId: p.id,
                policyNumber: p.policyNumber,
                insurerName: p.insurerName,
                lineOfBusiness: p.lineOfBusiness,
                severity: gap.severity ?? "medium",
                explanation: parseLocalizedJson(gap.aiExplanation),
                suggestion: parseLocalizedJson(gap.aiSuggestion),
            })

            // Track cross-policy gap occurrences
            const existing = gapSlugCounts.get(slug)
            if (existing) {
                existing.policies.push({ policyId: p.id, policyNumber: p.policyNumber })
            } else {
                gapSlugCounts.set(slug, {
                    slug,
                    severity: gap.severity ?? "medium",
                    policies: [{ policyId: p.id, policyNumber: p.policyNumber }],
                })
            }
        }
    }

    // Gaps appearing in 2+ policies
    const crossPolicyGaps = Array.from(gapSlugCounts.values())
        .filter((g) => g.policies.length >= 2)
        .map(({ slug, severity, policies }) => ({
            slug,
            severity,
            affectedPolicies: policies,
        }))

    // Calculate total savings from latest analysis results
    let totalEstimatedSavingsEur = 0
    for (const p of policies) {
        const resultJson = p.analysisRuns[0]?.resultJson as Record<string, any> | undefined
        const savings = resultJson?.savingsOpportunities as any[] | undefined
        if (savings) {
            for (const s of savings) {
                if (s.estimatedAnnualSavingsEur) {
                    totalEstimatedSavingsEur += s.estimatedAnnualSavingsEur
                }
            }
        }
    }

    // Risk score: weighted by gap severity
    const totalGaps =
        gapsBySeverity.critical.length * 4 +
        gapsBySeverity.high.length * 3 +
        gapsBySeverity.medium.length * 2 +
        gapsBySeverity.low.length * 1

    const maxPossibleRisk = policies.length * 12 // Assume max 3 gaps per policy at critical severity
    const riskScore = maxPossibleRisk > 0
        ? Math.min(100, Math.round((totalGaps / maxPossibleRisk) * 100))
        : 0

    return {
        userId,
        totalPolicies: policies.length,
        analyzedPolicies: analyzedPolicies.length,
        byLineOfBusiness: Array.from(lobMap.values()),
        gapsBySeverity,
        totalEstimatedSavingsEur: Math.round(totalEstimatedSavingsEur),
        crossPolicyGaps,
        riskScore,
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

function parseLocalizedJson(value: any): LocalizedText | null {
    if (!value) return null
    if (typeof value === "object" && "en" in value) return value as LocalizedText
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value)
            if (parsed.en) return parsed as LocalizedText
        } catch { /* not JSON */ }
        return { en: value, el: value }
    }
    return null
}
