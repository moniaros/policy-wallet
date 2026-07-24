import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { getTranslations } from '@/lib/i18n'

vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: () => ({ t: getTranslations('el'), language: 'el' }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import { PolicyComparison } from '@/components/wallet/PolicyComparison'

const el = getTranslations('el').wallet.comparison

const policy = (id: string, over: any = {}) => ({
    id,
    policyNumber: `PN-${id}`,
    insurerName: 'ΕΘΝΙΚΗ',
    lineOfBusiness: 'health',
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    premiumAmount: 500,
    premiumCurrency: 'EUR',
    ...over,
})

/**
 * The comparison showed only insurer/premium/dates for health, home and life —
 * so comparing two health plans told you nothing about which has the higher
 * annual limit or better hospital class, the whole reason to compare. Branch rows
 * now surface the figures that actually differ, and star the better cover.
 */
describe('the comparison surfaces branch-specific coverage figures', () => {
    it('compares two health plans on annual limit and hospital class', () => {
        const policies = [
            policy('a', { acordData: { health: { annualLimit: 30000, hospitalClass: 'Α' } } }),
            policy('b', { acordData: { health: { annualLimit: 50000, hospitalClass: 'Β' } } }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['a', 'b']} />
        )
        const text = container.textContent || ''
        expect(text).toContain(el.rowAnnualLimit)
        expect(text).toContain('30.000')
        expect(text).toContain('50.000')
        expect(text).toContain(el.rowHospitalClass)
    })

    it('stars the health plan with the HIGHER annual limit (better cover)', () => {
        const policies = [
            policy('a', { acordData: { health: { annualLimit: 30000 } } }),
            policy('b', { acordData: { health: { annualLimit: 50000 } } }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['a', 'b']} />
        )
        // The starred cell (best cover) must be the 50.000 one, not 30.000.
        const starred = [...container.querySelectorAll('span')].find((s) => s.textContent?.includes('⭐'))
        expect(starred?.textContent).toContain('50.000')
    })

    it('compares two life policies on the death benefit', () => {
        const policies = [
            policy('a', { lineOfBusiness: 'life', acordData: { lifeAndInvestment: { deathBenefit: 100000 } } }),
            policy('b', { lineOfBusiness: 'life', acordData: { lifeAndInvestment: { deathBenefit: 200000 } } }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['a', 'b']} />
        )
        const text = container.textContent || ''
        expect(text).toContain(el.rowDeathBenefit)
        expect(text).toContain('200.000')
    })

    it('compares two home policies on sum insured and earthquake cover', () => {
        const policies = [
            policy('a', { lineOfBusiness: 'home', acordData: { property: { insuredValue: 150000, earthquakeCoverageIncluded: true } } }),
            policy('b', { lineOfBusiness: 'home', acordData: { property: { insuredValue: 250000, earthquakeCoverageIncluded: false } } }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['a', 'b']} />
        )
        const text = container.textContent || ''
        expect(text).toContain(el.rowSumInsured)
        expect(text).toContain(el.rowEarthquake)
        expect(text).toContain('250.000')
    })

    it('does not star anything when the compared figures are equal', () => {
        const policies = [
            policy('a', { acordData: { health: { annualLimit: 40000 } } }),
            policy('b', { acordData: { health: { annualLimit: 40000 } } }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['a', 'b']} />
        )
        // Premium is also equal (500 each) → no lowest star either. Nothing starred.
        expect(container.textContent).not.toContain('⭐')
    })
})

/**
 * The comparison renders rows by branch FAMILY, so its selection filter must
 * group by family too — a motorbike and a car are both motor. Raw-line equality
 * blocked selecting them together (and renters+home, income-protection+life),
 * making the whole comparison unreachable for those pairs.
 */
describe('same-family policies are comparable', () => {
    it('offers a motorbike as comparable once a car is selected', () => {
        // One selected (a car) → the selection grid shows the comparable set,
        // filtered by comparablePolicies. The motorbike belongs there (both
        // motor). Raw-line equality filtered it out entirely.
        const policies = [
            policy('car', { lineOfBusiness: 'motor' }),
            policy('bike', { lineOfBusiness: 'motorbike' }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['car']} />
        )
        // The motorbike's row must appear in the selectable grid.
        expect(container.textContent).toContain('PN-bike')
    })

    it('excludes a different family from the comparable set', () => {
        // A health policy is NOT comparable with a selected motor policy.
        const policies = [
            policy('car', { lineOfBusiness: 'motor' }),
            policy('plan', { lineOfBusiness: 'health' }),
        ]
        const { container } = render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['car']} />
        )
        expect(container.textContent).not.toContain('PN-plan')
    })
})

/**
 * The comparison is a data table a screen-reader user cross-references. It needs
 * column/row header semantics, and the ⭐ best-value marker — visual-only — needs
 * a text alternative or a blind user cannot tell which policy the table
 * recommends.
 */
describe('the comparison table is accessible', () => {
    const setup = () => {
        const policies = [
            policy('a', { acordData: { health: { annualLimit: 30000 } } }),
            policy('b', { acordData: { health: { annualLimit: 50000 } } }),
        ]
        return render(
            <PolicyComparison policies={policies} isOpen onClose={() => {}} selectedPolicyIds={['a', 'b']} />
        )
    }

    it('uses column and row header scopes', () => {
        const { container } = setup()
        expect(container.querySelectorAll('th[scope="col"]').length).toBeGreaterThanOrEqual(3) // label + 2 policies
        expect(container.querySelectorAll('th[scope="row"]').length).toBeGreaterThan(0)
    })

    it('gives the best-value star a screen-reader text alternative', () => {
        const { container } = setup()
        const star = [...container.querySelectorAll('span')].find((s) => s.textContent?.includes('⭐'))
        // The ⭐ glyph itself is decorative…
        expect(star?.querySelector('[aria-hidden="true"]')?.textContent).toContain('⭐')
        // …and an sr-only span explains WHY (higher annual limit = most cover).
        expect(star?.textContent).toContain(el.bestHighest)
    })
})
