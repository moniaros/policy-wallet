/**
 * Agent credential-verification state — the single source of truth.
 *
 * An AgentProfile.verificationStatus moves through a small state machine:
 *   pending   a fresh profile, or one submitted and awaiting review
 *   approved  an admin reviewed the professional licence and approved it
 *   rejected  an admin reviewed it and did not approve
 *
 * The admin review action WRITES "approved" (app/(protected)/admin/actions.ts),
 * and the admin console reads it back correctly. But the customer- and
 * agent-facing surfaces historically compared against "verified" — a value
 * NOTHING in the system ever writes. The consequence was silent and serious: an
 * admin could approve an intermediary (approval email and all) yet the "Verified
 * Agent" trust mark never appeared on the agent's own portal, their settings
 * status card, or the public AgentCard a policyholder sees when deciding whether
 * to trust them. The whole point of the verification flow — signalling a checked
 * intermediary — was defeated by a one-word enum drift.
 *
 * Every reader now goes through these helpers, so the writer and the readers can
 * never disagree on the string again.
 */

export type AgentVerificationStatus = "pending" | "approved" | "rejected"

export const AGENT_VERIFICATION_STATUS = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
} as const

/**
 * Have the agent's professional credentials passed review?
 *
 * "approved" is canonical (what the admin action writes). "verified" is tolerated
 * only so any legacy row that predates the current review flow still reads as
 * verified rather than silently downgrading.
 */
export function isAgentVerified(status: string | null | undefined): boolean {
    return status === "approved" || status === "verified"
}

/** Was the agent reviewed and NOT approved? (distinct from still-pending) */
export function isAgentRejected(status: string | null | undefined): boolean {
    return status === "rejected"
}
