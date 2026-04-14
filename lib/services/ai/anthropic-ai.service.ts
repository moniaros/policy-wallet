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
import { enrichExtractionPayload } from "./extraction-enrichment"
import { matchesAnyPattern, withTimeoutAndRetry, parseUsage as parseUsageShared } from "./shared-utils"
import { wrapGapResultsBilingual, wrapClarityResultsBilingual } from "../translation/greek-to-bilingual"
import { daysFromNow, DEFAULT_POLICY_DURATION_DAYS } from "@/lib/constants/time"

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

        const prompt = `You are an expert insurance analyst specializing in reading long policy documents.
Your task is to carefully read the ENTIRE document and extract structured insurance data in ACORD format.
IMPORTANT:
Before producing the final JSON, internally:
1. Identify all sections of the document
2. Locate relevant insurance data across:
   - Schedule
   - General Terms (Γενικοί Όροι)
   - Special Conditions (Ειδικοί Όροι)
   - Appendices / endorsements
Then extract.
RULES:
- Do NOT skip sections
- Do NOT assume missing values
- Preserve original wording (Greek/English)
- If missing → null
NORMALIZATION:
- Dates → DD-MM-YYYY
- Amounts → numeric only
ADVANCED EXTRACTION:
finePrintClauses:
Identify clauses that:
- limit coverage
- impose obligations
- introduce hidden exclusions
For each:
[text, category, severity, reason]
perksAndBenefits:
Extract all services and benefits:
[name, description, phone, usageLimit, reminderRecommended]
notableConditions:
Extract:
- waiting periods
- renewal rules
- deadlines
- eligibility constraints
OUTPUT:
Return ONLY valid JSON in this structure:
{
  "lineOfBusiness": "...",
  "acord": {...},
  "finePrintClauses": [...],
  "perksAndBenefits": [...],
  "notableConditions": [...]
}
Do not include Citations, text should be in Greek (Primary and language of source) and English in different tags. This includes all text such as names,`

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
            startDate: extracted.startDate || new Date().toISOString().split("T")[0],
            endDate: extracted.endDate || daysFromNow(DEFAULT_POLICY_DURATION_DAYS).toISOString().split("T")[0],
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
                    explanation: z.string().describe("Gap explanation in Greek"),
                    suggestion: z.string().describe("Remediation suggestion in Greek"),
                })
            ),
            acordData: AcordDataSchema.optional(),
        })

        let prompt: string
        if (hasStructuredContext && !document) {
            const ctx = options!.structuredContext!
            prompt = `Analyze pre-extracted insurance policy data and identify coverage gaps.
Respond in Greek (Ελληνικά) only. All explanation and suggestion fields must be in Greek.
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
Respond in Greek (Ελληνικά) only. All explanation and suggestion fields must be in Greek.
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
        const hasStructuredContext = !!options?.structuredContext

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

        const checklistPrompt = checklist
            .map((pillar) => `- ${pillar.key}: ${pillar.title.en}; checks: ${pillar.checks.join(", ")}`)
            .join("\n")

        let prompt: string
        if (hasStructuredContext && !document) {
            const ctx = options!.structuredContext!
            prompt = `Create a plain-language policy clarity report with checklist scoring.
Respond in Greek (Ελληνικά) only. All text fields must be in Greek.
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
Respond in Greek (Ελληνικά) only. All text fields must be in Greek.
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

        const acordContext = options?.structuredContext?.acordData
            ? `\nDetailed Policy Data (ACORD):\n${JSON.stringify(options.structuredContext.acordData, null, 2)}`
            : ""

        const parts: any[] = [
            {
                type: "text",
                text: `You are an insurance advisor. Answer the user question based on policy data provided.
Respond in the same language as the question.
Policy:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Dates: ${metadata.startDate.toISOString().split("T")[0]} to ${metadata.endDate.toISOString().split("T")[0]}
- Premium: ${metadata.premiumAmount ?? "N/A"} | Summary: ${metadata.coverageSummary || "N/A"}${acordContext}
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

    // ── Risk Profile Analysis ────────────────────────────────────────

    async analyzeRiskProfile(
        profile: RiskProfileInput,
        existingPolicies: PolicyMetadata[],
        options?: AITrackingOptions
    ): Promise<AIRiskProfileAnalysisResponse> {
        if (!this.aiProvider) throw new Error("Anthropic service not available")

        const modelName = env.CLAUDE_MODEL_QA as string

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
            })).describe("Personalized risk insights (max 5)"),
            prioritizedGaps: z.array(z.object({
                lineOfBusiness: z.string(),
                reason: z.object({ en: z.string(), el: z.string() }),
                urgency: z.enum(["critical", "high", "medium", "low"]),
            })).describe("Missing insurance lines ranked by urgency (max 5)"),
            profileStrengths: z.array(z.object({
                en: z.string(),
                el: z.string(),
            })).describe("Positive aspects of current coverage (max 3)"),
        })

        const policySummary = existingPolicies.length > 0
            ? existingPolicies.map(p =>
                `- ${p.lineOfBusiness} (${p.insurerName}): premium ${p.premiumAmount ?? "unknown"}€, expires ${p.endDate.toISOString().split("T")[0]}`
            ).join("\n")
            : "No policies currently held."

        const age = profile.dateOfBirth
            ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null

        const prompt = `You are an expert Greek insurance advisor. Analyze this person's risk profile and current insurance portfolio.

## Risk Profile
- Age: ${age ?? "Unknown"}
- Marital status: ${profile.maritalStatus || "Unknown"}
- Dependents: ${profile.dependentsCount}
- Employment: ${profile.employmentStatus || "Unknown"}
- Occupation: ${profile.occupation || "Unknown"}
- Annual income: ${profile.annualIncome ? `€${profile.annualIncome}` : "Unknown"}
- Owns home: ${profile.ownsHome ? "Yes" : "No"}
- Mortgage: ${profile.mortgageAmount ? `€${profile.mortgageAmount}` : "None"}
- Vehicles: ${profile.vehiclesCount}
- Has pets: ${profile.hasPets ? "Yes" : "No"}
- Travels frequently: ${profile.travelsFrequently ? "Yes" : "No"}
- Has loans: ${profile.hasLoans ? "Yes" : "No"}${profile.loanAmount ? ` (€${profile.loanAmount})` : ""}
- Smoking status: ${profile.smokingStatus || "Unknown"}
- Life events: ${profile.lifeEvents?.length ? profile.lifeEvents.map(e => `${e.type} (${e.date})`).join(", ") : "None reported"}
- Gender: ${profile.gender || "Unknown"}
- BMI: ${profile.heightCm && profile.weightKg ? (profile.weightKg / ((profile.heightCm / 100) ** 2)).toFixed(1) : "Unknown"}
- Activity level: ${profile.activityLevel || "Unknown"}
- Chronic conditions: ${profile.chronicConditions?.length ? profile.chronicConditions.join(", ") : "None reported"}
- Family medical history: ${profile.familyMedicalHistory?.length ? profile.familyMedicalHistory.join(", ") : "None reported"}
- Driving record: ${profile.drivingRecord || "Unknown"}

## Current Insurance Portfolio
${policySummary}

## Instructions
1. Consider the Greek insurance market context (mandatory motor, ENFIA property requirements, ESY public health)
2. Identify the most critical coverage gaps given this person's specific situation
3. Provide actionable, personalized insights (not generic advice)
4. Be bilingual: provide both English and Greek for all text fields
5. Consider life stage, income level, and family situation when assessing urgency
6. Limit insights to max 5, prioritized gaps to max 5, strengths to max 3`

        try {
            const result = await withTimeoutAndRetry(
                () => generateObject({
                    model: this.aiProvider!(modelName),
                    schema: RiskProfileAnalysisSchema,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
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
