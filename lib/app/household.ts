/**
 * Household — people, each with a state derived from the policies naming them.
 *
 * A person is «εντάξει» when every policy naming them is covered; a dependant
 * with NO policy naming them is a review item — never a gap — until the user
 * confirms the situation (§9). The household model is what makes a future
 * preventive opportunity addressable to a person without restructuring.
 */
import type { ProtectionState } from "./state"

export const RELATIONS = ["self", "partner", "child", "parent", "other"] as const
export type Relation = (typeof RELATIONS)[number]

export interface HouseholdPersonLike {
    id: string
    relation: Relation
    isDependant: boolean
    /** States of the live policies naming this person (from the verdict's perPolicy). */
    policyStates: ReadonlyArray<ProtectionState>
}

export function personState(p: HouseholdPersonLike): ProtectionState {
    if (p.policyStates.length === 0) return p.isDependant ? "review" : "covered"
    if (p.policyStates.includes("gap")) return "gap"
    if (p.policyStates.includes("review")) return "review"
    return "covered"
}

export interface HouseholdSummary {
    people: Array<{ id: string; state: ProtectionState; policyCount: number }>
    allCovered: boolean
}

export function summariseHousehold(people: readonly HouseholdPersonLike[]): HouseholdSummary {
    const rows = people.map((p) => ({ id: p.id, state: personState(p), policyCount: p.policyStates.length }))
    return { people: rows, allCovered: rows.length > 0 && rows.every((r) => r.state === "covered") }
}
