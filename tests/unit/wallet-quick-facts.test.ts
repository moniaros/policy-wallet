import { describe, it, expect } from 'vitest'
import { quickFacts } from '@/lib/wallet/quick-facts'
import { getTranslations } from '@/lib/i18n'

/**
 * Spec v2 §6: the wallet card answers «am I covered?» per branch without
 * opening the policy — and never from silence.
 */
const t = getTranslations('el') as any

describe('quickFacts', () => {
    it('health: hospital class, coordination centre (tap-to-call), check-up, direct billing', () => {
        const facts = quickFacts({
            lineOfBusiness: 'health',
            acordData: {
                health: {
                    hospitalClass: 'A',
                    coordinationCentre: { name: 'Κέντρο', phone: '210 123 4567' },
                    annualCheckupIncluded: true,
                    directBillingAvailable: false,
                },
            } as any,
        }, t, 'el')
        expect(facts.map((f) => f.key)).toEqual(['hospitalClass', 'coordinationCentre', 'annualCheckup', 'directBilling'])
        expect(facts[1].href).toBe('tel:2101234567')
        expect(facts[2].value).toBe(t.coverageDetails.included)
        expect(facts[3].tone).toBe('warning')
    })

    it('unknown is not absence: an unstated boolean renders no badge', () => {
        const facts = quickFacts({ lineOfBusiness: 'health', acordData: { health: { hospitalClass: 'B' } } as any }, t, 'el')
        expect(facts.map((f) => f.key)).toEqual(['hospitalClass'])
    })

    it('a masked value is an extraction failure, not a fact', () => {
        const facts = quickFacts({ lineOfBusiness: 'pet', acordData: { pet: { microchipNumber: 'XXXXXX', leishmaniaCovered: false } } as any }, t, 'el')
        expect(facts.map((f) => f.key)).toEqual(['leishmania'])
        expect(facts[0].value).toBe(t.coverageDetails.notCovered)
    })

    it('motor: tier, green card warning inside 30 days, driver count, roadside number', () => {
        const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
        const facts = quickFacts({
            lineOfBusiness: 'motorbike',
            acordData: {
                vehicle: { coverageTier: 'comprehensive', greenCardExpiryDate: soon, namedDrivers: [{ ageBand: 'over-30' }], roadsideAssistancePhone: '1158' },
            } as any,
        }, t, 'el')
        expect(facts.map((f) => f.key)).toEqual(['coverageTier', 'greenCard', 'namedDrivers', 'roadside'])
        expect(facts[0].value).toBe(t.coverageDetails.motor.comprehensive)
        expect(facts[1].tone).toBe('warning')
        expect(facts[3].href).toBe('tel:1158')
    })

    it('home: ENFIA and the three perils, capped at four facts', () => {
        const facts = quickFacts({
            lineOfBusiness: 'home',
            acordData: { property: { enfiaEligible: false, fireCoverageIncluded: true, earthquakeCoverageIncluded: true, floodCoverageIncluded: false, insuredValue: 150000 } } as any,
        }, t, 'el')
        expect(facts.map((f) => f.key)).toEqual(['enfia', 'fire', 'earthquake', 'flood'])
        expect(facts[3].tone).toBe('warning')
    })

    it('life and pet: fund value with growth sign, and limit used of total', () => {
        const life = quickFacts({ lineOfBusiness: 'life', acordData: { lifeAndInvestment: { currentFundValue: 12000, ytdGrowth: -2.5, guaranteedPercentage: 60 } } as any }, t, 'el')
        expect(life.map((f) => f.key)).toEqual(['fundValue', 'ytdGrowth', 'split'])
        expect(life[1].tone).toBe('critical')
        expect(life[2].value).toBe('60% / 40%')
        const pet = quickFacts({ lineOfBusiness: 'pet', acordData: { pet: { annualLimit: 1500, annualLimitUsed: 320 } } as any }, t, 'el')
        expect(pet[0].value).toContain(t.coverageDetails.of)
    })

    it('no extraction, no facts', () => {
        expect(quickFacts({ lineOfBusiness: 'motor', acordData: null }, t, 'el')).toEqual([])
    })
})
