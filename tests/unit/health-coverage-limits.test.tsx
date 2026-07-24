import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HealthCoverageDetails } from '@/components/wallet/coverage-details/HealthCoverageDetails'
import { getTranslations } from '@/lib/i18n'

const el = getTranslations('el').coverageDetails.health

/**
 * The health panel extracted every coverage limit but rendered only the
 * outpatient one. The annual limit — the ceiling on what the insurer pays in a
 * year, the single most consequential number on a health policy — the room &
 * board daily limit, and the out-of-pocket maximum were dropped. Worse, the
 * "is there anything to show?" gate didn't count them either, so a policy whose
 * extraction found ONLY those limits rendered nothing at all.
 */
describe('the health panel shows the coverage limits, not just outpatient', () => {
    it('shows the annual limit — the ceiling on what the insurer pays', () => {
        const { container } = render(
            <HealthCoverageDetails acordData={{ health: { annualLimit: 30000 } } as any} language="el" />
        )
        expect(container.textContent).toContain(el.annualLimit)
        expect(container.textContent).toContain('30.000')
    })

    it('shows room & board and out-of-pocket maximum', () => {
        const acord: any = { health: { roomAndBoardLimit: 250, outOfPocketMax: 5000 } }
        const { container } = render(<HealthCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain(el.roomAndBoardLimit)
        expect(container.textContent).toContain('250')
        expect(container.textContent).toContain(el.outOfPocketMax)
        expect(container.textContent).toContain('5.000')
    })

    it('renders the panel when ONLY a limit was extracted (gate fix)', () => {
        // Before: hasAnyData ignored the limits, so a limits-only extraction
        // returned null and the policyholder saw no coverage figures at all.
        const { container } = render(
            <HealthCoverageDetails acordData={{ health: { annualLimit: 10000 } } as any} language="el" />
        )
        expect(container.textContent).toContain('10.000')
    })

    it('still renders in English', () => {
        const enHealth = getTranslations('en').coverageDetails.health
        const { container } = render(
            <HealthCoverageDetails acordData={{ health: { annualLimit: 20000 } } as any} language="en" />
        )
        expect(container.textContent).toContain(enHealth.annualLimit)
    })

    it('shows nothing for a health section with no data at all', () => {
        const { container } = render(<HealthCoverageDetails acordData={{ health: {} } as any} language="el" />)
        expect(container.textContent).toBe('')
    })
})
