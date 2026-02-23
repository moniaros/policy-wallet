/**
 * Gemini AI Service Implementation
 * 
 * Implements the IAIService interface using Google's Gemini AI.
 * Handles policy extraction and gap analysis using the Gemini API.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import type {
  IAIService,
  AIDocument,
  PolicyMetadata,
  GapDefinitionForAI,
  AIPolicyExtractionResponse,
  AIGapAnalysisResponse,
  AITrackingOptions
} from './ai-service.interface'
import { trackTokenUsage } from '@/lib/token-tracking'
import { enrichExtractionPayload } from './extraction-enrichment'

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

export class GeminiAIService implements IAIService {
  private genAI: GoogleGenerativeAI | null = null
  private apiKey: string | null = null

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY

    // Ensure key is a non-empty string
    if (key && typeof key === 'string' && key.trim().length > 0 && key !== 'undefined' && key !== 'null') {
      this.apiKey = key.trim()
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey)
      } catch (err) {
        logger('error', 'Failed to initialize GoogleGenerativeAI SDK', {
          error: err instanceof Error ? err.message : String(err)
        })
        this.genAI = null
        this.apiKey = null
      }
    } else {
      this.apiKey = null
      this.genAI = null
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
    if (!this.genAI) {
      throw new Error('Gemini AI service is not available')
    }

    try {
      // Use configured Gemini model for extraction
      const modelName = env.GEMINI_MODEL_EXTRACTION
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1, // Low temperature for factual extraction
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })

      const prompt = `
You are an expert insurance document analyst with deep knowledge of ACORD standards and European insurance policies.

TASK: Analyze this insurance policy document (PDF or image) and extract ALL available information into a structured JSON format.

CRITICAL INSTRUCTIONS:
1. Extract data EXACTLY as it appears in the document - do not invent or assume values
2. For dates, use YYYY-MM-DD format
3. For monetary amounts, extract the numeric value only (no currency symbols)
4. If a field is not visible or unclear, use null
5. Return ONLY valid JSON - no markdown, no explanations, no additional text

REQUIRED FIELDS:
{
  "insurerName": "Full legal name of the insurance company",
  "policyNumber": "Complete policy/contract number",
  "lineOfBusiness": "motor|health|home|life|travel|liability|pet|breakdown|legal_expenses|income_protection|gadget|bicycle|business|cyber|motorbike|public_liability|renters|other",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "premiumAmount": number,
  "premiumCurrency": "EUR|USD|GBP|CHF",
  "coverageSummary": "Brief summary of main coverages (max 200 chars)",
  "customerName": "First name of the insured if visible",
  "customerSurname": "Last name of the insured if visible",
  "customerEmail": "Email of the insured if visible",
  "exclusions": ["Top policy exclusions/limitations in plain language"],
  "extractionConfidence": {
    "overall": 0-100,
    "requiresReview": true|false,
    "fields": {
      "insurerName": 0-100,
      "policyNumber": 0-100,
      "lineOfBusiness": 0-100,
      "startDate": 0-100,
      "endDate": 0-100,
      "premiumAmount": 0-100
    }
  },
  
  "acordData": {
    "acordStandard": "V1.0",
    "policy": {
      "insurerName": "string",
      "policyNumber": "string",
      "lineOfBusiness": "string",
      "effectiveDate": "YYYY-MM-DD",
      "expirationDate": "YYYY-MM-DD",
      "premium": {
        "amount": number,
        "currency": "string",
        "frequency": "annual|monthly|quarterly|semi-annual"
      },
      "deductible": {
        "amount": number,
        "currency": "string"
      },
      "coverageLimit": {
        "amount": number,
        "currency": "string"
      },
      "insurerContact": "Phone number or contact info",
      "agentName": "Agent/broker name if visible",
      "agentContact": "Agent contact if visible"
    },
    "vehicle": {
      "make": "string",
      "model": "string",
      "year": number,
      "plateNumber": "string",
      "vin": "string",
      "usage": "private|commercial|taxi"
    },
    "property": {
      "address": "string",
      "type": "apartment|house|commercial",
      "squareMeters": number,
      "constructionYear": number
    },
    "insured": {
      "name": "string",
      "taxId": "AFM or tax ID",
      "address": "string",
      "phone": "string",
      "email": "string"
    },
    "coverages": [
      {
        "type": "string",
        "limit": { "amount": number, "currency": "string" },
        "deductible": { "amount": number, "currency": "string" },
        "description": "string"
      }
    ],
    "exclusions": ["string exclusion 1", "string exclusion 2"],
    "beneficiaries": [
      {
        "name": "string",
        "relationship": "string",
        "percentage": number
      }
    ],

    "health": {
      "hospitalClass": "A|B|C or null if not health policy",
      "coordinationCentre": { "name": "string", "phone": "string" },
      "annualCheckupIncluded": true|false,
      "directBillingAvailable": true|false,
      "waitingPeriods": [{ "type": "string", "durationDays": number, "endDate": "YYYY-MM-DD" }],
      "outpatientLimit": number,
      "deductiblePerClaim": number
    },

    "motor": {
      "coverageTier": "third_party|third_party_fire_theft|comprehensive",
      "greenCardExpiry": "YYYY-MM-DD",
      "namedDrivers": [{ "name": "string", "licenseNumber": "string" }],
      "accidentDeclarationPhone": "string",
      "roadsideAssistancePhone": "string",
      "ownVehicleDamage": true|false,
      "glassBreakage": true|false
    },

    "home": {
      "enfiaEligible": true|false,
      "catastropheCoverage": { "fire": true|false, "earthquake": true|false, "flood": true|false },
      "mortgageeBank": "string",
      "technicalAssistancePhone": "string",
      "theftCoverageLimit": number,
      "insuredValue": number,
      "replacementValue": number,
      "contentsVsStructure": "contents_only|structure_only|both"
    },

    "life": {
      "currentFundValue": number,
      "ytdGrowth": number,
      "taxFreeAtMaturity": true|false,
      "guaranteedPercentage": number,
      "unitLinkedPercentage": number,
      "surrenderValue": number,
      "lastPremiumDate": "YYYY-MM-DD",
      "lastPremiumAmount": number
    },

    "pet": {
      "microchipNumber": "string",
      "annualLimitTotal": number,
      "annualLimitUsed": number,
      "breedSpecificDiseases": ["string"],
      "leishmaniaCovered": true|false,
      "directVetPayment": true|false,
      "waitingPeriods": [{ "type": "string", "durationDays": number, "endDate": "YYYY-MM-DD" }]
    }
  }
}

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
9. Extract coverage limits (often labeled "Sum Insured", "Ασφαλιζόμενο Κεφάλαιο")
10. Extract exclusions from sections titled "Exclusions", "Δεν καλύπτεται", "Εξαιρέσεις", "Αποκλεισμοί"
11. Provide realistic confidence scores per critical field (0-100)

LANGUAGE SUPPORT:
- Handle both Greek and English documents
- Common Greek terms: Ασφάλιστρο (Premium), Απαλλαγή (Deductible), Ασφαλιζόμενο (Insured)

Return ONLY the JSON object, nothing else.
`

      const imagePart = {
        inlineData: {
          data: document.data,
          mimeType: document.mimeType
        }
      }

      logger('info', 'Starting Gemini 2.0 Flash extraction', {
        fileName: document.fileName,
        mimeType: document.mimeType,
        model: 'gemini-2.0-flash-exp'
      })

      const result = await withTimeoutAndRetry(
        () => model.generateContent([prompt, imagePart]),
        'Gemini extraction'
      )
      const response = await result.response
      const text = response.text()

      if (options?.userId) {
        const usage = response.usageMetadata
        if (usage) {
          await trackTokenUsage({
            userId: options.userId,
            operationType: 'policy_analysis',
            policyId: options.policyId,
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            model: env.GEMINI_MODEL_EXTRACTION as any
          }).catch(err => {
            logger('error', 'Failed to track token usage', { error: err })
          })
        }
      }

      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON')
      }

      const jsonStr = jsonMatch[0]
      const extracted = JSON.parse(jsonStr)
      const enriched = enrichExtractionPayload(extracted)

      logger('info', 'Gemini 2.0 Flash extraction successful', {
        fileName: document.fileName,
        insurerName: extracted.insurerName,
        policyNumber: extracted.policyNumber,
        hasAcordData: !!extracted.acordData
      })

      // Return with fallbacks for required fields
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
        acordData: enriched.acordData
      }
    } catch (error) {
      logger('error', 'Gemini 2.0 Flash extraction failed', {
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
    if (!this.genAI) {
      throw new Error('Gemini AI service is not available')
    }

    try {
      // Use configured Gemini model for gap analysis
      const model = this.genAI.getGenerativeModel({
        model: env.GEMINI_MODEL_GAP_ANALYSIS,
        generationConfig: {
          temperature: 0.2, // Slightly higher for nuanced analysis
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })

      const prompt = `
You are an expert insurance analyst with deep knowledge of ACORD standards and European insurance policies.

TASK: Analyze the provided policy document and metadata to identify coverage gaps.

CRITICAL: The DOCUMENT is the SOURCE OF TRUTH.
Current metadata may be incomplete or incorrect - verify against the document.

Step 1: Data Verification
- Extract Insurer, Policy Number, Dates, and Premium from the DOCUMENT
- If document is missing/unreadable, use Current Metadata
- Extract detailed ACORD-compliant data structure

Step 2: Gap Analysis
- Check for gaps using VERIFIED data from Step 1
- Provide clear explanations based on document clauses
- Provide explanations in BOTH English (en) and Greek (el)

Current Metadata (Reference Only):
Insurer: ${metadata.insurerName}
Policy Number: ${metadata.policyNumber}
Type: ${metadata.lineOfBusiness}
Dates: ${metadata.startDate.toISOString().split('T')[0]} to ${metadata.endDate.toISOString().split('T')[0]}
Premium: ${metadata.premiumAmount}
Summary: ${metadata.coverageSummary || 'N/A'}

Potential Gaps to Check:
${gapDefinitions.map(g => `- Slug: ${g.slug} (${g.name}): ${g.checkCriteria}`).join('\n')}

IMPORTANT: Return ONLY a JSON object with this exact structure:
{
  "verifiedMetadata": {
    "insurerName": "string",
    "policyNumber": "string",
    "lineOfBusiness": "motor|health|home|life|travel|liability",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "premiumAmount": number,
    "coverageSummary": "string"
  },
  "exclusions": ["Top exclusions discovered from document text"],
  "extractionConfidence": {
    "overall": 0-100,
    "requiresReview": true|false,
    "fields": {
      "insurerName": 0-100,
      "policyNumber": 0-100,
      "lineOfBusiness": 0-100,
      "startDate": 0-100,
      "endDate": 0-100,
      "premiumAmount": 0-100
    }
  },
  "gapResults": [
    {
      "slug": "gap-slug",
      "isDetected": boolean,
      "explanation": { "en": "English explanation", "el": "Ελληνική εξήγηση" },
      "suggestion": { "en": "English suggestion", "el": "Ελληνική πρόταση" }
    }
  ],
  "acordData": {
    "acordStandard": "V1.0",
    "policy": {
      "insurerName": "string",
      "policyNumber": "string",
      "effectiveDate": "YYYY-MM-DD",
      "expirationDate": "YYYY-MM-DD",
      "premium": { "amount": number, "currency": "string" },
      "deductible": { "amount": number, "currency": "string" },
      "coverageLimit": { "amount": number, "currency": "string" },
      "insurerContact": "string"
    },
    "vehicle": {},
    "property": {},
    "coverages": [],
    "exclusions": []
  }
}

Return ONLY valid JSON, no other text.
`

      const parts: any[] = [prompt]
      if (document) {
        parts.push({
          inlineData: {
            data: document.data,
            mimeType: document.mimeType
          }
        })
      }

      logger('info', 'Starting Gemini 2.0 Flash gap analysis', {
        policyNumber: metadata.policyNumber,
        gapsToCheck: gapDefinitions.length,
        hasDocument: !!document,
        model: 'gemini-2.0-flash-exp'
      })

      const result = await withTimeoutAndRetry(
        () => model.generateContent(parts),
        'Gemini gap analysis'
      )
      const response = await result.response
      const text = response.text()

      if (options?.userId) {
        const usage = response.usageMetadata
        if (usage) {
          await trackTokenUsage({
            userId: options.userId,
            operationType: 'gap_detection',
            policyId: options.policyId,
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            model: env.GEMINI_MODEL_GAP_ANALYSIS as any
          }).catch(err => {
            logger('error', 'Failed to track token usage', { error: err })
          })
        }
      }

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI did not return valid JSON')
      }

      const analysis: AIGapAnalysisResponse & { exclusions?: unknown; extractionConfidence?: unknown } = JSON.parse(jsonMatch[0])
      const enriched = enrichExtractionPayload({
        insurerName: analysis.verifiedMetadata?.insurerName,
        policyNumber: analysis.verifiedMetadata?.policyNumber,
        lineOfBusiness: analysis.verifiedMetadata?.lineOfBusiness,
        startDate: analysis.verifiedMetadata?.startDate,
        endDate: analysis.verifiedMetadata?.endDate,
        premiumAmount: analysis.verifiedMetadata?.premiumAmount,
        exclusions: analysis.exclusions,
        extractionConfidence: analysis.extractionConfidence,
        acordData: analysis.acordData,
      })
      analysis.acordData = enriched.acordData

      logger('info', 'Gemini 2.0 Flash gap analysis successful', {
        policyNumber: metadata.policyNumber,
        gapsChecked: gapDefinitions.length,
        gapsDetected: analysis.gapResults.filter(g => g.isDetected).length,
        hasAcordData: !!analysis.acordData
      })

      return analysis
    } catch (error) {
      logger('error', 'Gemini 2.0 Flash gap analysis failed', {
        policyNumber: metadata.policyNumber,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
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
      const model = this.genAI.getGenerativeModel({
        model: env.GEMINI_MODEL_QA,
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })

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

      // If there's a document, include it
      if (document) {
        parts.push({
          inlineData: {
            data: document.data,
            mimeType: document.mimeType
          }
        })
      }

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
5. Use simple language that a non-expert can understand
6. If the question is about coverage, explain what IS and IS NOT covered
7. For Greek policies, you may respond in Greek if the question is in Greek

Answer the user's question:
`
      parts.push(prompt)

      const result = await withTimeoutAndRetry(
        () => model.generateContent(parts),
        'Gemini Q&A'
      )
      const response = await result.response
      const answer = response.text()

      // Track Token Usage
      if (options?.userId && response.usageMetadata) {
        const usage = response.usageMetadata
        trackTokenUsage({
          userId: options.userId,
          operationType: 'qa_session',
          policyId: options.policyId,
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
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
