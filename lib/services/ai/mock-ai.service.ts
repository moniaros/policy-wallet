/**
 * Mock AI Service Implementation
 * 
 * Provides a mock implementation of IAIService for testing
 * and development without requiring actual AI API calls.
 */

import { logger } from '@/lib/logger'
import type {
    IAIService,
    AIDocument,
    PolicyMetadata,
    GapDefinitionForAI,
    AIPolicyExtractionResponse,
    AIGapAnalysisResponse,
    AITrackingOptions
} from './ai-service.interface'

export class MockAIService implements IAIService {
    private shouldFail: boolean = false
    private delay: number = 500 // Simulate network delay

    constructor(options?: { shouldFail?: boolean; delay?: number }) {
        this.shouldFail = options?.shouldFail || false
        this.delay = options?.delay || 500
    }

    /**
     * Mock service is always available
     */
    isAvailable(): boolean {
        return true
    }

    /**
     * Gets the service name
     */
    getServiceName(): string {
        return 'Mock AI (Testing)'
    }

    /**
     * Simulates policy data extraction
     */
    async extractPolicyData(document: AIDocument, options?: AITrackingOptions): Promise<AIPolicyExtractionResponse> {
        // Simulate network delay
        await this.simulateDelay()

        if (this.shouldFail) {
            throw new Error('Mock AI extraction failed (intentional)')
        }

        logger('info', 'Mock AI extraction completed', {
            fileName: document.fileName
        })

        // Return mock data
        return {
            insurerName: 'Mock Insurance Co.',
            policyNumber: `MOCK-${Date.now()}`,
            lineOfBusiness: 'motor',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            premiumAmount: 500,
            coverageSummary: 'Mock policy with standard coverage'
        }
    }

    /**
     * Simulates gap analysis
     */
    async analyzeGaps(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        gapDefinitions: GapDefinitionForAI[],
        options?: AITrackingOptions
    ): Promise<AIGapAnalysisResponse> {
        // Simulate network delay
        await this.simulateDelay()

        if (this.shouldFail) {
            throw new Error('Mock AI gap analysis failed (intentional)')
        }

        logger('info', 'Mock AI gap analysis completed', {
            policyNumber: metadata.policyNumber,
            gapsChecked: gapDefinitions.length
        })

        // Simulate detecting 30% of gaps
        const gapResults = gapDefinitions.map((def, index) => ({
            slug: def.slug,
            isDetected: index % 3 === 0, // Detect every 3rd gap
            explanation: {
                en: `Mock explanation for ${def.name}`,
                el: `Εικονική εξήγηση για ${def.name}`
            },
            suggestion: {
                en: `Mock suggestion for ${def.name}`,
                el: `Εικονική πρόταση για ${def.name}`
            }
        }))

        return {
            verifiedMetadata: {
                insurerName: metadata.insurerName,
                policyNumber: metadata.policyNumber,
                lineOfBusiness: metadata.lineOfBusiness,
                startDate: metadata.startDate.toISOString().split('T')[0],
                endDate: metadata.endDate.toISOString().split('T')[0],
                premiumAmount: metadata.premiumAmount || 0,
                coverageSummary: metadata.coverageSummary || 'Mock coverage summary'
            },
            gapResults,
            acordData: {
                acordStandard: 'V1.0',
                policy: {
                    number: metadata.policyNumber,
                    type: metadata.lineOfBusiness
                },
                vehicle: {},
                coverages: []
            }
        }
    }

    /**
     * Simulates network delay
     */
    private async simulateDelay(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, this.delay))
    }

    /**
     * Sets whether the mock should fail
     */
    setShouldFail(shouldFail: boolean): void {
        this.shouldFail = shouldFail
    }

    /**
     * Sets the simulated delay
     */
    setDelay(delay: number): void {
        this.delay = delay
    }
}
