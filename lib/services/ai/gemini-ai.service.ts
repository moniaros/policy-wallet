/**
 * Gemini AI Service Implementation
 * 
 * Implements the IAIService interface using Google's Gemini AI.
 * Handles policy extraction and gap analysis using the Gemini API.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateObject, generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
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
  AITrackingOptions,
  RiskProfileInput,
  AIRiskProfileAnalysisResponse,
} from './ai-service.interface'
import { trackTokenUsage } from '@/lib/token-tracking'
import { enrichExtractionPayload } from './extraction-enrichment'
import { AcordDataSchema } from '../../schemas/acord-data'
import { matchesAnyPattern, withTimeoutAndRetry, parseUsage as parseUsageShared } from './shared-utils'
import { wrapGapResultsBilingual, wrapClarityResultsBilingual } from '../translation/greek-to-bilingual'
import { daysFromNow, DEFAULT_POLICY_DURATION_DAYS } from '@/lib/constants/time'

const GEMINI_SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]
const GEMINI_MODEL_PATTERNS = ['^gemini-']

function parseUsage(usage: any, model: string) {
  return parseUsageShared(usage, model, 'gemini')
}

export class GeminiAIService implements IAIService {
  private genAI: GoogleGenerativeAI | null = null
  private aiProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null
  private apiKey: string | null = null

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY

    // Ensure key is a non-empty string
    if (key && typeof key === 'string' && key.trim().length > 0 && key !== 'undefined' && key !== 'null') {
      this.apiKey = key.trim()
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey)
        this.aiProvider = createGoogleGenerativeAI({ apiKey: this.apiKey })
      } catch (err) {
        logger('error', 'Failed to initialize GoogleGenerativeAI SDK', {
          error: err instanceof Error ? err.message : String(err)
        })
        this.genAI = null
        this.aiProvider = null
        this.apiKey = null
      }
    } else {
      this.apiKey = null
      this.genAI = null
      this.aiProvider = null
    }
  }

  /**
   * Checks if Gemini AI service is available
   */
  isAvailable(): boolean {
    return this.genAI !== null && this.apiKey !== null
  }

  /**
   * Gets the service name
   */
  getServiceName(): string {
    return 'Gemini AI'
  }

  getCapabilities(): AICapabilityMetadata {
    return {
      provider: 'gemini',
      supportsDocumentInput: true,
      supportedMimeTypes: GEMINI_SUPPORTED_MIME_TYPES,
      modelPatterns: GEMINI_MODEL_PATTERNS,
    }
  }

  checkCapabilities(input: AICapabilityCheckInput): AICapabilityCheckResult {
    const capabilities = this.getCapabilities()
    const model = (input.model || '').trim()

    if (model && !matchesAnyPattern(model, capabilities.modelPatterns)) {
      return {
        supported: false,
        code: 'AI_CAPABILITY_UNSUPPORTED_MODEL',
        reason: `Model '${model}' is not supported by provider gemini`,
        userMessageKey: 'analysis.errors.unavailable',
        metadata: capabilities,
      }
    }

    if (input.hasDocument) {
      const mimeType = (input.mimeType || '').trim().toLowerCase()
      if (!mimeType || !capabilities.supportedMimeTypes.includes(mimeType)) {
        return {
          supported: false,
          code: 'AI_CAPABILITY_UNSUPPORTED_MIME',
          reason: `MIME type '${mimeType || 'unknown'}' is not supported by provider gemini`,
          userMessageKey: 'analysis.errors.document',
          metadata: capabilities,
        }
      }
    }

    return {
      supported: true,
      code: 'OK',
      reason: 'Capability check passed',
      userMessageKey: 'analysis.status.inProgress',
      metadata: capabilities,
    }
  }

  /**
   * Extracts policy data from a document using Gemini 2.0 Flash
   * Supports both PDF and image formats with advanced multimodal analysis
   */
  async extractPolicyData(document: AIDocument, options?: AITrackingOptions): Promise<AIPolicyExtractionResponse> {
    if (!this.aiProvider) {
      throw new Error('Gemini AI service is not available')
    }

    try {
      const modelName = options?.modelOverride || env.GEMINI_MODEL_EXTRACTION

      // Optimized prompt: field-level instructions moved to Zod .describe() annotations
      // Reduced from ~600 tokens to ~200 tokens (~65% prompt savings)
      const prompt = `You are an insurance document parser.
TASK:
Extract ALL insurance data from this PDF into structured JSON using ACORD format.
IMPORTANT:
- Read ALL pages, including:
  - General Terms
  - Special Conditions
  - Appendices
- Do NOT summarize
- Do NOT skip sections
STRICT RULES:
- Output JSON only
- No text outside JSON
- If value not found → null
DATA NORMALIZATION:
- Dates: DD-MM-YYYY
- Amounts: numbers only
- Keep original language (Greek or English)
DETECT:
lineOfBusiness = Motor | Property | Health | Life | Travel
ONLY populate the matching ACORD section.
EXTRACTION SECTIONS:
finePrintClauses:
Extract limiting clauses:
[text, category, severity, reason]
perksAndBenefits:
[name, description, phone, usageLimit, reminderRecommended]
notableConditions:
[condition, type, userActionRequired, deadline]
FINAL OUTPUT:
{
  "lineOfBusiness": "...",
  "acord": {...},
  "finePrintClauses": [...],
  "perksAndBenefits": [...],
  "notableConditions": [...]
}
Do not include Citations, text should be in Greek (Primary and language of source) and English in different tags. This includes all text such as names, descriptions, types, usage limits etc.`

      logger('info', 'Starting Gemini 2.0 Flash extraction with UI Zod Schema', {
        fileName: document.fileName,
        mimeType: document.mimeType,
        model: modelName
      })

      // Schema-driven extraction: .describe() annotations guide the AI on what to look for
      const ExtractionSchema = z.object({
        insurerName: z.string().optional().describe("Insurance company name from logo, letterhead, or header"),
        policyNumber: z.string().optional().describe("Policy number from headers, footers, or labeled fields"),
        lineOfBusiness: z.string().optional().describe("One of: motor, health, home, life, travel, liability, pet, other"),
        startDate: z.string().optional().describe("Policy start date in YYYY-MM-DD (look for Ισχύς, Period, Validity)"),
        endDate: z.string().optional().describe("Policy end date in YYYY-MM-DD"),
        premiumAmount: z.number().optional().describe("Annual premium amount, numeric only (look for Ασφάλιστρο, Premium)"),
        premiumCurrency: z.string().optional().describe("Currency code, e.g. EUR"),
        coverageSummary: z.string().optional().describe("Brief summary of main coverages, max 200 chars"),
        customerName: z.string().optional().describe("Policyholder first name"),
        customerSurname: z.string().optional().describe("Policyholder surname"),
        customerEmail: z.string().optional(),
        exclusions: z.array(z.string()).optional().describe("Top exclusions from Εξαιρέσεις/Exclusions sections"),
        extractionConfidence: z.object({
          overall: z.number().describe("0-100 confidence score"),
          requiresReview: z.boolean().describe("True if overall < 80 or critical fields missing"),
          fields: z.record(z.string(), z.number()).describe("Per-field confidence scores 0-100")
        }).optional(),
        acordData: AcordDataSchema.optional().describe("Type-specific structured data matching the detected lineOfBusiness")
      })

      const result = await withTimeoutAndRetry(
        () => generateObject({
          model: this.aiProvider!(modelName as string),
          schema: ExtractionSchema,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'file',
                  data: document.data,
                  mediaType: document.mimeType,
                  filename: document.fileName
                } as any
              ]
            }
          ],
          temperature: 0.1
        }),
        'Gemini extraction generateObject'
      )

      const extracted = result.object
      const enriched = enrichExtractionPayload(extracted, undefined, 'gemini')
      const parsedUsage = parseUsage(result.usage, modelName)

      if (options?.userId) {
        if (result.usage) {
          const usage = parseUsage(result.usage, modelName)
          await trackTokenUsage({
            userId: options.userId,
            operationType: 'policy_analysis',
            policyId: options.policyId,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            model: modelName as any
          })
        }
      }

      logger('info', 'Gemini 2.0 Flash Zod extraction successful', {
        fileName: document.fileName,
        insurerName: extracted.insurerName,
        policyNumber: extracted.policyNumber,
        hasAcordData: !!extracted.acordData
      })

      return {
        insurerName: extracted.insurerName || 'Unknown Insurer',
        policyNumber: extracted.policyNumber || `PENDING-${Date.now()}`,
        lineOfBusiness: extracted.lineOfBusiness || 'other',
        startDate: extracted.startDate || new Date().toISOString().split('T')[0],
        endDate: extracted.endDate || daysFromNow(DEFAULT_POLICY_DURATION_DAYS).toISOString().split('T')[0],
        premiumAmount: extracted.premiumAmount || 0,
        coverageSummary: extracted.coverageSummary || 'Extracted from document',
        customerName: extracted.customerName,
        customerSurname: extracted.customerSurname,
        customerEmail: extracted.customerEmail,
        exclusions: enriched.exclusions,
        extractionMeta: enriched.extractionMeta,
        acordData: enriched.acordData,
        usage: parsedUsage
      }
    } catch (error) {
      logger('error', 'Gemini Zod extraction failed', {
        fileName: document.fileName,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Analyzes policy for gaps using Gemini 2.0 Flash
   */
  async analyzeGaps(
    document: AIDocument | null,
    metadata: PolicyMetadata,
    gapDefinitions: GapDefinitionForAI[],
    options?: AITrackingOptions
  ): Promise<AIGapAnalysisResponse> {
    if (!this.aiProvider) {
      throw new Error('Gemini AI service is not available')
    }

    try {
      const modelName = options?.modelOverride || env.GEMINI_MODEL_GAP_ANALYSIS
      const hasStructuredContext = !!options?.structuredContext
      const hasDocument = !!document

      // When structured context is available, use compact JSON instead of re-sending the PDF
      // This saves ~50-100K input tokens per call
      let prompt: string
      if (hasStructuredContext && !hasDocument) {
        const ctx = options!.structuredContext!
        prompt = `You are an expert insurance analyst. Analyze the following pre-extracted policy data to identify coverage gaps.
Respond in Greek (Ελληνικά) only. All explanation and suggestion fields must be in Greek.

Extracted Policy Data:
- Insurer: ${ctx.insurerName}
- Policy Number: ${ctx.policyNumber}
- Line of Business: ${ctx.lineOfBusiness}
- Period: ${ctx.startDate} to ${ctx.endDate}
- Premium: ${ctx.premiumAmount}
- Summary: ${ctx.coverageSummary || 'N/A'}
- Exclusions: ${ctx.exclusions?.join(', ') || 'None extracted'}
${ctx.acordData ? `- ACORD Data: ${JSON.stringify(ctx.acordData)}` : ''}

Potential Gaps to Check:
${gapDefinitions.map(g => `- ${g.slug}: ${g.checkCriteria}`).join('\n')}`
      } else {
        prompt = `You are an expert insurance analyst with deep knowledge of ACORD standards and European insurance policies.
TASK: Analyze the provided policy document and metadata to identify coverage gaps.
CRITICAL: The DOCUMENT is the SOURCE OF TRUTH. Current metadata may be incomplete or incorrect - verify against the document.
Step 1: Verify Insurer, Policy Number, Dates, and Premium from the DOCUMENT. If document is missing, use Current Metadata.
Step 2: Check for gaps. Respond in Greek (Ελληνικά) only. All explanation and suggestion fields must be in Greek.

Current Metadata (Reference Only):
Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
Dates: ${metadata.startDate.toISOString().split('T')[0]} to ${metadata.endDate.toISOString().split('T')[0]}
Premium: ${metadata.premiumAmount} | Summary: ${metadata.coverageSummary || 'N/A'}

Potential Gaps to Check:
${gapDefinitions.map(g => `- ${g.slug}: ${g.checkCriteria}`).join('\n')}`
      }

      const parts: any[] = [{ type: 'text', text: prompt }]
      if (document) {
        parts.push({
          type: 'file',
          data: document.data,
          mediaType: document.mimeType,
          filename: document.fileName
        })
      }

      logger('info', 'Starting Gemini Zod Flash gap analysis', {
        policyNumber: metadata.policyNumber,
        gapsToCheck: gapDefinitions.length,
        hasDocument,
        hasStructuredContext,
        model: modelName
      })

      const GapAnalysisSchema = z.object({
        verifiedMetadata: z.object({
          insurerName: z.string().optional(),
          policyNumber: z.string().optional(),
          lineOfBusiness: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          premiumAmount: z.number().optional(),
          coverageSummary: z.string().optional()
        }),
        exclusions: z.array(z.string()).optional(),
        extractionConfidence: z.object({
          overall: z.number().describe('0-100'),
          requiresReview: z.boolean(),
          fields: z.record(z.string(), z.number())
        }).optional(),
        gapResults: z.array(z.object({
          slug: z.string(),
          isDetected: z.boolean(),
          explanation: z.string().describe("Gap explanation in Greek"),
          suggestion: z.string().describe("Remediation suggestion in Greek")
        })),
        acordData: AcordDataSchema.optional()
      })

      const result = await withTimeoutAndRetry(
        () => generateObject({
          model: this.aiProvider!(modelName as string),
          schema: GapAnalysisSchema,
          messages: [{ role: 'user', content: parts }],
          temperature: 0.2
        }),
        'Gemini Zod gap analysis'
      )

      const analysisRaw = result.object
      const parsedUsage = parseUsage(result.usage, modelName)

      if (options?.userId) {
        if (result.usage) {
          const usage = parseUsage(result.usage, modelName)
          await trackTokenUsage({
            userId: options.userId,
            operationType: 'gap_detection',
            policyId: options.policyId,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            model: modelName as any
          })
        }
      }

      const enriched = enrichExtractionPayload({
        insurerName: analysisRaw.verifiedMetadata?.insurerName,
        policyNumber: analysisRaw.verifiedMetadata?.policyNumber,
        lineOfBusiness: analysisRaw.verifiedMetadata?.lineOfBusiness,
        startDate: analysisRaw.verifiedMetadata?.startDate,
        endDate: analysisRaw.verifiedMetadata?.endDate,
        premiumAmount: analysisRaw.verifiedMetadata?.premiumAmount,
        exclusions: analysisRaw.exclusions,
        extractionConfidence: analysisRaw.extractionConfidence,
        acordData: analysisRaw.acordData,
      }, undefined, 'gemini')

      const response: AIGapAnalysisResponse = {
        verifiedMetadata: analysisRaw.verifiedMetadata as any,
        gapResults: wrapGapResultsBilingual(analysisRaw.gapResults),
        acordData: enriched.acordData,
        usage: parsedUsage
      }

      logger('info', 'Gemini Zod gap analysis successful', {
        policyNumber: metadata.policyNumber,
        gapsChecked: gapDefinitions.length,
        gapsDetected: response.gapResults.filter(g => g.isDetected).length,
        hasAcordData: !!response.acordData
      })

      return response
    } catch (error) {
      logger('error', 'Gemini Zod gap analysis failed', {
        policyNumber: metadata.policyNumber,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
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
    if (!this.aiProvider) {
      throw new Error('Gemini AI service is not available')
    }

    const modelName = options?.modelOverride || env.GEMINI_MODEL_CLARITY_ANALYSIS
    const hasStructuredContext = !!options?.structuredContext
    const hasDocument = !!document

    const checklistPrompt = checklist
      .map((pillar) => `- ${pillar.key}: ${pillar.title.en} | checks: ${pillar.checks.join(', ')}`)
      .join('\n')

    // When structured context is available, use compact JSON instead of re-sending the PDF
    let prompt: string
    if (hasStructuredContext && !hasDocument) {
      const ctx = options!.structuredContext!
      prompt = `You are an insurance clarity analyst for policyholders.
Goal: 1) Plain-language insights 2) Savings opportunities 3) Coverage gaps 4) Checklist scoring
5) Fine print warnings 6) Hidden perks and free services.
Respond in Greek (Ελληνικά) only. All text fields must be in Greek.
Use the extracted data below as source of truth. If details are missing, say so and lower confidence.

SPECIAL FOCUS — Fine Print & Hidden Value:
- Identify clauses, restrictions, and conditions that most consumers would be SURPRISED by.
- Highlight ALL free prevention services, assistance phone numbers, and gifts.
- Flag auto-renewal traps, claim filing deadlines, and notification obligations.
- Populate finePrintClauses, perksAndBenefits, and notableConditions arrays in acordData.

Extracted Policy Data:
- Insurer: ${ctx.insurerName} | Policy: ${ctx.policyNumber} | Type: ${ctx.lineOfBusiness}
- Period: ${ctx.startDate} to ${ctx.endDate} | Premium: ${ctx.premiumAmount}
- Summary: ${ctx.coverageSummary || 'N/A'}
- Exclusions: ${ctx.exclusions?.join(', ') || 'None extracted'}
${ctx.acordData ? `- ACORD Data: ${JSON.stringify(ctx.acordData)}` : ''}

Checklist pillars:
${checklistPrompt}`
    } else {
      prompt = `You are an insurance clarity analyst for policyholders.
Goal: 1) Plain-language insights 2) Savings opportunities 3) Coverage gaps 4) Checklist scoring
5) Fine print warnings 6) Hidden perks and free services.
Respond in Greek (Ελληνικά) only. All text fields must be in Greek.
Use the document as source of truth. If details are missing, say so and lower confidence.

SPECIAL FOCUS — Fine Print & Hidden Value:
- Identify clauses, restrictions, and conditions that most consumers would be SURPRISED by.
- Highlight ALL free prevention services, assistance phone numbers, and gifts.
- Flag auto-renewal traps, claim filing deadlines, and notification obligations.

Current metadata:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Period: ${metadata.startDate.toISOString().split('T')[0]} to ${metadata.endDate.toISOString().split('T')[0]}
- Premium: ${metadata.premiumAmount ?? 'N/A'} | Summary: ${metadata.coverageSummary || 'N/A'}

Checklist pillars:
${checklistPrompt}`
    }

    const ClaritySchema = z.object({
      plainLanguageSummary: z.string().describe("Plain-language summary in Greek"),
      coverageSnapshot: z.object({
        covered: z.array(z.string()).default([]),
        notCovered: z.array(z.string()).default([]),
        limits: z.array(z.object({
          name: z.string(),
          value: z.string(),
        })).default([]),
        deductibles: z.array(z.object({
          name: z.string(),
          value: z.string(),
        })).default([]),
        exclusions: z.array(z.string()).default([]),
      }),
      savingsOpportunities: z.array(z.object({
        action: z.string().describe("Savings action in Greek"),
        rationale: z.string().describe("Rationale in Greek"),
        estimatedAnnualSavingsEur: z.number().nullable(),
        confidence: z.number().min(0).max(100),
      })).default([]),
      coverageGaps: z.array(z.object({
        slug: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        evidence: z.string().describe("Gap evidence in Greek"),
        recommendation: z.string().describe("Recommendation in Greek"),
      })).default([]),
      checklistScores: z.array(z.object({
        pillarKey: z.string(),
        pillarName: z.string().describe("Pillar name in Greek"),
        checksPassed: z.number().int().min(0),
        checksTotal: z.number().int().min(1),
        successPct: z.number().int().min(0).max(100),
        notes: z.string().describe("Notes in Greek"),
      })).default([]),
      priorityActions: z.array(z.object({
        priority: z.enum(['high', 'medium', 'low']),
        action: z.string().describe("Action in Greek"),
        reason: z.string().describe("Reason in Greek"),
      })).default([]),
      finePrintWarnings: z.array(z.object({
        clause: z.string().describe("The restricting clause in Greek"),
        riskLevel: z.enum(['info', 'warning', 'critical']),
        impact: z.string().describe("Why this matters, in Greek"),
      })).default([]).describe("Hidden restrictions a consumer would be surprised by"),
      hiddenPerks: z.array(z.object({
        name: z.string().describe("Perk name in Greek"),
        description: z.string().describe("Description in Greek"),
        phone: z.string().optional().describe("Phone number to use the service"),
        usageFrequency: z.string().optional().describe("e.g. 1x per year"),
      })).default([]).describe("Free services, gifts, and prevention perks"),
      acordData: AcordDataSchema.optional(),
    })

    const parts: any[] = [{ type: 'text', text: prompt }]
    if (document) {
      parts.push({
        type: 'file',
        data: document.data,
        mediaType: document.mimeType,
        filename: document.fileName,
      })
    }

    const result = await withTimeoutAndRetry(
      () => generateObject({
        model: this.aiProvider!(modelName as string),
        schema: ClaritySchema,
        messages: [{ role: 'user', content: parts }],
        temperature: 0.2,
      }),
      'Gemini clarity analysis'
    )

    const parsedUsage = parseUsage(result.usage, modelName)
    const object = result.object

    if (options?.userId && result.usage) {
      const usage = parseUsage(result.usage, modelName)
      await trackTokenUsage({
        userId: options.userId,
        operationType: 'policy_clarity',
        policyId: options.policyId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        model: modelName as any,
      })
    }

    return wrapClarityResultsBilingual({
      plainLanguageSummary: object.plainLanguageSummary,
      coverageSnapshot: object.coverageSnapshot,
      savingsOpportunities: object.savingsOpportunities,
      coverageGaps: object.coverageGaps,
      checklistScores: object.checklistScores,
      priorityActions: object.priorityActions,
      finePrintWarnings: object.finePrintWarnings,
      hiddenPerks: object.hiddenPerks,
      acordData: object.acordData,
      usage: parsedUsage,
    })
  }

  /**
   * Answers a question about a policy
   */
  async askQuestion(
    document: AIDocument | null,
    metadata: PolicyMetadata,
    question: string,
    options?: AITrackingOptions
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('AI service not initialized')
    }

    try {
      if (!this.aiProvider) {
        throw new Error('Gemini AI service is not available')
      }

      const model = this.aiProvider(env.GEMINI_MODEL_QA as string)

      // Prepare context from policy data
      const context = `
Policy Information:
      - Insurer: ${metadata.insurerName}
      - Policy Number: ${metadata.policyNumber}
      - Type: ${metadata.lineOfBusiness}
      - Start Date: ${metadata.startDate.toISOString().split('T')[0]}
      - End Date: ${metadata.endDate.toISOString().split('T')[0]}
      - Premium: ${metadata.premiumAmount || 'N/A'}
      - Coverage Summary: ${metadata.coverageSummary || 'N/A'}
      `

      // Build detailed context from structuredContext (ACORD data) when available
      const acordContext = options?.structuredContext?.acordData
        ? `\n\nDetailed Policy Data (ACORD):\n${JSON.stringify(options.structuredContext.acordData, null, 2)}`
        : ''

      const parts: any[] = []

      const prompt = `
You are an expert insurance advisor helping a policyholder understand their insurance policy.

        ${context}${acordContext}

User Question: ${question}

      Instructions:
      1. Answer the question based on the policy data provided
      2. Be clear, concise, and helpful
      3. If the information is not available, say so
      4. Use simple language that a non-expert can understand
      5. If the question is about coverage, explain what IS and IS NOT covered
      6. For Greek policies, you may respond in Greek if the question is in Greek

Answer the user's question:
        `
      parts.push({ type: 'text', text: prompt })
      if (document) {
        parts.push({
          type: 'file',
          data: document.data,
          mediaType: document.mimeType,
          filename: document.fileName
        })
      }

      const result = await withTimeoutAndRetry(
        () => generateText({
          model,
          messages: [{ role: 'user', content: parts }],
          temperature: 0.3
        }),
        'Gemini Q&A'
      )
      const answer = result.text

      // Track Token Usage
      if (options?.userId && result.usage) {
        const usage = parseUsage(result.usage, env.GEMINI_MODEL_QA as string)
        trackTokenUsage({
          userId: options.userId,
          operationType: 'qa_session',
          policyId: options.policyId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          model: env.GEMINI_MODEL_QA as any
        }).catch(err => {
          logger('error', 'Failed to track token usage in Q&A', { error: err })
        })
      }

      return answer
    } catch (error) {
      logger('error', 'Gemini 2.0 Flash Q&A failed', {
        policyNumber: metadata.policyNumber,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  // ── Risk Profile Analysis (Phase 2) ────────────────────────────────

  async analyzeRiskProfile(
    profile: RiskProfileInput,
    existingPolicies: PolicyMetadata[],
    options?: AITrackingOptions
  ): Promise<AIRiskProfileAnalysisResponse> {
    if (!this.aiProvider) {
      throw new Error('Gemini AI service is not available')
    }

    const modelName = env.GEMINI_MODEL_QA as string // Flash model for fast, cost-effective analysis

    const RiskProfileAnalysisSchema = z.object({
      riskSummary: z.object({
        en: z.string().describe('English risk summary (2-3 sentences)'),
        el: z.string().describe('Greek risk summary (2-3 sentences)'),
      }).describe('Overall risk profile summary'),
      riskLevel: z.enum(['low', 'moderate', 'high', 'very_high']).describe('Overall risk level based on coverage gaps and profile'),
      insights: z.array(z.object({
        category: z.string().describe('Category: health, life, property, income, liability, travel, or general'),
        insight: z.object({
          en: z.string().describe('English insight'),
          el: z.string().describe('Greek insight'),
        }),
        urgency: z.enum(['critical', 'high', 'medium', 'low']),
        actionable: z.boolean().describe('Whether the user can take immediate action'),
      })).describe('Informational coverage observations (max 5)'),
      prioritizedGaps: z.array(z.object({
        lineOfBusiness: z.string().describe('Insurance line: motor, home, health, life, travel, pet, liability, legal_expenses, income_protection'),
        reason: z.object({
          en: z.string().describe('English reason this coverage is needed'),
          el: z.string().describe('Greek reason this coverage is needed'),
        }),
        urgency: z.enum(['critical', 'high', 'medium', 'low']),
      })).describe('Insurance lines not currently detected in the portfolio (max 5)'),
      profileStrengths: z.array(z.object({
        en: z.string(),
        el: z.string(),
      })).describe('Positive aspects of current coverage (max 3)'),
    })

    const policySummary = existingPolicies.length > 0
      ? existingPolicies.map(p =>
          `- ${p.lineOfBusiness} (${p.insurerName}): premium ${p.premiumAmount ?? 'unknown'}€, expires ${p.endDate.toISOString().split('T')[0]}`
        ).join('\n')
      : 'No policies currently held.'

    const age = profile.dateOfBirth
      ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const prompt = `You are an informational insurance-analysis assistant for the Greek market. Analyze this person's risk profile and current insurance portfolio for educational purposes.

## Risk Profile
- Age: ${age ?? 'Unknown'}
- Marital status: ${profile.maritalStatus || 'Unknown'}
- Dependents: ${profile.dependentsCount}
- Employment: ${profile.employmentStatus || 'Unknown'}
- Occupation: ${profile.occupation || 'Unknown'}
- Annual income: ${profile.annualIncome ? `€${profile.annualIncome}` : 'Unknown'}
- Owns home: ${profile.ownsHome ? 'Yes' : 'No'}
- Mortgage: ${profile.mortgageAmount ? `€${profile.mortgageAmount}` : 'None'}
- Vehicles: ${profile.vehiclesCount}
- Has pets: ${profile.hasPets ? 'Yes' : 'No'}
- Travels frequently: ${profile.travelsFrequently ? 'Yes' : 'No'}
- Has loans: ${profile.hasLoans ? 'Yes' : 'No'}${profile.loanAmount ? ` (€${profile.loanAmount})` : ''}
- Smoking status: ${profile.smokingStatus || 'Unknown'}
- Life events: ${profile.lifeEvents?.length ? profile.lifeEvents.map(e => `${e.type} (${e.date})`).join(', ') : 'None reported'}
- Gender: ${profile.gender || 'Unknown'}
- BMI: ${profile.heightCm && profile.weightKg ? (profile.weightKg / ((profile.heightCm / 100) ** 2)).toFixed(1) : 'Unknown'}
- Activity level: ${profile.activityLevel || 'Unknown'}
- Chronic conditions: ${profile.chronicConditions?.length ? profile.chronicConditions.join(', ') : 'None reported'}
- Family medical history: ${profile.familyMedicalHistory?.length ? profile.familyMedicalHistory.join(', ') : 'None reported'}
- Driving record: ${profile.drivingRecord || 'Unknown'}

## Current Insurance Portfolio
${policySummary}

## Instructions
1. Consider the Greek insurance market context (mandatory motor, ENFIA property requirements, ESY public health)
2. Identify the most critical coverage gaps given this person's specific situation
3. Provide factual, informational observations about coverage gaps and overlaps; do not give personalized financial or insurance advice or tell the user what they "should" buy. Phrase findings as observations (e.g. "this profile appears to lack ...", "this policy may not cover ...").
4. Be bilingual: provide both English and Greek for all text fields
5. Consider life stage, income level, and family situation when assessing urgency
6. Limit insights to max 5, prioritized gaps to max 5, strengths to max 3`

    try {
      const result = await withTimeoutAndRetry(
        () => generateObject({
          model: this.aiProvider!(modelName),
          schema: RiskProfileAnalysisSchema,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
        'Gemini risk profile analysis'
      )

      const analysis = result.object
      const parsedUsage = parseUsage(result.usage, modelName)

      if (options?.userId && result.usage) {
        trackTokenUsage({
          userId: options.userId,
          operationType: 'risk_profile_analysis',
          inputTokens: parsedUsage.inputTokens,
          outputTokens: parsedUsage.outputTokens,
          model: modelName as any,
        }).catch(err => {
          logger('error', 'Failed to track token usage for risk profile analysis', { error: err })
        })
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
      logger('error', 'Gemini risk profile analysis failed', {
        userId: options?.userId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
