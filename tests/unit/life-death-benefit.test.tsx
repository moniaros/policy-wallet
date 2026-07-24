import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LifeCoverageDetails } from '@/components/wallet/coverage-details/LifeCoverageDetails'
import { lifeSection } from '@/lib/wallet/coverage-sections'
import { getTranslations } from '@/lib/i18n'

const el = getTranslations('el').coverageDetails.life

/**
 * deathBenefit — the sum paid to beneficiaries on death — is THE figure of a life
 * policy. It is a canonical `lifeAndInvestment` field with no legacy `life`
 * counterpart, so the section resolver's type never carried it and the panel
 * never showed it. The panel knew only the investment side, so a term-life policy
 * (protection only, no fund/surrender) rendered nothing at all.
 */
describe('the life panel shows the death benefit, not only the investment side', () => {
    it('resolves deathBenefit from the canonical section', () => {
        expect(lifeSection({ lifeAndInvestment: { deathBenefit: 150000 } } as any)?.deathBenefit).toBe(150000)
    })

    it('shows the death benefit prominently', () => {
        const { container } = render(
            <LifeCoverageDetails acordData={{ lifeAndInvestment: { deathBenefit: 150000 } } as any} language="el" />
        )
        expect(container.textContent).toContain(el.deathBenefit)
        expect(container.textContent).toContain('150.000')
        // …with the plain-language explanation of what it is.
        expect(container.textContent).toContain(el.deathBenefitHint)
    })

    it('renders a term-life policy that has ONLY a death benefit', () => {
        // The core regression: no fund, no surrender, no beneficiaries — before,
        // hasAnyData was false and the whole panel returned null.
        const { container } = render(
            <LifeCoverageDetails acordData={{ lifeAndInvestment: { deathBenefit: 200000 } } as any} language="el" />
        )
        expect(container.textContent).toContain('200.000')
    })

    it('shows cash value and maturity date when present', () => {
        const acord: any = { lifeAndInvestment: { cashValue: 8000, maturityDate: '2040-06-01' } }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.cashValue)
        expect(container.textContent).toContain('8.000')
        expect(container.textContent).toContain(el.maturityDate)
        // Document-date formatting, not a raw ISO string.
        expect(container.textContent).not.toContain('2040-06-01')
    })

    it('still renders in English', () => {
        const enLife = getTranslations('en').coverageDetails.life
        const { container } = render(
            <LifeCoverageDetails acordData={{ lifeAndInvestment: { deathBenefit: 100000 } } as any} language="en" />
        )
        expect(container.textContent).toContain(enLife.deathBenefit)
    })
})
