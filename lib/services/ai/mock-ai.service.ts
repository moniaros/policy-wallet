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
    AICapabilityCheckInput,
    AICapabilityCheckResult,
    AICapabilityMetadata,
    PolicyMetadata,
    GapDefinitionForAI,
    AIPolicyExtractionResponse,
    AIGapAnalysisResponse,
    AIPolicyClarityResponse,
    AITrackingOptions
} from './ai-service.interface'
import { enrichExtractionPayload } from './extraction-enrichment'

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

    getCapabilities(): AICapabilityMetadata {
        return {
            provider: "mock",
            supportsDocumentInput: true,
            supportedMimeTypes: [
                "application/pdf",
                "image/png",
                "image/jpeg",
                "image/webp",
            ],
            modelPatterns: [".*"],
        }
    }

    checkCapabilities(input: AICapabilityCheckInput): AICapabilityCheckResult {
        const capabilities = this.getCapabilities()
        return {
            supported: true,
            code: "OK",
            reason: `Mock provider supports operation ${input.operation}`,
            userMessageKey: "analysis.status.inProgress",
            metadata: capabilities,
        }
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

        const base = {
            insurerName: 'Mock Insurance Co.',
            policyNumber: `MOCK-${Date.now()}`,
            lineOfBusiness: 'motor',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            premiumAmount: 500,
            coverageSummary: 'Mock policy with standard coverage',
            customerName: 'John',
            customerSurname: 'Doe',
            customerEmail: 'john.doe@example.com',
            exclusions: ['Driving under influence', 'Commercial use not declared'],
            extractionConfidence: {
                overall: 88,
                fields: {
                    insurerName: 96,
                    policyNumber: 92,
                    lineOfBusiness: 90,
                    startDate: 84,
                    endDate: 85,
                    premiumAmount: 88,
                }
            },
            acordData: {
                policy: {
                    insurerName: 'Mock Insurance Co.',
                    policyNumber: `MOCK-${Date.now()}`,
                }
            }
        }
        const enriched = enrichExtractionPayload(base)

        // Return mock data
        return {
            ...base,
            exclusions: enriched.exclusions,
            extractionMeta: enriched.extractionMeta,
            acordData: enriched.acordData,
            usage: {
                inputTokens: 2400,
                outputTokens: 900,
                totalTokens: 3300,
                model: options?.modelOverride || 'gemini-2.0-flash-exp'
            }
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

        const response = {
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
                coverages: [],
                exclusions: ['Damage during illegal activity']
            }
        }
        const enriched = enrichExtractionPayload({
            insurerName: response.verifiedMetadata.insurerName,
            policyNumber: response.verifiedMetadata.policyNumber,
            lineOfBusiness: response.verifiedMetadata.lineOfBusiness,
            startDate: response.verifiedMetadata.startDate,
            endDate: response.verifiedMetadata.endDate,
            premiumAmount: response.verifiedMetadata.premiumAmount,
            exclusions: response.acordData.exclusions,
            extractionConfidence: {
                overall: 86,
                fields: {
                    insurerName: 95,
                    policyNumber: 93,
                    lineOfBusiness: 90,
                    startDate: 80,
                    endDate: 80,
                    premiumAmount: 78,
                }
            },
            acordData: response.acordData
        })
        response.acordData = enriched.acordData
        ;(response as any).usage = {
            inputTokens: 3200,
            outputTokens: 1100,
            totalTokens: 4300,
            model: options?.modelOverride || 'gemini-2.0-flash-exp'
        }
        return response
    }

    async analyzePolicyClarity(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        checklist: Array<{
            key: string
            title: { en: string; el: string }
            description: { en: string; el: string }
            checks: string[]
        }>,
        options?: AITrackingOptions
    ): Promise<AIPolicyClarityResponse> {
        await this.simulateDelay()

        if (this.shouldFail) {
            throw new Error('Mock AI clarity analysis failed')
        }

        return {
            plainLanguageSummary: {
                en: `This ${metadata.lineOfBusiness} policy is active and can be improved in selected areas.`,
                el: `Το συμβόλαιο ${metadata.lineOfBusiness} είναι ενεργό και μπορεί να βελτιωθεί σε επιλεγμένα σημεία.`,
            },
            coverageSnapshot: {
                covered: ['Third party liability', 'Legal protection'],
                notCovered: ['Natural disaster extension'],
                limits: [{ name: 'Third party bodily injury', value: '1300000' }],
                deductibles: [{ name: 'Own damage deductible', value: '300 EUR' }],
                exclusions: ['Damage during illegal use'],
            },
            savingsOpportunities: [
                {
                    action: {
                        en: 'Request renewal market comparison',
                        el: 'Ζητήστε σύγκριση αγοράς στην ανανέωση',
                    },
                    rationale: {
                        en: 'Premium appears above benchmark for similar profile.',
                        el: 'Το ασφάλιστρο φαίνεται υψηλότερο από το μέσο όρο για παρόμοιο προφίλ.',
                    },
                    estimatedAnnualSavingsEur: 120,
                    confidence: 76,
                },
            ],
            coverageGaps: [
                {
                    slug: 'natural_disaster_extension_missing',
                    severity: 'medium',
                    evidence: {
                        en: 'No explicit flood/earthquake extension found.',
                        el: 'Δεν εντοπίστηκε ρητή επέκταση για πλημμύρα/σεισμό.',
                    },
                    recommendation: {
                        en: 'Consider adding natural disaster extension.',
                        el: 'Εξετάστε την προσθήκη επέκτασης φυσικών φαινομένων.',
                    },
                },
            ],
            checklistScores: checklist.map((pillar) => ({
                pillarKey: pillar.key,
                pillarName: pillar.title,
                checksPassed: Math.max(1, pillar.checks.length - 1),
                checksTotal: pillar.checks.length,
                successPct: Math.round((Math.max(1, pillar.checks.length - 1) / pillar.checks.length) * 100),
                notes: {
                    en: `Mock assessment for ${pillar.title.en}.`,
                    el: `Εικονική αξιολόγηση για ${pillar.title.el}.`,
                },
            })),
            priorityActions: [
                {
                    priority: 'high',
                    action: {
                        en: 'Review uncovered risks with advisor',
                        el: 'Ελέγξτε τα ακάλυπτα ρίσκα με σύμβουλο',
                    },
                    reason: {
                        en: 'At least one medium/high impact gap detected.',
                        el: 'Εντοπίστηκε τουλάχιστον ένα κενό μέσης/υψηλής επίδρασης.',
                    },
                },
            ],
            acordData: {
                policy: {
                    number: metadata.policyNumber,
                },
            },
            usage: {
                inputTokens: 3500,
                outputTokens: 1400,
                totalTokens: 4900,
                model: options?.modelOverride || 'gemini-2.0-flash-exp',
            },
        }
    }

    /**
     * Simulates network delay
     */
    private async simulateDelay(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, this.delay))
    }

    /**
     * Answers a question about a policy (Mock)
     */
    async askQuestion(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        question: string,
        options?: AITrackingOptions
    ): Promise<string> {
        await this.simulateDelay()

        if (this.shouldFail) {
            throw new Error('Mock AI Chat failed')
        }

        return `This is a mock answer to your question: "${question}". I've analyzed your ${metadata.insurerName} policy.`
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
