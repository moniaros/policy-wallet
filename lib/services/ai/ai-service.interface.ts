/**
 * AI Service Interface
 * 
 * Defines the contract for AI service implementations.
 * Allows for easy swapping between different AI providers
 * and mock implementations for testing.
 */

/**
 * Document to be analyzed by AI
 */
export interface AIDocument {
    /** Base64-encoded document data */
    data: string
    /** MIME type (e.g., 'application/pdf', 'image/jpeg') */
    mimeType: string
    /** Original filename */
    fileName: string
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
 * Gap analysis result from AI
 */
export interface AIGapResult {
    slug: string
    isDetected: boolean
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

export interface ClarityCoverageGap {
    slug: string
    severity: "low" | "medium" | "high" | "critical"
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
}

// ── Risk Profile Analysis (Phase 2) ─────────────────────────────────

export interface RiskProfileInput {
    maritalStatus: string | null
    dependentsCount: number
    employmentStatus: string | null
    ownsHome: boolean
    mortgageAmount: number | null
    hasPets: boolean
    vehiclesCount: number
    annualIncome: number | null
    occupation: string | null
    travelsFrequently: boolean
    hasLoans: boolean
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
    extractPolicyData(document: AIDocument, options?: AITrackingOptions): Promise<AIPolicyExtractionResponse>

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
