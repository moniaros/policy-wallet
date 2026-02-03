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
}

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
}

/**
 * AI Service Interface
 * 
 * All AI service implementations must implement this interface
 */
export interface IAIService {
    /**
     * Extracts policy information from a document
     * 
     * @param document - Document to analyze
     * @returns Extracted policy information
     * @throws {Error} If extraction fails
     */
    extractPolicyData(document: AIDocument): Promise<AIPolicyExtractionResponse>

    /**
     * Analyzes a policy for coverage gaps
     * 
     * @param document - Policy document to analyze (optional)
     * @param metadata - Current policy metadata
     * @param gapDefinitions - Gap definitions to check
     * @returns Gap analysis results
     * @throws {Error} If analysis fails
     */
    analyzeGaps(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        gapDefinitions: GapDefinitionForAI[]
    ): Promise<AIGapAnalysisResponse>

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
