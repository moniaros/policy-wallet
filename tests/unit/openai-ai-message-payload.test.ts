import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIDocument, GapDefinitionForAI, PolicyMetadata } from '@/lib/services/ai/ai-service.interface'
import { OpenAIAIService } from '@/lib/services/ai/openai-ai.service'
import { generateObject, generateText } from 'ai'

vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: function createOpenAI() {
    return function provider(model: string) {
      return { model }
    }
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    OPENAI_MODEL_EXTRACTION: 'test-openai-extraction-model',
    OPENAI_MODEL_GAP_ANALYSIS: 'test-openai-gap-model',
    OPENAI_MODEL_CLARITY_ANALYSIS: 'test-openai-clarity-model',
    OPENAI_MODEL_QA: 'test-openai-qa-model',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: vi.fn(),
}))

vi.mock('@/lib/token-tracking', () => ({
  trackTokenUsage: vi.fn(() => Promise.resolve()),
}))

describe('OpenAIAIService message payload shape', () => {
  const doc: AIDocument = {
    data: 'QUJDRA==',
    mimeType: 'application/pdf',
    fileName: 'policy.pdf',
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
      title: { en: 'Clarity', el: 'Safineia' },
      description: { en: 'Clear terms', el: 'Safeis oroi' },
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
          plainLanguageSummary: { en: 'summary', el: 'perilipsi' },
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

    const service = new OpenAIAIService('test-openai-api-key')

    await service.extractPolicyData(doc)
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
      expect(filePart.filename).toBe(doc.fileName)
      expect(filePart.mimeType).toBeUndefined()
      expect(String(filePart.data)).not.toContain('data:application/pdf')
    }
  })

  it('uses ai@6-compatible file parts for Q&A generateText calls', async () => {
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockResolvedValue({
      text: 'Answer',
      usage: { inputTokens: 8, outputTokens: 3 },
    } as any)

    const service = new OpenAIAIService('test-openai-api-key')

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
    expect(filePart.filename).toBe(doc.fileName)
    expect(filePart.mimeType).toBeUndefined()
    expect(userMessage.content.some((part: any) => 'inlineData' in part)).toBe(false)
  })
})
