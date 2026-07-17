/**
 * Whether an agent may see a customer's IDENTITY (name / phone / image).
 *
 * A `CustomerRelationship` is created unilaterally by the agent — "add customer"
 * or an invite, on any email — so its mere existence is NOT consent. The
 * `agent-visibility` model already restricts which POLICIES an agent sees; this
 * is the identity twin: without it, an agent can type any email that belongs to
 * a real PolicyWallet user and read that person's name/phone/image (a GDPR
 * disclosure and an email-enumeration oracle).
 *
 * Identity is shown only when one of these is true:
 *   1. the customer explicitly accepted the invite (`activationStatus:"activated"`,
 *      the state only `redeemInvite` sets), or
 *   2. the customer is a phantom the agent created (no independent account:
 *      no password, never email-verified — nobody to consent), or
 *   3. the agent already has ≥1 visible policy for them (they legitimately
 *      manage a policy, so the identity is already theirs to see).
 */
export function isConsentedRelationship(
    rel: { activationStatus?: string | null } | null | undefined
): boolean {
    return rel?.activationStatus === "activated"
}

export function isPhantomCustomer(
    customer: { password: string | null; emailVerified: Date | null }
): boolean {
    return customer.password == null && customer.emailVerified == null
}

export function agentMaySeeCustomerIdentity(
    rel: { activationStatus?: string | null } | null | undefined,
    customer: { password: string | null; emailVerified: Date | null },
    visiblePolicyCount: number
): boolean {
    return (
        isConsentedRelationship(rel) ||
        isPhantomCustomer(customer) ||
        visiblePolicyCount > 0
    )
}
