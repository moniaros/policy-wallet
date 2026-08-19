/**
 * OpenAI AI Service Implementation
 *
 * Secondary provider used for remediation failover and canary rollout.
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import { trackTokenUsage } from "@/lib/token-tracking"
import type {
    AIDocument,
    AICapabilityCheckInput,
    AICapabilityCheckResult,
    AICapabilityMetadata,
    AIGapAnalysisResponse,
    AIPolicyClarityResponse,
    AIPolicyExtractionResponse,
    AIRiskProfileAnalysisResponse,
    AITrackingOptions,
    GapDefinitionForAI,
    IAIService,
    PolicyMetadata,
    RiskProfileInput,
} from "./ai-service.interface"
import { AcordDataSchema } from "@/lib/schemas/acord-data"
import { enrichExtractionPayload } from "./extraction-enrichment"
import { buildExtractionSchema } from "./extraction-schema"
import { matchesAnyPattern, withTimeoutAndRetry, parseUsage as parseUsageShared } from "./shared-utils"
import {
    buildExtractionPrompt,
    buildGapAnalysisPrompt,
    buildClarityPrompt,
    buildQaPrompt,
    buildRiskProfilePrompt,
} from "./prompts"
import { wrapGapResultsBilingual, wrapClarityResultsBilingual } from "../translation/greek-to-bilingual"

const OPENAI_SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
]
const OPENAI_MODEL_PATTERNS = ["^gpt-", "^o[1-9]", "^text-", "^chatgpt-"]

function parseUsage(usage: any, model: string) {
    return parseUsageShared(usage, model, "openai")
}

export class OpenAIAIService implements IAIService {
    private apiKey: string | null = null
    private aiProvider: ReturnType<typeof createOpenAI> | null = null

    constructor(apiKey?: string) {
        const key = apiKey || process.env.OPENAI_API_KEY
        if (key && typeof key === "string" && key.trim().length > 0) {
            this.apiKey = key.trim()
            this.aiProvider = createOpenAI({ apiKey: this.apiKey })
        }
    }

    isAvailable(): boolean {
        return this.aiProvider !== null && this.apiKey !== null
    }

    getServiceName(): string {
        return "OpenAI"
    }

    getCapabilities(): AICapabilityMetadata {
        return {
            provider: "openai",
            supportsDocumentInput: true,
            supportedMimeTypes: OPENAI_SUPPORTED_MIME_TYPES,
            modelPatterns: OPENAI_MODEL_PATTERNS,
        }
    }

    checkCapabilities(input: AICapabilityCheckInput): AICapabilityCheckResult {
        const capabilities = this.getCapabilities()
        const model = (input.model || "").trim()

        if (model && !matchesAnyPattern(model, capabilities.modelPatterns)) {
            return {
                supported: false,
                code: "AI_CAPABILITY_UNSUPPORTED_MODEL",
                reason: `Model '${model}' is not supported by provider openai`,
                userMessageKey: "analysis.errors.unavailable",
                metadata: capabilities,
            }
        }

        if (input.hasDocument) {
            const mimeType = (input.mimeType || "").trim().toLowerCase()
            if (!mimeType || !capabilities.supportedMimeTypes.includes(mimeType)) {
                return {
                    supported: false,
                    code: "AI_CAPABILITY_UNSUPPORTED_MIME",
                    reason: `MIME type '${mimeType || "unknown"}' is not supported by provider openai`,
                    userMessageKey: "analysis.errors.document",
                    metadata: capabilities,
                }
            }
        }

        return {
            supported: true,
            code: "OK",
            reason: "Capability check passed",
            userMessageKey: "analysis.status.inProgress",
            metadata: capabilities,
        }
    }

    async extractPolicyData(document: AIDocument, options?: AITrackingOptions): Promise<AIPolicyExtractionResponse> {
        if (!this.aiProvider) throw new Error("OpenAI service not available")
        const modelName = options?.modelOverride || env.OPENAI_MODEL_EXTRACTION

        const ExtractionSchema = buildExtractionSchema()

        const result = await withTimeoutAndRetry(
            (signal) =>
                generateObject({
                    // Propagate the wrapper's timeout abort so a timed-out call stops
                    // billing; the wrapper owns retries (SDK default of 2 multiplied
                    // every layer's attempts).
                    abortSignal: signal,
                    maxRetries: 0,
                    model: this.aiProvider!(modelName as string),
                    schema: ExtractionSchema,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: buildExtractionPrompt(options?.operatorGuidance, options?.lineOfBusinessHint) },
                                {
                                    type: "file",
                                    data: document.data,
                                    mediaType: document.mimeType,
                                    filename: document.fileName,
                                } as any,
                            ],
                        },
                    ],
                    temperature: 0.1,
                }),
            "OpenAI extraction generateObject"
        )

        const extracted = result.object
        const enriched = enrichExtractionPayload(extracted, undefined, 'openai')
        const parsedUsage = parseUsage(result.usage, modelName)

        if (options?.userId && result.usage) {
            await trackTokenUsage({
                userId: options.userId,
                operationType: "policy_analysis",
                policyId: options.policyId,
                inputTokens: parsedUsage.inputTokens,
                outputTokens: parsedUsage.outputTokens,
                model: modelName as any,
            })
        }

        return {
            insurerName: extracted.insurerName || "Unknown Insurer",
            policyNumber: extracted.policyNumber || `PENDING-${Date.now()}`,
            lineOfBusiness: extracted.lineOfBusiness || "other",
            // Missing dates stay empty — no fabricated 'today' (data integrity).
            startDate: extracted.startDate || '',
            endDate: extracted.endDate || '',
            premiumAmount: extracted.premiumAmount || 0,
            coverageSummary: extracted.coverageSummary || "Extracted from document",
            issueDate: extracted.issueDate,
            premiumFrequency: extracted.premiumFrequency,
            renewalDate: extracted.renewalDate,
            customerName: extracted.customerName,
            customerSurname: extracted.customerSurname,
            customerEmail: extracted.customerEmail,
            customerPhone: extracted.customerPhone,
            customerTaxId: extracted.customerTaxId,
            documentKind: enriched.documentKind,
            evidence: enriched.evidence,
            exclusions: enriched.exclusions,
            extractionMeta: enriched.extractionMeta,
            acordData: enriched.acordData,
            usage: parsedUsage,
        }
    }

    async analyzeGaps(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        gapDefinitions: GapDefinitionForAI[],
        options?: AITrackingOptions
    ): Promise<AIGapAnalysisResponse> {
        if (!this.aiProvider) throw new Error("OpenAI service not available")
        const modelName = options?.modelOverride || env.OPENAI_MODEL_GAP_ANALYSIS

        const GapAnalysisSchema = z.object({
            verifiedMetadata: z.object({
                insurerName: z.string().optional(),
                policyNumber: z.string().optional(),
                lineOfBusiness: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                premiumAmount: z.number().optional(),
                coverageSummary: z.string().optional(),
            }),
            gapResults: z.array(
                z.object({
                    slug: z.string(),
                    explanation: z.string().describe("Gap explanation in Greek"),
                    suggestion: z.string().describe("Remediation suggestion in Greek"),
                })
            ),
            acordData: AcordDataSchema.optional(),
        })

        // When structured context is available, use compact JSON instead of re-sending the PDF
        const prompt = buildGapAnalysisPrompt(metadata, gapDefinitions, options?.structuredContext, !!document, options?.operatorGuidance)

        const parts: any[] = [{ type: "text", text: prompt }]
        if (document) {
            parts.push({
                type: "file",
                data: document.data,
                mediaType: document.mimeType,
                filename: document.fileName,
            })
        }

        const result = await withTimeoutAndRetry(
            (signal) =>
                generateObject({
                    // Propagate the wrapper's timeout abort so a timed-out call stops
                    // billing; the wrapper owns retries (SDK default of 2 multiplied
                    // every layer's attempts).
                    abortSignal: signal,
                    maxRetries: 0,
                    model: this.aiProvider!(modelName as string),
                    schema: GapAnalysisSchema,
                    messages: [{ role: "user", content: parts }],
                    temperature: 0.2,
                }),
            "OpenAI gap analysis"
        )

        const parsedUsage = parseUsage(result.usage, modelName)
        if (options?.userId && result.usage) {
            await trackTokenUsage({
                userId: options.userId,
                operationType: "gap_detection",
                policyId: options.policyId,
                inputTokens: parsedUsage.inputTokens,
                outputTokens: parsedUsage.outputTokens,
                model: modelName as any,
            })
        }

        return {
            verifiedMetadata: result.object.verifiedMetadata,
            gapResults: wrapGapResultsBilingual(result.object.gapResults),
            acordData: result.object.acordData,
            usage: parsedUsage,
        }
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
        if (!this.aiProvider) throw new Error("OpenAI service not available")
        const modelName = options?.modelOverride || env.OPENAI_MODEL_CLARITY_ANALYSIS

        const ClaritySchema = z.object({
            plainLanguageSummary: z.string().describe("Plain-language summary in Greek"),
            coverageSnapshot: z.object({
                covered: z.array(z.string()).default([]),
                notCovered: z.array(z.string()).default([]),
                limits: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
                deductibles: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
                exclusions: z.array(z.string()).default([]),
            }),
            savingsOpportunities: z.array(
                z.object({
                    action: z.string().describe("Savings action in Greek"),
                    rationale: z.string().describe("Rationale in Greek"),
                    estimatedAnnualSavingsEur: z.number().nullable(),
                    confidence: z.number().min(0).max(100),
                })
            ).default([]),
            coverageGaps: z.array(
                z.object({
                    slug: z.string(),
                    evidence: z.string().describe("Gap evidence in Greek"),
                    recommendation: z.string().describe("Recommendation in Greek"),
                })
            ).default([]),
            checklistScores: z.array(
                z.object({
                    pillarKey: z.string(),
                    pillarName: z.string().describe("Pillar name in Greek"),
                    checksPassed: z.number().int().min(0),
                    checksTotal: z.number().int().min(1),
                    successPct: z.number().int().min(0).max(100),
                    notes: z.string().describe("Notes in Greek"),
                })
            ).default([]),
            priorityActions: z.array(
                z.object({
                    priority: z.enum(["high", "medium", "low"]),
                    action: z.string().describe("Action in Greek"),
                    reason: z.string().describe("Reason in Greek"),
                })
            ).default([]),
            finePrintWarnings: z.array(z.object({
                clause: z.string().describe("Restricting clause in Greek"),
                riskLevel: z.enum(["info", "warning", "critical"]),
                impact: z.string().describe("Why this matters, in Greek"),
            })).default([]),
            hiddenPerks: z.array(z.object({
                name: z.string().describe("Perk name in Greek"),
                description: z.string().describe("Description in Greek"),
                phone: z.string().optional(),
                usageFrequency: z.string().optional(),
            })).default([]),
            acordData: AcordDataSchema.optional(),
        })

        // When structured context is available, use compact JSON instead of re-sending the PDF
        const prompt = buildClarityPrompt(metadata, checklist, options?.structuredContext, !!document, options?.operatorGuidance)

        const parts: any[] = [{ type: "text", text: prompt }]
        if (document) {
            parts.push({
                type: "file",
                data: document.data,
                mediaType: document.mimeType,
                filename: document.fileName,
            })
        }

        const result = await withTimeoutAndRetry(
            (signal) =>
                generateObject({
                    // Propagate the wrapper's timeout abort so a timed-out call stops
                    // billing; the wrapper owns retries (SDK default of 2 multiplied
                    // every layer's attempts).
                    abortSignal: signal,
                    maxRetries: 0,
                    model: this.aiProvider!(modelName as string),
                    schema: ClaritySchema,
                    messages: [{ role: "user", content: parts }],
                    temperature: 0.2,
                }),
            "OpenAI clarity analysis"
        )

        const parsedUsage = parseUsage(result.usage, modelName)
        if (options?.userId && result.usage) {
            await trackTokenUsage({
                userId: options.userId,
                operationType: "policy_clarity",
                policyId: options.policyId,
                inputTokens: parsedUsage.inputTokens,
                outputTokens: parsedUsage.outputTokens,
                model: modelName as any,
            })
        }

        return wrapClarityResultsBilingual({
            ...result.object,
            usage: parsedUsage,
        })
    }

    async askQuestion(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        question: string,
        options?: AITrackingOptions
    ): Promise<string> {
        if (!this.aiProvider) throw new Error("OpenAI service not available")
        const modelName = options?.modelOverride || env.OPENAI_MODEL_QA

        const parts: any[] = [
            {
                type: "text",
                text: buildQaPrompt(metadata, question, options?.structuredContext?.acordData, options?.operatorGuidance),
            },
        ]

        if (document) {
            parts.push({
                type: "file",
                data: document.data,
                mediaType: document.mimeType,
                filename: document.fileName,
            })
        }

        const result = await withTimeoutAndRetry(
            (signal) =>
                generateText({
                    // Propagate the wrapper's timeout abort so a timed-out call stops
                    // billing; the wrapper owns retries (SDK default of 2 multiplied
                    // every layer's attempts).
                    abortSignal: signal,
                    maxRetries: 0,
                    model: this.aiProvider!(modelName as string),
                    messages: [{ role: "user", content: parts }],
                    temperature: 0.3,
                }),
            "OpenAI Q&A"
        )

        const parsedUsage = parseUsage(result.usage, modelName)
        if (options?.userId && result.usage) {
            await trackTokenUsage({
                userId: options.userId,
                operationType: "qa_session",
                policyId: options.policyId,
                inputTokens: parsedUsage.inputTokens,
                outputTokens: parsedUsage.outputTokens,
                model: modelName as any,
            }).catch((err) => logger("error", "Failed to track OpenAI Q&A token usage", { error: err }))
        }

        return result.text
    }

    // ── Risk Profile Analysis ────────────────────────────────────────

    async analyzeRiskProfile(
        profile: RiskProfileInput,
        existingPolicies: PolicyMetadata[],
        options?: AITrackingOptions
    ): Promise<AIRiskProfileAnalysisResponse> {
        if (!this.aiProvider) throw new Error("OpenAI service not available")

        // Honor a router-supplied modelOverride (previously ignored on this path).
        const modelName = (options?.modelOverride || env.OPENAI_MODEL_QA) as string

        const RiskProfileAnalysisSchema = z.object({
            riskSummary: z.object({
                en: z.string().describe("English risk summary (2-3 sentences)"),
                el: z.string().describe("Greek risk summary (2-3 sentences)"),
            }),
            riskLevel: z.enum(["low", "moderate", "high", "very_high"]),
            insights: z.array(z.object({
                category: z.string(),
                insight: z.object({ en: z.string(), el: z.string() }),
                urgency: z.enum(["critical", "high", "medium", "low"]),
                actionable: z.boolean(),
            })).describe("Informational coverage observations (max 5)"),
            prioritizedGaps: z.array(z.object({
                lineOfBusiness: z.string(),
                reason: z.object({ en: z.string(), el: z.string() }),
                urgency: z.enum(["critical", "high", "medium", "low"]),
            })).describe("Insurance lines not currently detected in the portfolio (max 5)"),
            profileStrengths: z.array(z.object({
                en: z.string(),
                el: z.string(),
            })).describe("Positive aspects of current coverage (max 3)"),
        })

        const prompt = buildRiskProfilePrompt(profile, existingPolicies, options?.operatorGuidance)

        try {
            const result = await withTimeoutAndRetry(
                (signal) => generateObject({
                  // Propagate the wrapper's timeout abort so a timed-out call stops
                  // billing; the wrapper owns retries (SDK default of 2 multiplied
                  // every layer's attempts).
                  abortSignal: signal,
                  maxRetries: 0,
                    model: this.aiProvider!(modelName),
                    schema: RiskProfileAnalysisSchema,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                }),
                "OpenAI risk profile analysis"
            )

            const analysis = result.object
            const parsedUsage = parseUsage(result.usage, modelName)

            if (options?.userId && result.usage) {
                trackTokenUsage({
                    userId: options.userId,
                    operationType: "risk_profile_analysis",
                    inputTokens: parsedUsage.inputTokens,
                    outputTokens: parsedUsage.outputTokens,
                    model: modelName as any,
                }).catch(err => logger("error", "Failed to track OpenAI risk profile analysis token usage", { error: err }))
            }

            return {
                riskSummary: analysis.riskSummary,
                riskLevel: analysis.riskLevel,
                insights: analysis.insights,
                prioritizedGaps: analysis.prioritizedGaps,
                profileStrengths: analysis.profileStrengths,
                usage: parsedUsage,
            }
        } catch (error) {
            logger("error", "OpenAI risk profile analysis failed", {
                userId: options?.userId,
                error: error instanceof Error ? error.message : String(error),
            })
            throw error
        }
    }
}
