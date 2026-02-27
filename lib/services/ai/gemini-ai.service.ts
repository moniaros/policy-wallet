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
  PolicyMetadata,
  GapDefinitionForAI,
  AIPolicyExtractionResponse,
  AIGapAnalysisResponse,
  AIPolicyClarityResponse,
  AITrackingOptions
} from './ai-service.interface'
import { trackTokenUsage } from '@/lib/token-tracking'
import { enrichExtractionPayload } from './extraction-enrichment'
import { AcordDataSchema } from '../../schemas/acord-data'

const AI_CALL_TIMEOUT_MS = 60_000
const MAX_RETRIES = 1
const INITIAL_BACKOFF_MS = 2_000

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('deadline')) return true
    if (msg.includes('503') || msg.includes('500') || msg.includes('429') || msg.includes('service unavailable')) return true
    if (msg.includes('internal') || msg.includes('temporarily') || msg.includes('overloaded')) return true
  }
  return false
}

async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
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
        logger('warn', `${context}: transient failure, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`, {
          error: error instanceof Error ? error.message : String(error),
        })
        await new Promise(resolve => setTimeout(resolve, backoff))
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
  }
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

      const prompt = `
You are an expert insurance document analyst with deep knowledge of ACORD standards and European insurance policies.

TASK: Analyze this insurance policy document (PDF or image) and extract ALL available information into a structured JSON format.

CRITICAL INSTRUCTIONS:
1. Extract data EXACTLY as it appears in the document - do not invent or assume values
2. For dates, use YYYY-MM-DD format
3. For monetary amounts, extract the numeric value only (no currency symbols)
4. If a field is not visible or unclear, use null

TYPE-SPECIFIC EXTRACTION INSTRUCTIONS:
- Only populate the type-specific section that matches the lineOfBusiness (e.g., populate "health" only for health policies)
- For Health policies: Look for hospital class (Κλάση Νοσηλείας), coordination centre (Κέντρο Συντονισμού), waiting periods (Περίοδοι Αναμονής), outpatient limits
- For Motor policies: Look for coverage tier (Τρίτων/Μικτή), green card (Πράσινη Κάρτα), roadside assistance (Οδική Βοήθεια), accident declaration phone (Δήλωση Ατυχήματος), named drivers
- For Home policies: Check for fire+earthquake+flood coverage to compute ENFIA eligibility, look for technical assistance (Τεχνική Βοήθεια), insured vs replacement values, contents vs structure coverage
- For Life policies: Look for fund value, growth rates, tax-free maturity status, guaranteed vs unit-linked split, surrender value (Αξία Εξαγοράς), beneficiary details
- For Pet policies: Look for microchip number, annual limits, breed-specific disease coverage, leishmania coverage (Λεϊσμανίαση), direct vet payment, waiting periods

EXTRACTION PRIORITIES:
1. Look for policy number in headers, footers, or labeled fields
2. Identify insurer from logos, letterheads, or company names
3. Find effective/expiration dates (often labeled as "Period", "Validity", "Ισχύς")
4. Extract premium from payment sections (look for "Premium", "Ασφάλιστρο", "Amount Due")
5. Identify coverage type from policy title or type field
6. For vehicle policies: extract make, model, year, plate number
7. For property policies: extract address, type, square meters
8. Extract deductibles (often labeled "Excess", "Απαλλαγή")
9. Extract exclusions from sections titled "Exclusions", "Δεν καλύπτεται", "Εξαιρέσεις", "Αποκλεισμοί"

LANGUAGE SUPPORT:
- Handle both Greek and English documents
- Common Greek terms: Ασφάλιστρο (Premium), Απαλλαγή (Deductible), Ασφαλιζόμενο (Insured)
`

      logger('info', 'Starting Gemini 2.0 Flash extraction with UI Zod Schema', {
        fileName: document.fileName,
        mimeType: document.mimeType,
        model: modelName
      })

      const ExtractionSchema = z.object({
        insurerName: z.string().optional(),
        policyNumber: z.string().optional(),
        lineOfBusiness: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        premiumAmount: z.number().optional(),
        premiumCurrency: z.string().optional(),
        coverageSummary: z.string().optional(),
        customerName: z.string().optional(),
        customerSurname: z.string().optional(),
        customerEmail: z.string().optional(),
        exclusions: z.array(z.string()).optional(),
        extractionConfidence: z.object({
          overall: z.number().describe("0-100 score"),
          requiresReview: z.boolean(),
          fields: z.record(z.string(), z.number())
        }).optional(),
        acordData: AcordDataSchema.optional()
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
      const enriched = enrichExtractionPayload(extracted)
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
          }).catch(err => {
            logger('error', 'Failed to track token usage', { error: err })
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
        endDate: extracted.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

      const prompt = `
You are an expert insurance analyst with deep knowledge of ACORD standards and European insurance policies.

        TASK: Analyze the provided policy document and metadata to identify coverage gaps.

          CRITICAL: The DOCUMENT is the SOURCE OF TRUTH.
Current metadata may be incomplete or incorrect - verify against the document.

        Step 1: Data Verification
          - Extract Insurer, Policy Number, Dates, and Premium from the DOCUMENT
            - If document is missing / unreadable, use Current Metadata

Step 2: Gap Analysis
        - Check for gaps using VERIFIED data from Step 1
          - Provide clear explanations based on document clauses
            - Provide explanations in BOTH English(en) and Greek(el)

Current Metadata(Reference Only):
      Insurer: ${metadata.insurerName}
Policy Number: ${metadata.policyNumber}
      Type: ${metadata.lineOfBusiness}
      Dates: ${metadata.startDate.toISOString().split('T')[0]} to ${metadata.endDate.toISOString().split('T')[0]}
      Premium: ${metadata.premiumAmount}
      Summary: ${metadata.coverageSummary || 'N/A'}

Potential Gaps to Check:
${gapDefinitions.map(g => `- Slug: ${g.slug} (${g.name}): ${g.checkCriteria}`).join('\n')}
      `

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
        hasDocument: !!document,
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
          explanation: z.object({ en: z.string(), el: z.string() }),
          suggestion: z.object({ en: z.string(), el: z.string() })
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
          }).catch(err => {
            logger('error', 'Failed to track token usage', { error: err })
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
      })

      const response: AIGapAnalysisResponse = {
        verifiedMetadata: analysisRaw.verifiedMetadata as any,
        gapResults: analysisRaw.gapResults,
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

    const checklistPrompt = checklist
      .map((pillar) => `- ${pillar.key}: ${pillar.title.en} | checks: ${pillar.checks.join(', ')}`)
      .join('\n')

    const prompt = `
You are an insurance clarity analyst for policyholders.

Goal:
1) Translate policy language into plain-language insights.
2) Surface practical savings opportunities.
3) Detect coverage gaps and prioritize action.
4) Score each checklist pillar.

Use the document as source of truth. If details are missing, say so explicitly and lower confidence.

Current metadata:
- Insurer: ${metadata.insurerName}
- Policy Number: ${metadata.policyNumber}
- Line of Business: ${metadata.lineOfBusiness}
- Period: ${metadata.startDate.toISOString().split('T')[0]} to ${metadata.endDate.toISOString().split('T')[0]}
- Premium: ${metadata.premiumAmount ?? 'N/A'}
- Summary: ${metadata.coverageSummary || 'N/A'}

Checklist pillars:
${checklistPrompt}

Return strict JSON only.
`

    const ClaritySchema = z.object({
      plainLanguageSummary: z.object({
        en: z.string(),
        el: z.string(),
      }),
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
        action: z.object({ en: z.string(), el: z.string() }),
        rationale: z.object({ en: z.string(), el: z.string() }),
        estimatedAnnualSavingsEur: z.number().nullable(),
        confidence: z.number().min(0).max(100),
      })).default([]),
      coverageGaps: z.array(z.object({
        slug: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        evidence: z.object({ en: z.string(), el: z.string() }),
        recommendation: z.object({ en: z.string(), el: z.string() }),
      })).default([]),
      checklistScores: z.array(z.object({
        pillarKey: z.string(),
        pillarName: z.object({ en: z.string(), el: z.string() }),
        checksPassed: z.number().int().min(0),
        checksTotal: z.number().int().min(1),
        successPct: z.number().int().min(0).max(100),
        notes: z.object({ en: z.string(), el: z.string() }),
      })).default([]),
      priorityActions: z.array(z.object({
        priority: z.enum(['high', 'medium', 'low']),
        action: z.object({ en: z.string(), el: z.string() }),
        reason: z.object({ en: z.string(), el: z.string() }),
      })).default([]),
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
      }).catch((err) => {
        logger('error', 'Failed to track clarity token usage', { error: err })
      })
    }

    return {
      plainLanguageSummary: object.plainLanguageSummary,
      coverageSnapshot: object.coverageSnapshot,
      savingsOpportunities: object.savingsOpportunities,
      coverageGaps: object.coverageGaps,
      checklistScores: object.checklistScores,
      priorityActions: object.priorityActions,
      acordData: object.acordData,
      usage: parsedUsage,
    }
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

      const parts: any[] = []

      // Add the prompt
      const prompt = `
You are an expert insurance advisor helping a policyholder understand their insurance policy.

        ${context}

User Question: ${question}

      Instructions:
      1. Answer the question based on the policy document and metadata provided
      2. Be clear, concise, and helpful
      3. If the information is not available in the document, say so
      4. Provide specific references to policy sections when possible
      5. Use simple language that a non - expert can understand
      6. If the question is about coverage, explain what IS and IS NOT covered
      7. For Greek policies, you may respond in Greek if the question is in Greek

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
}
