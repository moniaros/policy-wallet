/**
 * Anthropic AI Service Implementation
 *
 * Premium failover provider using Claude models.
 * Activates when Gemini fails or for Pro-tier users.
 * Failover chain: Gemini -> Claude -> OpenAI.
 */

import { createAnthropic } from "@ai-sdk/anthropic"
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
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"
import { enrichExtractionPayload } from "./extraction-enrichment"
import { extractionCitationsEnabled, ExtractionSourcesSchema } from "./extraction-citations"
import { matchesAnyPattern, withTimeoutAndRetry, parseUsage as parseUsageShared } from "./shared-utils"
import {
    buildExtractionPrompt,
    buildGapAnalysisPrompt,
    buildClarityPrompt,
    buildQaPrompt,
    buildRiskProfilePrompt,
} from "./prompts"
import { wrapGapResultsBilingual, wrapClarityResultsBilingual } from "../translation/greek-to-bilingual"

const ANTHROPIC_SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
]
const ANTHROPIC_MODEL_PATTERNS = ["^claude-"]

function parseUsage(usage: any, model: string) {
    return parseUsageShared(usage, model, "anthropic")
}

export class AnthropicAIService implements IAIService {
    private apiKey: string | null = null
    private aiProvider: ReturnType<typeof createAnthropic> | null = null

    constructor(apiKey?: string) {
        const key = apiKey || process.env.ANTHROPIC_API_KEY
        if (key && typeof key === "string" && key.trim().length > 0 && key !== "undefined" && key !== "null") {
            this.apiKey = key.trim()
            try {
                this.aiProvider = createAnthropic({ apiKey: this.apiKey })
            } catch (err) {
                logger("error", "Failed to initialize Anthropic SDK", {
                    error: err instanceof Error ? err.message : String(err),
                })
                this.aiProvider = null
                this.apiKey = null
            }
        }
    }

    isAvailable(): boolean {
        return this.aiProvider !== null && this.apiKey !== null
    }

    getServiceName(): string {
        return "Anthropic Claude"
    }

    getCapabilities(): AICapabilityMetadata {
        return {
            provider: "anthropic",
            supportsDocumentInput: true,
            supportedMimeTypes: ANTHROPIC_SUPPORTED_MIME_TYPES,
            modelPatterns: ANTHROPIC_MODEL_PATTERNS,
        }
    }

    checkCapabilities(input: AICapabilityCheckInput): AICapabilityCheckResult {
        const capabilities = this.getCapabilities()
        const model = (input.model || "").trim()

        if (model && !matchesAnyPattern(model, capabilities.modelPatterns)) {
            return {
                supported: false,
                code: "AI_CAPABILITY_UNSUPPORTED_MODEL",
                reason: `Model '${model}' is not supported by provider anthropic`,
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
                    reason: `MIME type '${mimeType || "unknown"}' is not supported by provider anthropic`,
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
        if (!this.aiProvider) throw new Error("Anthropic service not available")
        const modelName = options?.modelOverride || env.CLAUDE_MODEL_EXTRACTION

        const ExtractionSchema = z.object({
            insurerName: z.string().optional().describe("Insurance company name"),
            policyNumber: z.string().optional().describe("Policy number"),
            lineOfBusiness: z.string().optional().describe(`Exactly one of: ${WRITE_BRANCH_IDS.join(", ")}`),
            startDate: z.string().optional().describe("Policy start date YYYY-MM-DD"),
            endDate: z.string().optional().describe("Policy end date YYYY-MM-DD"),
            premiumAmount: z.number().optional().describe("Annual premium, numeric only"),
            issueDate: z.string().optional().describe("Policy issue/signature date YYYY-MM-DD (Ημερομηνία έκδοσης)"),
            premiumFrequency: z.enum(["annual", "semiannual", "quarterly", "monthly", "one_off"]).optional().describe("Premium payment frequency (Συχνότητα καταβολής ασφαλίστρων)"),
            renewalDate: z.string().optional().describe("Policy renewal date YYYY-MM-DD if stated (Ημερομηνία ανανέωσης)"),
            coverageSummary: z.string().optional().describe("Brief summary of main coverages, max 200 chars"),
            customerName: z.string().optional(),
            customerSurname: z.string().optional(),
            customerEmail: z.string().optional(),
            customerPhone: z.string().optional().describe("Policyholder phone number (Τηλέφωνο, Κινητό)"),
            customerTaxId: z.string().optional().describe("Policyholder VAT / 9-digit Greek ΑΦΜ (ΑΦΜ, Α.Φ.Μ., ΔΟΥ, VAT)"),
            exclusions: z.array(z.string()).optional().describe("Top exclusions found"),
            extractionConfidence: z.object({
                overall: z.number().describe("0-100 confidence score"),
                requiresReview: z.boolean(),
                fields: z.record(z.string(), z.number()).describe("Per-field confidence 0-100 for: insurerName, policyNumber, lineOfBusiness, startDate, endDate, premiumAmount, issueDate, premiumFrequency, renewalDate"),
            }).optional(),
            ...(extractionCitationsEnabled() ? { extractionSources: ExtractionSourcesSchema } : {}),
            acordData: AcordDataSchema.optional().describe("Type-specific structured data matching the detected lineOfBusiness"),
        })

        // Shared canonical extraction prompt (lib/services/ai/prompts.ts);
        // the output contract is the schema-constrained ExtractionSchema.
        // NEVER pass temperature/top_p in this service: Claude Sonnet 5 (the
        // extraction/gap/clarity default) rejects non-default sampling params
        // with a 400; omitting them is safe on every Claude model.
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
                                { type: "text", text: buildExtractionPrompt(options?.operatorGuidance) },
                                {
                                    type: "file",
                                    data: document.data,
                                    mediaType: document.mimeType,
                                    filename: document.fileName,
                                } as any,
                            ],
                        },
                    ],
                }),
            "Anthropic extraction generateObject"
        )

        const extracted = result.object
        const enriched = enrichExtractionPayload(extracted, undefined, 'anthropic')
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

        logger("info", "Anthropic extraction successful", {
            fileName: document.fileName,
            insurerName: extracted.insurerName,
            policyNumber: extracted.policyNumber,
        })

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
        if (!this.aiProvider) throw new Error("Anthropic service not available")
        const modelName = options?.modelOverride || env.CLAUDE_MODEL_GAP_ANALYSIS

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
                    isDetected: z.boolean(),
                    explanation: z.string().describe("Gap explanation in Greek"),
                    suggestion: z.string().describe("Remediation suggestion in Greek"),
                })
            ),
            acordData: AcordDataSchema.optional(),
        })

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
                }),
            "Anthropic gap analysis"
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
        if (!this.aiProvider) throw new Error("Anthropic service not available")
        const modelName = options?.modelOverride || env.CLAUDE_MODEL_CLARITY_ANALYSIS

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
                    severity: z.enum(["low", "medium", "high", "critical"]),
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
                }),
            "Anthropic clarity analysis"
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
        if (!this.aiProvider) throw new Error("Anthropic service not available")
        const modelName = options?.modelOverride || env.CLAUDE_MODEL_QA

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
                }),
            "Anthropic Q&A"
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
            }).catch((err) => logger("error", "Failed to track Anthropic Q&A token usage", { error: err }))
        }

        return result.text
    }

    // ── Risk Profile Analysis ────────────────────────────────────────

    async analyzeRiskProfile(
        profile: RiskProfileInput,
        existingPolicies: PolicyMetadata[],
        options?: AITrackingOptions
    ): Promise<AIRiskProfileAnalysisResponse> {
        if (!this.aiProvider) throw new Error("Anthropic service not available")

        // Honor a router-supplied modelOverride (previously ignored on this path).
        const modelName = (options?.modelOverride || env.CLAUDE_MODEL_QA) as string

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
                }),
                "Anthropic risk profile analysis"
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
                }).catch(err => logger("error", "Failed to track Anthropic risk profile analysis token usage", { error: err }))
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
            logger("error", "Anthropic risk profile analysis failed", {
                userId: options?.userId,
                error: error instanceof Error ? error.message : String(error),
            })
            throw error
        }
    }
}
