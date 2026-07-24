import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { classifyMotorCoverageTier, tierCoversOwnVehicle } from '@/lib/wallet/motor-coverage-tier'
import { MotorCoverageDetails } from '@/components/wallet/coverage-details/MotorCoverageDetails'
import { HealthCoverageDetails } from '@/components/wallet/coverage-details/HealthCoverageDetails'

const COMPREHENSIVE_HINT = {
    heading: 'Μικτή ασφάλεια',
    definition: 'Καλύπτει και ζημιές στο δικό σας όχημα.',
    href: '/lexiko/mikti-asfaleia',
    moreLabel: 'Περισσότερα',
}

/**
 * `vehicle.coverageTier` is free text from the extraction. The panel printed it
 * verbatim, so a Greek policyholder read "Third-party-fire-theft" — English,
 * hyphenated — on the field that decides whether their own car is covered.
 * el.ts has carried «Τρίτων» / «Τρίτων, Πυρός & Κλοπής» / «Μικτή» all along.
 */
describe('the cover level is stated in the reader’s language', () => {
    it('shows the Greek market term, not the extracted English enum', () => {
        render(<MotorCoverageDetails acordData={{ vehicle: { coverageTier: 'comprehensive' } } as any} language="el" />)
        expect(screen.getByText('Μικτή')).toBeTruthy()
        expect(screen.queryByText(/comprehensive/i)).toBeNull()
    })

    it('names third-party cover as third-party', () => {
        render(<MotorCoverageDetails acordData={{ vehicle: { coverageTier: 'third-party' } } as any} language="el" />)
        expect(screen.getByText('Τρίτων')).toBeTruthy()
    })

    it('keeps fire & theft distinct from plain third-party', () => {
        render(<MotorCoverageDetails acordData={{ vehicle: { coverageTier: 'third-party-fire-theft' } } as any} language="el" />)
        expect(screen.getByText('Τρίτων, Πυρός & Κλοπής')).toBeTruthy()
    })

    it('shows an unrecognised tier verbatim rather than guessing one', () => {
        // The insurer's own wording is honest; a guess is not.
        render(<MotorCoverageDetails acordData={{ vehicle: { coverageTier: 'Πακέτο Silver' } } as any} language="el" />)
        expect(screen.getByText('Πακέτο Silver')).toBeTruthy()
    })
})

/**
 * The hint behind this row is the dictionary entry for «Μικτή ασφάλεια» — the
 * definition of COMPREHENSIVE cover. It was attached whatever the tier, so a
 * third-party-only policy carried a label explaining cover the holder has not
 * bought, on the one row where that misreading costs them their own car.
 */
describe('the comprehensive definition is only shown to comprehensive policies', () => {
    it('is absent on a third-party policy', () => {
        render(
            <MotorCoverageDetails
                acordData={{ vehicle: { coverageTier: 'third-party' } } as any}
                language="el"
                hints={{ comprehensive: COMPREHENSIVE_HINT } as any}
            />
        )
        expect(screen.queryByText('Μικτή ασφάλεια')).toBeNull()
        expect(screen.queryByText(/Καλύπτει και ζημιές στο δικό σας όχημα/)).toBeNull()
    })

    it('is present on a comprehensive policy', () => {
        render(
            <MotorCoverageDetails
                acordData={{ vehicle: { coverageTier: 'comprehensive' } } as any}
                language="el"
                hints={{ comprehensive: COMPREHENSIVE_HINT } as any}
            />
        )
        expect(screen.getByText('Μικτή ασφάλεια')).toBeTruthy()
    })
})

describe('tier classification', () => {
    it('reads both Greek spellings of comprehensive', () => {
        // «μικτή» and «μεικτή» are both current in the market.
        expect(classifyMotorCoverageTier('Μικτή ασφάλιση')).toBe('comprehensive')
        expect(classifyMotorCoverageTier('ΜΕΙΚΤΗ')).toBe('comprehensive')
    })

    it('does not downgrade a comprehensive policy that also names fire and theft', () => {
        expect(classifyMotorCoverageTier('Comprehensive incl. fire and theft')).toBe('comprehensive')
    })

    it('reads the Greek phrasing of third-party cover', () => {
        expect(classifyMotorCoverageTier('Αστική ευθύνη προς τρίτους')).toBe('third_party')
        expect(classifyMotorCoverageTier('Αστική ευθύνη, πυρός και κλοπής')).toBe('third_party_fire_theft')
    })

    it('returns null rather than guessing', () => {
        expect(classifyMotorCoverageTier('Πακέτο Silver')).toBeNull()
        expect(classifyMotorCoverageTier('')).toBeNull()
        expect(classifyMotorCoverageTier(null)).toBeNull()
    })

    it('knows which tiers pay for the holder’s own vehicle', () => {
        expect(tierCoversOwnVehicle('comprehensive')).toBe(true)
        expect(tierCoversOwnVehicle('third_party')).toBe(false)
        expect(tierCoversOwnVehicle('third_party_fire_theft')).toBe(false)
        expect(tierCoversOwnVehicle(null)).toBe(false)
    })
})

/**
 * Extracted dates are document text, not ISO. `new Date("03-01-2027")` does not
 * fail on the Greek order — V8 reads bare numeric dates month-first and returns
 * 1 MARCH. So a Green Card expiring on 3 January was shown as valid until 1
 * March: two months past the day it stops proving cover at a border.
 */
describe('the Green Card expiry is read as a Greek document date', () => {
    it('does not silently re-order a day-first date', () => {
        const { container } = render(
            <MotorCoverageDetails
                acordData={{ vehicle: { greenCardExpiryDate: '03-01-2027' } } as any}
                language="el"
            />
        )
        // 3 January 2027 — NOT 1 March.
        expect(container.textContent).toContain('3/1/2027')
        expect(container.textContent).not.toContain('1/3/2027')
    })

    it('reads a Greek month name instead of crashing the page', () => {
        // Intl throws RangeError on an Invalid Date, and this runs inside the
        // render of a client component — it took the whole policy page down.
        const { container } = render(
            <MotorCoverageDetails
                acordData={{ vehicle: { greenCardExpiryDate: '1 Μαρτίου 2027' } } as any}
                language="el"
            />
        )
        expect(container.textContent).toContain('1/3/2027')
        expect(container.textContent).not.toContain('Invalid Date')
    })

    it('says nothing at all when the date cannot be read', () => {
        // Not "Invalid Date" beside a confident green badge.
        const { container } = render(
            <MotorCoverageDetails
                acordData={{ vehicle: { greenCardExpiryDate: 'δείτε το συμβόλαιο', coverageTier: 'comprehensive' } } as any}
                language="el"
            />
        )
        expect(container.textContent).not.toContain('Invalid Date')
        expect(container.textContent).not.toContain('δείτε το συμβόλαιο')
    })

    it('still reads a proper ISO date', () => {
        const { container } = render(
            <MotorCoverageDetails acordData={{ vehicle: { greenCardExpiryDate: '2027-03-01' } } as any} language="el" />
        )
        expect(container.textContent).toContain('1/3/2027')
    })
})

/**
 * The same raw parse sat on waiting-period end dates — the date a policyholder
 * may first claim. Shifting it, or printing "Invalid Date", means someone files
 * inside the waiting period and is declined.
 */
describe('waiting-period end dates are read the same way', () => {
    it('does not re-order a day-first waiting-period date', () => {
        const acord: any = {
            health: { waitingPeriods: [{ condition: 'Μαιευτικά', endDate: '03-01-2027' }] },
        }
        const { container } = render(<HealthCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain('3/1/2027')
        expect(container.textContent).not.toContain('1/3/2027')
    })
})
