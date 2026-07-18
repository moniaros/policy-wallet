import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    buildExtractionPrompt,
    buildGapAnalysisPromptFromContext,
    buildGapAnalysisPromptFromDocument,
    buildClarityPromptFromContext,
    buildClarityPromptFromDocument,
    buildQaPrompt,
} from '@/lib/services/ai/prompts'
import { WRITE_BRANCH_IDS } from '@/lib/insurance/taxonomy'
import type { AIPolicyExtractionResponse, PolicyMetadata } from '@/lib/services/ai/ai-service.interface'

const metadata: PolicyMetadata = {
    insurerName: 'Εθνική Ασφαλιστική',
    policyNumber: 'POL-123',
    lineOfBusiness: 'motor',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2027-01-01T00:00:00Z'),
    premiumAmount: 350,
    coverageSummary: 'Αστική ευθύνη',
}

const ctx = {
    insurerName: 'Εθνική Ασφαλιστική',
    policyNumber: 'POL-123',
    lineOfBusiness: 'motor',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    premiumAmount: 350,
    coverageSummary: 'Αστική ευθύνη',
    exclusions: ['Οδήγηση υπό μέθη'],
} as AIPolicyExtractionResponse

const gapDefinitions = [
    { slug: 'no-roadside', checkCriteria: 'Roadside assistance missing' },
    { slug: 'low-liability', checkCriteria: 'Liability limit below legal minimum' },
]

const checklist = [
    {
        key: 'transparency',
        title: { en: 'Transparency', el: 'Διαφάνεια' },
        description: { en: 'd', el: 'δ' },
        checks: ['clear premium', 'clear exclusions'],
    },
]

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('buildExtractionPrompt', () => {
    // Regression: the per-provider prompts contradicted their own schemas
    // (DD-MM-YYYY vs YYYY-MM-DD, three different lineOfBusiness enums, a
    // legacy `acord` output contract, and a bilingual-tags instruction that
    // produced {el,en} objects where plain strings were expected).
    it('demands the schema date format and never the legacy one', () => {
        const prompt = buildExtractionPrompt()
        expect(prompt).toContain('YYYY-MM-DD')
        expect(prompt).not.toContain('DD-MM-YYYY')
    })

    it('carries the single canonical lineOfBusiness enum', () => {
        const prompt = buildExtractionPrompt()
        expect(prompt).toContain(WRITE_BRANCH_IDS.join(', '))
        // The legacy capitalized enum ("Motor | Property | ...") must not return —
        // "Property" was never a valid branch id.
        expect(prompt).not.toMatch(/Motor \| Property/)
    })

    it('does not restate a competing output contract', () => {
        // The old FINAL OUTPUT block demanded an `acord` key that no schema has.
        expect(buildExtractionPrompt()).not.toContain('"acord"')
    })

    it('guards premiumAmount against the sum-insured mis-extraction', () => {
        const prompt = buildExtractionPrompt()
        expect(prompt).toContain('ασφαλιζόμενο κεφάλαιο')
        expect(prompt).toContain('NEVER')
    })

    it('scopes bilingual output to schema-defined {en, el} objects only', () => {
        const prompt = buildExtractionPrompt()
        expect(prompt).toContain('{en, el}')
        expect(prompt).toContain('Never emit an {en, el} object where the schema expects a plain string')
    })

    it('appends the citations section only when the flag is on', () => {
        vi.stubEnv('EXTRACTION_CITATIONS', '')
        expect(buildExtractionPrompt()).not.toContain('extractionSources')

        vi.stubEnv('EXTRACTION_CITATIONS', '1')
        expect(buildExtractionPrompt()).toContain('extractionSources')
    })
})

describe('gap analysis prompts', () => {
    it('lists every gap definition and demands one result per slug (context path)', () => {
        const prompt = buildGapAnalysisPromptFromContext(ctx, gapDefinitions)
        expect(prompt).toContain('no-roadside')
        expect(prompt).toContain('low-liability')
        expect(prompt).toContain('exactly one gapResults entry')
        expect(prompt).toContain('Ελληνικά')
    })

    it('keeps the document as source of truth on the document path', () => {
        const prompt = buildGapAnalysisPromptFromDocument(metadata, gapDefinitions)
        expect(prompt).toContain('SOURCE OF TRUTH')
        expect(prompt).toContain('2026-01-01')
        expect(prompt).toContain('exactly one gapResults entry')
    })
})

describe('clarity prompts', () => {
    it('includes checklist pillars and scoring rules on both paths', () => {
        for (const prompt of [
            buildClarityPromptFromContext(ctx, checklist),
            buildClarityPromptFromDocument(metadata, checklist),
        ]) {
            expect(prompt).toContain('transparency')
            expect(prompt).toContain('checksTotal')
            expect(prompt).toContain('Ελληνικά')
        }
    })
})

describe('buildQaPrompt', () => {
    it('answers in the language of the question and includes ACORD context when given', () => {
        const prompt = buildQaPrompt(metadata, 'Καλύπτομαι για χαλάζι;', { motor: { coverageTier: 'full' } })
        expect(prompt).toContain('language of the question')
        expect(prompt).toContain('Καλύπτομαι για χαλάζι;')
        expect(prompt).toContain('coverageTier')
    })

    it('omits the ACORD block when no structured data exists', () => {
        expect(buildQaPrompt(metadata, 'Am I covered?')).not.toContain('ACORD')
    })
})
