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
    AITrackingOptions,
    GapDefinitionForAI,
    IAIService,
    PolicyMetadata,
} from "./ai-service.interface"
import { AcordDataSchema } from "@/lib/schemas/acord-data"
import { enrichExtractionPayload } from "./extraction-enrichment"

const AI_CALL_TIMEOUT_MS = 60_000
const MAX_RETRIES = 1
const INITIAL_BACKOFF_MS = 2_000
const OPENAI_SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
]
const OPENAI_MODEL_PATTERNS = ["^gpt-", "^o[1-9]", "^text-", "^chatgpt-"]

function matchesAnyPattern(value: string, patterns: string[]): boolean {
    return patterns.some((pattern) => new RegExp(pattern, "i").test(value))
}

function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message.toLowerCase()
    return (
        msg.includes("timeout") ||
        msg.includes("aborted") ||
        msg.includes("deadline") ||
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("service unavailable") ||
        msg.includes("temporarily") ||
        msg.includes("overloaded")
    )
}

async function withTimeoutAndRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await Promise.race([
                fn(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`AI call timed out after ${AI_CALL_TIMEOUT_MS}ms`)), AI_CALL_TIMEOUT_MS)
                ),
            ])
            return result
        } catch (error) {
            lastError = error
            if (attempt < MAX_RETRIES && isTransientError(error)) {
                const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
                logger("warn", `${context}: transient failure, retrying in ${backoff}ms`, {
                    error: error instanceof Error ? error.message : String(error),
                })
                await new Promise((resolve) => setTimeout(resolve, backoff))
            } else {
                throw error
            }
        }
    }
    throw lastError
}

function parseUsage(usage: any, model: string) {
    const inputTokens = Number(usage?.inputTokens ?? usage?.promptTokens ?? 0)
    const outputTokens = Number(usage?.outputTokens ?? usage?.completionTokens ?? 0)
    return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        provider: "openai" as const,
    }
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

        const ExtractionSchema = z.object({
            insurerName: z.string().optional(),
            policyNumber: z.string().optional(),
            lineOfBusiness: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            premiumAmount: z.number().optional(),
            coverageSummary: z.string().optional(),
            customerName: z.string().optional(),
            customerSurname: z.string().optional(),
            customerEmail: z.string().optional(),
            exclusions: z.array(z.string()).optional(),
            extractionConfidence: z.object({
                overall: z.number(),
                requiresReview: z.boolean(),
                fields: z.record(z.string(), z.number()),
            }).optional(),
            acordData: AcordDataSchema.optional(),
        })

        const result = await withTimeoutAndRetry(
            () =>
                generateObject({
                    model: this.aiProvider!(modelName as string),
                    schema: ExtractionSchema,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text:
                                        "Extract policy metadata and coverage summary from the provided insurance document. Return only structured data.",
                                },
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
            }).catch((err) => logger("error", "Failed to track OpenAI extraction token usage", { error: err }))
        }

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
                    isDetected: z.boolean(),
                    explanation: z.object({ en: z.string(), el: z.string() }),
                    suggestion: z.object({ en: z.string(), el: z.string() }),
                })
            ),
            acordData: AcordDataSchema.optional(),
        })

        const prompt = `
Analyze insurance metadata and identify coverage gaps from the provided definitions.
Use the document as source of truth when available.
Current metadata:
- Insurer: ${metadata.insurerName}
- Policy Number: ${metadata.policyNumber}
- Type: ${metadata.lineOfBusiness}
- Dates: ${metadata.startDate.toISOString().split("T")[0]} to ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"}
- Summary: ${metadata.coverageSummary || "N/A"}
Gap definitions:
${gapDefinitions.map((g) => `- ${g.slug}: ${g.checkCriteria}`).join("\n")}
`

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
            }).catch((err) => logger("error", "Failed to track OpenAI gap token usage", { error: err }))
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
        if (!this.aiProvider) throw new Error("OpenAI service not available")
        const modelName = options?.modelOverride || env.OPENAI_MODEL_CLARITY_ANALYSIS

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
        const prompt = `
Create a plain-language policy clarity report with checklist scoring.
Checklist:
${checklistPrompt}
Metadata:
- Insurer: ${metadata.insurerName}
- Number: ${metadata.policyNumber}
- Type: ${metadata.lineOfBusiness}
- Dates: ${metadata.startDate.toISOString().split("T")[0]} to ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"}
`

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
            }).catch((err) => logger("error", "Failed to track OpenAI clarity token usage", { error: err }))
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
        if (!this.aiProvider) throw new Error("OpenAI service not available")
        const modelName = options?.modelOverride || env.OPENAI_MODEL_QA

        const parts: any[] = [
            {
                type: "text",
                text: `
You are an insurance advisor. Answer the user question based on policy metadata and optional document.
Policy:
- Insurer: ${metadata.insurerName}
- Policy Number: ${metadata.policyNumber}
- Type: ${metadata.lineOfBusiness}
- Start Date: ${metadata.startDate.toISOString().split("T")[0]}
- End Date: ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"}
- Summary: ${metadata.coverageSummary || "N/A"}
Question: ${question}
                `,
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
}
