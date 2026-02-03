/**
 * Gemini AI Service Implementation
 * 
 * Implements the IAIService interface using Google's Gemini AI.
 * Handles policy extraction and gap analysis using the Gemini API.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'
import type {
    IAIService,
    AIDocument,
    PolicyMetadata,
    GapDefinitionForAI,
    AIPolicyExtractionResponse,
    AIGapAnalysisResponse
} from './ai-service.interface'

export class GeminiAIService implements IAIService {
    private genAI: GoogleGenerativeAI | null = null
    private apiKey: string | null = null

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || null

        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey)
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
     * Extracts policy data from a document using Gemini
     */
    async extractPolicyData(document: AIDocument): Promise<AIPolicyExtractionResponse> {
        if (!this.genAI) {
            throw new Error('Gemini AI service is not available')
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

            const prompt = `
Analyze this insurance policy document and extract the following JSON.
Do not include Markdown formatting, just the raw JSON.

Fields:
- insurerName (string): The insurance company name
- policyNumber (string): The policy number
- lineOfBusiness (one of: motor, health, home, life, travel, liability, pet, breakdown, legal_expenses, income_protection, gadget, bicycle, business, cyber, motorbike, public_liability, renters, other)
- startDate (YYYY-MM-DD): Policy start date
- endDate (YYYY-MM-DD): Policy end date
- premiumAmount (number): Premium amount in euros
- coverageSummary (string): A short, clear summary of key coverages and limits (max 200 chars)

If a field is missing, make a best guess or use null.
Return ONLY valid JSON, no other text.
`

            const imagePart = {
                inlineData: {
                    data: document.data,
                    mimeType: document.mimeType
                }
            }

            const result = await model.generateContent([prompt, imagePart])
            const response = await result.response
            const text = response.text()

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, '').replace(/```/g, '').trim()
            const extracted = JSON.parse(jsonStr)

            logger('info', 'Gemini policy extraction successful', {
                fileName: document.fileName,
                insurerName: extracted.insurerName
            })

            return {
                insurerName: extracted.insurerName || 'Unknown',
                policyNumber: extracted.policyNumber || `PENDING-${Date.now()}`,
                lineOfBusiness: extracted.lineOfBusiness || 'other',
                startDate: extracted.startDate || new Date().toISOString().split('T')[0],
                endDate: extracted.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                premiumAmount: extracted.premiumAmount || 0,
                coverageSummary: extracted.coverageSummary || 'Processing...'
            }
        } catch (error) {
            logger('error', 'Gemini policy extraction failed', {
                fileName: document.fileName,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Analyzes policy for gaps using Gemini
     */
    async analyzeGaps(
        document: AIDocument | null,
        metadata: PolicyMetadata,
        gapDefinitions: GapDefinitionForAI[]
    ): Promise<AIGapAnalysisResponse> {
        if (!this.genAI) {
            throw new Error('Gemini AI service is not available')
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

            const prompt = `
You are an expert insurance analyst. Analyze the provided policy document and metadata.

CRITICAL: The DOCUMENT is the SOURCE OF TRUTH.
Current metadata may be incomplete or incorrect.

Step 1: Data Verification
- Extract Insurer, Policy Number, Dates, and Premium from the DOCUMENT.
- If document is missing/unreadable, use Current Metadata.

Step 2: Gap Analysis
- Check for gaps using VERIFIED data from Step 1.
- Provide clear explanations based on document clauses.
- Provide explanations in BOTH English (en) and Greek (el).

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
    "policy": {},
    "vehicle": {},
    "coverages": []
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

            const result = await model.generateContent(parts)
            const response = await result.response
            const text = response.text()

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('AI did not return valid JSON')
            }

            const analysis: AIGapAnalysisResponse = JSON.parse(jsonMatch[0])

            logger('info', 'Gemini gap analysis successful', {
                policyNumber: metadata.policyNumber,
                gapsChecked: gapDefinitions.length,
                gapsDetected: analysis.gapResults.filter(g => g.isDetected).length
            })

            return analysis
        } catch (error) {
            logger('error', 'Gemini gap analysis failed', {
                policyNumber: metadata.policyNumber,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }
}
