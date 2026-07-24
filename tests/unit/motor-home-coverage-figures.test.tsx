import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MotorCoverageDetails } from '@/components/wallet/coverage-details/MotorCoverageDetails'
import { HomeCoverageDetails } from '@/components/wallet/coverage-details/HomeCoverageDetails'
import { motorSection, homeSection } from '@/lib/wallet/coverage-sections'
import { getTranslations } from '@/lib/i18n'

const elMotor = getTranslations('el').coverageDetails.motor
const elHome = getTranslations('el').coverageDetails.home

/**
 * Completing the extracted-but-unrendered sweep (health limits, life death
 * benefit): motor's excess and market value, and home's rebuild cost, are all
 * canonical-section-only fields that the section resolvers' types never carried,
 * so the panels never showed them — even though the home underinsurance gap is
 * computed from the rebuild cost the panel omitted.
 */
describe('motor: the excess and market value are shown', () => {
    it('resolves them from the canonical vehicle section', () => {
        const s = motorSection({ vehicle: { deductible: 500, estimatedMarketValue: 12000 } } as any)
        expect(s?.deductible).toBe(500)
        expect(s?.estimatedMarketValue).toBe(12000)
    })

    it('shows the excess with its plain-language explanation', () => {
        const { container } = render(
            <MotorCoverageDetails acordData={{ vehicle: { deductible: 500 } } as any} language="el" />
        )
        expect(container.textContent).toContain(elMotor.deductible)
        expect(container.textContent).toContain('500')
        expect(container.textContent).toContain(elMotor.deductibleHint)
    })

    it('shows the estimated market value', () => {
        const { container } = render(
            <MotorCoverageDetails acordData={{ vehicle: { estimatedMarketValue: 12000 } } as any} language="el" />
        )
        expect(container.textContent).toContain(elMotor.marketValue)
        expect(container.textContent).toContain('12.000')
    })

    it('renders a policy whose extraction found ONLY the excess', () => {
        const { container } = render(
            <MotorCoverageDetails acordData={{ vehicle: { deductible: 300 } } as any} language="el" />
        )
        expect(container.textContent).toContain('300')
    })
})

describe('home: the rebuild cost is shown beside the sum insured', () => {
    it('resolves it from the canonical property section', () => {
        expect(homeSection({ property: { estimatedRebuildCost: 200000 } } as any)?.estimatedRebuildCost).toBe(200000)
    })

    it('shows the rebuild cost — the figure the underinsurance gap is measured against', () => {
        const acord: any = { property: { insuredValue: 150000, estimatedRebuildCost: 200000 } }
        const { container } = render(<HomeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(elHome.rebuildCost)
        expect(container.textContent).toContain('200.000')
        // Both numbers of the average-clause comparison now visible together.
        expect(container.textContent).toContain('150.000')
    })

    it('renders a policy whose extraction found ONLY the rebuild cost', () => {
        const { container } = render(
            <HomeCoverageDetails acordData={{ property: { estimatedRebuildCost: 180000 } } as any} language="el" />
        )
        expect(container.textContent).toContain('180.000')
    })
})
