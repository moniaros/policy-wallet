/**
 * The ONE primary action of «Καλύψεις & κενά», chosen from facts — the same
 * idea as the home's next-step banner. First match wins; the order is the
 * order in which a person can actually act: nothing to read → add; unread →
 * analyse (or unlock); something found → see it; nothing found but the
 * picture is incomplete → answer; complete and open recommendations → see
 * them; else grow the wallet. A snapshot failure never changes the step; the
 * page says the recommendations did not load beside it.
 */

import type { CoverageStatusSummary } from "@/lib/protection/coverage-status"

export type ProtectionNextStepId = "add_first" | "analyse" | "unlock" | "gaps" | "answer" | "recommendations" | "add_more"

export interface ProtectionNextStepFacts {
    inForcePolicyCount: number
    analysedPolicyCount: number
    deepAnalysisAllowed: boolean
    summary: Pick<CoverageStatusSummary, "finding" | "noPolicy" | "notChecked" | "appearsCovered">
    classifiedFindingCount: number
    unknownFactorCount: number
    recommendationCount: number
}

export interface ProtectionNextStep {
    id: ProtectionNextStepId
    href: string
    /** The number the CTA quotes, when it quotes one («Απαντήστε 3 ερωτήσεις»). */
    count: number | null
}

export function chooseProtectionNextStep(f: ProtectionNextStepFacts): ProtectionNextStep {
    if (f.inForcePolicyCount === 0) return { id: "add_first", href: "/wallet/add", count: null }
    if (f.analysedPolicyCount === 0) {
        return f.deepAnalysisAllowed
            ? { id: "analyse", href: "#analyse", count: null }
            : { id: "unlock", href: "/upgrade?reason=feature_locked", count: null }
    }
    if (f.summary.finding > 0 || f.summary.noPolicy > 0 || f.classifiedFindingCount > 0) return { id: "gaps", href: "#gaps", count: null }
    if (f.summary.notChecked > 0 && f.unknownFactorCount > 0) return { id: "answer", href: "#life", count: f.unknownFactorCount }
    if (f.recommendationCount > 0) return { id: "recommendations", href: "/recommendations", count: null }
    return { id: "add_more", href: "/wallet/add", count: null }
}
