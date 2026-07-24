import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calculatePremiumFootprintDetailed } from '@/lib/wallet/premium-footprint'
import { getTranslations } from '@/lib/i18n'

/**
 * What `Policy.premiumAmount` MEANS.
 *
 * It is the total premium for the policy TERM. `premiumFrequency` is the payment
 * plan — how that total is settled — not the unit the amount is quoted in.
 *
 * This is stated in exactly one place, `lib/services/ai/prompts.ts`, and nowhere
 * near the half-dozen surfaces that add these numbers up and label the result
 * «Ετήσιο ασφάλιστρο». I misread it while auditing the comparison screen and
 * wrote an "annualiser" that multiplied a monthly-plan policy by twelve — a 12×
 * overstatement of a household's insurance spend, shipped as a bug fix. The
 * lateral sweep for other consumers is what surfaced the prompt line and stopped
 * it. These assertions exist so the next person does not have to be lucky.
 */
describe('premiumAmount is the total for the term', () => {
    it('is never multiplied by the payment frequency', () => {
        const base = {
            insurerName: 'ΕΘΝΙΚΗ',
            status: 'active',
            endDate: new Date(Date.now() + 200 * 86_400_000),
            premiumCurrency: 'EUR',
        }
        const monthlyPlan = {
            ...base,
            id: 'p1',
            policyNumber: 'PN-1',
            premiumAmount: 600,
            acordData: { policy: { premiumFrequency: 'monthly' } },
        }
        // 600 is what the year costs. Paying it in twelve installments does not
        // make it 7,200.
        expect(calculatePremiumFootprintDetailed([monthlyPlan]).total).toBe(600)
    })

    it('treats every payment plan identically, because the amount already is the total', () => {
        const mk = (i: number, frequency: string) => ({
            id: `p${i}`,
            policyNumber: `PN-${i}`,
            insurerName: 'ΕΘΝΙΚΗ',
            status: 'active',
            endDate: new Date(Date.now() + 200 * 86_400_000),
            premiumAmount: 500,
            premiumCurrency: 'EUR',
            acordData: { policy: { premiumFrequency: frequency } },
        })
        const totals = ['annual', 'semiannual', 'quarterly', 'monthly', 'one_off'].map(
            (f, i) => calculatePremiumFootprintDetailed([mk(i, f)]).total
        )
        expect(totals).toEqual([500, 500, 500, 500, 500])
    })
})

describe('the contract that makes that true', () => {
    it('the extraction prompt still asks for the term total, not an installment', () => {
        // If this instruction ever changes to per-installment reporting, every
        // consumer that sums these numbers becomes wrong at once — silently,
        // because nothing else in the codebase records the unit.
        const prompt = readFileSync('lib/services/ai/prompts.ts', 'utf-8')
        expect(prompt).toMatch(/premiumAmount is the premium the customer PAYS for the policy term/)
        expect(prompt).toMatch(/report the total premium for the term and capture the plan in premiumFrequency/)
    })

    it('the product calls premiumFrequency a payment frequency, not a premium unit', () => {
        expect(getTranslations('el').wallet.review.premiumFrequency).toBe('Συχνότητα πληρωμής')
        expect(getTranslations('en').wallet.review.premiumFrequency).toBe('Payment frequency')
    })
})
