import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"

/**
 * Whether a policy's branch has any authored check at all — the unauthored-
 * branch state (PW-TRANSPARENCY-02 amendment 01, B1.5).
 *
 * Goal 0 F3: only eight of roughly forty branches carry authored rules, and a
 * definition matches its branch EXACTLY (`renters` inherits nothing from
 * `home`). A policy in any other branch produces zero findings for the
 * structural reason that nothing was asked of it — and zero findings used to
 * render as reassurance. This module names that state so every surface can
 * say «δεν το έχουμε αξιολογήσει» instead of «κανένα εύρημα», and so a
 * portfolio roll-up can exclude such policies from any "assessed" figure and
 * state how many it excluded.
 *
 * Static on purpose: the catalogue in the repository is the source of which
 * rules are live (`npm run verify:gap-catalogue` holds the database to it), so
 * a surface needs no query to know a branch is unauthored. The per-run truth —
 * which rules a specific run attempted — travels on the run itself
 * (`policy_analysis_runs.attempted_rules`, B0.2) and drives the findings
 * provenance line; at HEAD the two agree.
 */

/**
 * The same shape test as `hasEvaluableRule` in lib/gap-detection.ts, restated
 * here because that module imports `lib/db` and this one is imported by client
 * components (the client-bundle boundary guard forbids the transitive import).
 * `tests/unit/unauthored-branch-state.test.tsx` pins the two in agreement.
 */
export function isEvaluableDetectionLogic(logic: unknown): boolean {
    if (!logic || typeof logic !== "object") return false
    const rules = (logic as { rules?: unknown }).rules
    if (Array.isArray(rules)) return rules.some((rule) => typeof (rule as { type?: unknown } | null)?.type === "string")
    return typeof (logic as { type?: unknown }).type === "string"
}

const AUTHORED_BY_BRANCH: ReadonlyMap<string, number> = (() => {
    const counts = new Map<string, number>()
    for (const definition of AUTHORED_GAP_DEFINITIONS) {
        if (!definition.isActive) continue
        if (!isEvaluableDetectionLogic(definition.detectionLogic)) continue
        counts.set(definition.lineOfBusiness, (counts.get(definition.lineOfBusiness) ?? 0) + 1)
    }
    return counts
})()

/** Active, evaluable authored checks for exactly this branch. */
export function authoredCheckCount(lineOfBusiness: string | null | undefined): number {
    return AUTHORED_BY_BRANCH.get(String(lineOfBusiness ?? "").trim()) ?? 0
}

export function isUnauthoredBranch(lineOfBusiness: string | null | undefined): boolean {
    return authoredCheckCount(lineOfBusiness) === 0
}

/** Branches that carry at least one authored check, sorted. */
export function authoredBranches(): string[] {
    return [...AUTHORED_BY_BRANCH.keys()].sort()
}

export type AssessmentState =
    /** No authored check exists for the branch: nothing can be assessed, whatever ran. */
    | "unauthored"
    /** Checks exist, but no analysis has completed for this policy. */
    | "not_analysed"
    /** Checks exist and an analysis has completed — findings (or their absence) mean something. */
    | "assessed"

export interface AssessablePolicy {
    lineOfBusiness?: string | null
    lastAnalyzedAt?: Date | string | null
}

export function assessmentState(policy: AssessablePolicy): AssessmentState {
    if (isUnauthoredBranch(policy.lineOfBusiness)) return "unauthored"
    if (!policy.lastAnalyzedAt) return "not_analysed"
    return "assessed"
}

export interface AssessmentPartition<T> {
    assessed: T[]
    unauthored: T[]
    notAnalysed: T[]
    /** `unauthored + notAnalysed` — the policies a roll-up must say it left out. */
    excludedCount: number
}

/** Split a portfolio into what a roll-up may count as assessed and what it must state it excluded. */
export function partitionByAssessment<T extends AssessablePolicy>(policies: readonly T[]): AssessmentPartition<T> {
    const out: AssessmentPartition<T> = { assessed: [], unauthored: [], notAnalysed: [], excludedCount: 0 }
    for (const policy of policies) {
        const state = assessmentState(policy)
        if (state === "assessed") out.assessed.push(policy)
        else if (state === "unauthored") out.unauthored.push(policy)
        else out.notAnalysed.push(policy)
    }
    out.excludedCount = out.unauthored.length + out.notAnalysed.length
    return out
}
