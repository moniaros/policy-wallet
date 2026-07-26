import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LifeCoverageDetails } from '@/components/wallet/coverage-details/LifeCoverageDetails'
import { getTranslations } from '@/lib/i18n'

const el = getTranslations('el').coverageDetails.life
const en = getTranslations('en').coverageDetails.life

/**
 * Beneficiary review (life policies). The product already listed named
 * beneficiaries but never prompted a review, and said NOTHING when none was
 * found — the highest-risk case, because an unnamed death benefit can pass
 * through the estate/probate. This adds a servicing nudge (present) and a hedged
 * prompt (missing), both directing to the insurer.
 */
describe('beneficiary review nudge — beneficiaries present', () => {
    it('lists the beneficiary and prompts a life-change review', () => {
        const acord: any = {
            lifeAndInvestment: { deathBenefit: 150000 },
            beneficiaries: [{ name: 'Μαρία Παπαδοπούλου', relationship: 'Σύζυγος', percentage: 100 }],
        }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain('Μαρία Παπαδοπούλου')
        expect(container.textContent).toContain(el.beneficiaryReviewNote)
        // The review nudge must NOT appear as a "missing" state here.
        expect(container.textContent).not.toContain(el.beneficiaryMissingNote)
    })
})

describe('beneficiary review nudge — none found', () => {
    it('shows a hedged prompt (not a false "you have none") with the estate consequence', () => {
        // A life policy with a death benefit but no extracted beneficiary.
        const acord: any = { lifeAndInvestment: { deathBenefit: 200000 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.beneficiaryMissingNote)
        // Hedged: framed as "not found in this document", never asserting none exists.
        expect(el.beneficiaryMissingNote).toContain('δεν εντοπίστηκε')
        expect(el.beneficiaryMissingNote).toContain('κληρονομιά')
    })

    it('renders the same prompt in English', () => {
        const acord: any = { lifeAndInvestment: { deathBenefit: 200000 } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="en" />)
        expect(container.textContent).toContain(en.beneficiaryMissingNote)
        expect(en.beneficiaryMissingNote.toLowerCase()).toContain('estate')
    })
})
