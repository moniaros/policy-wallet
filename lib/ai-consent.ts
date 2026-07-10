/**
 * AI-processing consent markers.
 *
 * Normal flow: the policyholder grants consent themselves and
 * `User.aiProcessingConsentVersion` holds the accepted policy version.
 *
 * Agent-managed flow (unactivated/phantom customers): the agent attests that
 * they obtained the customer's consent offline. The sentinel below is written
 * as the consent version — it satisfies the orchestrator's truthiness gate —
 * and evidence lands in the activity log. On account activation the sentinel
 * is CLEARED so the customer is asked first-hand.
 *
 * NOTE: the attestation model is pending counsel sign-off (see
 * docs/audits/ai-advice-compliance.md posture).
 */
export const AGENT_ATTESTED_CONSENT_PREFIX = "agent-attested:v1:"

export function isAgentAttestedConsent(version: string | null | undefined): boolean {
    return Boolean(version && version.startsWith(AGENT_ATTESTED_CONSENT_PREFIX))
}
