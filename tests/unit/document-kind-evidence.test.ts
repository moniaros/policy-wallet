import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

import {
    DOCUMENT_KINDS,
    DOCUMENT_KIND_PROMPT_SECTION,
    EVIDENCE_REFUSAL_COPY,
    assessExtractionEvidence,
    isPolicyBearing,
} from '@/lib/services/ai/document-kind'
import { buildExtractionPrompt } from '@/lib/services/ai/prompts'

/**
 * "Insufficient evidence" as a first-class answer.
 *
 * The pipeline assumed every upload was a policy schedule. Two documents in the
 * reference corpus are not — a health policy's terms booklet, and a page of
 * blank statutory opposition forms — and both would previously have been read as
 * policies, complete with an insurer name lifted off the letterhead.
 *
 * These tests pin the refusal, because a wrong policy in the wallet is worse
 * than no policy: it moves the protection score, it renders as cover the
 * customer does not have, and nothing about it looks broken.
 */
describe('document kind — what counts as a policy', () => {
    it('treats only a schedule or a certificate as policy-bearing', () => {
        expect(isPolicyBearing('policy_schedule')).toBe(true)
        expect(isPolicyBearing('certificate')).toBe(true)
        expect(isPolicyBearing('terms_and_conditions')).toBe(false)
        expect(isPolicyBearing('forms')).toBe(false)
        expect(isPolicyBearing('renewal_notice')).toBe(false)
        expect(isPolicyBearing('invoice')).toBe(false)
        expect(isPolicyBearing('other')).toBe(false)
    })

    it('treats a missing kind as policy-bearing, so older extractions behave as before', () => {
        // Every extraction stored before this field existed has no kind. Refusing
        // those would break re-analysis of the entire existing book.
        expect(isPolicyBearing(undefined)).toBe(true)
        expect(isPolicyBearing(null)).toBe(true)
    })
})

describe('evidence assessment — the corpus cases', () => {
    it('refuses a terms-and-conditions booklet even when it names an insurer', () => {
        // LIFE_POLICY.pdf: 113 pages of Όροι Ασφάλισης, «Η ΕΘΝΙΚΗ» on every page,
        // no schedule, no parties, no policy number.
        const verdict = assessExtractionEvidence({
            documentKind: 'terms_and_conditions',
            insurerName: 'Η ΕΘΝΙΚΗ',
        })
        expect(verdict.sufficient).toBe(false)
        expect(verdict).toMatchObject({ reason: 'not_a_policy_document', documentKind: 'terms_and_conditions' })
    })

    it('refuses blank statutory forms', () => {
        // LIFE_POLICY_RENEWAL.pdf: δήλωση εναντίωσης / υπαναχώρησης templates.
        const verdict = assessExtractionEvidence({ documentKind: 'forms', insurerName: 'Α.Ε.Ε.Γ.Α. «Η ΕΘΝΙΚΗ»' })
        expect(verdict.sufficient).toBe(false)
    })

    it('accepts a real schedule', () => {
        expect(assessExtractionEvidence({
            documentKind: 'policy_schedule',
            insurerName: 'Η ΕΘΝΙΚΗ',
            policyNumber: '1668177',
            startDate: '2024-12-05',
            endDate: '2025-12-05',
        }).sufficient).toBe(true)
    })
})

describe('evidence assessment — without a classification', () => {
    it('refuses when an insurer name is the ONLY thing found', () => {
        // The decisive rule. An insurer's name appears on brochures, booklets,
        // forms and envelopes; it identifies a company, never a contract.
        const verdict = assessExtractionEvidence({ insurerName: 'Η ΕΘΝΙΚΗ' })
        expect(verdict).toEqual({ sufficient: false, reason: 'no_identifying_evidence' })
    })

    it('accepts on a policy number alone', () => {
        expect(assessExtractionEvidence({ policyNumber: '193300/1' }).sufficient).toBe(true)
    })

    it('accepts on an insured party alone', () => {
        expect(assessExtractionEvidence({ customerSurname: 'ΜΟΝΙΑΡΟΣ' }).sufficient).toBe(true)
    })

    it('accepts on a complete period alone', () => {
        expect(assessExtractionEvidence({ startDate: '2026-04-30', endDate: '2027-04-29' }).sufficient).toBe(true)
    })

    it('does not accept half a period', () => {
        // A single date is as likely to be a print date or a specimen as a term.
        expect(assessExtractionEvidence({ startDate: '2026-04-30' }).sufficient).toBe(false)
    })

    it('ignores whitespace-only values', () => {
        expect(assessExtractionEvidence({ policyNumber: '   ', customerName: '' }).sufficient).toBe(false)
    })

    it('ignores an unrecognised documentKind rather than failing on it', () => {
        // A model that invents a kind should not be able to refuse a real policy.
        const verdict = assessExtractionEvidence({
            documentKind: 'σχέδιο',
            policyNumber: '140014/2',
        })
        expect(verdict.sufficient).toBe(true)
    })
})

describe('orchestrator wiring — the guards are actually reached', () => {
    /**
     * Asserted on the source: the orchestrator is a "use server" module whose
     * import chain parses the real environment, so it cannot be instantiated
     * here. What matters is that the two guards sit on the path that writes
     * policy metadata, and that nothing routes around them.
     */
    const source = readFileSync(
        join(__dirname, '..', '..', 'lib/services/analysis/policy-analysis-orchestrator.service.ts'),
        'utf8'
    )

    it('refuses to overwrite stored metadata from a non-policy document', () => {
        expect(source).toMatch(/extraction\.evidence && !extraction\.evidence\.sufficient/)
    })

    it('keeps a line of business the customer already confirmed', () => {
        // Re-analysis normally supersedes stored values by design. The branch is
        // the exception: it selects the score category, the coverage panel, the
        // gap definitions and the advisor's commission rate.
        expect(source).toContain('function resolveLineOfBusiness')
        expect(source).toMatch(/reviewState === "confirmed"/)
    })

    it('does not re-read the raw extraction after the guards have run', () => {
        // The persist path used to recompute the branch straight from
        // `extraction.lineOfBusiness`, routing around normalization, the evidence
        // gate and the confirmation guard in one line.
        expect(source).not.toMatch(/normalizeLineOfBusiness\(extraction\.lineOfBusiness \|\| metadata\.lineOfBusiness\)/)
        expect(source).toContain('const normalizedLob = metadata.lineOfBusiness')
    })
})

describe('document kind — prompt contract', () => {
    it('names every kind in the instruction the model receives', () => {
        for (const kind of DOCUMENT_KINDS) {
            expect(DOCUMENT_KIND_PROMPT_SECTION, kind).toContain(kind)
        }
    })

    it('is present in the extraction prompt', () => {
        const prompt = buildExtractionPrompt()
        expect(prompt).toContain('DOCUMENT KIND')
        expect(prompt).toContain('policy_schedule')
    })

    it('tells the model to leave fields empty rather than carry values over', () => {
        expect(DOCUMENT_KIND_PROMPT_SECTION).toContain('LEAVE EVERY FIELD YOU CANNOT FIND EMPTY')
    })

    it('carries bilingual copy for every refusal reason', () => {
        for (const [reason, copy] of Object.entries(EVIDENCE_REFUSAL_COPY)) {
            expect(copy.el.length, reason).toBeGreaterThan(0)
            expect(copy.en.length, reason).toBeGreaterThan(0)
        }
    })
})
