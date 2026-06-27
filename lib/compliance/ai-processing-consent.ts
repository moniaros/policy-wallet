import { db } from "@/lib/db"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"

/**
 * AI-processing consent (GDPR Art. 9).
 *
 * Policy documents — which can contain special-category health data
 * (PolicyholderProfile.chronicConditions / familyMedicalHistory) — are sent to
 * third-party LLM providers during analysis. That requires explicit consent.
 *
 * This module is the single source of truth for reading and recording that
 * consent. The enforcement chokepoint is
 * `PolicyAnalysisOrchestratorService.createRun()`, which throws
 * `AI_PROCESSING_CONSENT_REQUIRED` before any document bytes reach a provider.
 */

export const AI_PROCESSING_CONSENT_REQUIRED = "AI_PROCESSING_CONSENT_REQUIRED"

/** The consent version a fresh acceptance is recorded against. */
export const AI_PROCESSING_CONSENT_VERSION = LEGAL_POLICY_VERSIONS.ai_processing

/** True once the user has an AI-processing consent version on record. */
export async function userHasAiProcessingConsent(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { aiProcessingConsentVersion: true },
    })
    return Boolean(user?.aiProcessingConsentVersion)
}

/**
 * Record an explicit AI-processing consent: writes an immutable `consentAudit`
 * row and stamps `user.aiProcessingConsentVersion`. Idempotent — re-recording
 * simply refreshes the version/timestamp.
 */
export async function recordAiProcessingConsent(opts: {
    userId: string
    locale?: "el" | "en"
    source?: string
    ipAddress?: string | null
    userAgent?: string | null
}): Promise<void> {
    const locale = opts.locale ?? "el"
    await db.consentAudit.create({
        data: {
            userId: opts.userId,
            consentType: "ai_processing",
            policyVersion: AI_PROCESSING_CONSENT_VERSION,
            locale,
            source: opts.source ?? "web",
            accepted: true,
            acceptedAt: new Date(),
            ipAddress: opts.ipAddress ?? null,
            userAgent: opts.userAgent ?? null,
        },
    })

    await db.user.update({
        where: { id: opts.userId },
        data: {
            aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
            consentLocale: locale,
            consentUpdatedAt: new Date(),
        },
    })
}
