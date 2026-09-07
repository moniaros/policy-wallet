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
    // "activated" — the customer accepted the agent's invite (redeemInvite).
    // "active"    — the CUSTOMER initiated the relationship by sharing a
    //               policy with the agent (wallet sharePolicy) — unambiguous
    //               consent, and it must survive later grant revocations.
    return rel?.activationStatus === "activated" || rel?.activationStatus === "active"
}

/**
 * The credential signals the identity rule reads. `hasPassword` is PRESENCE,
 * computed by `lib/services/credential-signals.ts` from `password IS NOT NULL`;
 * the hash itself never reaches this module or anything that calls it
 * (PW-BRIDGE-01 A-01 — eleven callers used to select the column to test it for null).
 */
export type CredentialSignals = { hasPassword: boolean; emailVerified: Date | null }

export function isPhantomCustomer(customer: CredentialSignals): boolean {
    return !customer.hasPassword && customer.emailVerified == null
}

export function agentMaySeeCustomerIdentity(
    rel: { activationStatus?: string | null } | null | undefined,
    customer: CredentialSignals,
    visiblePolicyCount: number
): boolean {
    return (
        isConsentedRelationship(rel) ||
        isPhantomCustomer(customer) ||
        visiblePolicyCount > 0
    )
}

/**
 * The ONE way to serialize a customer's identity toward an agent-facing
 * surface. Every place that renders a relationship's customer (dashboard,
 * activity feed, opportunities, protection scores…) must go through this —
 * ad-hoc `customer.name` reads are how the consent rule kept getting bypassed
 * off the /customers page.
 *
 * When identity is not visible, the email stands in for the name: the agent
 * typed it themselves, so it is never a disclosure — the real name is.
 */
export function presentCustomerIdentity(
    rel: { activationStatus?: string | null } | null | undefined,
    customer: {
        name: string | null
        email: string
        image?: string | null
        hasPassword: boolean
        emailVerified: Date | null
    },
    visiblePolicyCount: number
): { identityVisible: boolean; name: string; image: string | null } {
    const identityVisible = agentMaySeeCustomerIdentity(rel, customer, visiblePolicyCount)
    return {
        identityVisible,
        name: identityVisible ? customer.name || customer.email : customer.email,
        image: identityVisible ? (customer.image ?? null) : null,
    }
}
