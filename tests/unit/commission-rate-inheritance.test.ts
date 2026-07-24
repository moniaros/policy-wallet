import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { commissionRate, commissionOn, DEFAULT_COMMISSION_RATE_PERCENT } from '@/lib/agent/commission'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * `/agent/settings` offers exactly eight lines to configure — motor, home,
 * health, life, travel, pet, liability, legal expenses. Policies and
 * opportunities carry the taxonomy's full vocabulary, where motorbike and truck
 * sit under motor, renters under home, and income protection, disability and
 * personal accident under life.
 *
 * The lookup matched the id exactly, so every child branch fell through to the
 * 15% default. An agent who had set motor at 10% read 15% on each motorbike in
 * their own commission report — half again what they actually earn — with
 * nothing on screen to show a fallback had been used.
 */
describe('a child branch inherits its parent commission rate', () => {
    const rates = { motor: 10, home: 8, life: 20 }

    it('applies the motor rate to a motorbike and a truck', () => {
        expect(commissionRate(rates, 'motorbike')).toBeCloseTo(0.1)
        expect(commissionRate(rates, 'truck')).toBeCloseTo(0.1)
    })

    it('applies the home rate to renters', () => {
        expect(commissionRate(rates, 'renters')).toBeCloseTo(0.08)
    })

    it('applies the life rate to its children', () => {
        for (const lob of ['income_protection', 'disability', 'personal_accident']) {
            expect(commissionRate(rates, lob), lob).toBeCloseTo(0.2)
        }
    })

    it('an exact key still wins over the parent', () => {
        expect(commissionRate({ motor: 10, motorbike: 25 }, 'motorbike')).toBeCloseTo(0.25)
    })

    it('falls back to the default only when neither exists', () => {
        expect(commissionRate(rates, 'cyber')).toBeCloseTo(DEFAULT_COMMISSION_RATE_PERCENT / 100)
        expect(commissionRate({}, 'motor')).toBeCloseTo(DEFAULT_COMMISSION_RATE_PERCENT / 100)
    })

    it('carries through to the money figure', () => {
        // €400 motorbike premium: 10% configured, not the 15% default.
        expect(commissionOn(rates, 'motorbike', 400)).toBeCloseTo(40)
        expect(commissionOn(rates, 'motorbike', 400)).not.toBeCloseTo(60)
    })

    it('is unaffected by casing or a null line', () => {
        expect(commissionRate(rates, 'MotorBike')).toBeCloseTo(0.1)
        expect(commissionRate(rates, null)).toBeCloseTo(DEFAULT_COMMISSION_RATE_PERCENT / 100)
    })
})

/**
 * The commission chart's month labels were formatted server-side with a
 * hardcoded "en-GB", so a Greek agent read Jan/Feb/Mar on their own earnings.
 */
describe('the commission chart speaks the agent language', () => {
    it('the server emits a month key, not a formatted label', () => {
        const actions = strip(readFileSync('app/(protected)/commissions/actions.ts', 'utf-8'))
        expect(actions).not.toMatch(/toLocaleDateString\("en-GB", \{ month: "short"/)
        expect(actions).toMatch(/\$\{d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\) \+ 1\)/)
    })

    it('the client formats it in the reader language', () => {
        const client = strip(readFileSync('app/(protected)/commissions/CommissionsClient.tsx', 'utf-8'))
        expect(client).toMatch(/monthLabel\(m\.month\)/)
        expect(client).toMatch(/language === "el" \? "el" : "en"/)
    })
})
