/**
 * AI Service Interface
 * 
 * Defines the contract for AI service implementations.
 * Allows for easy swapping between different AI providers
 * and mock implementations for testing.
 */

import type { DocumentKind, EvidenceVerdict } from "./document-kind"

/**
 * Document to be analyzed by AI
 */
/**
 * The extraction contract takes a `ValidatedAIDocument` — an AIDocument the
 * document gate has passed (lib/ingestion/validated-document.ts). Providers
 * still implement the method over the plain shape; the brand is enforced at
 * the call site, where the bytes and the verdict are both in hand.
 */
export type { ValidatedAIDocument } from "@/lib/ingestion/validated-document"
import type { ValidatedAIDocument } from "@/lib/ingestion/validated-document"
import type { BranchFamily, DocumentType } from "@/lib/ingestion/types"

export interface AIDocument {
    /** Base64-encoded document data */
    data: string
    /** MIME type (e.g., 'application/pdf', 'image/jpeg') */
    mimeType: string
    // NO fileName. The user's own file name is never sent to a model provider:
    // providers log request metadata, so a name in the payload leaves our
    // boundary. Every provider needs *a* name for the document part and gets a
    // constant from providerDocumentFileName(). Removing the field from the
    // contract means reintroducing it is a type error, not a review catch.
}

/**
 * Policy metadata for AI analysis context
 */
export interface PolicyMetadata {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: Date
    endDate: Date
    premiumAmount: number | null
    coverageSummary: string | null
}

/**
 * Gap definition for AI to check
 */
export interface GapDefinitionForAI {
    slug: string
    name: string
    description: string | null
    checkCriteria: string
}

/**
 * Verified policy metadata extracted by AI
 */
export interface VerifiedPolicyMetadata {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    startDate?: string
    endDate?: string
    premiumAmount?: number
    coverageSummary?: string
}

/**
 * What the model may say about a coverage gap.
 *
 * It may EXPLAIN. It may not DECIDE.
 *
 * This interface used to carry `isDetected: boolean`, and that boolean was the
 * product: whether a customer was told they had a coverage gap came down to a
 * model's per-slug judgement over a natural-language `checkCriteria` string.
 * Severity came from the same family of guesses — the clarity step emitted a
 * `low|medium|high|critical` enum with no rubric anywhere in the prompt, so the
 * same real-world risk landed on "critical" or "medium" depending on which slug
 * the model happened to spell that run (see the audit: cyber_risk_gap=critical
 * vs cyber_liability=medium, both minted by the same pipeline).
 *
 * Detection and severity are now decided by `lib/gap-detection.ts` against the
 * extracted AcordData, and the model is handed a gap that already exists and
 * asked only to put it in words. The fields are gone rather than ignored: an
 * ignored field is one refactor away from being read again, and the compiler
 * cannot warn you about a convention.
 */
export interface AIGapResult {
    slug: string
    explanation: {
        en: string
        el: string
    }
    suggestion: {
        en: string
        el: string
    }
}

/**
 * Complete gap analysis response from AI
 */
export interface AIGapAnalysisResponse {
    verifiedMetadata: VerifiedPolicyMetadata
    gapResults: AIGapResult[]
    acordData?: any
    usage?: AITokenUsage
}

/**
 * Normalized premium payment frequency (extraction enrichment maps free-form
 * provider output onto this union).
 */
export type PremiumFrequency = 'annual' | 'semiannual' | 'quarterly' | 'monthly' | 'one_off'

/**
 * Policy extraction result from AI
 */
export interface AIPolicyExtractionResponse {
    /** What kind of document this is. Absent on extractions predating the field. */
    documentKind?: DocumentKind
    /**
     * Whether the document carries a policy at all — decided on the raw model
     * output, before placeholder substitution. `sufficient: false` means the
     * caller must NOT overwrite stored policy metadata from this result.
     */
    evidence?: EvidenceVerdict
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount: number
    coverageSummary: string
    issueDate?: string
    premiumFrequency?: string
    renewalDate?: string
    customerName?: string
    customerSurname?: string
    customerEmail?: string
    customerPhone?: string
    /** Policyholder VAT / ΑΦΜ (raw as extracted; normalize before use). */
    customerTaxId?: string
    exclusions?: string[]
    extractionMeta?: {
        overallConfidence: number
        fieldConfidence: Record<string, number>
        missingCriticalFields: string[]
        requiresReview: boolean
    }
    acordData?: any // ACORD-compliant structured data extracted from document
    usage?: AITokenUsage
}

export interface AITokenUsage {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    model: string
    provider?: "gemini" | "openai" | "anthropic" | "mock"
}

export interface LocalizedText {
    en: string
    el: string
}

export interface ClarityCoverageSnapshot {
    covered: string[]
    notCovered: string[]
    limits: Array<{ name: string; value: string }>
    deductibles: Array<{ name: string; value: string }>
    exclusions: string[]
}

export interface ClaritySavingsOpportunity {
    action: LocalizedText
    rationale: LocalizedText
    estimatedAnnualSavingsEur: number | null
    confidence: number
}

/**
 * Prose the clarity pass produced about a gap. NOT a detection, NOT a severity.
 *
 * `severity` was removed here for the same reason as `AIGapResult.isDetected`:
 * membership of this array used to be the detection signal, and the enum on it
 * used to become `GapInstance.severity` verbatim. Both are rule decisions now.
 */
export interface ClarityCoverageGap {
    slug: string
    evidence: LocalizedText
    recommendation: LocalizedText
}

export interface ClarityChecklistScore {
    pillarKey: string
    pillarName: LocalizedText
    checksPassed: number
    checksTotal: number
    successPct: number
    notes: LocalizedText
}

export interface ClarityPriorityAction {
    priority: "high" | "medium" | "low"
    action: LocalizedText
    reason: LocalizedText
}

export interface ClarityFinePrintWarning {
    clause: LocalizedText
    riskLevel: "info" | "warning" | "critical"
    impact: LocalizedText
}

export interface ClarityHiddenPerk {
    name: LocalizedText
    description: LocalizedText
    phone?: string
    usageFrequency?: string
}

export interface AIPolicyClarityResponse {
    plainLanguageSummary: LocalizedText
    coverageSnapshot: ClarityCoverageSnapshot
    savingsOpportunities: ClaritySavingsOpportunity[]
    coverageGaps: ClarityCoverageGap[]
    checklistScores: ClarityChecklistScore[]
    priorityActions: ClarityPriorityAction[]
    finePrintWarnings?: ClarityFinePrintWarning[]
    hiddenPerks?: ClarityHiddenPerk[]
    acordData?: any
    usage?: AITokenUsage
}

/**
 * AI Service Interface
 * 
 * All AI service implementations must implement this interface
 */
/**
 * Tracking options for AI operations
 */
export interface AITrackingOptions {
    userId?: string
    policyId?: string
    modelOverride?: string
    /** Output-token cap for this call (from the route decision). Undefined =
     *  provider default. Interactive answers are short, so a cap protects
     *  against runaway output cost without truncating a real answer. */
    maxOutputTokens?: number
    provider?: "gemini" | "openai" | "anthropic" | "mock"
    remediationAttempt?: number
    fallbackType?: "model_fallback" | "provider_failover"
    /** Pre-extracted structured policy data to use instead of re-sending the PDF document.
     *  When provided with document=null, AI services should build context from this JSON
     *  rather than requiring the raw document, saving 50-100K input tokens per call. */
    structuredContext?: AIPolicyExtractionResponse
    /** Admin-configured operator guidance (validated at save time by
     *  validateOperatorGuidance), rendered ADDITIVELY into the prompt under an
     *  OPERATOR GUIDANCE label — it supplements the canonical task rules and can
     *  never replace the compliance persona. Resolved per call from
     *  lib/services/ai/prompt-overrides.ts (exact LoB match, then global). */
    operatorGuidance?: string
    /** The line of business already believed to apply, used to select the
     *  line-of-business knowledge pack composed into the extraction prompt
     *  (lib/services/ai/lob-packs). A HINT, not a constraint: the model still
     *  reports the lineOfBusiness it reads from the document, and a wrong hint
     *  costs a paragraph of irrelevant guidance rather than a wrong answer. */
    lineOfBusinessHint?: string
}

// ── Risk Profile Analysis (Phase 2) ─────────────────────────────────

/**
 * The profile as the model is allowed to see it.
 *
 * The booleans and counts are nullable ON PURPOSE. They used to be plain
 * `boolean` / `number`, so an untouched profile — whose columns default to
 * `false` and `0` — rendered into the prompt as the assertions "Owns home: No",
 * "Vehicles: 0", "Has pets: No". The model was being told, as fact, things
 * nobody had ever asked. `null` now means "not answered" and the prompt renders
 * it as Unknown, which is the difference between a model reasoning about a
 * person and a model reasoning about a set of defaults.
 */
export interface RiskProfileInput {
    maritalStatus: string | null
    dependentsCount: number | null
    employmentStatus: string | null
    ownsHome: boolean | null
    mortgageAmount: number | null
    hasPets: boolean | null
    vehiclesCount: number | null
    annualIncome: number | null
    occupation: string | null
    travelsFrequently: boolean | null
    hasLoans: boolean | null
    loanAmount: number | null
    smokingStatus: string | null
    dateOfBirth: string | null
    lifeEvents: Array<{ type: string; date: string }> | null
    // Health & Lifestyle
    gender: string | null
    heightCm: number | null
    weightKg: number | null
    chronicConditions: string[] | null
    familyMedicalHistory: string[] | null
    drivingRecord: string | null
    activityLevel: string | null
    /**
     * Layer 1 as CONTEXT, never as evidence: what the customer said matters,
     * derived from the first-stage onboarding. Orders and phrases the model's
     * observations; cannot create, remove or resize a gap. Null when the
     * customer never completed the profile.
     */
    statedPriorities?: Array<{ domain: string; importance: string }> | null
}

export interface AIRiskInsight {
    category: string
    insight: LocalizedText
    urgency: "critical" | "high" | "medium" | "low"
    actionable: boolean
}

export interface AIRiskProfileAnalysisResponse {
    riskSummary: LocalizedText
    riskLevel: "low" | "moderate" | "high" | "very_high"
    insights: AIRiskInsight[]
    prioritizedGaps: Array<{
        lineOfBusiness: string
        reason: LocalizedText
        urgency: "critical" | "high" | "medium" | "low"
    }>
    profileStrengths: LocalizedText[]
    usage?: AITokenUsage
}

export type AICapabilityOperation =
    | "extractPolicyData"
    | "analyzeGaps"
    | "analyzePolicyClarity"
    | "askQuestion"
    | "analyzeRiskProfile"
    | "classifyDocument"

// ── Document classification (the document gate's cheap model stage) ────────
//
// What the gate hands the model is an EXCERPT — the first ~6,000 characters of
// text, or the first pages of a scan — never the whole document, and never
// before the deterministic stages have failed to settle the question
// (lib/ingestion/document-gate.ts). The answer is a closed vocabulary.

export type AIClassificationInput =
    | { kind: "text"; text: string; declaredBranch: string | null }
    | { kind: "document"; data: string; mimeType: string; declaredBranch: string | null }

export interface AIDocumentClassification {
    documentType: DocumentType
    isInsuranceDocument: boolean
    /** 0..1 */
    insuranceConfidence: number
    detectedBranch: BranchFamily | null
    /** 0..1 */
    branchConfidence: number
    /** False when the excerpt could not be read at all. */
    readable: boolean
    /** Short phrases from the excerpt that justify the verdict. */
    signals: string[]
    usage?: AITokenUsage
}

export interface AICapabilityMetadata {
    provider: "gemini" | "openai" | "anthropic" | "mock"
    supportsDocumentInput: boolean
    supportedMimeTypes: string[]
    modelPatterns: string[]
}

export interface AICapabilityCheckInput {
    operation: AICapabilityOperation
    model?: string
    hasDocument?: boolean
    mimeType?: string | null
}

export interface AICapabilityCheckResult {
    supported: boolean
    code: string
    reason: string
    userMessageKey: string
    metadata: AICapabilityMetadata
}

/**
 * AI Service Interface
 * 
 * All AI service implementations must implement this interface
 */
export interface IAIService {
    /**
     * Returns provider capability metadata for model/media support checks.
     */
    getCapabilities(): AICapabilityMetadata

    /**
     * Validates whether the provider can execute a given operation with the
     * requested model + media combination.
     */
    checkCapabilities(input: AICapabilityCheckInput): AICapabilityCheckResult

    /**
     * Extracts policy information from a document
     * 
     * @param document - Document to analyze
     * @param options - Tracking options
     * @returns Extracted policy information
     * @throws {Error} If extraction fails
     */
    extractPolicyData(document: ValidatedAIDocument, options?: AITrackingOptions): Promise<AIPolicyExtractionResponse>

    /**
     * Classifies an EXCERPT of an upload for the document gate: what kind of
     * document, how surely insurance, which branch family. Cheapest model,
     * closed schema, untrusted-content framing. Never the whole document.
     */
    classifyDocument(input: AIClassificationInput, options?: AITrackingOptions): Promise<AIDocumentClassification>

    /**
     * Analyzes a policy for coverage gaps
     * 
     * @param document - Policy document to analyze (optional)
     * @param metadata - Current policy metadata
     * @param gapDefinitions - Gap definitions to check
     * @param options - Tracking options
     * @returns Gap analysis results
     * @throws {Error} If analysis fails
     */
    analyzeGaps(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        gapDefinitions: GapDefinitionForAI[],
        options?: AITrackingOptions
    ): Promise<AIGapAnalysisResponse>

    /**
     * Produces policy clarity insights from checklist-based analysis.
     *
     * @param document - Policy document to analyze
     * @param metadata - Current policy metadata
     * @param checklist - Checklist pillars and checks to evaluate
     * @param options - Tracking options
     */
    analyzePolicyClarity(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        checklist: Array<{
            key: string
            title: LocalizedText
            description: LocalizedText
            checks: string[]
        }>,
        options?: AITrackingOptions
    ): Promise<AIPolicyClarityResponse>

    /**
     * Answers a question about a policy
     * 
     * @param document - Policy document context (optional)
     * @param metadata - Policy metadata context
     * @param question - User's question
     * @param options - Tracking options
     * @returns Answer to the question
     * @throws {Error} If question answering fails
     */
    askQuestion(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        question: string,
        options?: AITrackingOptions
    ): Promise<string>

    /**
     * Analyzes a user's risk profile against their existing policies
     * to surface informational observations about coverage gaps and overlaps.
     *
     * @param profile - User's risk profile fields
     * @param existingPolicies - Current policy portfolio metadata
     * @param options - Tracking options
     * @returns Risk analysis with insights, gap priorities, and strengths
     */
    analyzeRiskProfile(
        profile: RiskProfileInput,
        existingPolicies: PolicyMetadata[],
        options?: AITrackingOptions
    ): Promise<AIRiskProfileAnalysisResponse>

    /**
     * Checks if the AI service is available
     *
     * @returns True if service is available
     */
    isAvailable(): boolean

    /**
     * Gets the name of the AI service
     * 
     * @returns Service name
     */
    getServiceName(): string
}
