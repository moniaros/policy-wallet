/**
 * The customer's view of what their advisor can see — built from grants and
 * policies, as ONE pure function (PW-BRIDGE-01 A-09 / A-10).
 *
 * The first live capture of the /agent page read «Ο σύμβουλός σας βλέπει 13 από
 * τα 10 ασφαλιστήριά σας»: the ledger counted GRANTS, including grants whose
 * policy had since been deleted, and could count one policy twice. A numerator
 * above its denominator is the one number this product must never print. So:
 *
 *   - a grant over a policy that no longer exists is not a row and not a count;
 *   - one policy appears once, at the HIGHEST level granted to this advisor;
 *   - the summary's numerator is the number of DISTINCT policies the advisor can
 *     see, so it can never exceed the policy count beside it.
 */

import { normalizePermissions, type PolicyPermissionLevel } from "@/lib/policy-access"

const LEVEL_RANK: Record<PolicyPermissionLevel, number> = { none: 0, read: 1, write: 2, manage: 3 }

export interface LedgerGrant {
    id: string
    scope: string
    grantedAt: Date | string
    permissions: string
}

export interface LedgerPolicy {
    id: string
    policyNumber: string | null
    insurerName: string | null
    lineOfBusiness: string | null
    createdByUserId: string | null
}

export interface SharedPolicyLedgerItem {
    grantId: string
    policyId: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    addedByAdvisor: boolean
    grantedAt: string
    /** The highest level granted over this policy, normalised by lib/policy-access. */
    permissions: PolicyPermissionLevel
}

export interface SharedPolicyLedger {
    items: SharedPolicyLedgerItem[]
    /** Distinct existing policies the advisor can see — the numerator. */
    sharedCount: number
    /** All of the customer's policies — the denominator. */
    totalCount: number
    /** Grants that pointed at no current policy — dropped, reported for the ledger's honesty. */
    orphanGrantCount: number
}

export function buildSharedPolicyLedger(grants: readonly LedgerGrant[], policies: readonly LedgerPolicy[], advisorUserId: string): SharedPolicyLedger {
    const byId = new Map(policies.map((p) => [p.id, p]))
    const best = new Map<string, { grant: LedgerGrant; level: PolicyPermissionLevel }>()
    let orphanGrantCount = 0
    for (const grant of grants) {
        if (!grant.scope.startsWith("policy:")) continue
        const policyId = grant.scope.slice("policy:".length)
        if (!byId.has(policyId)) {
            orphanGrantCount += 1
            continue
        }
        const level = normalizePermissions(grant.permissions)
        const current = best.get(policyId)
        if (!current || LEVEL_RANK[level] > LEVEL_RANK[current.level]) best.set(policyId, { grant, level })
    }
    const items: SharedPolicyLedgerItem[] = [...best.entries()].map(([policyId, { grant, level }]) => {
        const policy = byId.get(policyId)!
        return {
            grantId: grant.id,
            policyId,
            policyNumber: policy.policyNumber ?? "",
            insurerName: policy.insurerName ?? "",
            lineOfBusiness: policy.lineOfBusiness ?? "",
            addedByAdvisor: policy.createdByUserId === advisorUserId,
            grantedAt: new Date(grant.grantedAt).toISOString(),
            permissions: level,
        }
    })
    return { items, sharedCount: items.length, totalCount: policies.length, orphanGrantCount }
}
