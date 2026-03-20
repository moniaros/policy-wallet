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
    AITrackingOptions,
    GapDefinitionForAI,
    IAIService,
    PolicyMetadata,
} from "./ai-service.interface"
import { AcordDataSchema } from "@/lib/schemas/acord-data"
import { enrichExtractionPayload } from "./extraction-enrichment"
import { matchesAnyPattern, withTimeoutAndRetry, parseUsage as parseUsageShared } from "./shared-utils"

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
            lineOfBusiness: z.string().optional().describe("One of: motor, health, home, life, travel, liability, pet, other"),
            startDate: z.string().optional().describe("Policy start date YYYY-MM-DD"),
            endDate: z.string().optional().describe("Policy end date YYYY-MM-DD"),
            premiumAmount: z.number().optional().describe("Annual premium, numeric only"),
            coverageSummary: z.string().optional().describe("Brief summary of main coverages, max 200 chars"),
            customerName: z.string().optional(),
            customerSurname: z.string().optional(),
            customerEmail: z.string().optional(),
            exclusions: z.array(z.string()).optional().describe("Top exclusions found"),
            extractionConfidence: z.object({
                overall: z.number().describe("0-100 confidence score"),
                requiresReview: z.boolean(),
                fields: z.record(z.string(), z.number()),
            }).optional(),
            acordData: AcordDataSchema.optional().describe("Type-specific structured data matching the detected lineOfBusiness"),
        })

        const prompt = `Extract ALL insurance policy data from this document into structured JSON.
Rules: Extract exactly as shown. Dates: YYYY-MM-DD. Amounts: numeric only. Unknown fields: null.
Handle both Greek (Ασφάλιστρο, Απαλλαγή, Εξαιρέσεις, Ισχύς) and English documents.
Only populate the type-specific ACORD section matching the detected lineOfBusiness.`

        const result = await withTimeoutAndRetry(
            () =>
                generateObject({
                    model: this.aiProvider!(modelName as string),
                    schema: ExtractionSchema,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
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
            "Anthropic extraction generateObject"
        )

        const extracted = result.object
        const enriched = enrichExtractionPayload(extracted)
        const parsedUsage = parseUsage(result.usage, modelName)

        if (options?.userId && result.usage) {
            await trackTokenUsage({
                userId: options.userId,
                operationType: "policy_analysis",
                policyId: options.policyId,
                inputTokens: parsedUsage.inputTokens,
                outputTokens: parsedUsage.outputTokens,
                model: modelName as any,
            }).catch((err) => logger("error", "Failed to track Anthropic extraction token usage", { error: err }))
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
            startDate: extracted.startDate || new Date().toISOString().split("T")[0],
            endDate: extracted.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            premiumAmount: extracted.premiumAmount || 0,
            coverageSummary: extracted.coverageSummary || "Extracted from document",
            customerName: extracted.customerName,
            customerSurname: extracted.customerSurname,
            customerEmail: extracted.customerEmail,
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
        const hasStructuredContext = !!options?.structuredContext

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
                    explanation: z.object({ en: z.string(), el: z.string() }),
                    suggestion: z.object({ en: z.string(), el: z.string() }),
                })
            ),
            acordData: AcordDataSchema.optional(),
        })

        let prompt: string
        if (hasStructuredContext && !document) {
            const ctx = options!.structuredContext!
            prompt = `Analyze pre-extracted insurance policy data and identify coverage gaps.
Provide explanations in BOTH English (en) and Greek (el).
Extracted Policy Data:
- Insurer: ${ctx.insurerName} | Policy: ${ctx.policyNumber} | Type: ${ctx.lineOfBusiness}
- Period: ${ctx.startDate} to ${ctx.endDate} | Premium: ${ctx.premiumAmount}
- Summary: ${ctx.coverageSummary || "N/A"}
- Exclusions: ${ctx.exclusions?.join(", ") || "None extracted"}
${ctx.acordData ? `- ACORD Data: ${JSON.stringify(ctx.acordData)}` : ""}
Gap definitions:
${gapDefinitions.map((g) => `- ${g.slug}: ${g.checkCriteria}`).join("\n")}`
        } else {
            prompt = `Analyze insurance policy and identify coverage gaps.
Provide explanations in BOTH English (en) and Greek (el).
Current metadata:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Dates: ${metadata.startDate.toISOString().split("T")[0]} to ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"} | Summary: ${metadata.coverageSummary || "N/A"}
Gap definitions:
${gapDefinitions.map((g) => `- ${g.slug}: ${g.checkCriteria}`).join("\n")}`
        }

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
            () =>
                generateObject({
                    model: this.aiProvider!(modelName as string),
                    schema: GapAnalysisSchema,
                    messages: [{ role: "user", content: parts }],
                    temperature: 0.2,
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
            }).catch((err) => logger("error", "Failed to track Anthropic gap token usage", { error: err }))
        }

        return {
            verifiedMetadata: result.object.verifiedMetadata,
            gapResults: result.object.gapResults,
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
        const hasStructuredContext = !!options?.structuredContext

        const ClaritySchema = z.object({
            plainLanguageSummary: z.object({ en: z.string(), el: z.string() }),
            coverageSnapshot: z.object({
                covered: z.array(z.string()).default([]),
                notCovered: z.array(z.string()).default([]),
                limits: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
                deductibles: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
                exclusions: z.array(z.string()).default([]),
            }),
            savingsOpportunities: z.array(
                z.object({
                    action: z.object({ en: z.string(), el: z.string() }),
                    rationale: z.object({ en: z.string(), el: z.string() }),
                    estimatedAnnualSavingsEur: z.number().nullable(),
                    confidence: z.number().min(0).max(100),
                })
            ).default([]),
            coverageGaps: z.array(
                z.object({
                    slug: z.string(),
                    severity: z.enum(["low", "medium", "high", "critical"]),
                    evidence: z.object({ en: z.string(), el: z.string() }),
                    recommendation: z.object({ en: z.string(), el: z.string() }),
                })
            ).default([]),
            checklistScores: z.array(
                z.object({
                    pillarKey: z.string(),
                    pillarName: z.object({ en: z.string(), el: z.string() }),
                    checksPassed: z.number().int().min(0),
                    checksTotal: z.number().int().min(1),
                    successPct: z.number().int().min(0).max(100),
                    notes: z.object({ en: z.string(), el: z.string() }),
                })
            ).default([]),
            priorityActions: z.array(
                z.object({
                    priority: z.enum(["high", "medium", "low"]),
                    action: z.object({ en: z.string(), el: z.string() }),
                    reason: z.object({ en: z.string(), el: z.string() }),
                })
            ).default([]),
            acordData: AcordDataSchema.optional(),
        })

        const checklistPrompt = checklist
            .map((pillar) => `- ${pillar.key}: ${pillar.title.en}; checks: ${pillar.checks.join(", ")}`)
            .join("\n")

        let prompt: string
        if (hasStructuredContext && !document) {
            const ctx = options!.structuredContext!
            prompt = `Create a plain-language policy clarity report with checklist scoring.
Use the extracted data below as source of truth.
Extracted Policy Data:
- Insurer: ${ctx.insurerName} | Policy: ${ctx.policyNumber} | Type: ${ctx.lineOfBusiness}
- Period: ${ctx.startDate} to ${ctx.endDate} | Premium: ${ctx.premiumAmount}
- Summary: ${ctx.coverageSummary || "N/A"}
- Exclusions: ${ctx.exclusions?.join(", ") || "None extracted"}
${ctx.acordData ? `- ACORD Data: ${JSON.stringify(ctx.acordData)}` : ""}
Checklist:
${checklistPrompt}`
        } else {
            prompt = `Create a plain-language policy clarity report with checklist scoring.
Use the document as source of truth when available.
Checklist:
${checklistPrompt}
Metadata:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Dates: ${metadata.startDate.toISOString().split("T")[0]} to ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"}`
        }

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
            () =>
                generateObject({
                    model: this.aiProvider!(modelName as string),
                    schema: ClaritySchema,
                    messages: [{ role: "user", content: parts }],
                    temperature: 0.2,
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
            }).catch((err) => logger("error", "Failed to track Anthropic clarity token usage", { error: err }))
        }

        return {
            ...result.object,
            usage: parsedUsage,
        }
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
                text: `You are an insurance advisor. Answer the user question based on policy metadata and optional document.
Respond in the same language as the question.
Policy:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Dates: ${metadata.startDate.toISOString().split("T")[0]} to ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"} | Summary: ${metadata.coverageSummary || "N/A"}
Question: ${question}`,
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
            () =>
                generateText({
                    model: this.aiProvider!(modelName as string),
                    messages: [{ role: "user", content: parts }],
                    temperature: 0.3,
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
}
