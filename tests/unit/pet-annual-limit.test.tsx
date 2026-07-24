import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PetCoverageDetails } from '@/components/wallet/coverage-details/PetCoverageDetails'

/**
 * The pet panel read only annualLimitTotal (the legacy alias). A policy whose
 * extraction populated the canonical `annualLimit` — the field the prompt
 * targets — showed no pet annual limit. Now resolved canonical-first.
 */
describe('pet: the annual limit shows whether stored canonical or legacy', () => {
    it('renders the canonical annualLimit', () => {
        const { container } = render(
            <PetCoverageDetails acordData={{ pet: { annualLimit: 3000 } } as any} language="el" />
        )
        expect(container.textContent).toContain('3.000')
    })
    it('still renders the legacy annualLimitTotal', () => {
        const { container } = render(
            <PetCoverageDetails acordData={{ pet: { annualLimitTotal: 2500 } } as any} language="el" />
        )
        expect(container.textContent).toContain('2.500')
    })
    it('prefers canonical when both present', () => {
        const { container } = render(
            <PetCoverageDetails acordData={{ pet: { annualLimit: 4000, annualLimitTotal: 1 } } as any} language="el" />
        )
        expect(container.textContent).toContain('4.000')
    })
})
