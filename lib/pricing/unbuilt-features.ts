/**
 * Agent plan features that are SOLD but have no implementation.
 *
 * The agent plans advertise 17 boolean capabilities. Five of them appear
 * nowhere in the codebase outside the schema and the plan defaults: no gate
 * checks them, no surface renders them, nothing changes when a plan grants
 * them. An agent upgrading for one of these pays and receives nothing.
 *
 * This registry exists so that gap is DECLARED rather than silent. It is not an
 * excuse to keep selling them — it is the list that makes the debt countable
 * and impossible to grow by accident. `tests/unit/sold-feature-honesty.test.ts`
 * checks it in both directions: a newly unbuilt feature fails until it is
 * listed, and a feature listed here that has since been implemented fails until
 * it is removed.
 *
 * Product decision required for each entry: build it, or stop advertising it.
 * Marketing and pricing copy should treat anything in this list as unavailable.
 *
 * Note on what is NOT here: `pipelineAnalytics` and `priorityQueue` are absent
 * because they ARE enforced — just not through `canAgentUseFeature`.
 * `priorityQueue` sets the analysis run's queue priority in the orchestrator and
 * `pipelineAnalytics` is read directly by the agent dashboard. A prior audit
 * counted them as unfenced by looking only for the gate helper.
 */
export const SOLD_BUT_UNBUILT_AGENT_FEATURES = [
    "collaborationThreads",
    "apiAccess",
    "sharedPolicyRoom",
    "asyncMessaging",
    "privateNotes",
] as const

export type SoldButUnbuiltAgentFeature = (typeof SOLD_BUT_UNBUILT_AGENT_FEATURES)[number]

/** True when a plan flag is advertised but backed by no implementation. */
export function isUnbuiltAgentFeature(feature: string): boolean {
    return (SOLD_BUT_UNBUILT_AGENT_FEATURES as readonly string[]).includes(feature)
}
