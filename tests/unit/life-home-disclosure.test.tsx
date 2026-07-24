import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LifeCoverageDetails } from '@/components/wallet/coverage-details/LifeCoverageDetails'
import { HomeCoverageDetails } from '@/components/wallet/coverage-details/HomeCoverageDetails'
import { classifyHomeCoverScope } from '@/lib/wallet/home-cover-scope'
import { getTranslations } from '@/lib/i18n'

const el = getTranslations('el').coverageDetails
const en = getTranslations('en').coverageDetails

/**
 * The life panel presents a retail investment product: a fund value, a
 * year-to-date return, a guaranteed/unit-linked split and a maturity tax
 * verdict — all extracted by a model from a PDF. It carried none of the
 * disclosure that makes those figures safe to show.
 */
describe('life: investment figures carry their disclosure', () => {
    it('states that past performance does not predict future results', () => {
        const acord: any = { lifeAndInvestment: { currentFundValue: 12500, ytdGrowth: 4.2 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain('+4.20%')
        expect(container.textContent).toContain(el.life.pastPerformanceNote)
    })

    it('carries the same note in English', () => {
        const acord: any = { lifeAndInvestment: { currentFundValue: 12500, ytdGrowth: -1.5 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="en" />)
        expect(container.textContent).toContain(en.life.pastPerformanceNote)
    })

    it('does not print the note when there is no return to disclose', () => {
        const acord: any = { lifeAndInvestment: { currentFundValue: 12500 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).not.toContain(el.life.pastPerformanceNote)
    })

    it('says the unit-linked share can fall', () => {
        // The bar paints the guaranteed share in the affirmative colour and the
        // unit-linked share in neutral grey — the inverse of where risk sits.
        const acord: any = { lifeAndInvestment: { guaranteedPercentage: 40, unitLinkedPercentage: 60 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.life.unitLinkedRiskNote)
    })

    it('stays quiet on a wholly guaranteed contract', () => {
        const acord: any = { lifeAndInvestment: { guaranteedPercentage: 100, unitLinkedPercentage: 0 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).not.toContain(el.life.unitLinkedRiskNote)
    })
})

/**
 * «Αφορολόγητο» in a green badge is a settled verdict on someone's tax position,
 * derived from a model reading a PDF. Greek life-policy taxation at maturity
 * turns on the contract type, the holding period and the law in force years from
 * now — this product cannot give that answer, and must not appear to.
 */
describe('life: the maturity tax line is framed as the document’s claim', () => {
    it('qualifies a tax-free maturity', () => {
        const acord: any = { lifeAndInvestment: { taxFreeAtMaturity: true, currentFundValue: 1 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.taxFree)
        expect(container.textContent).toContain(el.life.taxNote)
        expect(el.life.taxNote).toMatch(/δεν αποτελεί φορολογική συμβουλή/i)
    })

    it('qualifies a taxable one too', () => {
        const acord: any = { lifeAndInvestment: { taxFreeAtMaturity: false, currentFundValue: 1 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.life.taxNote)
    })

    it('carries the disclaimer in English as well', () => {
        expect(en.life.taxNote).toMatch(/not tax advice/i)
    })
})

/**
 * Whether the building, its contents, or both are insured decides whether a
 * burglary or a burst pipe is paid at all. It was printed verbatim, so a Greek
 * reader saw "structure-only" in English.
 */
describe('home: the insured subject is stated in the reader’s language', () => {
    it('names a building-only policy as such', () => {
        const acord: any = { property: { contentsVsStructure: 'structure-only' } }
        const { container } = render(<HomeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.home.structureOnly)
        expect(container.textContent).not.toContain('structure-only')
    })

    it('names a contents-only policy as such', () => {
        const acord: any = { property: { contentsVsStructure: 'contents-only' } }
        const { container } = render(<HomeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.home.contentsOnly)
    })

    it('names a policy covering both', () => {
        const acord: any = { property: { contentsVsStructure: 'both' } }
        const { container } = render(<HomeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.home.contentsAndStructure)
    })

    it('shows unrecognised wording verbatim rather than guessing a scope', () => {
        const acord: any = { property: { contentsVsStructure: 'Πακέτο Α2' } }
        const { container } = render(<HomeCoverageDetails acordData={acord} language="el" />)
        expect(screen.getByText('Πακέτο Α2')).toBeTruthy()
        expect(container.textContent).not.toContain(el.home.contentsAndStructure)
    })
})

describe('home cover-scope classification', () => {
    it('reads the Greek wording', () => {
        expect(classifyHomeCoverScope('Μόνο κτίριο')).toBe('structure_only')
        expect(classifyHomeCoverScope('Περιεχόμενα')).toBe('contents_only')
        expect(classifyHomeCoverScope('Κτίριο και περιεχόμενα')).toBe('both')
    })

    it('treats a policy naming both subjects as both', () => {
        // Not "structure_only" just because structure is mentioned first.
        expect(classifyHomeCoverScope('building and contents')).toBe('both')
        expect(classifyHomeCoverScope('Contents and structure')).toBe('both')
    })

    it('returns null rather than guessing', () => {
        expect(classifyHomeCoverScope('Πακέτο Α2')).toBeNull()
        expect(classifyHomeCoverScope('')).toBeNull()
        expect(classifyHomeCoverScope(null)).toBeNull()
    })
})
