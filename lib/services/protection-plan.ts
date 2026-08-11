/**
 * The customer's protection plan — one derivation for "what has been done and
 * what is still open", built ONLY from facts the database already records.
 *
 * This absorbs the old getting-started checklist (5 setup signals, previously
 * hardcoded in a client component with localStorage dismissal) and extends it
 * with the recommendation lifecycle: every active recommendation is an open
 * step, every actioned or dismissed one counts as handled. Dismissal counts —
 * reviewing a suggestion and deciding against it is a completed decision, not
 * an outstanding task.
 *
 * Pure and exported so plan progress is unit-testable and the dashboard cannot
 * invent its own arithmetic.
 */

export type ProtectionPlanStepId =
    | "upload"
    | "analysis"
    | "gaps"
    | "agent"
    | "notifications"

export type ProtectionPlanStepState = "done" | "open"

export interface ProtectionPlanStep {
    /** Setup step ids above, or `recommendation:<id>` for engine suggestions. */
    id: string
    kind: "setup" | "recommendation"
    state: ProtectionPlanStepState
    href: string
}

export interface ProtectionPlanFacts {
    policyCount: number
    /** Any PolicyAnalysisRun in a completed state. */
    hasCompletedAnalysis: boolean
    openGapCount: number
    hasAgent: boolean
    notificationsEnabled: boolean
    /** Ids of currently-active recommendation instances. */
    activeRecommendationIds: string[]
    /** Count of actioned + dismissed recommendation instances. */
    handledRecommendationCount: number
}

export interface ProtectionPlan {
    steps: ProtectionPlanStep[]
    completed: number
    total: number
    allDone: boolean
}

const SETUP_HREFS: Record<ProtectionPlanStepId, string> = {
    upload: "/wallet/add",
    analysis: "/coverage-insights",
    gaps: "/coverage-insights",
    agent: "/agent",
    notifications: "/notifications",
}

export function buildProtectionPlan(facts: ProtectionPlanFacts): ProtectionPlan {
    const setupDone: Record<ProtectionPlanStepId, boolean> = {
        upload: facts.policyCount > 0,
        analysis: facts.hasCompletedAnalysis,
        // Zero gaps when no analysis ever ran is not "no gaps" — it is "we have
        // not looked". The old checklist encoded this rule; keep it.
        gaps: facts.hasCompletedAnalysis && facts.openGapCount === 0,
        agent: facts.hasAgent,
        notifications: facts.notificationsEnabled,
    }

    const steps: ProtectionPlanStep[] = (
        Object.keys(SETUP_HREFS) as ProtectionPlanStepId[]
    ).map((id) => ({
        id,
        kind: "setup",
        state: setupDone[id] ? "done" : "open",
        href: SETUP_HREFS[id],
    }))

    for (const recId of facts.activeRecommendationIds) {
        steps.push({
            id: `recommendation:${recId}`,
            kind: "recommendation",
            state: "open",
            href: "/coverage-insights",
        })
    }

    const doneSetup = steps.filter((s) => s.kind === "setup" && s.state === "done").length
    const completed = doneSetup + facts.handledRecommendationCount
    const total = steps.length + facts.handledRecommendationCount
    return { steps, completed, total, allDone: total > 0 && completed === total }
}
