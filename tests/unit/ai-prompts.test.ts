import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    buildExtractionPrompt,
    buildGapAnalysisPrompt,
    buildClarityPrompt,
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
    { slug: 'no-roadside', name: 'No roadside assistance', description: null, checkCriteria: 'Roadside assistance missing' },
    { slug: 'low-liability', name: 'Low liability limit', description: null, checkCriteria: 'Liability limit below legal minimum' },
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

    it('keeps the single-acord-section invariant', () => {
        expect(buildExtractionPrompt()).toContain('ONLY the section matching the detected lineOfBusiness')
    })

    it('asks for citations only when the flag is on, and forbids them when off', () => {
        vi.stubEnv('EXTRACTION_CITATIONS', '')
        const off = buildExtractionPrompt()
        // JSON mode has no server-side schema enforcement — the negative
        // instruction is what keeps invented citation fields out (flag off).
        expect(off).toContain('Do not include citations')
        expect(off).not.toContain('CITATIONS:')

        vi.stubEnv('EXTRACTION_CITATIONS', '1')
        expect(buildExtractionPrompt()).toContain('extractionSources')
    })
})

describe('buildGapAnalysisPrompt', () => {
    it('uses the compact context path when extraction context exists and no document is attached', () => {
        const prompt = buildGapAnalysisPrompt(metadata, gapDefinitions, ctx, false)
        expect(prompt).toContain('pre-extracted policy data')
        expect(prompt).toContain('no-roadside')
        expect(prompt).toContain('low-liability')
        expect(prompt).toContain('exactly one gapResults entry')
        expect(prompt).toContain('Ελληνικά')
    })

    it('keeps the document as source of truth when a document is attached', () => {
        const prompt = buildGapAnalysisPrompt(metadata, gapDefinitions, ctx, true)
        expect(prompt).toContain('SOURCE OF TRUTH')
        expect(prompt).toContain('2026-01-01')
        expect(prompt).toContain('exactly one gapResults entry')
    })

    it('falls back to the document path when no context exists', () => {
        expect(buildGapAnalysisPrompt(metadata, gapDefinitions, undefined, false)).toContain('SOURCE OF TRUTH')
    })
})

describe('buildClarityPrompt', () => {
    it('includes checklist pillars, scoring rules and the acordData destination on both paths', () => {
        for (const prompt of [
            buildClarityPrompt(metadata, checklist, ctx, false),
            buildClarityPrompt(metadata, checklist, undefined, true),
        ]) {
            expect(prompt).toContain('transparency')
            expect(prompt).toContain('checksTotal')
            expect(prompt).toContain('Ελληνικά')
            // The orchestrator merges clarity acordData over extraction's —
            // the model must be told WHERE to put fine-print findings.
            expect(prompt).toContain('finePrintClauses, perksAndBenefits, and notableConditions arrays in acordData')
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
