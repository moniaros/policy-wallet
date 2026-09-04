import { beforeEach, describe, expect, it, vi } from 'vitest'
import { asValidatedForTests } from "../helpers/validated-document"
import { providerDocumentFileName } from '@/lib/wallet/document-label'
import type { AIDocument, GapDefinitionForAI, PolicyMetadata } from '@/lib/services/ai/ai-service.interface'
import { GeminiAIService } from '@/lib/services/ai/gemini-ai.service'
import { generateObject, generateText } from 'ai'

vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  // json-mode-schema embeds the JSON schema in the prompt via zodSchema()
  zodSchema: () => ({ jsonSchema: { type: 'object', mocked: true } }),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class GoogleGenerativeAI {
    constructor(_apiKey: string) {}
  },
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: function createGoogleGenerativeAI() {
    return function provider(model: string) {
      return { model }
    }
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    GEMINI_MODEL_EXTRACTION: 'test-extraction-model',
    GEMINI_MODEL_GAP_ANALYSIS: 'test-gap-model',
    GEMINI_MODEL_CLARITY_ANALYSIS: 'test-clarity-model',
    GEMINI_MODEL_QA: 'test-qa-model',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: vi.fn(),
}))

vi.mock('@/lib/token-tracking', () => ({
  trackTokenUsage: vi.fn(() => Promise.resolve()),
}))

describe('GeminiAIService message payload shape', () => {
  const doc: AIDocument = {
    data: 'QUJDRA==',
    mimeType: 'application/pdf',
  }

  const metadata: PolicyMetadata = {
    insurerName: 'Test Insurer',
    policyNumber: 'PN-123',
    lineOfBusiness: 'motor',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    premiumAmount: 100,
    coverageSummary: 'Test coverage',
  }

  const gapDefinitions: GapDefinitionForAI[] = [
    {
      slug: 'roadside_assistance_missing',
      name: 'Roadside Assistance',
      description: 'Missing roadside support',
      checkCriteria: 'Check if roadside support exists',
    },
  ]

  const checklist = [
    {
      key: 'clarity',
      title: { en: 'Clarity', el: 'Σαφήνεια' },
      description: { en: 'Clear terms', el: 'Σαφείς όροι' },
      checks: ['uses_plain_language'],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses ai@6-compatible file parts for extraction, gap, and clarity generateObject calls', async () => {
    const generateObjectMock = vi.mocked(generateObject)
    generateObjectMock
      .mockResolvedValueOnce({
        object: {
          insurerName: 'Insurer',
          policyNumber: 'PN-1',
          lineOfBusiness: 'motor',
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          premiumAmount: 200,
          coverageSummary: 'Summary',
        },
        usage: { inputTokens: 10, outputTokens: 5 },
      } as any)
      .mockResolvedValueOnce({
        object: {
          verifiedMetadata: {},
          gapResults: [
            {
              slug: 'roadside_assistance_missing',
              isDetected: false,
              explanation: { en: 'ok', el: 'ok' },
              suggestion: { en: 'ok', el: 'ok' },
            },
          ],
        },
        usage: { inputTokens: 11, outputTokens: 6 },
      } as any)
      .mockResolvedValueOnce({
        object: {
          plainLanguageSummary: { en: 'summary', el: 'περίληψη' },
          coverageSnapshot: {
            covered: [],
            notCovered: [],
            limits: [],
            deductibles: [],
            exclusions: [],
          },
          savingsOpportunities: [],
          coverageGaps: [],
          checklistScores: [],
          priorityActions: [],
        },
        usage: { inputTokens: 12, outputTokens: 7 },
      } as any)

    const service = new GeminiAIService('test-api-key')

    await service.extractPolicyData(asValidatedForTests(doc))
    await service.analyzeGaps(doc, metadata, gapDefinitions)
    await service.analyzePolicyClarity(doc, metadata, checklist)

    expect(generateObjectMock).toHaveBeenCalledTimes(3)

    for (const call of generateObjectMock.mock.calls) {
      const payload = call[0] as any
      const userMessage = payload.messages[0]
      expect(userMessage.role).toBe('user')

      const filePart = userMessage.content.find((part: any) => part.type === 'file')
      expect(filePart).toBeDefined()
      expect(filePart.data).toBe(doc.data)
      expect(filePart.mediaType).toBe(doc.mimeType)
      // A constant, not the user's file name — providers log request
      // metadata, so a real name here leaves our boundary.
      expect(filePart.filename).toBe(providerDocumentFileName(doc.mimeType))
      expect(filePart.filename).not.toMatch(/policy|life|health|\d{4}/i)
      expect(filePart.mimeType).toBeUndefined()
      expect(String(filePart.data)).not.toContain('data:application/pdf')

      // Gemini rejects AcordDataSchema-sized response_schemas ("too many
      // states") — these calls must use JSON mode with the schema in the
      // prompt and local validation instead.
      expect(payload.output).toBe('no-schema')
      expect(payload.schema).toBeUndefined()
      const schemaTextPart = userMessage.content.find(
        (part: any) => part.type === 'text' && String(part.text).includes('JSON SCHEMA:')
      )
      expect(schemaTextPart).toBeDefined()
    }
  })

  it('uses ai@6-compatible file parts for Q&A generateText calls', async () => {
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockResolvedValue({
      text: 'Answer',
      usage: { inputTokens: 8, outputTokens: 3 },
    } as any)

    const service = new GeminiAIService('test-api-key')

    await service.askQuestion(doc, metadata, 'What is covered?')

    expect(generateTextMock).toHaveBeenCalledTimes(1)
    const payload = generateTextMock.mock.calls[0][0] as any
    const userMessage = payload.messages[0]

    expect(userMessage.role).toBe('user')
    expect(Array.isArray(userMessage.content)).toBe(true)

    const textPart = userMessage.content.find((part: any) => part.type === 'text')
    expect(textPart).toBeDefined()

    const filePart = userMessage.content.find((part: any) => part.type === 'file')
    expect(filePart).toBeDefined()
    expect(filePart.data).toBe(doc.data)
    expect(filePart.mediaType).toBe(doc.mimeType)
    // A constant, not the user's file name — providers log request
      // metadata, so a real name here leaves our boundary.
      expect(filePart.filename).toBe(providerDocumentFileName(doc.mimeType))
      expect(filePart.filename).not.toMatch(/policy|life|health|\d{4}/i)
    expect(filePart.mimeType).toBeUndefined()
    expect(userMessage.content.some((part: any) => 'inlineData' in part)).toBe(false)
  })
})
