/**
 * GUARD: the customer's «N of M shared» can never print N > M, and the ledger
 * never lists a grant over a policy that no longer exists (PW-BRIDGE-01 A-09).
 *
 * Measured on 2026-09-06 by the two-sided harness: /agent read «Ο σύμβουλός σας
 * βλέπει 13 από τα 10 ασφαλιστήριά σας» — grants counted, deleted fixture
 * policies included, one policy counted per grant. The helper is the repair;
 * this file is what keeps it.
 */

import { describe, expect, it } from "vitest"

import { buildSharedPolicyLedger } from "@/lib/wallet/shared-policy-ledger"

const policies = [
    { id: "p1", policyNumber: "ΣΥΜΒ-1", insurerName: "Interamerican", lineOfBusiness: "motor", createdByUserId: null },
    { id: "p2", policyNumber: "ΣΥΜΒ-2", insurerName: "Εθνική Ασφαλιστική", lineOfBusiness: "home", createdByUserId: "agent-1" },
    { id: "p3", policyNumber: null, insurerName: null, lineOfBusiness: "health", createdByUserId: null },
]
const at = new Date("2026-09-01T10:00:00.000Z")

describe("shared-policy ledger — the customer's view of what the advisor can see", () => {
    it("drops grants over policies that no longer exist and reports how many it dropped", () => {
        const ledger = buildSharedPolicyLedger(
            [
                { id: "g1", scope: "policy:p1", grantedAt: at, permissions: "view" },
                { id: "ghost", scope: "policy:deleted", grantedAt: at, permissions: "view" },
                { id: "ghost2", scope: "policy:deleted-too", grantedAt: at, permissions: "edit" },
            ],
            policies,
            "agent-1"
        )
        expect(ledger.items.map((i) => i.policyId)).toEqual(["p1"])
        expect(ledger.orphanGrantCount).toBe(2)
    })

    it("counts one policy once, at the highest level granted, so N never exceeds M", () => {
        const ledger = buildSharedPolicyLedger(
            [
                { id: "g1", scope: "policy:p1", grantedAt: at, permissions: "view" },
                { id: "g2", scope: "policy:p1", grantedAt: at, permissions: "edit" },
                { id: "g3", scope: "policy:p2", grantedAt: at, permissions: "manage" },
                { id: "g4", scope: "policy:p2", grantedAt: at, permissions: "view" },
                { id: "g5", scope: "policy:p3", grantedAt: at, permissions: "view,edit" },
                { id: "g6", scope: "policy:p1", grantedAt: at, permissions: "view" },
                { id: "g7", scope: "portfolio", grantedAt: at, permissions: "manage" },
            ],
            policies,
            "agent-1"
        )
        expect(ledger.sharedCount).toBe(3)
        expect(ledger.totalCount).toBe(3)
        expect(ledger.sharedCount).toBeLessThanOrEqual(ledger.totalCount)
        const byPolicy = Object.fromEntries(ledger.items.map((i) => [i.policyId, i.permissions]))
        expect(byPolicy).toEqual({ p1: "write", p2: "manage", p3: "write" })
    })

    it("declares who added the policy and serialises the grant date as ISO", () => {
        const ledger = buildSharedPolicyLedger([{ id: "g3", scope: "policy:p2", grantedAt: at, permissions: "manage" }], policies, "agent-1")
        expect(ledger.items[0]).toMatchObject({ addedByAdvisor: true, grantedAt: "2026-09-01T10:00:00.000Z", insurerName: "Εθνική Ασφαλιστική" })
        expect(buildSharedPolicyLedger([{ id: "g1", scope: "policy:p1", grantedAt: at, permissions: "view" }], policies, "agent-1").items[0].addedByAdvisor).toBe(false)
    })

    it("an empty book is an empty ledger with the denominator still stated", () => {
        const ledger = buildSharedPolicyLedger([], policies, "agent-1")
        expect(ledger).toMatchObject({ items: [], sharedCount: 0, totalCount: 3, orphanGrantCount: 0 })
    })
})
