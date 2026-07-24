import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { motorSection, homeSection, lifeSection, coverageSectionKeys } from '@/lib/wallet/coverage-sections'
import { MotorCoverageDetails } from '@/components/wallet/coverage-details/MotorCoverageDetails'
import { HomeCoverageDetails } from '@/components/wallet/coverage-details/HomeCoverageDetails'
import { LifeCoverageDetails } from '@/components/wallet/coverage-details/LifeCoverageDetails'

/**
 * acord-data.ts holds two names for three branches: the canonical `vehicle`,
 * `property` and `lifeAndInvestment` sections, and a `motor` / `home` / `life`
 * block labelled in the schema itself as "legacy aliases … AI extraction should
 * populate the canonical sections". Nothing maps between them.
 *
 * The three panels read the aliases, so a freshly analysed motor, home or life
 * policy rendered an empty panel. These assert what the READER sees, not which
 * key the code reaches for — the panels are rendered with a canonical-only
 * extraction, exactly the shape the pipeline stores.
 */
describe('the coverage panel reads what extraction actually wrote', () => {
    it('shows the motor cover tier and roadside facts from a canonical extraction', () => {
        const acord: any = {
            vehicle: {
                coverageTier: 'comprehensive',
                accidentDeclarationPhone: '210 999 8888',
                roadsideAssistancePhone: '210 111 2222',
                greenCardExpiryDate: '2027-03-01',
                namedDrivers: [{ name: 'Μαρία Παπαδοπούλου' }],
            },
        }
        render(<MotorCoverageDetails acordData={acord} language="el" />)

        // The single most consequential fact about a motor policy — stated in
        // the reader's language. This first asserted /comprehensive/i, which
        // was the English enum leaking to a Greek reader, not a passing panel.
        expect(screen.getByText('Μικτή')).toBeTruthy()
        // The number you are meant to ring from the roadside.
        expect(screen.getByText('210 999 8888')).toBeTruthy()
        expect(screen.getByText('210 111 2222')).toBeTruthy()
        // Who else is actually covered to drive it.
        expect(screen.getByText('Μαρία Παπαδοπούλου')).toBeTruthy()
    })

    it('shows the home sum insured and the peril grid from a canonical extraction', () => {
        const acord: any = {
            property: {
                insuredValue: 250000,
                fireCoverageIncluded: true,
                earthquakeCoverageIncluded: false,
                floodCoverageIncluded: true,
                mortgageeBank: 'Alpha Bank',
            },
        }
        const { container } = render(<HomeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain('250.000')
        expect(screen.getByText('Alpha Bank')).toBeTruthy()
        // The earthquake verdict the gap engine already reports on this data.
        expect(container.textContent).toMatch(/σεισμ/i)
    })

    it('shows life fund and surrender values from a canonical extraction', () => {
        const acord: any = {
            lifeAndInvestment: { currentFundValue: 12500, surrenderValue: 9800, ytdGrowth: 4.2 },
        }
        const { container } = render(<LifeCoverageDetails acordData={acord} language="el" />)
        expect(container.textContent).toContain('12.500')
        expect(container.textContent).toContain('9.800')
    })

    it('still renders data stored under the legacy alias', () => {
        // Real rows predate the canonical naming; the fix must not orphan them.
        const acord: any = { motor: { coverageTier: 'third-party', accidentDeclarationPhone: '210 555 4444' } }
        render(<MotorCoverageDetails acordData={acord} language="el" />)
        expect(screen.getByText('210 555 4444')).toBeTruthy()
    })

    it('prefers the canonical section when a row carries both', () => {
        const acord: any = {
            vehicle: { coverageTier: 'comprehensive' },
            motor: { coverageTier: 'third-party' },
        }
        expect(motorSection(acord)?.coverageTier).toBe('comprehensive')
    })
})

describe('section resolvers', () => {
    it('translates the two names that genuinely differ', () => {
        // canonical `greenCardExpiryDate` → the panel's `greenCardExpiry`
        expect(motorSection({ vehicle: { greenCardExpiryDate: '2027-01-01' } } as any)?.greenCardExpiry)
            .toBe('2027-01-01')
        // canonical flat peril flags → the panel's nested block
        expect(homeSection({ property: { earthquakeCoverageIncluded: true } } as any)?.catastropheCoverage)
            .toEqual({ fire: undefined, earthquake: true, flood: undefined })
    })

    it('does not invent a peril verdict when the extraction stated none', () => {
        // An all-undefined block renders three red crosses — i.e. tells a
        // policyholder their house has no fire, earthquake or flood cover on an
        // extraction that never mentioned any of them.
        expect(homeSection({ property: { insuredValue: 100 } } as any)?.catastropheCoverage).toBeUndefined()
    })

    it('returns null when neither name is present', () => {
        expect(motorSection({} as any)).toBeNull()
        expect(homeSection({} as any)).toBeNull()
        expect(lifeSection({} as any)).toBeNull()
        expect(motorSection(null)).toBeNull()
    })

    it('keeps a false canonical flag rather than falling back to the alias', () => {
        // `??` not `||`: "explicitly not covered" must beat a stale alias value.
        const acord: any = {
            property: { fireCoverageIncluded: false },
            home: { catastropheCoverage: { fire: true } },
        }
        expect(homeSection(acord)?.catastropheCoverage?.fire).toBe(false)
    })
})

/**
 * The page decides whether to offer the coverage section — and whether to tell
 * the reader to re-run a metered analysis — from this lookup. Keyed on the raw
 * line of business it missed every child branch, so a motorbike or a renters
 * policy got no panel AND no explanation.
 */
describe('every branch that has a panel resolves to one', () => {
    it('maps child branches to their parent family', () => {
        expect(coverageSectionKeys('motorbike')).toContain('vehicle')
        expect(coverageSectionKeys('truck')).toContain('vehicle')
        expect(coverageSectionKeys('renters')).toContain('property')
        expect(coverageSectionKeys('income_protection')).toContain('lifeAndInvestment')
        expect(coverageSectionKeys('disability')).toContain('lifeAndInvestment')
        expect(coverageSectionKeys('personal_accident')).toContain('lifeAndInvestment')
    })

    it('lists the canonical name for life, not only the alias', () => {
        // Missing `lifeAndInvestment` meant a successfully analysed life policy
        // was told to re-analyse — spending metered AI on a run that worked.
        expect(coverageSectionKeys('life')).toContain('lifeAndInvestment')
    })

    it('lists both spellings for every branch that has two', () => {
        expect(coverageSectionKeys('motor')).toEqual(expect.arrayContaining(['vehicle', 'motor']))
        expect(coverageSectionKeys('home')).toEqual(expect.arrayContaining(['property', 'home']))
        expect(coverageSectionKeys('life')).toEqual(expect.arrayContaining(['lifeAndInvestment', 'life']))
    })

    it('is null for branches with no type-specific panel', () => {
        // travel/cyber/business have no panel — the page must not offer the
        // section and then render an empty card.
        expect(coverageSectionKeys('travel')).toBeNull()
        expect(coverageSectionKeys('cyber')).toBeNull()
        expect(coverageSectionKeys(null)).toBeNull()
    })
})

/**
 * The dispatcher and the gate must agree with the panels. Asserted through the
 * rendered tab so a future edit that re-reads `acordData.motor` fails here even
 * though the resolver is still exported and still correct.
 */
describe('the tab dispatcher resolves child branches', () => {
    it('renders the motor panel for a motorbike policy', async () => {
        const { CoverageTabView } = await import('@/components/wallet/coverage-details/CoverageTabView')
        const acord: any = { vehicle: { accidentDeclarationPhone: '210 777 6666' } }
        render(<CoverageTabView acordData={acord} lineOfBusiness={'motorbike' as any} language="el" />)
        expect(screen.getByText('210 777 6666')).toBeTruthy()
    })

    it('renders the home panel for a renters policy', async () => {
        const { CoverageTabView } = await import('@/components/wallet/coverage-details/CoverageTabView')
        const acord: any = { property: { mortgageeBank: 'Πειραιώς' } }
        render(<CoverageTabView acordData={acord} lineOfBusiness={'renters' as any} language="el" />)
        expect(screen.getByText('Πειραιώς')).toBeTruthy()
    })
})
