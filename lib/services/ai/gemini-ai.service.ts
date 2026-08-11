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
import { buildExtractionSchema } from './extraction-schema'
import { schemaPromptBlock, validateJsonModeObject, coercedGreekString, normalizeClarityShape } from './json-mode-schema'
import {
  buildExtractionPrompt,
  buildGapAnalysisPrompt,
  buildClarityPrompt,
  buildQaPrompt,
  buildRiskProfilePrompt,
} from './prompts'
import { AcordDataSchema } from '../../schemas/acord-data'
import { matchesAnyPattern, withTimeoutAndRetry, parseUsage as parseUsageShared } from './shared-utils'
import { wrapGapResultsBilingual, wrapClarityResultsBilingual } from '../translation/greek-to-bilingual'

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
   * Extracts policy data from a document (model from GEMINI_MODEL_EXTRACTION)
   * Supports both PDF and image formats with advanced multimodal analysis
   */
  async extractPolicyData(document: AIDocument, options?: AITrackingOptions): Promise<AIPolicyExtractionResponse> {
    if (!this.aiProvider) {
      throw new Error('Gemini AI service is not available')
    }

    try {
      const modelName = options?.modelOverride || env.GEMINI_MODEL_EXTRACTION

      // Shared canonical extraction prompt (lib/services/ai/prompts.ts) —
      // the output contract is the schema block appended below.
      const prompt = buildExtractionPrompt(options?.operatorGuidance, options?.lineOfBusinessHint)

      logger('info', 'Starting Gemini extraction', {
        fileName: document.fileName,
        mimeType: document.mimeType,
        model: modelName
      })

      // Shared with every provider — see lib/services/ai/extraction-schema.ts
      const ExtractionSchema = buildExtractionSchema()

      // JSON mode: the schema travels in the prompt and validation happens
      // locally — Gemini rejects AcordDataSchema-sized response_schemas with
      // "too many states for serving" (see json-mode-schema.ts).
      const extractionGuidance = `
extractionConfidence.fields MUST include a 0-100 score for every extracted field among: insurerName, policyNumber, lineOfBusiness, startDate, endDate, premiumAmount, issueDate, premiumFrequency, renewalDate.
${schemaPromptBlock(ExtractionSchema)}`

      const result = await withTimeoutAndRetry(
        (signal) => generateObject({
          // Propagate the wrapper's timeout abort so a timed-out call stops
          // billing; the wrapper owns retries (SDK default of 2 multiplied
          // every layer's attempts).
          abortSignal: signal,
          maxRetries: 0,
          model: this.aiProvider!(modelName as string),
          output: 'no-schema',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `${prompt}\n${extractionGuidance}` },
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

      const extracted = validateJsonModeObject(ExtractionSchema, result.object, 'gemini extraction')
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

      logger('info', 'Gemini extraction successful', {
        fileName: document.fileName,
        insurerName: extracted.insurerName,
        policyNumber: extracted.policyNumber,
        hasAcordData: !!extracted.acordData
      })

      return {
        insurerName: extracted.insurerName || 'Unknown Insurer',
        policyNumber: extracted.policyNumber || `PENDING-${Date.now()}`,
        lineOfBusiness: extracted.lineOfBusiness || 'other',
        // Missing dates stay empty — no fabricated 'today' (data integrity).
        startDate: extracted.startDate || '',
        endDate: extracted.endDate || '',
        premiumAmount: extracted.premiumAmount || 0,
        coverageSummary: extracted.coverageSummary || 'Extracted from document',
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
   * Analyzes policy for gaps (model from GEMINI_MODEL_GAP_ANALYSIS)
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
      const prompt = buildGapAnalysisPrompt(metadata, gapDefinitions, options?.structuredContext, hasDocument, options?.operatorGuidance)

      const parts: any[] = [{ type: 'text', text: prompt }]
      if (document) {
        parts.push({
          type: 'file',
          data: document.data,
          mediaType: document.mimeType,
          filename: document.fileName
        })
      }

      logger('info', 'Starting Gemini gap analysis', {
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
          explanation: coercedGreekString.describe("Gap explanation in Greek — a plain string, NOT an object"),
          suggestion: coercedGreekString.describe("Remediation suggestion in Greek — a plain string, NOT an object")
        })),
        acordData: AcordDataSchema.optional()
      })

      // JSON mode — GapAnalysisSchema embeds AcordDataSchema, which exceeds
      // Gemini's response_schema state budget (see json-mode-schema.ts).
      parts.push({ type: 'text', text: schemaPromptBlock(GapAnalysisSchema) })

      const result = await withTimeoutAndRetry(
        (signal) => generateObject({
          // Propagate the wrapper's timeout abort so a timed-out call stops
          // billing; the wrapper owns retries (SDK default of 2 multiplied
          // every layer's attempts).
          abortSignal: signal,
          maxRetries: 0,
          model: this.aiProvider!(modelName as string),
          output: 'no-schema',
          messages: [{ role: 'user', content: parts }],
          temperature: 0.2
        }),
        'Gemini Zod gap analysis'
      )

      const analysisRaw = validateJsonModeObject(GapAnalysisSchema, result.object, 'gemini gap analysis')
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
        // JSON mode has no server-side shape guarantee — a missing gapResults
        // array must degrade to "no gaps checked", not a crash.
        gapResults: wrapGapResultsBilingual(
          Array.isArray(analysisRaw.gapResults) ? analysisRaw.gapResults : []
        ),
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

    // When structured context is available, use compact JSON instead of re-sending the PDF
    const prompt = buildClarityPrompt(metadata, checklist, options?.structuredContext, !!document, options?.operatorGuidance)

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

    // JSON mode — ClaritySchema embeds AcordDataSchema, which exceeds
    // Gemini's response_schema state budget (see json-mode-schema.ts).
    parts.push({ type: 'text', text: schemaPromptBlock(ClaritySchema) })

    const result = await withTimeoutAndRetry(
      (signal) => generateObject({
        // Propagate the wrapper's timeout abort so a timed-out call stops
        // billing; the wrapper owns retries (SDK default of 2 multiplied
        // every layer's attempts).
        abortSignal: signal,
        maxRetries: 0,
        model: this.aiProvider!(modelName as string),
        output: 'no-schema',
        messages: [{ role: 'user', content: parts }],
        temperature: 0.2,
      }),
      'Gemini clarity analysis'
    )

    const parsedUsage = parseUsage(result.usage, modelName)
    // normalizeClarityShape: JSON mode has no server-side shape guarantee —
    // missing snapshot arrays killed the coverage_mapping step in prod.
    const object = normalizeClarityShape(
        validateJsonModeObject(ClaritySchema, result.object, 'gemini clarity analysis')
    )

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

      // Honor the router's model + output cap (this path read the env model
      // directly and set no cap, so the gateway's route decision was ignored).
      const model = this.aiProvider((options?.modelOverride || env.GEMINI_MODEL_QA) as string)

      const parts: any[] = [
        { type: 'text', text: buildQaPrompt(metadata, question, options?.structuredContext?.acordData, options?.operatorGuidance) },
      ]
      if (document) {
        parts.push({
          type: 'file',
          data: document.data,
          mediaType: document.mimeType,
          filename: document.fileName
        })
      }

      const result = await withTimeoutAndRetry(
        (signal) => generateText({
          // Propagate the wrapper's timeout abort so a timed-out call stops
          // billing; the wrapper owns retries (SDK default of 2 multiplied
          // every layer's attempts).
          abortSignal: signal,
          maxRetries: 0,
          model,
          messages: [{ role: 'user', content: parts }],
          temperature: 0.3,
          ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
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
      logger('error', 'Gemini Q&A failed', {
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

    // Honor a router-supplied modelOverride (this path ignored it before, so the
    // gateway's route decision could never reach the risk-profile call).
    const modelName = (options?.modelOverride || env.GEMINI_MODEL_QA) as string

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
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
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
